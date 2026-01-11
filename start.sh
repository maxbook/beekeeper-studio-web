#!/bin/bash

# Beekeeper Studio Web - Simple Start Script

set -e

echo "🐝 Beekeeper Studio Web - Starting..."
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. You have: $(node -v)"
    exit 1
fi

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "✓ PostgreSQL is running"
    else
        echo "⚠️  PostgreSQL not running. Start it or use Docker:"
        echo "   docker run -d --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:14"
    fi
else
    echo "⚠️  PostgreSQL client not found (optional)"
    echo "   You can install it or use Docker:"
    echo "   docker run -d --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:14"
fi
echo ""

# Install server dependencies if needed
if [ ! -d "packages/server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd packages/server && yarn install && cd ../..
    echo "✓ Server dependencies installed"
else
    echo "✓ Server dependencies already installed"
fi

# Install client dependencies if needed
if [ ! -d "packages/client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd packages/client && yarn install && cd ../..
    echo "✓ Client dependencies installed"
else
    echo "✓ Client dependencies already installed"
fi

echo ""
echo "🚀 Starting servers..."
echo ""
echo "Opening TWO terminal tabs:"
echo "  1. Server (http://localhost:3000)"
echo "  2. Client (http://localhost:5173)"
echo ""
echo "Login with: admin / admin"
echo ""

# Function to start in new terminal
start_server() {
    osascript -e 'tell application "Terminal"
        do script "cd \"'"$(pwd)"'/packages/server\" && yarn dev"
    end tell' &>/dev/null || \
    gnome-terminal -- bash -c "cd $(pwd)/packages/server && yarn dev; exec bash" &>/dev/null || \
    echo "Please manually run: cd packages/server && yarn dev"
}

start_client() {
    osascript -e 'tell application "Terminal"
        do script "cd \"'"$(pwd)"'/packages/client\" && yarn dev"
    end tell' &>/dev/null || \
    gnome-terminal -- bash -c "cd $(pwd)/packages/client && yarn dev; exec bash" &>/dev/null || \
    echo "Please manually run: cd packages/client && yarn dev"
}

# Check if we can auto-start
if command -v osascript &> /dev/null || command -v gnome-terminal &> /dev/null; then
    start_server
    sleep 1
    start_client
    echo "✓ Servers starting in separate terminals..."
else
    echo "⚠️  Could not auto-start terminals. Please run manually:"
    echo ""
    echo "Terminal 1:"
    echo "  cd packages/server && yarn dev"
    echo ""
    echo "Terminal 2:"
    echo "  cd packages/client && yarn dev"
fi

echo ""
echo "📖 Documentation: FINAL_STATUS.md, PROJECT_COMPLETE.md"
echo "🐛 Issues? Check package.json or run manually"
