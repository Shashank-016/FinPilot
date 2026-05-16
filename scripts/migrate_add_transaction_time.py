"""Add transaction_time column to transactions table."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_time VARCHAR"))
    conn.commit()

print("OK: transaction_time column added.")
