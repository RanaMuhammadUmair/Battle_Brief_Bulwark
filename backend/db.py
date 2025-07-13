import os
import sqlite3
import json

# Database file path - stored in the same directory as this module
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "summaries.db")

class Database:
    """
    Database handler for managing document summaries.
    Provides CRUD operations for storing and retrieving user summaries with automatic cleanup.
    """
    
    def __init__(self):
        """
        Initializing database connection and create tables if they don't exist.
        Uses SQLite with thread-safe configuration and row factory for dict-like access.
        """
        self.conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        self.create_table()

    def create_table(self):
        """
        Creating the summaries table if it doesn't exist.
        Table stores user summaries with metadata and automatic timestamp generation.
        """
        query = """
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            filename TEXT,
            plain_text TEXT,
            summary TEXT,
            metadata TEXT,
            -- use localtime here instead of UTC
            created_at TIMESTAMP DEFAULT (datetime('now','localtime'))
        );
        """
        self.conn.execute(query)
        self.conn.commit()

    def save_summary(self, user_id, plain_text, summary, metadata):
        """
        Save a new summary to the database and maintain user's summary limit.
        
        Args:
            user_id (str): Unique identifier for the user
            plain_text (str): Original document text
            summary (str): Generated summary text
            metadata (dict): Additional metadata including filename
            
        Note: Automatically enforces a limit of 10000 summaries per user by removing oldest entries.
        """
        # Insert new summary record
        query = """
        INSERT INTO summaries (user_id, filename, plain_text, summary, metadata)
        VALUES (?, ?, ?, ?, ?)
        """
        metadata_json = json.dumps(metadata)
        filename = metadata.get("filename", "Unknown Filename")  # Fallback for missing filename
        self.conn.execute(query, (user_id, filename, plain_text, summary, metadata_json))
        self.conn.commit()
        
        # Enforce summary limit: retain only the last 120 summaries for this user
        count_query = "SELECT COUNT(*) as count FROM summaries WHERE user_id = ?"
        count_result = self.conn.execute(count_query, (user_id,)).fetchone()
        summary_count = count_result["count"]
        
        # Remove oldest summaries if limit exceeded
        if summary_count > 10000:
            num_to_remove = summary_count - 10000
            delete_query = """
            DELETE FROM summaries 
            WHERE id IN (
                SELECT id FROM summaries
                WHERE user_id = ?
                ORDER BY created_at ASC
                LIMIT ?
            )
            """
            self.conn.execute(delete_query, (user_id, num_to_remove))
            self.conn.commit()

    def get_summaries_for_user(self, user_id):
        """
        Retrieve all summaries for a specific user, ordered by most recent first.
        
        Args:
            user_id (str): Unique identifier for the user
            
        Returns:
            list[dict]: List of summary records as dictionaries
        """
        query = "SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC"
        cursor = self.conn.execute(query, (user_id,))
        return [dict(row) for row in cursor.fetchall()]

    def delete_summary(self, summary_id: int):
        """
        Remove a specific summary record by its ID.
        
        Args:
            summary_id (int): Unique identifier of the summary to delete
        """
        query = "DELETE FROM summaries WHERE id = ?"
        self.conn.execute(query, (summary_id,))
        self.conn.commit()
