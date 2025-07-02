import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand, escapeShellPath } from '../utils/shell-utils';
import { findFlexCompiler, showFlexDownloadPrompt } from './detection';

/**
 * Format the Flex compiler command for the current platform
 * Windows requires special syntax: ."{compiler}" {args}
 * Other platforms use standard: {compiler} {args}
 */
function formatFlexCommand(flexCompiler: string, args: string): string {
    if (process.platform === 'win32') {
        return `.\"${flexCompiler}\" ${args}`;
    } else {
        return `${flexCompiler} ${args}`;
    }
}

/**
 * Run a Flex file using the detected compiler in the integrated terminal
 */
export async function runFlexFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active Flex file found. Please open a .lx, .fx, or .flex file.');
        return;
    }

    const document = editor.document;
    const filePath = document.fileName;
    const fileExtension = path.extname(filePath).toLowerCase();

    // Check if it's a Flex file
    if (!['.lx', '.fx', '.flex'].includes(fileExtension)) {
        vscode.window.showErrorMessage('This is not a Flex file. Please open a .lx, .fx, or .flex file.');
        return;
    }

    // Save the file if it has unsaved changes
    if (document.isDirty) {
        await document.save();
    }

    // Find the Flex compiler
    const flexCompiler = await findFlexCompiler();

    if (!flexCompiler) {
        vscode.window.showErrorMessage('Flex compiler not found. Please install the Flex compiler and restart VS Code.');
        showFlexDownloadPrompt();
        return;
    }

    // Create or reuse the Flex terminal
    let terminal = vscode.window.terminals.find(term => term.name === 'Flex');

    if (!terminal) {
        terminal = vscode.window.createTerminal({
            name: 'Flex',
            cwd: path.dirname(filePath)
        });
    }

    // Show the terminal and execute the command
    terminal.show(true); // true = preserve focus on the terminal

    // Use proper shell escaping for the file path
    const escapedFilePath = escapeShellPath(filePath);
    const command = formatFlexCommand(flexCompiler, escapedFilePath);

    // Execute the command directly
    terminal.sendText(command, true);
}

/**
 * Runs the currently open Flex file with AI-powered debugging and assistance.
 * This function is designed to be robust, with clear user feedback and error handling.
 */
export async function runFlexFileWithAI(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'flex') {
        vscode.window.showErrorMessage('No active Flex file found. Please open a .lx, .fx, or .flex file.');
        return;
    }

    // --- Step 1: Show initial feedback and get configuration ---
    vscode.window.showInformationMessage('✨ Attempting to run with Flex AI...');
    const config = vscode.workspace.getConfiguration('flex');
    const isAIEnabled = config.get<boolean>('enableAI');

    if (!isAIEnabled) {
        vscode.window.showErrorMessage('AI execution is not enabled. Please enable "flex.enableAI" in your settings.');
        return;
    }

    // --- Step 2: Verify compiler path ---
    const flexCompiler = await findFlexCompiler();
    if (!flexCompiler) {
        vscode.window.showErrorMessage('Flex compiler not found or configured. Please run "Flex: Verify Compiler Installation".');
        return;
    }

    // --- Step 3: Check for API Key ---
    const apiKey = config.get<string>('openRouterApiKey');
    if (!apiKey) {
        vscode.window.showErrorMessage('OpenRouter API key is missing. Please set "flex.openRouterApiKey" in your settings.');
        return;
    }
    vscode.window.showInformationMessage('🔑 OpenRouter API Key found.');

    // --- Step 4: Determine AI model ---
    let aiModel = config.get<string>('aiModel', 'default');
    if (aiModel === 'custom') {
        const customModel = config.get<string>('aiModel', '').trim();
        if (customModel === '') {
            vscode.window.showErrorMessage('AI model is set to "custom", but no custom model name is provided. Please select a model from the settings.');
            return; // Just return without a value
        }
        aiModel = customModel;
    }
    vscode.window.showInformationMessage(`🧠 Using AI Model: ${aiModel}`);

    // --- Step 5: Get or create the dedicated AI terminal ---
    let terminal = vscode.window.terminals.find(t => t.name === 'Flex AI');
    if (!terminal) {
        terminal = vscode.window.createTerminal('Flex AI');
    }
    terminal.show();

    // --- Step 6: Construct and execute the command ---
    const filePath = editor.document.uri.fsPath;
    const escapedFilePath = escapeShellPath(filePath);

    // Use platform-specific environment variable syntax
    const setKeyCommand = process.platform === 'win32'
        ? `$env:OPENROUTER_API_KEY="${apiKey}"`     // PowerShell syntax for Windows
        : `export OPENROUTER_API_KEY="${apiKey}"`;  // Unix shell syntax for other platforms

    let aiCommandSegment: string;
    if (aiModel === 'default') {
        aiCommandSegment = `--ai ${escapedFilePath}`;
    } else {
        aiCommandSegment = `--ai ${aiModel} ${escapedFilePath}`;
    }

    const fullCommand = formatFlexCommand(flexCompiler, aiCommandSegment);

    vscode.window.showInformationMessage(`🚀 Executing command...`);

    // For Windows, send three separate commands for better reliability;
    // for other platforms, combine with && for efficiency
    if (process.platform === 'win32') {
        // Windows: Send three separate commands for better PowerShell compatibility
        terminal.sendText(setKeyCommand, true);           // 1. Set API key (PowerShell syntax)
        terminal.sendText('clear', true);                 // 2. Clear terminal
        terminal.sendText(fullCommand, true);             // 3. Run Flex command
    } else {
        // Other platforms: Clear terminal, then combine API key export and Flex command
        terminal.sendText('clear', true);
        terminal.sendText(`${setKeyCommand} && ${fullCommand}`, true);
    }
}

