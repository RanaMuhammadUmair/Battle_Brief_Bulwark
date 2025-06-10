import sqlite3
from sqlite3 import Connection
from passlib.context import CryptContext
from typing import Optional

DATABASE = "users.db"  # SQLite file stored locally

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_connection() -> Connection:
    # enable a longer timeout, WAL mode, and allow cross‐thread use
    conn = sqlite3.connect(
        DATABASE,
        timeout=10,              # wait up to 10s for locks to clear
        check_same_thread=False  # allow use across threads/processes
    )
    conn.row_factory = sqlite3.Row
    # use write-ahead logging for better concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
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

def get_user(username: str) -> Optional[sqlite3.Row]:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return row

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

def update_user(
    username: str,
    new_username: str,
    full_name: Optional[str],
    email: str
) -> dict:
    """
    Update a user's username, full_name and email.
    Returns the updated row as a dict or raises ValueError if not found.
    """
    conn = get_db_connection()
    try:
        # wrap UPDATE in a transaction
        with conn:
            cur = conn.execute(
                "UPDATE users SET username = ?, full_name = ?, email = ? WHERE username = ?",
                (new_username, full_name, email, username)
            )
            if cur.rowcount == 0:
                raise ValueError(f"User '{username}' not found")
        # now fetch the updated row
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (new_username,)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise ValueError("Failed to fetch updated user")
    return dict(row)

def update_user_password(username: str, new_hashed_password: str) -> None:
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET hashed_password = ? WHERE username = ?",
        (new_hashed_password, username)
    )
    conn.commit()
    conn.close()