#!/bin/bash

# Start both backend and frontend in development mode

cd "$(dirname "$0")"

echo "========================================="
echo "  Starting Development Servers"
echo "========================================="
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
cd backend
./start.sh &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend in background
echo "Starting frontend server..."
cd frontend
./start.sh &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "  ✅ Servers running!"
echo "========================================="
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "========================================="
echo ""

# Wait for background processes
wait
