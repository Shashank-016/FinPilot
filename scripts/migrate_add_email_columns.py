"""Add source, email_uid, needs_review columns to transactions table."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR",
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS email_uid VARCHAR UNIQUE",
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    conn.commit()

print("Migration complete.")
