#!/bin/bash
# Project A Prototype - Launcher
# Double-click to start, close terminal window to stop

PROJECT_DIR="/Users/aktheboss/Desktop/AK-code/Ai Avatar project"
BACKEND_DIR="$PROJECT_DIR/Open-LLM-VTuber"
FRONTEND_DIR="$PROJECT_DIR/Open-LLM-VTuber-Web"

echo "🚀 Starting Project A Prototype..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Project A Prototype..."
    pkill -f "run_server.py" 2>/dev/null
    pkill -f "electron-vite" 2>/dev/null
    pkill -f "electron" 2>/dev/null
    echo "✅ All processes stopped. Goodbye!"
    exit 0
}

# Trap signals to run cleanup
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes
pkill -f "run_server.py" 2>/dev/null
pkill -f "electron-vite" 2>/dev/null
sleep 1

# Start backend
echo "📦 Starting backend server..."
cd "$BACKEND_DIR"
uv run run_server.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:12393 > /dev/null 2>&1; then
        echo "✅ Backend ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "🖥️  Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════════════════"
echo "  🎭 Project A Prototype is running!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Press Ctrl+C or close this window to stop."
echo ""

# Wait for processes
wait




