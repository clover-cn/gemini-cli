#!/bin/bash

# Gemini Plus CLI Installation Script

set -e

echo "🚀 Installing Gemini Plus CLI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (>=18.0.0) first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please install Node.js >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run bundle

# Install globally
echo "🌍 Installing globally..."
npm install -g .

echo "✅ Gemini Plus CLI installed successfully!"
echo ""
echo "You can now use the 'gemini-plus' command anywhere:"
echo "  gemini-plus --help"
echo "  gemini-plus --version"
echo "  gemini-plus"
echo ""
echo "🎉 Happy coding!"
