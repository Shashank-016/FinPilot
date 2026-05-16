"""Add password_hash, google_id, avatar_url columns to users table."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    conn.commit()

print("Migration complete.")
