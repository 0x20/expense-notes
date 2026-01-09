#!/bin/bash

# Start backend only

cd "$(dirname "$0")"

echo "Starting backend server..."
cd backend
./start.sh
