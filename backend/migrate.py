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

    # 2024-01: Make member_name nullable (SQLite doesn't support ALTER COLUMN, need to recreate)
    # For SQLite, we need to check if already nullable and recreate table if not
    cursor.execute("PRAGMA table_info(expense_notes)")
    columns_info = cursor.fetchall()
    for col in columns_info:
        if col[1] == 'member_name' and col[3] == 1:  # notnull = 1 means NOT NULL
            print("Making member_name nullable (recreating table)...")
            # Create temp table, copy data, drop old, rename
            cursor.execute("""
                CREATE TABLE expense_notes_new (
                    id VARCHAR(36) PRIMARY KEY,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    member_name VARCHAR(255),
                    date_entered DATETIME NOT NULL,
                    description TEXT NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    member_email VARCHAR(255) NOT NULL,
                    photo_paths TEXT,
                    signature_path VARCHAR(500),
                    mattermost_username VARCHAR(255),
                    payment_method VARCHAR(50) DEFAULT 'iban',
                    iban VARCHAR(50),
                    paid BOOLEAN DEFAULT 0,
                    expense_type VARCHAR(50),
                    pay_date DATETIME,
                    paid_from VARCHAR(100),
                    paid_to VARCHAR(255),
                    financial_responsible VARCHAR(255),
                    signature_financial_path VARCHAR(500),
                    attachment_paths TEXT,
                    created_at DATETIME,
                    updated_at DATETIME,
                    admin_notes TEXT,
                    deleted BOOLEAN DEFAULT 0
                )
            """)
            cursor.execute("""
                INSERT INTO expense_notes_new SELECT * FROM expense_notes
            """)
            cursor.execute("DROP TABLE expense_notes")
            cursor.execute("ALTER TABLE expense_notes_new RENAME TO expense_notes")
            print("Table recreated with nullable member_name")
            break

    conn.commit()
    conn.close()

    print("Migrations complete.")
    return 0

if __name__ == '__main__':
    exit(main())
