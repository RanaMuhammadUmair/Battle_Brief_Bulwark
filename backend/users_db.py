"""
Module: users_db

This module provides the data access layer for user-related operations
against a local SQLite database. It handles connection setup, schema
initialization, and CRUD operations on the users table.
"""

import sqlite3
from sqlite3 import Connection
from passlib.context import CryptContext
from typing import Optional

# Path to the SQLite database file
DATABASE = "users.db"

# Password-hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db_connection() -> Connection:
    """
    Establish and return a SQLite3 connection configured for:
    - 10s busy timeout to wait on locked resources
    - Cross-thread/process usage (check_same_thread=False)
    - Write-Ahead Logging (WAL) for improved concurrency
    - Row factory set to sqlite3.Row to allow dict-like access
    """
    conn = sqlite3.connect(
        DATABASE,
        timeout=10,
        check_same_thread=False
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def initialize_db() -> None:
    """
    Create the 'users' table if it does not already exist.
    Columns:
      - id               : Auto-increment primary key
      - username         : Unique text identifier
      - full_name        : Optional user full name
      - email            : Optional user email address
      - hashed_password  : Required bcrypt-hashed password
      - disabled         : Flag (0/1) to disable account
    """
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
    """
    Fetch a single user record by username.
    Returns a sqlite3.Row or None if not found.
    """
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
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
    email: Optional[str]
) -> dict:
    """
    Update a user's username, full_name, and email.
    Wraps update in a transaction and ensures the user exists.
    Returns the updated record as a dict.
    Raises ValueError if the original user is not found or fetch fails.
    """
    conn = get_db_connection()
    try:
        with conn:
            cur = conn.execute(
                "UPDATE users SET username = ?, full_name = ?, email = ? WHERE username = ?",
                (new_username, full_name, email, username)
            )
            if cur.rowcount == 0:
                raise ValueError(f"User '{username}' not found")
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (new_username,)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise ValueError("Failed to fetch updated user")
    return dict(row)


def update_user_password(username: str, new_hashed_password: str) -> None:
    """
    Update only the bcrypt-hashed password for the given username.
    Commits immediately and closes the connection.
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET hashed_password = ? WHERE username = ?",
        (new_hashed_password, username)
    )
    conn.commit()
    conn.close()