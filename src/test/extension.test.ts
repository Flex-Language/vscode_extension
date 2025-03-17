import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Flex Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting Flex extension tests');

    test('Extension is activated', async () => {
        // Get the extension
        const extension = vscode.extensions.getExtension('flex-team.flex');
        assert.ok(extension, 'Extension should be available');

        // Ensure the extension is activated
        if (!extension.isActive) {
            await extension.activate();
        }

        assert.ok(extension.isActive, 'Extension should be activated');
    });

    test('Commands are registered', async () => {
        // Get all commands
        const commands = await vscode.commands.getCommands(true);
        
        // Check for flex commands
        assert.ok(commands.includes('flex.format'), 'Format command should be registered');
        assert.ok(commands.includes('flex.run'), 'Run command should be registered');
        assert.ok(commands.includes('flex.lint'), 'Lint command should be registered');
    });

    test('Syntax highlighting is registered', async () => {
        // This is a simple check to see if the grammar is loaded
        const languages = await vscode.languages.getLanguages();
        assert.ok(languages.includes('flex'), 'Flex language should be registered');
    });

    test('.lx extension is associated with Flex language', async () => {
        // Create a test file with .lx extension
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            assert.fail('No workspace folder available for testing');
            return;
        }
        
        // Open the example .lx file
        const examplePath = path.join(workspaceFolder.uri.fsPath, 'examples', 'test_program.lx');
        if (!fs.existsSync(examplePath)) {
            assert.fail(`Example file not found: ${examplePath}`);
            return;
        }
        
        const document = await vscode.workspace.openTextDocument(examplePath);
        assert.strictEqual(document.languageId, 'flex', 'Document language should be identified as flex');
    });
});
