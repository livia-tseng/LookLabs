#!/bin/bash

# LookLabs - Quick Start Script

echo "🚀 Starting LookLabs AI Outfit Generator..."

# Check if virtual environment exists, create if not
if [ ! -d .venv ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    echo "📥 Installing dependencies..."
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "✅ Virtual environment found"
fi

# Activate virtual environment
source .venv/bin/activate

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found"
    echo "📝 The app will run in DEMO MODE with mock data"
    echo "   (No API key needed for testing, but uploads will use fake data)"
    echo ""
    echo "💡 To use real AI analysis:"
    echo "   1. Get an OpenAI API key: https://platform.openai.com/api-keys"
    echo "   2. Run: ./setup_env.sh"
    echo "   Or see: GET_API_KEY.md for detailed instructions"
    echo ""
    read -p "Continue in demo mode? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo "🎭 Starting in DEMO MODE..."
    echo ""
else
    # Check if API key is set in .env
    if ! grep -q "OPENAI_API_KEY=" .env || grep -q "OPENAI_API_KEY=$" .env || grep -q "OPENAI_API_KEY=your" .env; then
        echo "⚠️  No valid OPENAI_API_KEY found in .env"
        echo "🎭 Running in DEMO MODE (mock data)"
        echo ""
    fi
fi

# Create storage directory if it doesn't exist
mkdir -p storage

# Start the server
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📖 Open http://localhost:8000 in your browser"
echo "💡 Press Ctrl+C to stop the server"
echo ""
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
