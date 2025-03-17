# Change Log

All notable changes to the "vscode-flex" extension will be documented in this file.

## [0.2.6] - 2023-08-15

### Added
- Added icon for "Run File with AI" button in the editor toolbar
- Improved AI integration with proper environment variable handling

### Fixed
- Fixed "Run File with AI" button appearance and functionality
- Fixed issue with % character appearing at the end of generated shell scripts
- Ensured AI mode properly passes environment variables to the Flex interpreter

## [0.2.5] - 2023-08-10

### Added
- Cross-platform support improvements for Windows, macOS, and Linux
- New status bar indicators showing the current Flex run status
- Variable resolution for VS Code variables like `${workspaceFolder}` 
- Support for multiple AI models (Qwen, OpenAI, LMStudio)
- Automatic detection of Sindbad/Flex paths with user prompts
- Enhanced error handling and reporting in the terminal

### Improved
- Path handling for cross-platform compatibility
- AI environment configuration respects user preferences (USE_AI variable)
- Unified run handler for better code organization
- Better terminal integration with proper process management
- Enhanced script generation for platform-specific nuances

### Fixed
- Fixed incorrect path resolution when running Flex files
- Fixed status bar not updating properly after execution
- Fixed process termination issues on Windows
- Fixed incomplete comment block in extension.ts
- Fixed environment variable handling to respect user settings

## [0.2.0] - 2023-07-15

### Added
- Go to Definition functionality for variables, functions, and parameters
- Find References functionality to locate all usages of a symbol
- Run and Stop commands with editor toolbar integration
- AI-powered features:
  - Explain Code: Get explanations for selected Flex code
  - Generate Code: Generate Flex code from natural language descriptions
  - Translate to Flex: Convert code from other languages to Flex
- New icons for AI and run/stop functionality

### Improved
- Enhanced syntax highlighting for better code readability
- Improved error diagnostics with more detailed messages
- Better code completion with context-aware suggestions

### Fixed
- Various bug fixes and performance improvements

## [0.1.0] - 2023-06-01

### Added
- Initial release of the Flex language extension
- Syntax highlighting for Flex language
- Basic code completion for keywords and built-in functions
- Error diagnostics for common syntax errors
- Hover information for symbols
- Document symbols for outline view
