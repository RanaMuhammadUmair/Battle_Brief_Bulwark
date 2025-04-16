import os
import sqlite3
import json

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "summaries.db")

class Database:
    def __init__(self):
        self.conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_table()

    def create_table(self):
        query = """
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            filename TEXT,
            plain_text TEXT,
            summary TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        self.conn.execute(query)
        self.conn.commit()

    def save_summary(self, user_id, plain_text, summary, metadata):
        query = """
        INSERT INTO summaries (user_id, filename, plain_text, summary, metadata)
        VALUES (?, ?, ?, ?, ?)
        """
        metadata_json = json.dumps(metadata)
        self.conn.execute(query, (user_id, metadata.get("filename"), plain_text, summary, metadata_json))
        self.conn.commit()

    def get_summaries_for_user(self, user_id):
        query = "SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC"
        cursor = self.conn.execute(query, (user_id,))
        return [dict(row) for row in cursor.fetchall()]
