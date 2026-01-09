#!/bin/bash

# Start frontend only

cd "$(dirname "$0")"

echo "Starting frontend server..."
cd frontend
./start.sh
