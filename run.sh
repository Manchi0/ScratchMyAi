#!/bin/bash

# Configuration
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Stopping frontend and backend..."
    # Kill all child processes (background jobs)
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and exit (SIGTERM)
trap cleanup SIGINT SIGTERM

echo "Starting AxonX..."

# Start Backend
echo "Starting Backend..."
cd "$BACKEND_DIR" || exit
python -m uvicorn server:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd "$FRONTEND_DIR" || exit
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "--------------------------------------------------"
echo "Backend running at: http://localhost:8000"
echo "Frontend running at: http://localhost:5173"
echo "Press Ctrl+C to stop both."
echo "--------------------------------------------------"
echo ""

# Keep the script running to wait for jobs
wait
