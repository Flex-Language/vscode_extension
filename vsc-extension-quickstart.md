# Welcome to Flex Language Extension Development

## What's in the folder

* `package.json` - The extension manifest containing metadata and configuration.
* `tsconfig.json` - TypeScript configuration.
* `src/extension.ts` - The main extension activation point.
* `src/server/server.ts` - The language server implementation.
* `syntaxes/flex.tmLanguage.json` - TextMate grammar for syntax highlighting.
* `language-configuration.json` - Language configuration for brackets, comments, etc.
* `snippets/flex.json` - Code snippets for the Flex language.

## Get up and running

* Press `F5` to open a new window with your extension loaded.
* Create a new file with a `.flex`, `.fx`, or `.lx` file extension.
* Verify that syntax highlighting works and snippets appear.
* Try out features like code formatting, linting, and running Flex files.

## Make changes

* You can relaunch the extension from the debug toolbar after making changes to the files.
* You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Add more features

* Additional syntax highlighting enhancements can be added to `syntaxes/flex.tmLanguage.json`.
* Language server features like code completion, hover info, and more can be extended in `src/server/server.ts`.
* New snippets can be added to `snippets/flex.json`.

## Install your extension

* To begin using your extension with Visual Studio Code, copy it into the `<user home>/.vscode/extensions` folder and restart VS Code.
* To share your extension with others, publish it to the VS Code marketplace.

## Publish to VS Code Marketplace

1. Get a Personal Access Token
2. Install the VSCE publishing tool: `npm install -g vsce`
3. Package your extension: `vsce package`
4. Publish: `vsce publish`

## Further reading

* [VS Code Extension API](https://code.visualstudio.com/api)
* [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
