"""Add 'transfer' to type check constraints on transactions and categories tables."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check",
    "ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'))",
    "ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check",
    "ALTER TABLE categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense', 'transfer'))",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    conn.commit()

print("Migration complete.")
