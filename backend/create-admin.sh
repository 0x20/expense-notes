#!/bin/bash

# Create or reset admin user

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Run setup.sh first."
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Run setup script
echo "Creating/updating admin user..."
python setup.py
