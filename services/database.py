import sqlite3
from contextlib import closing

DB_NAME = "database/chat.db"


def get_connection():
    """
    Create and return a SQLite connection.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Initialize database if it does not exist.
    """

    with closing(get_connection()) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                user_message TEXT NOT NULL,

                bot_message TEXT NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            )
        """)

        conn.commit()


def save_chat(user_message, bot_message):
    """
    Save one conversation into database.
    """

    with closing(get_connection()) as conn:

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO conversations
            (
                user_message,
                bot_message
            )
            VALUES (?, ?)
        """, (user_message, bot_message))

        conn.commit()


def get_history(limit=50):
    """
    Return latest conversations.

    Returns:
        List[Dict]
    """

    with closing(get_connection()) as conn:

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                user_message,
                bot_message,
                created_at
            FROM conversations
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()

    history = []

    for row in rows:

        history.append({

            "id": row["id"],

            "user_message": row["user_message"],

            "bot_message": row["bot_message"],

            "created_at": row["created_at"]

        })

    return history


def clear_history():
    """
    Delete all conversations.
    """

    with closing(get_connection()) as conn:

        cursor = conn.cursor()

        cursor.execute("DELETE FROM conversations")

        conn.commit()


def get_conversation(conversation_id):
    """
    Get one conversation by id.
    """

    with closing(get_connection()) as conn:

        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                user_message,
                bot_message,
                created_at
            FROM conversations
            WHERE id = ?
        """, (conversation_id,))

        row = cursor.fetchone()

    if row is None:
        return None

    return {

        "id": row["id"],

        "user_message": row["user_message"],

        "bot_message": row["bot_message"],

        "created_at": row["created_at"]

    }