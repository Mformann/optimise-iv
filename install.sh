#!/bin/bash
# Installation script for Optimise IV CRM Prototype (Linux/macOS)

echo "======================================================="
echo "    Optimise IV CRM Prototype - Installation Script"
echo "======================================================="
echo ""

# Check for node
if ! command -v node &> /dev/null
then
    echo "[ERROR]: Node.js is not installed! Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

echo "Installing root dependencies and triggering frontend/backend installs..."
npm install

echo ""
echo "======================================================="
echo "Installation Complete!"
echo "You can now start the application by running:"
echo "  npm run dev"
echo "======================================================="
