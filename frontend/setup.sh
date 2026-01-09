#!/bin/bash

# Setup frontend environment

cd "$(dirname "$0")"

echo "Setting up frontend environment..."

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ".env file created. Update VITE_API_URL if needed."
else
    echo ".env file already exists."
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env if API URL differs from http://localhost:8000"
echo "2. Run: ./start.sh  (to start the dev server)"
