#!/bin/bash
# Database migration script
# Run this after deploying schema changes

DB_PATH="${1:-data/expense_notes.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "Database not found: $DB_PATH"
    echo "Usage: ./migrate.sh [path/to/expense_notes.db]"
    exit 1
fi

echo "Running migrations on: $DB_PATH"

# Helper function to add column if it doesn't exist
add_column_if_not_exists() {
    table=$1
    column=$2
    type=$3

    # Check if column exists
    exists=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM pragma_table_info('$table') WHERE name='$column';")

    if [ "$exists" -eq 0 ]; then
        echo "Adding column: $table.$column"
        sqlite3 "$DB_PATH" "ALTER TABLE $table ADD COLUMN $column $type;"
    else
        echo "Column exists: $table.$column (skipping)"
    fi
}

# === MIGRATIONS ===

# 2024-01: Add mattermost_username for DM notifications
add_column_if_not_exists "expense_notes" "mattermost_username" "VARCHAR(255)"

# Add future migrations here:
# add_column_if_not_exists "expense_notes" "new_column" "TEXT"

echo "Migrations complete."
