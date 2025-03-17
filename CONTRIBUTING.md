# Contributing to Flex Language Extension

Thank you for your interest in contributing to the Flex Language Extension for Visual Studio Code! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/YourUsername/vscode-flex.git
   cd vscode-flex
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Development Environment**
   ```bash
   ./setup.sh
   ```

## Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b my-feature
   ```

2. **Make Changes**
   - Edit the source code in the `src` directory
   - Update or add tests as needed
   - Document any new features or changes

3. **Build and Test**
   ```bash
   npm run compile
   npm test
   ```

4. **Run the Extension**
   - Press `F5` in VS Code to launch a development instance with your extension loaded
   - Test your changes in the development environment

5. **Submit a Pull Request**
   - Push your changes to your fork
   - Create a pull request to the main repository
   - Provide a clear description of the changes and any related issues

## Coding Guidelines

- Follow the TypeScript coding conventions
- Use ESLint to maintain code quality (`npm run lint`)
- Write meaningful comments and documentation
- Include tests for new features

## Adding Features

### Adding Syntax Highlighting

To enhance syntax highlighting:
1. Modify the TextMate grammar in `syntaxes/flex.tmLanguage.json`
2. Add new token types or update existing ones
3. Test with various code examples to ensure correct highlighting

### Enhancing the Language Server

To improve language services:
1. Update the server implementation in `src/server/server.ts`
2. Add or enhance features like code completion, linting, or hover information
3. Test the new capabilities thoroughly

### Adding Snippets

To create new code snippets:
1. Add entries to `snippets/flex.json`
2. Follow the VS Code snippet format
3. Test the snippets in Flex files

## Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce the issue
- Expected vs. actual behavior
- VS Code version and extension version
- Any relevant logs or error messages

## Feature Requests

Feature requests are welcome! When requesting a feature:
- Describe the feature in detail
- Explain the use case and benefits
- Provide examples if possible

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to create a welcoming and inclusive environment for all contributors.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.
