import sqlite3

DB_NAME = "database/chat.db"

def init_db():

    conn = sqlite3.connect(DB_NAME)

    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT NOT NULL,
            bot_message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

def save_chat(user_message, bot_message):

    conn = sqlite3.connect(DB_NAME)

    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO conversations(user_message, bot_message)
        VALUES(?,?)
    """, (user_message, bot_message))

    conn.commit()
    conn.close()

def get_history():

    conn = sqlite3.connect(DB_NAME)

    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_message, bot_message, created_at
        FROM conversations
        ORDER BY id DESC
    """)

    data = cursor.fetchall()

    conn.close()

    return data