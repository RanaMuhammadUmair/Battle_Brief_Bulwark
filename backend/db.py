import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

class Database:
    """Simple database for storing summaries"""
    
    def __init__(self, db_path: str = None):
        """Initialize database connection"""
        if db_path is None:
            # Use a file in the same directory as this script by default
            current_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.join(current_dir, "summaries.db")
            
        self.db_path = db_path
        self._initialize_db()
    
    def _initialize_db(self):
        """Create tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create summaries table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            original_text TEXT,
            summary TEXT,
            created_at TEXT,
            metadata TEXT
        )
        ''')
        
        # Add some demo data if table is empty
        cursor.execute("SELECT COUNT(*) FROM summaries")
        if cursor.fetchone()[0] == 0:
            self._add_demo_data(cursor)
            
        conn.commit()
        conn.close()
    
    def _add_demo_data(self, cursor):
        """Add demo data for testing"""
        demo_summaries = [
            {
                "user_id": "1",
                "original_text": "This is a sample military report about troop movements in Region A.",
                "summary": "Report indicates standard troop movements in Region A with no unusual activity.",
                "created_at": (datetime.utcnow().replace(hour=10, minute=30)).isoformat(),
                "metadata": json.dumps({
                    "filename": "region_a_report.txt",
                    "model": "gpt4",
                    "filesize": 1245,
                    "timestamp": datetime.utcnow().isoformat()
                })
            },
            {
                "user_id": "1",
                "original_text": "Intelligence briefing on supply chain logistics for Operation Secure Path.",
                "summary": "Supply chain for Operation Secure Path remains intact with adequate resources.",
                "created_at": (datetime.utcnow().replace(hour=8, minute=15)).isoformat(),
                "metadata": json.dumps({
                    "filename": "logistics_briefing.pdf",
                    "model": "bart",
                    "filesize": 2890,
                    "timestamp": datetime.utcnow().isoformat()
                })
            }
        ]
        
        for summary in demo_summaries:
            cursor.execute(
                "INSERT INTO summaries (user_id, original_text, summary, created_at, metadata) VALUES (?, ?, ?, ?, ?)",
                (summary["user_id"], summary["original_text"], summary["summary"], summary["created_at"], summary["metadata"])
            )
    
    def save_summary(self, 
                    user_id: str, 
                    original_text: str, 
                    summary: str, 
                    metadata: Optional[Dict[str, Any]] = None) -> int:
        """
        Save a summary to the database
        
        Args:
            user_id: ID of the user who created the summary
            original_text: The original text that was summarized
            summary: The generated summary
            metadata: Additional metadata about the summary
            
        Returns:
            int: ID of the inserted summary
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        created_at = datetime.utcnow().isoformat()
        metadata_json = json.dumps(metadata or {})
        
        cursor.execute(
            "INSERT INTO summaries (user_id, original_text, summary, created_at, metadata) VALUES (?, ?, ?, ?, ?)",
            (user_id, original_text, summary, created_at, metadata_json)
        )
        
        summary_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return summary_id
    
    def get_summary(self, summary_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve a summary by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM summaries WHERE id = ?", (summary_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            summary = dict(row)
            summary['metadata'] = json.loads(summary['metadata'])
            return summary
        return None
    
    def get_user_summaries(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all summaries for a user"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        conn.close()
        
        summaries = []
        for row in rows:
            summary = dict(row)
            summary['metadata'] = json.loads(summary['metadata'])
            summaries.append(summary)
            
        return summaries
