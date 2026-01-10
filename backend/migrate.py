#!/usr/bin/env python3
"""Database migration script. Run after deploying schema changes."""

import sqlite3
import os

DB_PATH = os.environ.get('DATABASE_URL', 'sqlite:///./data/expense_notes.db')
# Extract path from sqlite:/// URL
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def add_column_if_not_exists(cursor, table, column, col_type):
    """Add column if it doesn't exist."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]

    if column not in columns:
        print(f"Adding column: {table}.{column}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    else:
        print(f"Column exists: {table}.{column} (skipping)")

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return 1

    print(f"Running migrations on: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # === MIGRATIONS ===

    # 2024-01: Add mattermost_username for DM notifications
    add_column_if_not_exists(cursor, "expense_notes", "mattermost_username", "VARCHAR(255)")

    # 2024-01: Add payment method fields
    add_column_if_not_exists(cursor, "expense_notes", "payment_method", "VARCHAR(50) DEFAULT 'iban'")
    add_column_if_not_exists(cursor, "expense_notes", "iban", "VARCHAR(50)")

    conn.commit()
    conn.close()

    print("Migrations complete.")
    return 0

if __name__ == '__main__':
    exit(main())
