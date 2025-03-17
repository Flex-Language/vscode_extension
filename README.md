# Flex Language Extension for VS Code

This extension provides support for the Flex programming language in Visual Studio Code, including syntax highlighting, code completion, and execution of Flex programs.

## Features

- Syntax highlighting for Flex files (.lx, .flex, .fx)
- Run Flex programs directly from VS Code
- Optional AI-assisted coding and error handling
- Support for multiple AI models (Qwen, OpenAI, LMStudio)
- Cross-platform support (Windows, macOS, Linux)

## Installation

### Prerequisites

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the [Flex Interpreter](https://flex-lang.org/download) for your operating system
3. Install [Node.js](https://nodejs.org/) (required for running Flex scripts)

### Installing the Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "Flex Language"
4. Click "Install"

### Post-Installation Setup

After installing the extension, you'll need to configure it:

1. Open VS Code settings (File > Preferences > Settings)
2. Search for "flex" to find all Flex-related settings
3. Set `flex.flexPath` to the directory containing your Flex interpreter's `main.py` file
4. Optional: Configure AI settings if you want to use AI-assisted features

## Common Installation Issues and Solutions

### Windows Users

Windows users may experience issues with script permissions or path resolution. If you encounter any issues:

1. Run the Windows Fix Script:
   - Download [windows-fix.js](https://github.com/flex-lang/vscode-flex/raw/main/windows-fix.js)
   - Open a command prompt and navigate to the download directory
   - Run `node windows-fix.js`

2. Manual Fix (if the script doesn't work):
   - Ensure PowerShell execution policy allows script execution:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
   - Verify Node.js is in your PATH environment variable
   - Check that the Flex path in VS Code settings is correctly set

### macOS and Linux Users

If you experience permission issues on macOS or Linux:

1. Make the script executable:
   ```bash
   chmod +x ~/.vscode/extensions/flex-language-*/run-flex.sh
   ```

2. If the extension can't find the Flex interpreter, set the path manually in VS Code settings:
   - Go to Settings
   - Find `flex.flexPath`
   - Set it to the full path of your Flex interpreter directory

## Usage

### Running Flex Programs

1. Open a Flex file (with extension .lx, .flex, or .fx)
2. Use one of the following methods to run:
   - Press F5 to run without AI
   - Press Shift+F5 to run with AI assistance
   - Use the Command Palette (Ctrl+Shift+P or Cmd+Shift+P) and select "Flex: Run File" or "Flex: Run File with AI"

### Stopping Execution

- Press Shift+F6 or use the Command Palette and select "Flex: Stop Running"

### AI Configuration

To use AI features with the extension:

1. Enable AI in settings: Set `flex.ai.enable` to `true`
2. Choose an AI model:
   - **Qwen**: Default model, no additional setup required
   - **OpenAI**: Requires an API key set in `flex.ai.apiKey`
   - **LMStudio**: Requires LMStudio to be running locally, with the API URL set in `flex.ai.lmstudioUrl`

## Configuration Options

| Setting | Description | Default Value |
|---------|-------------|---------------|
| `flex.path` | Path to the Flex runner script | `run-flex.js` |
| `flex.flexPath` | Path to the Flex interpreter directory | `""` |
| `flex.ai.enable` | Enable AI features | `false` |
| `flex.ai.model` | AI model to use (qwen, openai, lmstudio) | `qwen` |
| `flex.ai.apiKey` | API key for OpenAI | `""` |
| `flex.ai.lmstudioUrl` | URL for LMStudio API | `http://localhost:1234/v1` |

## Known Issues

- The extension requires the Flex interpreter to be installed separately
- AI features require specific model availability based on configuration
- Terminal-based execution may behave differently across operating systems
- Some special character escape sequences may not work correctly in all shells

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License. See the LICENSE file for details.