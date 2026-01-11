#!/bin/bash

# Beekeeper Studio Web - Quick Start Script
# This script helps you quickly start both server and client for testing

set -e

echo "🐝 Beekeeper Studio Web - Quick Start"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Install it or use Docker:${NC}"
    echo "   docker run -d --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:14"
else
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL not running on localhost:5432${NC}"
        echo "   Start PostgreSQL or use Docker (see above)"
    fi
fi
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"

if [ ! -d "packages/server/node_modules" ]; then
    echo "  Installing server dependencies..."
    cd packages/server && yarn install --silent && cd ../..
    echo -e "${GREEN}  ✓ Server dependencies installed${NC}"
else
    echo -e "${GREEN}  ✓ Server dependencies already installed${NC}"
fi

if [ ! -d "packages/client/node_modules" ]; then
    echo "  Installing client dependencies..."
    cd packages/client && yarn install --silent && cd ../..
    echo -e "${GREEN}  ✓ Client dependencies installed${NC}"
else
    echo -e "${GREEN}  ✓ Client dependencies already installed${NC}"
fi
echo ""

# Check for .env files
echo -e "${BLUE}Checking configuration...${NC}"

if [ ! -f "packages/server/.env" ]; then
    echo "  Creating server .env from example..."
    cp packages/server/.env.example packages/server/.env
    echo -e "${GREEN}  ✓ Server .env created${NC}"
fi

if [ ! -f "packages/client/.env" ]; then
    echo "  Creating client .env from example..."
    cp packages/client/.env.example packages/client/.env
    echo -e "${GREEN}  ✓ Client .env created${NC}"
fi
echo ""

# Start servers
echo -e "${BLUE}Starting servers...${NC}"
echo ""
echo -e "${YELLOW}This will open TWO terminal tabs:${NC}"
echo "  1. Server (http://localhost:3000)"
echo "  2. Client (http://localhost:5173)"
echo ""

# Check if we're in a terminal that supports tabs
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
    # iTerm
    echo "Starting in iTerm..."
    osascript <<EOF
tell application "iTerm"
    activate

    -- Create new window
    set newWindow to (create window with default profile)

    -- First tab for server
    tell current session of newWindow
        write text "cd $(pwd)/packages/server && yarn dev"
    end tell

    -- Second tab for client
    tell newWindow
        create tab with default profile
    end tell

    tell current session of current tab of newWindow
        write text "cd $(pwd)/packages/client && yarn dev"
    end tell
end tell
EOF
elif [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
    # macOS Terminal
    echo "Starting in Terminal..."
    osascript <<EOF
tell application "Terminal"
    activate

    -- Server tab
    do script "cd $(pwd)/packages/server && yarn dev"

    -- Client tab
    do script "cd $(pwd)/packages/client && yarn dev"
end tell
EOF
else
    # Fallback: use tmux or screen if available
    if command -v tmux &> /dev/null; then
        echo "Starting in tmux..."
        tmux new-session -d -s beekeeper "cd packages/server && yarn dev"
        tmux split-window -h -t beekeeper "cd packages/client && yarn dev"
        tmux attach -t beekeeper
    elif command -v screen &> /dev/null; then
        echo "Starting in screen..."
        screen -dmS beekeeper bash -c "cd packages/server && yarn dev"
        screen -S beekeeper -X screen bash -c "cd packages/client && yarn dev"
        screen -r beekeeper
    else
        # Manual instructions
        echo -e "${YELLOW}⚠️  Auto-start not available on this terminal${NC}"
        echo ""
        echo "Please open TWO terminal windows manually and run:"
        echo ""
        echo -e "${BLUE}Terminal 1 (Server):${NC}"
        echo "  cd packages/server"
        echo "  yarn dev"
        echo ""
        echo -e "${BLUE}Terminal 2 (Client):${NC}"
        echo "  cd packages/client"
        echo "  yarn dev"
        echo ""
        echo -e "Then open: ${GREEN}http://localhost:5173${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Beekeeper Studio Web is starting!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Server: ${BLUE}http://localhost:3000${NC}"
echo -e "Client: ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "Login with: ${YELLOW}admin / admin${NC}"
echo ""
echo "Press Ctrl+C in each terminal to stop"
