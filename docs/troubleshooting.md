# Troubleshooting Guide for VS Code Flex Extension

This guide covers common issues you might encounter when using the Flex extension and provides solutions to help you resolve them.

## Installation Issues

### Extension Not Installing

**Problem**: The extension fails to install or doesn't appear in VS Code.

**Solutions**:
1. Restart VS Code and try installing again
2. Check your internet connection
3. Try installing from the VS Code marketplace website
4. Verify VS Code is up to date (version 1.60.0 or higher required)

### Node.js Not Found

**Problem**: Error message indicating Node.js is not found or not installed.

**Solutions**:
1. Install Node.js from [nodejs.org](https://nodejs.org/) (v12.0.0 or higher recommended)
2. Verify Node.js is in your PATH by running `node --version` in the terminal
3. Restart VS Code after installing Node.js

## Configuration Issues

### Sindbad Path Not Set

**Problem**: "Sindbad path not set" error when trying to run Flex files.

**Solutions**:
1. Set the `flex.sindbadPath` setting in VS Code settings to point to your Sindbad/src directory
2. Allow the extension to auto-detect by answering "Yes" when prompted
3. Verify the path contains the required files (main.py should be present)

### AI Features Not Working

**Problem**: AI features don't work or error messages appear when AI is enabled.

**Solutions**:
1. Verify `flex.ai.enable` is set to `true` in settings
2. Check that the selected AI model is properly configured:
   - For Qwen: No additional setup needed
   - For OpenAI: Ensure `flex.ai.apiKey` is set with a valid API key
   - For LMStudio: Ensure LMStudio is running with the API server enabled on port 1234
3. Check the terminal for error messages that might indicate API issues

## Execution Issues

### Cannot Run Flex File

**Problem**: Error when trying to run Flex files, such as "Cannot run program" or "Command not found".

**Solutions**:
1. Check if Node.js is installed and in your PATH
2. Verify file permissions on Unix systems (`chmod +x run-flex.sh`)
3. Make sure the Sindbad path is correctly set and contains main.py
4. Check that the file has a supported extension (.lx, .flex, or .fx)
5. Try restarting VS Code

### Process Won't Stop

**Problem**: The Flex process continues running after clicking the stop button.

**Solutions**:
1. Try clicking the stop button again
2. Close and reopen the terminal
3. For Windows: Open Task Manager and end python.exe processes
4. For Mac/Linux: Open Terminal and run `pkill -f "python3 main.py"`
5. Restart VS Code if the problem persists

### Error Finding Script

**Problem**: "Cannot find run-flex.js" or similar errors.

**Solutions**:
1. Verify that `flex.path` is set correctly in settings
2. If using relative paths, ensure they're relative to the workspace folder
3. Try using an absolute path to the script
4. Reinstall the extension if the scripts are missing

## Path Issues

### Spaces in Path Names

**Problem**: Errors when paths contain spaces or special characters.

**Solutions**:
1. The extension should handle spaces automatically, but try wrapping paths in quotes manually if needed
2. Avoid using special characters (~, !, @, etc.) in paths if possible
3. Try moving files to a directory without spaces or special characters

### VS Code Variables Not Resolving

**Problem**: Variables like `${workspaceFolder}` don't get replaced in commands.

**Solutions**:
1. The extension now resolves these variables automatically
2. Avoid using VS Code variables in settings if possible
3. Use absolute paths instead of relative paths

### Working Directory Issues

**Problem**: The terminal opens in the wrong working directory or cannot find files.

**Solutions**:
1. The extension now sets the correct working directory
2. Try using absolute paths for the input file
3. Manually `cd` to the correct directory in the terminal
4. Restart VS Code and try again

## Performance Issues

### Slow Execution

**Problem**: Flex files run slowly or take a long time to start.

**Solutions**:
1. Check system resource usage (CPU, RAM)
2. Disable AI features if not needed (set `flex.ai.enable` to `false`)
3. Close other applications to free up system resources
4. Verify the Sindbad interpreter is functioning correctly

### Extension Becomes Unresponsive

**Problem**: VS Code or the extension freezes when running Flex files.

**Solutions**:
1. Stop any running Flex processes
2. Restart VS Code
3. Update the extension to the latest version
4. Check for high CPU usage from Python or Node.js processes

## Advanced Troubleshooting

### Debug Logs

To enable detailed debug logs:

1. Open VS Code settings
2. Set `flex.debug.enable` to `true`
3. Set `flex.debug.verboseLogging` to `true`
4. Open the Output panel (View > Output)
5. Select "Flex Language" from the dropdown menu
6. The logs will show details of what's happening during execution

### Manual Script Execution

To manually test if scripts are working:

1. Open a terminal
2. Navigate to your project directory
3. Run the command: `node run-flex.js path/to/your/file.flex`
4. Check the output for any error messages

### Repairing the Installation

If the extension seems corrupted:

1. Uninstall the extension from VS Code
2. Close VS Code
3. Delete the extension directory:
   - Windows: `%USERPROFILE%\.vscode\extensions\mikawi.flex-language-*`
   - macOS/Linux: `~/.vscode/extensions/mikawi.flex-language-*`
4. Restart VS Code and reinstall the extension

## Contact Support

If you've tried the solutions in this guide and are still experiencing issues:

1. Check the [GitHub issues page](https://github.com/flex-lang/vscode-flex/issues) for similar problems
2. Submit a new issue with details about your problem, including:
   - Your operating system version
   - VS Code version
   - Extension version
   - Error messages
   - Steps to reproduce the issue 