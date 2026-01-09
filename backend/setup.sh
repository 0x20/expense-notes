#!/bin/bash

# Setup backend environment

cd "$(dirname "$0")"

echo "Setting up backend environment..."

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with uv..."
    uv venv
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
uv pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env

    # Generate SECRET_KEY
    SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

    # Update .env with generated key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    else
        # Linux
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    fi

    echo "Generated SECRET_KEY in .env"
else
    echo ".env file already exists."
fi

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure email settings in .env (optional)"
echo "2. Run: python setup.py  (to create admin user)"
echo "3. Run: ./start.sh  (to start the server)"
