import os
import sqlite3

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")
DB_PATH = os.environ.get("DATASAGE_DB_PATH", DEFAULT_DB_PATH)


def get_connection():
    return sqlite3.connect(DB_PATH)


def get_database_path():
    return DB_PATH


def set_database_path(path):
    global DB_PATH

    resolved_path = os.path.abspath(os.path.expanduser(path))
    if not os.path.exists(resolved_path):
        raise ValueError(f"Database file does not exist: {resolved_path}")
    if not os.path.isfile(resolved_path):
        raise ValueError(f"Database path is not a file: {resolved_path}")

    conn = sqlite3.connect(resolved_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1")
        if cursor.fetchone() is None:
            raise ValueError("The selected SQLite database does not contain any user tables.")
    finally:
        conn.close()

    DB_PATH = resolved_path
    return DB_PATH


def init_db(seed=42):
    from init_db import init_db as seed_database

    seed_database(DB_PATH, seed=seed)


def ensure_db():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        exists = cursor.fetchone() is not None
    finally:
        conn.close()

    if not exists:
        init_db()


def get_schema_map():
    ensure_db()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type IN ('table', 'view')
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        )
        names = [row[0] for row in cursor.fetchall()]
        schema = {}
        for name in names:
            cursor.execute(f'PRAGMA table_info("{name}")')
            schema[name] = [
                {
                    "name": row[1],
                    "type": row[2] or "TEXT",
                    "primary_key": bool(row[5]),
                }
                for row in cursor.fetchall()
            ]
        return schema
    finally:
        conn.close()


def get_schema_description():
    lines = []
    for table_name, columns in get_schema_map().items():
        column_text = ", ".join(f"{column['name']} {column['type']}".strip() for column in columns)
        lines.append(f"- {table_name}({column_text})")
    return "\n".join(lines)


def get_allowed_tables():
    return set(get_schema_map().keys())


def run_query(sql):
    ensure_db()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        data = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        return columns, data
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()
