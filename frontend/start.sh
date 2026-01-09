#!/bin/bash

# Start frontend development server

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not installed. Run setup.sh first."
    exit 1
fi

# Start server
echo "Starting frontend server on http://localhost:5173"
npm run dev
