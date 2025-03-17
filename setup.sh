#!/bin/bash
# Setup script for Flex VSCode Extension

echo "Setting up Flex VS Code Extension development environment..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Create out directory if it doesn't exist
mkdir -p out

echo "Setup complete! You can now start developing the Flex VS Code Extension."
echo "To test the extension, press F5 in VS Code."
