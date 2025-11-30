#!/bin/bash

# Setup script for LookLabs - Creates .env file if it doesn't exist

if [ -f .env ]; then
    echo "✅ .env file already exists"
    exit 0
fi

echo "📝 Creating .env file..."
echo ""
echo "Please enter your OpenAI API key:"
read -p "OPENAI_API_KEY: " api_key

if [ -z "$api_key" ]; then
    echo "❌ API key cannot be empty. Exiting."
    exit 1
fi

cat > .env << EOF
# OpenAI API Configuration
OPENAI_API_KEY=$api_key

# Database Configuration
DATABASE_URL=sqlite:///./closet.db

# Storage Configuration
STORAGE_DIR=./storage
EOF

echo ""
echo "✅ .env file created successfully!"
echo "📁 Location: $(pwd)/.env"
echo ""
echo "⚠️  Note: Make sure to add your actual OpenAI API key if you used a placeholder."
