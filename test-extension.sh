#!/bin/bash
# Script to compile and launch the extension for testing

echo "Building and launching Flex extension for testing..."

# Compile the TypeScript code
npm run compile

# Launch VS Code with the extension
code --extensionDevelopmentPath="$PWD" "$PWD/examples/test_program.lx"