/**
 * Validate a Flex file for syntax errors
 */
export async function validateFlexFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active Flex file found.');
        return;
    }

    const document = editor.document;
    const filePath = document.fileName;

    // Save the file if it has unsaved changes
    if (document.isDirty) {
        await document.save();
    }

    // Find the Flex compiler
    const flexCompiler = await findFlexCompiler();

    if (!flexCompiler) {
        vscode.window.showErrorMessage('Flex compiler not found. Cannot validate syntax.');
        return;
    }

    try {
        // Try to validate with a syntax check flag (if the compiler supports it)
        const { stdout, stderr } = await execCommand(flexCompiler, ['--check', filePath], { timeout: 10000 });

        if (stderr) {
            vscode.window.showErrorMessage(`Syntax errors found: ${stderr}`);
        } else {
            vscode.window.showInformationMessage('Flex file syntax is valid.');
        }

    } catch (error: any) {
        // If --check isn't supported, fall back to trying to run the file
        vscode.window.showWarningMessage('Syntax validation not fully supported. Use "Run Flex File" to check for errors.');
    }
}

/**
 * Test compiler detection directly (debug command)
 */
export async function testCompilerDirectly(): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('Flex Compiler Test');
    outputChannel.clear();
    outputChannel.appendLine('=== Compiler Detection Debug Test ===');

    const flexCompiler = await findFlexCompiler();

    if (flexCompiler) {
        vscode.window.showInformationMessage(`✅ Flex compiler found: ${flexCompiler}`);

        outputChannel.appendLine(`✅ Found: ${flexCompiler}`);

        // Test with version command
        try {
            outputChannel.appendLine('=== Testing --version command ===');
            const { stdout, stderr } = await execCommand(flexCompiler, ['--version'], { timeout: 5000 });
            const output = stdout + stderr;

            outputChannel.appendLine('=== Version Output ===');
            outputChannel.appendLine(output);

            // Test with a simple file execution to see what happens
            outputChannel.appendLine('=== Testing file execution capability ===');
            try {
                const testFilePath = 'tests/fixtures/fully_working_flex.lx';
                outputChannel.appendLine(`Testing with: ${testFilePath}`);

                // For Windows, we might need to test the special syntax, but since execCommand uses spawn,
                // we'll test with the standard approach here and let the terminal execution handle the Windows syntax
                const { stdout: execOut, stderr: execErr } = await execCommand(flexCompiler, [testFilePath], { timeout: 10000 });
                outputChannel.appendLine('=== Test Execution Output ===');
                if (execOut) {
                    outputChannel.appendLine('STDOUT:');
                    outputChannel.appendLine(execOut);
                }
                if (execErr) {
                    outputChannel.appendLine('STDERR:');
                    outputChannel.appendLine(execErr);
                }
            } catch (execError: any) {
                outputChannel.appendLine('=== Test Execution Failed ===');
                outputChannel.appendLine(`Error: ${execError.message}`);
                outputChannel.appendLine(`Exit Code: ${execError.code || 'unknown'}`);
                if (execError.stderr) {
                    outputChannel.appendLine('STDERR:');
                    outputChannel.appendLine(execError.stderr);
                }
                if (execError.stdout) {
                    outputChannel.appendLine('STDOUT:');
                    outputChannel.appendLine(execError.stdout);
                }
            }

        } catch (error: any) {
            outputChannel.appendLine('=== Version Test Failed ===');
            outputChannel.appendLine(`Error: ${error.message}`);
            vscode.window.showWarningMessage(`Compiler found but version test failed: ${error.message}`);
        }
    } else {
        outputChannel.appendLine('❌ No Flex compiler found on this system');
        vscode.window.showErrorMessage('❌ No Flex compiler found on this system');
        showFlexDownloadPrompt();
    }

    outputChannel.show();
}

/**
 * Configure custom compiler path
 */
export async function configureCompilerPath(): Promise<void> {
    const currentPath = vscode.workspace.getConfiguration('flex').get<string>('compilerPath', '');

    const newPath = await vscode.window.showInputBox({
        prompt: 'Enter the path to your Flex compiler executable',
        value: currentPath,
        placeHolder: 'e.g., /usr/local/bin/flex or C:\\Flex\\flex.exe'
    });

    if (newPath !== undefined) {
        await vscode.workspace.getConfiguration('flex').update('compilerPath', newPath, vscode.ConfigurationTarget.Global);

        if (newPath.trim() === '') {
            vscode.window.showInformationMessage('Compiler path cleared. Will use auto-detection.');
        } else {
            vscode.window.showInformationMessage(`Compiler path set to: ${newPath}`);
        }
    }
} 