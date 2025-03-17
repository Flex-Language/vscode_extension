# Cross-Platform Considerations for Flex Extension

This document explains how the Flex VSCode extension handles cross-platform compatibility issues and provides troubleshooting tips for different operating systems.

## Path Handling

The extension handles paths differently based on the operating system:

### Windows
- Uses backslashes (`\`) as path separators
- Command execution uses CMD or PowerShell
- Paths with spaces are enclosed in double quotes
- Uses batch files (.bat) for Flex script execution

### macOS and Linux
- Uses forward slashes (`/`) as path separators
- Command execution uses Bash
- Paths with spaces and special characters are escaped
- Uses shell scripts (.sh) for Flex script execution
- Ensures proper permissions (executable bit) on scripts

## Environment Variables

The extension sets the following environment variables:

- `USE_AI`: Set based on user preferences in `flex.ai.enable`
- `FLEX_AI_MODEL`: Set based on user selection in `flex.ai.model`
- `OPENAI_API_KEY`: Only set if using OpenAI model

## Script Generation

The extension generates platform-specific scripts:

1. **run-flex.js**: The main Node.js script that handles OS detection and creates the appropriate platform-specific script
2. **run-flex.sh**: The Unix shell script (macOS and Linux)
3. **run-flex.bat**: The Windows batch script

These scripts are dynamically updated with the correct path to the Sindbad directory.

## Example Configurations

### Windows Example

```json
// .vscode/settings.json on Windows
{
    "flex.path": "run-flex.js",
    "flex.sindbadPath": "C:\\Program Files\\Sindbad\\src",
    "flex.ai.enable": true,
    "flex.ai.model": "qwen"
}
```

Generated batch script:
```batch
@echo off
REM Windows batch file to run Flex programs

REM Path to the Sindbad directory
SET SINDBAD_DIR=C:\Program Files\Sindbad\src

REM Change to the Sindbad/src directory
cd /d "%SINDBAD_DIR%"

REM Run the Flex interpreter with the absolute path
python main.py "C:\Users\username\projects\flex_project\example.flex"
```

### macOS Example

```json
// .vscode/settings.json on macOS
{
    "flex.path": "run-flex.js",
    "flex.sindbadPath": "/Users/username/Developer/Sindbad/src",
    "flex.ai.enable": true,
    "flex.ai.model": "openai",
    "flex.ai.apiKey": "sk-xxx..."
}
```

Generated shell script:
```bash
#!/bin/bash

# Path to the Sindbad directory
SINDBAD_DIR="/Users/username/Developer/Sindbad/src"

# Change to the Sindbad/src directory
cd "$SINDBAD_DIR"

# Run the Flex interpreter with the absolute path
python3 main.py "/Users/username/projects/flex_project/example.flex"
```

### Linux Example

```json
// .vscode/settings.json on Linux
{
    "flex.path": "run-flex.js",
    "flex.sindbadPath": "/opt/sindbad/src",
    "flex.ai.enable": true,
    "flex.ai.model": "lmstudio",
    "flex.ai.lmstudioUrl": "http://localhost:1234/v1"
}
```

Generated shell script:
```bash
#!/bin/bash

# Path to the Sindbad directory
SINDBAD_DIR="/opt/sindbad/src"

# Change to the Sindbad/src directory
cd "$SINDBAD_DIR"

# Run the Flex interpreter with the absolute path
python3 main.py "/home/username/projects/flex_project/example.flex"
```

## Common Issues and Solutions

### Windows Issues

1. **Path Resolution**:
   - Problem: VS Code variables like `${workspaceFolder}` not resolving
   - Solution: The extension now resolves these variables before passing to the terminal

2. **Script Execution**:
   - Problem: "Cannot run .js file" error
   - Solution: Ensure Node.js is installed and in your PATH

3. **Process Termination**:
   - Problem: Flex process continues after stop command
   - Solution: The extension now uses `taskkill /pid [PID] /T /F` for proper termination

### macOS and Linux Issues

1. **Script Permissions**:
   - Problem: "Permission denied" when running scripts
   - Solution: The extension ensures scripts are executable with `chmod +x`

2. **Terminal Integration**:
   - Problem: Terminal opens in wrong working directory
   - Solution: The extension now sets the correct working directory explicitly

3. **Path Escaping**:
   - Problem: Paths with spaces or special characters fail
   - Solution: The extension now properly escapes these characters

## How Path Resolution Works

1. The extension gets the path to the Flex script (`flex.path`)
2. It resolves any VS Code variables (like `${workspaceFolder}`) using the `resolveVariables` function
3. For file paths, it uses the `escapePath` function to handle special characters
4. When executing, it uses absolute paths where possible to avoid working directory issues

## Detecting Sindbad and Flex Paths

The extension now:
1. Checks common locations for Sindbad/Flex based on the OS
2. Prompts the user if a path is found but not set
3. Allows manual entry of paths with validation
4. Stores paths in user settings for future use

## Testing Your Configuration

To test if your configuration is working correctly:

1. Open a Flex file (.lx, .flex, or .fx)
2. Press F5 to run without AI or Shift+F5 to run with AI
3. Check the terminal output for any errors
4. Look at the status bar for execution status 