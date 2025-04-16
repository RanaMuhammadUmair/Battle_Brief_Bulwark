import sqlite3
from sqlite3 import Connection
from passlib.context import CryptContext

DATABASE = "users.db"  # SQLite file stored locally

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_connection() -> Connection:
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # so we can access columns by name
    return conn

def initialize_db():
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                full_name TEXT,
                email TEXT,
                hashed_password TEXT NOT NULL,
                disabled INTEGER NOT NULL DEFAULT 0
            );
        """)
    conn.close()

def get_user(username: str):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return user

def create_user(username: str, full_name: str, email: str, password: str):
    hashed_password = pwd_context.hash(password)
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                "INSERT INTO users (username, full_name, email, hashed_password) VALUES (?, ?, ?, ?)",
                (username, full_name, email, hashed_password)
            )
    except sqlite3.IntegrityError:
        conn.close()
        raise ValueError("Username already exists")
    conn.close()
    return get_user(username)