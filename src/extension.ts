import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { workspace, ExtensionContext, window, commands, TextDocument, Position, Range } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import * as cp from 'child_process';
import * as os from 'os';
import * as http from 'http';

let client: LanguageClient;

// Track the current running process
let currentChildProcess: cp.ChildProcess | null = null;
let terminal: vscode.Terminal | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

// Track the current running process
let runningProcess: cp.ChildProcess | undefined;
let runningTerminal: vscode.Terminal | undefined;
let runningStatusBarItem: vscode.StatusBarItem;

export function activate(context: ExtensionContext) {
    console.log('Flex language extension is now active!');

    // Ensure all required scripts exist and have proper permissions
    ensureScriptsExist(context).catch(error => {
        console.error('Failed to create necessary scripts:', error);
        vscode.window.showErrorMessage('Failed to set up Flex extension properly. Some features may not work.');
    });

    // Register formatter
    const formatProvider = registerFormattingProvider(context);

    // Register commands
    registerCommands(context);

    // Register refactoring providers
    registerRefactoringProviders(context);

    // Register AI commands
    registerAICommands(context);

    // Register run commands
    registerRunCommands(context);

    // Check and prompt for Sindbad path if needed
    checkSindbadPath(context);

    // Start language server
    startLanguageServer(context);
}

function registerFormattingProvider(context: ExtensionContext) {
    const formatProvider = vscode.languages.registerDocumentFormattingEditProvider('flex', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            const text = document.getText();
            const formatted = formatFlexCode(text);
            
            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const textRange = new vscode.Range(
                firstLine.range.start,
                lastLine.range.end
            );
            
            return [vscode.TextEdit.replace(textRange, formatted)];
        }
    });

    context.subscriptions.push(formatProvider);
    return formatProvider;
}

function formatFlexCode(code: string): string {
    // Enhanced formatting implementation
    let formattedCode = '';
    let indentLevel = 0;
    const lines = code.split(/\r?\n/);
    
    // Track if we're inside a multiline comment
    let inMultilineComment = false;
    
    // Track if we're inside a string
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Skip empty lines
        if (line === '') {
            formattedCode += '\n';
            continue;
        }
        
        // Handle multiline comments
        if (inMultilineComment) {
            const commentEndIndex = line.indexOf('*/');
            if (commentEndIndex !== -1) {
                inMultilineComment = false;
                // Add the comment with current indent
                const indent = '    '.repeat(indentLevel);
                formattedCode += indent + line + '\n';
            } else {
                // Continue the multiline comment with current indent
                const indent = '    '.repeat(indentLevel);
                formattedCode += indent + line + '\n';
            }
            continue;
        }
        
        // Check for multiline comment start
        const commentStartIndex = line.indexOf('/*');
        if (commentStartIndex !== -1 && !line.includes('*/')) {
            inMultilineComment = true;
            // Add the comment with current indent
            const indent = '    '.repeat(indentLevel);
            formattedCode += indent + line + '\n';
            continue;
        }
        
        // Decrease indent for closing brackets/braces
        if (line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Special case for else/elif statements
        if (line.startsWith('else') || line.startsWith('elif')) {
            // Decrease indent for else/elif
            indentLevel = Math.max(0, indentLevel - 1);
            
            // Add indent
            const indent = '    '.repeat(indentLevel);
            formattedCode += indent + line + '\n';
            
            // Increase indent if the line ends with an opening brace
            if (line.endsWith('{')) {
                indentLevel++;
            }
            // Also increase indent for else/elif without braces
            else if (!line.includes('{')) {
                indentLevel++;
            }
            
            continue;
        }
        
        // Add indent
        const indent = '    '.repeat(indentLevel);
        formattedCode += indent + line + '\n';
        
        // Increase indent after opening brackets/braces
        if (line.endsWith('{') || line.endsWith('(') || line.endsWith('[')) {
            indentLevel++;
        }
        
        // Handle if/for/while statements without braces
        if ((line.startsWith('if') || line.startsWith('cond') || 
             line.startsWith('for') || line.startsWith('loop') || 
             line.startsWith('while') || line.startsWith('karr')) && 
            !line.endsWith('{') && !line.includes('{')) {
            indentLevel++;
        }
        
        // Handle function declarations
        if ((line.startsWith('fun') || line.startsWith('sndo2')) && 
            line.includes('(') && !line.includes('{')) {
            // If the function declaration doesn't have an opening brace yet,
            // don't increase the indent level
        }
        else if ((line.startsWith('fun') || line.startsWith('sndo2')) && 
                 line.includes('(') && line.includes('{')) {
            // Function declaration with opening brace - indent already increased above
        }
    }
    
    return formattedCode;
}

/**
 * Setup AI environment variables for the Flex process
 * @param enableAI Whether to enable AI for this run
 * @returns Environment variables for the process
 */
function setupAIEnvironment(enableAI: boolean): { [key: string]: string } {
    const config = vscode.workspace.getConfiguration('flex');
    const env = { ...process.env as { [key: string]: string } };
    
    // Set USE_AI based on whether AI is enabled
    env['USE_AI'] = enableAI ? 'true' : 'false';
    
    if (enableAI) {
        // Get AI model from configuration
        const aiModel = config.get<string>('ai.model', 'qwen');
        env['FLEX_AI_MODEL'] = aiModel;
        
        // If using OpenAI, set the API key
        if (aiModel === 'openai') {
            const apiKey = config.get<string>('ai.apiKey', '');
            if (apiKey) {
                env['OPENAI_API_KEY'] = apiKey;
            }
        }
        
        // If using LMStudio, check if it's running
        if (aiModel === 'lmstudio') {
            try {
                // Use http.request with a Promise to check if LMStudio is running
                const checkLMStudioRunning = new Promise<boolean>((resolve) => {
                    const req = http.request({
                        hostname: 'localhost',
                        port: 1234,
                        path: '/v1/health',
                        method: 'GET',
                        timeout: 1000
                    }, (response: http.IncomingMessage) => {
                        resolve(response.statusCode === 200);
                    });
                    
                    req.on('error', () => {
                        resolve(false);
                    });
                    
                    req.end();
                });
                
                // Warn if LMStudio is not running
                checkLMStudioRunning.then((isRunning) => {
                    if (!isRunning) {
                        vscode.window.showWarningMessage('LMStudio does not appear to be running. Please start LMStudio with the API server enabled.');
                    }
                });
            } catch (error) {
                console.error('Error checking LMStudio:', error);
            }
        }
    }
    
    return env;
}

// /**
//  * Stops the currently running Flex process
//  */
// async function stopRunningProcess(): Promise<void> {
//     if (currentChildProcess && currentChildProcess.pid) {
//         try {
//             const platform = os.platform();
//             if (platform === 'win32') {
//                 // On Windows, use taskkill
//                 cp.exec(`taskkill /pid ${currentChildProcess.pid} /T /F`);
//             } else {
//                 // On Unix-like systems, use kill
//                 process.kill(-currentChildProcess.pid, 'SIGKILL');
//             }
//         } catch (error) {
//             console.error('Error stopping process:', error);
//         }
        
//         currentChildProcess = null;
//     }
    
//     if (statusBarItem) {
//         statusBarItem.text = '$(debug-stop) Flex: Stopped';
//         setTimeout(() => {
//             if (statusBarItem) {
//                 statusBarItem.hide();
//             }
//         }, 3000);
//     }
// }

// Register the commands for the extension
function registerCommands(context: ExtensionContext) {
    // Register the run command (without AI)
    context.subscriptions.push(
        commands.registerCommand('flex.run', () => {
            handleFlexRun(context, false);
        })
    );
    
    // Register the run with AI command
    context.subscriptions.push(
        commands.registerCommand('flex.runWithAI', () => {
            handleFlexRun(context, true);
        })
    );
    
    // Register the stop command
    context.subscriptions.push(
        commands.registerCommand('flex.stopRun', async () => {
            await stopRunningProcess();
            window.showInformationMessage('Flex execution stopped');
        })
    );

    // Format command
    context.subscriptions.push(commands.registerCommand('flex.format', () => {
        const editor = window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'flex') {
            return;
        }
        
        commands.executeCommand('editor.action.formatDocument');
    }));
    
    // Lint command
    context.subscriptions.push(commands.registerCommand('flex.lint', () => {
        if (client) {
            // Request linting from the language server
            client.sendNotification('flex/lint');
        }
    }));

    // Create new Flex file command
    context.subscriptions.push(commands.registerCommand('flex.createNewFile', async (uri: vscode.Uri) => {
        // Get the target directory
        const targetDir = uri ? uri.fsPath : workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!targetDir) {
            window.showErrorMessage('No workspace folder open.');
            return;
        }
        
        // Ask for the file name
        const fileName = await window.showInputBox({
            placeHolder: 'Enter file name (without extension)',
            prompt: 'Enter the name for the new Flex file'
        });
        
        if (!fileName) {
            return;
        }
        
        // Add the .lx extension if not provided
        const fullFileName = fileName.endsWith('.lx') || fileName.endsWith('.flex') || fileName.endsWith('.fx') 
            ? fileName 
            : `${fileName}.lx`;
        
        // Create the file path
        const filePath = path.join(targetDir, fullFileName);
        
        // Check if file already exists
        if (fs.existsSync(filePath)) {
            window.showErrorMessage(`File ${fullFileName} already exists.`);
            return;
        }
        
        // Create a template for the new file
        const template = `// ${fileName} - Flex program
// Created on ${new Date().toLocaleDateString()}

// Your code here

`;
        
        // Write the file
        fs.writeFileSync(filePath, template);
        
        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    }));

    // Go to definition command
    context.subscriptions.push(commands.registerCommand('flex.goToDefinition', async () => {
        const editor = window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'flex') {
            return;
        }
        
        // Execute the built-in go to definition command
        await commands.executeCommand('editor.action.revealDefinition');
    }));

    // Find references command
    context.subscriptions.push(commands.registerCommand('flex.findReferences', async () => {
        const editor = window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'flex') {
            return;
        }
        
        // Execute the built-in find references command
        await commands.executeCommand('editor.action.referenceSearch.trigger');
    }));
}

function registerRefactoringProviders(context: ExtensionContext) {
    // Register rename provider
    const renameProvider = vscode.languages.registerRenameProvider('flex', {
        provideRenameEdits(document, position, newName) {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return null;
            }
            
            const oldName = document.getText(wordRange);
            const edit = new vscode.WorkspaceEdit();
            
            // Find all occurrences of the symbol in the document
            const text = document.getText();
            const pattern = new RegExp(`\\b${oldName}\\b`, 'g');
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                const matchPos = document.positionAt(match.index);
                const matchRange = new vscode.Range(
                    matchPos,
                    matchPos.translate(0, oldName.length)
                );
                
                // Skip if it's in a comment or string
                const lineText = document.lineAt(matchPos.line).text;
                const linePrefix = lineText.substring(0, matchPos.character);
                
                // Skip if in a single-line comment
                if (linePrefix.includes('//')) {
                    continue;
                }
                
                // Add the edit
                edit.replace(document.uri, matchRange, newName);
            }
            
            return edit;
        }
    });
    
    // Register code actions provider for quick fixes and refactorings
    const codeActionsProvider = vscode.languages.registerCodeActionsProvider('flex', {
        provideCodeActions(document, range, context, token) {
            const actions: vscode.CodeAction[] = [];
            
            // Extract variable refactoring
            if (range.isSingleLine && !range.isEmpty) {
                const selectedText = document.getText(range);
                
                // Only offer to extract non-trivial expressions
                if (selectedText.length > 1 && 
                    !selectedText.startsWith('//') && 
                    !selectedText.includes('"') && 
                    !selectedText.includes("'")) {
                    
                    const extractAction = new vscode.CodeAction(
                        'Extract to variable', 
                        vscode.CodeActionKind.RefactorExtract
                    );
                    
                    extractAction.command = {
                        title: 'Extract to variable',
                        command: 'flex.extractVariable',
                        arguments: [document, range, selectedText]
                    };
                    
                    actions.push(extractAction);
                }
            }
            
            // Add quick fixes for diagnostics
            if (context.diagnostics.length > 0) {
                for (const diagnostic of context.diagnostics) {
                    if (diagnostic.message.includes('is used but not declared')) {
                        // Create a quick fix to declare the variable
                        const varName = diagnostic.message.match(/\'([^']+)\'/)?.[1];
                        if (varName) {
                            const declareAction = new vscode.CodeAction(
                                `Declare variable '${varName}'`,
                                vscode.CodeActionKind.QuickFix
                            );
                            
                            declareAction.command = {
                                title: `Declare variable '${varName}'`,
                                command: 'flex.declareVariable',
                                arguments: [document, diagnostic.range, varName]
                            };
                            
                            declareAction.diagnostics = [diagnostic];
                            declareAction.isPreferred = true;
                            
                            actions.push(declareAction);
                        }
                    }
                }
            }
            
            return actions;
        }
    });
    
    // Register commands for code actions
    context.subscriptions.push(
        commands.registerCommand('flex.extractVariable', (document: vscode.TextDocument, range: vscode.Range, expression: string) => {
            const editor = window.activeTextEditor;
            if (!editor || editor.document !== document) {
                return;
            }
            
            // Get the indentation of the current line
            const lineText = document.lineAt(range.start.line).text;
            const indentMatch = lineText.match(/^\s*/);
            const indent = indentMatch ? indentMatch[0] : '';
            
            // Create a variable name based on the expression
            let varName = 'extracted';
            if (/^\d+$/.test(expression)) {
                varName = 'num';
            } else if (/^\d+\.\d+$/.test(expression)) {
                varName = 'decimal';
            } else if (expression.includes('+') || expression.includes('-') || 
                       expression.includes('*') || expression.includes('/')) {
                varName = 'result';
            } else {
                // Try to create a camelCase name from the expression
                varName = expression.toLowerCase()
                    .replace(/[^\w]+(.)/g, (_, chr) => chr.toUpperCase())
                    .replace(/[^\w]/, '');
                
                if (varName.length === 0 || /^\d/.test(varName)) {
                    varName = 'extracted';
                }
            }
            
            // Create the edit
            const edit = new vscode.WorkspaceEdit();
            
            // Insert the variable declaration before the current line
            const declarationPos = new vscode.Position(range.start.line, 0);
            edit.insert(document.uri, declarationPos, `${indent}${varName} = ${expression}\n`);
            
            // Replace the selected expression with the variable name
            edit.replace(document.uri, range, varName);
            
            // Apply the edit
            return vscode.workspace.applyEdit(edit);
        }),
        
        commands.registerCommand('flex.declareVariable', (document: vscode.TextDocument, range: vscode.Range, varName: string) => {
            const editor = window.activeTextEditor;
            if (!editor || editor.document !== document) {
                return;
            }
            
            // Find the appropriate place to insert the declaration
            // For simplicity, we'll insert at the beginning of the file
            const edit = new vscode.WorkspaceEdit();
            
            // Get the first non-comment, non-empty line
            let insertLine = 0;
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i).text.trim();
                if (line === '' || line.startsWith('//') || line.startsWith('/*')) {
                    insertLine = i + 1;
                } else {
                    break;
                }
            }
            
            const insertPos = new vscode.Position(insertLine, 0);
            edit.insert(document.uri, insertPos, `rakm ${varName} = 0\n`);
            
            // Apply the edit
            return vscode.workspace.applyEdit(edit);
        })
    );
    
    context.subscriptions.push(renameProvider, codeActionsProvider);
}

function registerAICommands(context: ExtensionContext) {
    // AI Explain command
    const aiExplainCommand = vscode.commands.registerCommand('flex.aiExplain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select code to explain');
            return;
        }

        const selectedText = editor.document.getText(selection);
        
        // Create and show the webview panel
        const panel = vscode.window.createWebviewPanel(
            'flexAIExplain',
            'Flex AI Explanation',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
        );

        // Set the HTML content
        panel.webview.html = getAIWebviewContent('Explaining Flex Code...', 'Analyzing your code...');

        try {
            // Simulate AI processing (in a real implementation, this would call an AI service)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Generate explanation (this would be replaced with actual AI-generated content)
            const explanation = generateExplanation(selectedText);
            
            // Update the webview with the explanation
            panel.webview.html = getAIWebviewContent('Flex Code Explanation', explanation);
        } catch (error) {
            panel.webview.html = getAIWebviewContent('Error', 'Failed to generate explanation: ' + error);
        }
    });

    // AI Generate command
    const aiGenerateCommand = vscode.commands.registerCommand('flex.aiGenerate', async () => {
        // Prompt the user for what they want to generate
        const prompt = await vscode.window.showInputBox({
            prompt: 'What Flex code would you like to generate?',
            placeHolder: 'E.g., A function to calculate factorial'
        });

        if (!prompt) {
            return; // User cancelled
        }

        // Create and show the webview panel
        const panel = vscode.window.createWebviewPanel(
            'flexAIGenerate',
            'Flex AI Code Generation',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
        );

        // Set the HTML content
        panel.webview.html = getAIWebviewContent('Generating Flex Code...', 'Processing your request...');

        try {
            // Simulate AI processing (in a real implementation, this would call an AI service)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate code (this would be replaced with actual AI-generated content)
            const generatedCode = generateCode(prompt);
            
            // Update the webview with the generated code
            panel.webview.html = getAIWebviewContent('Generated Flex Code', 
                `<p>Based on your prompt: "${prompt}"</p>
                <pre><code>${generatedCode}</code></pre>
                <button id="insertCode">Insert Code at Cursor</button>`);
            
            // Handle the insert code button click
            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'insertCode') {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            editBuilder.insert(editor.selection.active, generatedCode);
                        });
                    }
                }
            });

            // Enable communication from the webview to the extension
            panel.webview.html = panel.webview.html.replace('</body>', `
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('insertCode').addEventListener('click', () => {
                        vscode.postMessage({ command: 'insertCode' });
                    });
                </script>
                </body>
            `);
        } catch (error) {
            panel.webview.html = getAIWebviewContent('Error', 'Failed to generate code: ' + error);
        }
    });

    // AI Translate command
    const aiTranslateCommand = vscode.commands.registerCommand('flex.aiTranslate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select code to translate');
            return;
        }

        const selectedText = editor.document.getText(selection);
        
        // Prompt for source language
        const sourceLanguage = await vscode.window.showQuickPick(
            ['JavaScript', 'Python', 'Java', 'C++', 'C#', 'Other'],
            { placeHolder: 'Select the source language' }
        );

        if (!sourceLanguage) {
            return; // User cancelled
        }

        // Create and show the webview panel
        const panel = vscode.window.createWebviewPanel(
            'flexAITranslate',
            'Translate to Flex',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
        );

        // Set the HTML content
        panel.webview.html = getAIWebviewContent('Translating to Flex...', `Translating from ${sourceLanguage}...`);

        try {
            // Simulate AI processing (in a real implementation, this would call an AI service)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Translate code (this would be replaced with actual AI-generated content)
            const translatedCode = translateToFlex(selectedText, sourceLanguage);
            
            // Update the webview with the translated code
            panel.webview.html = getAIWebviewContent('Translated Flex Code', 
                `<p>Translated from ${sourceLanguage}:</p>
                <pre><code>${translatedCode}</code></pre>
                <button id="insertCode">Replace Selected Code</button>`);
            
            // Handle the insert code button click
            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'insertCode') {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            editBuilder.replace(selection, translatedCode);
                        });
                    }
                }
            });

            // Enable communication from the webview to the extension
            panel.webview.html = panel.webview.html.replace('</body>', `
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('insertCode').addEventListener('click', () => {
                        vscode.postMessage({ command: 'insertCode' });
                    });
                </script>
                </body>
            `);
        } catch (error) {
            panel.webview.html = getAIWebviewContent('Error', 'Failed to translate code: ' + error);
        }
    });

    context.subscriptions.push(aiExplainCommand, aiGenerateCommand, aiTranslateCommand);
}

// Helper function to generate HTML content for the webview
function getAIWebviewContent(title: string, content: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h1 {
                    color: var(--vscode-editor-foreground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                pre {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow: auto;
                }
                code {
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    margin-top: 15px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div>${content}</div>
        </body>
        </html>
    `;
}

// Mock function to generate code explanation (would be replaced with actual AI service)
function generateExplanation(code: string): string {
    // Get configuration
    const config = vscode.workspace.getConfiguration('flex');
    const aiEnabled = config.get<boolean>('ai.enable', true);
    const aiModel = config.get<string>('ai.model', 'qwen');
    
    if (!aiEnabled) {
        return mockGenerateExplanation(code);
    }
    
    // If using OpenAI, we need an API key
    if (aiModel === 'openai') {
        const apiKey = config.get<string>('ai.apiKey', '');
        if (!apiKey) {
            vscode.window.showWarningMessage('OpenAI API key not set. Using mock explanation instead.');
            return mockGenerateExplanation(code);
        }
        
        // This would be where we'd call the OpenAI API
        // For now, still return the mock response but with a note
        return mockGenerateExplanation(code) + 
            `<p><em>Note: This is using the configured AI model (${aiModel}). For actual AI-generated explanations, implement the OpenAI API call here.</em></p>`;
    }
    
    // For Qwen or other models, we'd handle those differently
    // For now, return the mock response with a note
    return mockGenerateExplanation(code) + 
        `<p><em>Note: This is using the configured AI model (${aiModel}). For actual AI-generated explanations, integrate with the appropriate API.</em></p>`;
}

// The mock implementation moved to its own function
function mockGenerateExplanation(code: string): string {
    return `
        <p>This Flex code does the following:</p>
        <ul>
            <li>Defines variables and functions</li>
            <li>Implements logic for data processing</li>
            <li>Handles user input and output</li>
        </ul>
        <p>The code structure follows standard Flex programming patterns and best practices.</p>
        <p>Here's a breakdown of the key components:</p>
        <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
    `;
}

// Mock function to generate code (would be replaced with actual AI service)
function generateCode(prompt: string): string {
    // Get configuration
    const config = vscode.workspace.getConfiguration('flex');
    const aiEnabled = config.get<boolean>('ai.enable', true);
    const aiModel = config.get<string>('ai.model', 'qwen');
    
    if (!aiEnabled) {
        return mockGenerateCode(prompt);
    }
    
    // If using OpenAI, we need an API key
    if (aiModel === 'openai') {
        const apiKey = config.get<string>('ai.apiKey', '');
        if (!apiKey) {
            vscode.window.showWarningMessage('OpenAI API key not set. Using mock code generation instead.');
            return mockGenerateCode(prompt);
        }
        
        // This would be where we'd call the OpenAI API
        // For now, still return the mock response but with a note
        return mockGenerateCode(prompt) + 
            `\n\n// Note: This is using the configured AI model (${aiModel}).
// For actual AI-generated code, implement the OpenAI API call.`;
    }
    
    // For Qwen or other models, we'd handle those differently
    // For now, return the mock response with a note
    return mockGenerateCode(prompt) + 
        `\n\n// Note: This is using the configured AI model (${aiModel}).
// For actual AI-generated code, integrate with the appropriate API.`;
}

// The mock implementation moved to its own function
function mockGenerateCode(prompt: string): string {
    if (prompt.includes('factorial')) {
        return `// Function to calculate factorial
fun factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

// Example usage
int result = factorial(5);
print("Factorial of 5 is: " + result);`;
    } else {
        return `// Generated Flex code based on your prompt
fun main() {
    print("Hello from Flex!");
    
    // Your implementation here
    // Based on: "${prompt}"
}`;
    }
}

// Mock function to translate code to Flex (would be replaced with actual AI service)
function translateToFlex(code: string, sourceLanguage: string): string {
    // Get configuration
    const config = vscode.workspace.getConfiguration('flex');
    const aiEnabled = config.get<boolean>('ai.enable', true);
    const aiModel = config.get<string>('ai.model', 'qwen');
    
    if (!aiEnabled) {
        return mockTranslateToFlex(code, sourceLanguage);
    }
    
    // If using OpenAI, we need an API key
    if (aiModel === 'openai') {
        const apiKey = config.get<string>('ai.apiKey', '');
        if (!apiKey) {
            vscode.window.showWarningMessage('OpenAI API key not set. Using mock translation instead.');
            return mockTranslateToFlex(code, sourceLanguage);
        }
        
        // This would be where we'd call the OpenAI API
        // For now, still return the mock response but with a note
        return mockTranslateToFlex(code, sourceLanguage) + 
            `\n\n// Note: This is using the configured AI model (${aiModel}).
// For actual AI translation, implement the OpenAI API call.`;
    }
    
    // For Qwen or other models, we'd handle those differently
    // For now, return the mock response with a note
    return mockTranslateToFlex(code, sourceLanguage) + 
        `\n\n// Note: This is using the configured AI model (${aiModel}).
// For actual AI translation, integrate with the appropriate API.`;
}

// The mock implementation moved to its own function
function mockTranslateToFlex(code: string, sourceLanguage: string): string {
    if (sourceLanguage === 'JavaScript') {
        return code
            .replace(/function\s+(\w+)\s*\(/g, 'fun $1(')
            .replace(/const\s+(\w+)\s*=/g, 'int $1 =')
            .replace(/let\s+(\w+)\s*=/g, 'int $1 =')
            .replace(/var\s+(\w+)\s*=/g, 'int $1 =')
            .replace(/console\.log/g, 'print')
            .replace(/\+\+/g, ' = $1 + 1');
    } else if (sourceLanguage === 'Python') {
        return code
            .replace(/def\s+(\w+)\s*\(/g, 'fun $1(')
            .replace(/print\s*\(/g, 'print(')
            .replace(/#/g, '//')
            .replace(/:\s*$/gm, ' {')
            .replace(/^\s*$/gm, '}');
    } else {
        // Generic translation attempt
        return `// Translated from ${sourceLanguage} to Flex
// Note: This is a basic translation and may need adjustments

${code
    .replace(/\/\//g, '// ')
    .replace(/function|def|void|public static|private static/g, 'fun')
    .replace(/console\.log|System\.out\.println|print/g, 'print')
    .replace(/int|float|double|string|boolean/g, (match) => {
        const typeMap: {[key: string]: string} = {
            'int': 'int',
            'float': 'float',
            'double': 'float',
            'string': 'string',
            'boolean': 'bool'
        };
        return typeMap[match] || match;
    })
}`;
    }
}

function startLanguageServer(context: ExtensionContext) {
    // The server is implemented in Node
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
    
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };
    
    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for Flex documents
        documentSelector: [{ scheme: 'file', language: 'flex' }],
        synchronize: {
            // Notify the server about file changes to files in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/*.{flex,fx,lx}')
        }
    };
    
    // Create and start the client
    client = new LanguageClient(
        'flexLanguageServer',
        'Flex Language Server',
        serverOptions,
        clientOptions
    );
    
    // Start the client. This will also launch the server
    const disposable = client.start();
    context.subscriptions.push(disposable);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

// Function to register run-related commands
function registerRunCommands(context: vscode.ExtensionContext) {
    // Create status bar item
    runningStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    runningStatusBarItem.text = "$(stop) Stop Flex";
    runningStatusBarItem.command = 'flex.stopRun';
    runningStatusBarItem.tooltip = 'Stop the running Flex program';
    context.subscriptions.push(runningStatusBarItem);

    // Register run file command
    const runFileCommand = vscode.commands.registerCommand('flex.runFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        // Check if the file is saved
        if (editor.document.isDirty) {
            const saved = await editor.document.save();
            if (!saved) {
                vscode.window.showErrorMessage('Please save the file before running');
                return;
            }
        }

        const filePath = editor.document.uri.fsPath;
        
        // Check if we already have a running process
        if (runningProcess) {
            vscode.window.showInformationMessage('A Flex program is already running. Stop it first.');
            return;
        }

        try {
            // Check if Sindbad path is set
            const config = vscode.workspace.getConfiguration('flex');
            const sindbadPath = config.get<string>('sindbadPath', '');
            
            if (!sindbadPath) {
                await checkSindbadPath(context);
                // Recheck if the path was set
                const updatedPath = config.get<string>('sindbadPath', '');
                if (!updatedPath) {
                    vscode.window.showErrorMessage('Sindbad path not set. Cannot run Flex files.');
                    return;
                }
            }
            
            // Get Flex runner script path
            let flexPath = config.get<string>('path', '');
            
            if (flexPath) {
                // Resolve any VS Code variables in the path
                flexPath = resolveVariables(flexPath, context);
            }
            
            if (!flexPath) {
                // Create or update the wrapper scripts in the extension directory
                const isWindows = process.platform === 'win32';
                const wrapperScriptName = isWindows ? 'run-flex.bat' : 'run-flex.sh';
                const wrapperPath = path.join(context.extensionPath, wrapperScriptName);
                
                if (createOrUpdateWrapperScript(wrapperPath, sindbadPath, isWindows)) {
                    flexPath = wrapperPath;
                    await config.update('path', flexPath, true);
                    vscode.window.showInformationMessage(`Created Flex runner script at: ${flexPath}`);
                } else {
                    vscode.window.showErrorMessage('Failed to create Flex runner script.');
                    return;
                }
            }
            
            // Terminate any existing terminal
            if (runningTerminal) {
                runningTerminal.dispose();
                runningTerminal = undefined;
            }
            
            // Create a new terminal
            runningTerminal = vscode.window.createTerminal('Flex Run');
            runningTerminal.show();
            
            // Clear the terminal (if supported by the terminal)
            runningTerminal.sendText('clear || cls');
            
            // Detect OS
            const isWindows = process.platform === 'win32';
            
            // Set environment variables based on OS and user settings
            const aiEnabled = config.get<boolean>('ai.enable', false);
            
            if (isWindows) {
                if (aiEnabled) {
                    runningTerminal.sendText('set USE_AI=true');
                    const aiModel = config.get<string>('ai.model', 'qwen');
                    runningTerminal.sendText(`set FLEX_AI_MODEL=${aiModel}`);
                } else {
                    runningTerminal.sendText('set USE_AI=false');
                }
            } else {
                if (aiEnabled) {
                    runningTerminal.sendText('export USE_AI=true');
                    const aiModel = config.get<string>('ai.model', 'qwen');
                    runningTerminal.sendText(`export FLEX_AI_MODEL=${aiModel}`);
                } else {
                    runningTerminal.sendText('export USE_AI=false');
                }
            }
            
            // Run the file using the Flex interpreter
            runningTerminal.sendText(`"${flexPath}" "${filePath}"`);
            
            // Set context to show the stop button
            vscode.commands.executeCommand('setContext', 'flexRunning', true);
            runningStatusBarItem.show();
            
            // Create a fake running process object since we can't access the actual terminal process
            runningProcess = {
                kill: () => {
                    // This will be overridden in the stopRun command
                    return true;
                }
            } as any;
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run Flex file: ${error}`);
            
            // Reset the running state
            vscode.commands.executeCommand('setContext', 'flexRunning', false);
            runningStatusBarItem.hide();
            runningProcess = undefined;
        }
    });

    // Register stop run command
    const stopRunCommand = vscode.commands.registerCommand('flex.stopRun', () => {
        // Reset the running process
        runningProcess = undefined;
        
        if (runningTerminal) {
            // Detect OS
            const isWindows = process.platform === 'win32';
            
            // Send appropriate kill command based on OS
            if (isWindows) {
                // On Windows, we can use taskkill to forcefully terminate processes
                runningTerminal.sendText('taskkill /F /IM python.exe /T');
                runningTerminal.sendText('echo.');
                runningTerminal.sendText('echo Program execution stopped by user.');
            } else {
                // On Unix-like systems, we can use pkill or killall
                runningTerminal.sendText('pkill -f "python3 main.py" || killall -9 python3');
                runningTerminal.sendText('echo ""');
                runningTerminal.sendText('echo "Program execution stopped by user."');
            }
            
            // Give the kill command some time to execute
            setTimeout(() => {
                if (runningTerminal) {
                    runningTerminal.dispose();
                    runningTerminal = undefined;
                }
            }, 1000);
        }
        
        // Reset the running state
        vscode.commands.executeCommand('setContext', 'flexRunning', false);
        runningStatusBarItem.hide();
    });

    context.subscriptions.push(runFileCommand, stopRunCommand);
}

// Function to check and prompt for Sindbad path if not set
async function checkSindbadPath(context: ExtensionContext) {
    const config = workspace.getConfiguration('flex');
    const sindbadPath = config.get<string>('sindbadPath', '');
    
    if (!sindbadPath) {
        // First try to find it in common locations
        let foundPath = '';
        const isWindows = process.platform === 'win32';
        
        // Common locations to check
        const commonLocations = isWindows
            ? [
                path.join('C:', 'Program Files', 'Sindbad', 'src'),
                path.join('C:', 'Program Files (x86)', 'Sindbad', 'src'),
                path.join(os.homedir(), 'Sindbad', 'src')
              ]
            : [
                path.join('/usr', 'local', 'Sindbad', 'src'),
                path.join(os.homedir(), 'Sindbad', 'src'),
                path.join(os.homedir(), 'Developer', 'python', 'grad', 'Sindbad', 'src')
              ];
        
        for (const location of commonLocations) {
            if (fs.existsSync(path.join(location, 'main.py'))) {
                foundPath = location;
                break;
            }
        }
        
        if (foundPath) {
            const useFoundPath = await window.showInformationMessage(
                `Found Sindbad at: ${foundPath}. Use this path?`,
                'Yes', 'No'
            );
            
            if (useFoundPath === 'Yes') {
                await config.update('sindbadPath', foundPath, true);
                window.showInformationMessage(`Sindbad path set to: ${foundPath}`);
            }
        }
        
        // Prompt the user to provide the path
        const userInput = await window.showInputBox({
            placeHolder: 'Enter the full path to the Sindbad/src directory',
            prompt: 'Please provide the path to the Sindbad/src directory that contains the Flex interpreter (main.py)',
            ignoreFocusOut: true
        });
        
        if (userInput) {
            // Verify the path exists and contains main.py
            const mainPyPath = path.join(userInput, 'main.py');
            if (fs.existsSync(mainPyPath)) {
                await config.update('sindbadPath', userInput, true);
                window.showInformationMessage(`Sindbad path set to: ${userInput}`);
            } else {
                const tryAgain = await window.showErrorMessage(
                    `Invalid Sindbad path: ${userInput}. The directory should contain main.py.`,
                    'Try Again', 'Cancel'
                );
                
                if (tryAgain === 'Try Again') {
                    // Recursive call to try again
                    return checkSindbadPath(context);
                }
            }
        } else {
            // User cancelled, show information about the requirement
            window.showInformationMessage(
                'Sindbad path is required to run Flex files. Please set it in the settings.',
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    commands.executeCommand('workbench.action.openSettings', 'flex.sindbadPath');
                }
            });
        }
    } else {
        // Verify the existing path still contains main.py
        const mainPyPath = path.join(sindbadPath, 'main.py');
        if (!fs.existsSync(mainPyPath)) {
            const resetPath = await window.showErrorMessage(
                `The configured Sindbad path (${sindbadPath}) does not contain main.py. Would you like to set a new path?`,
                'Yes', 'No'
            );
            
            if (resetPath === 'Yes') {
                await config.update('sindbadPath', '', true);
                return checkSindbadPath(context);
            }
        }
    }
}

// Function to create or update the wrapper script for running Flex files
function createOrUpdateWrapperScript(scriptPath: string, sindbadPath: string, isWindows: boolean): boolean {
    try {
        let scriptContent = '';
        
        if (isWindows) {
            // Create Windows batch script
            scriptContent = `@echo off
REM Windows batch file to run Flex programs

REM Get the absolute path of the input file
SET INPUT_FILE=%1
SET ABSOLUTE_PATH=%~f1

REM Path to the Sindbad directory
SET SINDBAD_DIR=${sindbadPath.replace(/\\/g, '\\\\')}

REM Change to the Sindbad/src directory
cd /d "%SINDBAD_DIR%"

REM Run the Flex interpreter with the absolute path
python main.py "%ABSOLUTE_PATH%"`;
        } else {
            // Create Unix shell script
            scriptContent = `#!/bin/bash

# Get the absolute path of the input file
INPUT_FILE="$1"
ABSOLUTE_PATH=$(realpath "$INPUT_FILE")

# Path to the Sindbad directory
SINDBAD_DIR="${sindbadPath.replace(/"/g, '\\"')}"

# Change to the Sindbad/src directory
cd "$SINDBAD_DIR"

# Run the Flex interpreter with the absolute path
python3 main.py "$ABSOLUTE_PATH"`;
        }
        
        fs.writeFileSync(scriptPath, scriptContent);
        
        // Make the script executable on Unix-like systems
        if (!isWindows) {
            try {
                fs.chmodSync(scriptPath, '755');
            } catch (err) {
                console.error(`Failed to make script executable: ${err}`);
            }
        }
        
        return true;
    } catch (err) {
        console.error(`Failed to create wrapper script: ${err}`);
        return false;
    }
}

// Function to resolve VS Code variables in a string
function resolveVariables(value: string, context: vscode.ExtensionContext): string {
    if (!value) return value;
    
    // Replace ${workspaceFolder} with the actual workspace folder path
    if (value.includes('${workspaceFolder}') && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        value = value.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
    }
    
    // Replace ${extensionPath} with the extension path
    if (value.includes('${extensionPath}')) {
        value = value.replace(/\$\{extensionPath\}/g, context.extensionPath);
    }
    
    return value;
}

/**
 * Ensures all required scripts exist in the extension directory
 */
async function ensureScriptsExist(context: vscode.ExtensionContext): Promise<void> {
    const extensionPath = context.extensionPath;
    const globalStoragePath = context.globalStorageUri.fsPath;
    
    // Ensure the global storage path exists
    if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
    }
    
    const scriptsToCreate = [
        {
            name: 'run-flex.js',
            content: generateRunFlexJsContent(),
            targetPath: path.join(globalStoragePath, 'run-flex.js')
        },
        {
            name: 'run-flex.sh',
            content: generateUnixScriptContent(),
            targetPath: path.join(globalStoragePath, 'run-flex.sh'),
            chmod: true
        },
        {
            name: 'run-flex.bat',
            content: generateWindowsScriptContent(),
            targetPath: path.join(globalStoragePath, 'run-flex.bat')
        }
    ];

    console.log(`Extension path: ${extensionPath}`);
    console.log(`Global storage path: ${globalStoragePath}`);

    // Create all required scripts
    for (const script of scriptsToCreate) {
        try {
            // Create the script in the global storage directory
            fs.writeFileSync(script.targetPath, script.content, { mode: 0o755 });
            console.log(`Created script at: ${script.targetPath}`);
            
            // Also create a copy in the extension directory for backward compatibility
            const extensionScriptPath = path.join(extensionPath, script.name);
            try {
                fs.writeFileSync(extensionScriptPath, script.content, { mode: 0o755 });
            } catch (err: any) {
                console.log(`Note: Could not write to extension directory: ${err.message}`);
                // This is expected when installed from marketplace, so we don't treat it as an error
            }
            
            // Set executable permissions for Unix scripts
            if (script.chmod && os.platform() !== 'win32') {
                try {
                    await new Promise<void>((resolve, reject) => {
                        cp.exec(`chmod +x "${script.targetPath}"`, (error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });
                } catch (error) {
                    console.error(`Failed to set permissions for ${script.targetPath}: ${error}`);
                    // Try an alternative method using fs
                    try {
                        fs.chmodSync(script.targetPath, 0o755);
                        console.log(`Set permissions using fs.chmodSync for ${script.targetPath}`);
                    } catch (chmodError) {
                        console.error(`Failed to set permissions using fs.chmodSync: ${chmodError}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to create script ${script.name}: ${error}`);
            throw error;
        }
    }
    
    // Update the configuration to point to the global storage path
    const config = vscode.workspace.getConfiguration('flex');
    const currentPath = config.get<string>('path', '');
    
    // Only update if the current path is the default or old value
    if (!currentPath || currentPath === 'run-flex.js' || currentPath.includes('${workspaceFolder}')) {
        const newPath = path.join(globalStoragePath, 'run-flex.js');
        await config.update('path', newPath, vscode.ConfigurationTarget.Global);
        console.log(`Updated flex.path setting to: ${newPath}`);
    }
}

/**
 * Generates the content for run-flex.js script
 */
function generateRunFlexJsContent(): string {
    return [
        '#!/usr/bin/env node',
        'const fs = require(\'fs\');',
        'const path = require(\'path\');',
        'const os = require(\'os\');',
        'const { execSync, spawn } = require(\'child_process\');',
        '',
        '// Get the input file from command line arguments',
        'let inputFile = process.argv[2];',
        'if (!inputFile) {',
        '    console.error(\'Error: No input file specified\');',
        '    process.exit(1);',
        '}',
        '',
        '// Resolve to absolute path',
        'const absoluteInputPath = path.resolve(process.cwd(), inputFile);',
        '',
        '// Check if file exists',
        'if (!fs.existsSync(absoluteInputPath)) {',
        '    console.error(`Error: File ${absoluteInputPath} does not exist`);',
        '    process.exit(1);',
        '}',
        '',
        '// Get script directory',
        'const scriptDir = path.dirname(process.argv[1]);',
        '',
        '// Try to read settings.json from various locations',
        'let flexSettings = {};',
        'const possibleSettingsLocations = [',
        '    path.join(process.cwd(), \'.vscode\', \'settings.json\'),',
        '    path.join(path.dirname(process.cwd()), \'.vscode\', \'settings.json\'),',
        '    path.join(scriptDir, \'.vscode\', \'settings.json\'),',
        '    path.join(os.homedir(), \'.vscode\', \'settings.json\')',
        '];',
        '',
        'for (const settingsPath of possibleSettingsLocations) {',
        '    try {',
        '        if (fs.existsSync(settingsPath)) {',
        '            const settingsContent = fs.readFileSync(settingsPath, \'utf8\');',
        '            flexSettings = JSON.parse(settingsContent);',
        '            break;',
        '        }',
        '    } catch (error) {',
        '        console.error(`Warning: Error reading settings from ${settingsPath}: ${error.message}`);',
        '    }',
        '}',
        '',
        '// Get Flex interpreter path from settings or use default',
        'let flexInterpreterPath = \'\';',
        'if (flexSettings[\'flex.flexPath\']) {',
        '    flexInterpreterPath = flexSettings[\'flex.flexPath\'];',
        '} else {',
        '    // Use default paths based on OS',
        '    if (os.platform() === \'win32\') {',
        '        flexInterpreterPath = path.join(os.homedir(), \'Flex\', \'src\');',
        '    } else if (os.platform() === \'darwin\') {',
        '        flexInterpreterPath = path.join(os.homedir(), \'Developer\', \'Flex\', \'src\');',
        '    } else {',
        '        flexInterpreterPath = path.join(os.homedir(), \'flex\', \'src\');',
        '    }',
        '}',
        '',
        'console.log(`Using Flex interpreter path: ${flexInterpreterPath}`);',
        'console.log(`To change this, update the flex.flexPath setting in .vscode/settings.json`);',
        '',
        '// Determine the platform',
        'const isWindows = os.platform() === \'win32\';',
        '',
        '// Create and update the platform-specific script',
        'updatePlatformScript(absoluteInputPath, isWindows, flexInterpreterPath);',
        '',
        '// Run the appropriate script',
        'try {',
        '    if (isWindows) {',
        '        // Run the batch script on Windows',
        '        const batchPath = path.join(scriptDir, \'run-flex.bat\');',
        '        console.log(`Updated Windows script at: ${batchPath}`);',
        '        execSync(`"${batchPath}"`, { stdio: \'inherit\' });',
        '    } else {',
        '        // Run the shell script on Unix-like systems',
        '        const shellPath = path.join(scriptDir, \'run-flex.sh\');',
        '        console.log(`Updated Unix script at: ${shellPath}`);',
        '        execSync(`bash "${shellPath}"`, { stdio: \'inherit\' });',
        '    }',
        '} catch (error) {',
        '    console.error(`Error running Flex: ${error.message}`);',
        '    process.exit(1);',
        '}',
        '',
        '/**',
        ' * Updates the platform-specific script for running Flex',
        ' */',
        'function updatePlatformScript(inputFilePath, isWindows, flexInterpreterPath) {',
        '    // Get the USE_AI value from environment or default to false',
        '    const useAI = process.env.USE_AI === \'true\';',
        '    const aiModel = process.env.FLEX_AI_MODEL || \'qwen\';',
        '    ',
        '    // Windows batch script',
        '    if (isWindows) {',
        '        const batchScript = generateWindowsBatchScript(inputFilePath, useAI, aiModel, flexInterpreterPath);',
        '        const batchPath = path.join(scriptDir, \'run-flex.bat\');',
        '        fs.writeFileSync(batchPath, batchScript);',
        '        try {',
        '            // Make the file readable/writable/executable by the owner',
        '            fs.chmodSync(batchPath, 0o755);',
        '        } catch (error) {',
        '            console.warn(`Could not set permissions for ${batchPath}: ${error.message}`);',
        '        }',
        '    } ',
        '    // Unix shell script',
        '    else {',
        '        const shellScript = generateUnixShellScript(inputFilePath, useAI, aiModel, flexInterpreterPath);',
        '        const shellPath = path.join(scriptDir, \'run-flex.sh\');',
        '        fs.writeFileSync(shellPath, shellScript);',
        '        ',
        '        // Ensure the script is executable',
        '        try {',
        '            fs.chmodSync(shellPath, 0o755);',
        '        } catch (error) {',
        '            console.warn(`Could not set permissions using fs: ${error.message}`);',
        '            try {',
        '                execSync(`chmod +x "${shellPath}"`);',
        '            } catch (chmodError) {',
        '                console.error(`Warning: Failed to set permissions for ${shellPath}: ${chmodError.message}`);',
        '            }',
        '        }',
        '    }',
        '}',
        '',
        '/**',
        ' * Generates a Windows batch script for running Flex',
        ' */',
        'function generateWindowsBatchScript(inputFilePath, useAI, aiModel, flexInterpreterPath) {',
        '    return `@echo off',
        'setlocal enabledelayedexpansion',
        '',
        'rem Set environment variables',
        'set "USE_AI=${useAI ? \'true\' : \'false\'}"',
        'set "FLEX_AI_MODEL=${aiModel}"',
        '',
        'rem Change to the Flex interpreter directory',
        'cd "${flexInterpreterPath.replace(/\\//g, \'\\\\\\\\\')}"',
        '',
        'rem Run the Flex interpreter with the specified file',
        'python main.py "${inputFilePath.replace(/\\//g, \'\\\\\\\\\')}"',
        '',
        'exit /b %errorlevel%',
        '`;',
        '}',
        '',
        '/**',
        ' * Generates a Unix shell script for running Flex',
        ' */',
        'function generateUnixShellScript(inputFilePath, useAI, aiModel, flexInterpreterPath) {',
        '    return `#!/bin/bash',
        '',
        '# Set environment variables',
        'export USE_AI="${useAI ? \'true\' : \'false\'}"',
        'export FLEX_AI_MODEL="${aiModel}"',
        '',
        '# Change to the Flex interpreter directory',
        'cd "${flexInterpreterPath}"',
        '',
        '# Run the Flex interpreter with the specified file',
        'python3 main.py "${inputFilePath}"',
        '',
        'exit $?',
        '`;',
        '}',
    ].join('\n');
}

/**
 * Generates the content for the Unix shell script
 */
function generateUnixScriptContent(): string {
    return `#!/bin/bash

# This script is dynamically managed by the VS Code Flex extension
# Manual changes will be overwritten

# Default to running without AI unless explicitly enabled
export USE_AI=false

# Default AI model
export FLEX_AI_MODEL=qwen

# Check if Flex path is provided
if [ -z "$1" ]; then
  echo "Error: No input file specified"
  exit 1
fi

# Get the Flex interpreter path from VS Code settings or use default
FLEX_INTERPRETER_DIR="$HOME/Developer/Flex/src"
if [ -f "$HOME/.vscode/settings.json" ]; then
  FLEX_PATH=$(grep -o '"flex.flexPath": *"[^"]*"' "$HOME/.vscode/settings.json" | cut -d'"' -f4)
  if [ ! -z "$FLEX_PATH" ]; then
    FLEX_INTERPRETER_DIR="$FLEX_PATH"
  fi
fi

# Change to the Flex interpreter directory
cd "$FLEX_INTERPRETER_DIR" || {
  echo "Error: Could not change to Flex interpreter directory: $FLEX_INTERPRETER_DIR"
  exit 1
}

# Execute the Flex interpreter
python3 main.py "$1"
`;
}

/**
 * Generates the content for the Windows batch script
 */
function generateWindowsScriptContent(): string {
    return `@echo off
REM This script is dynamically managed by the VS Code Flex extension
REM Manual changes will be overwritten

REM Default to running without AI unless explicitly enabled
set USE_AI=false

REM Default AI model
set FLEX_AI_MODEL=qwen

REM Check if Flex path is provided
if "%~1"=="" (
  echo Error: No input file specified
  exit /b 1
)

REM Get the Flex interpreter path from VS Code settings or use default
set FLEX_INTERPRETER_DIR=%USERPROFILE%\\Flex\\src
if exist "%USERPROFILE%\\.vscode\\settings.json" (
  for /f "tokens=2 delims=:," %%a in ('findstr /C:"flex.flexPath" "%USERPROFILE%\\.vscode\\settings.json"') do (
    set FLEX_PATH=%%~a
    set FLEX_PATH=!FLEX_PATH:"=!
    set FLEX_PATH=!FLEX_PATH: =!
    if not "!FLEX_PATH!"=="" set FLEX_INTERPRETER_DIR=!FLEX_PATH!
  )
)

REM Change to the Flex interpreter directory
cd /d "%FLEX_INTERPRETER_DIR%" || (
  echo Error: Could not change to Flex interpreter directory: %FLEX_INTERPRETER_DIR%
  exit /b 1
)

REM Execute the Flex interpreter
python main.py "%~1"
`;
}

/**
 * Common handler for running Flex files
 * @param context Extension context
 * @param useAI Whether to enable AI for this run
 */
async function handleFlexRun(context: vscode.ExtensionContext, useAI: boolean): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }
    
    const document = editor.document;
    const fileName = document.fileName;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Check if this is a Flex file
    if (!['.lx', '.flex', '.fx'].includes(fileExtension)) {
        vscode.window.showErrorMessage('Not a Flex file. Supported extensions: .lx, .flex, .fx');
        return;
    }
    
    // Save the file first
    await document.save();
    
    // Check if Flex path is set
    if (!await checkFlexPath(context)) {
        return;
    }
    
    // Get necessary paths and settings
    const config = vscode.workspace.getConfiguration('flex');
    let flexScriptPath = config.get<string>('path', 'run-flex.js');
    flexScriptPath = resolveVariables(flexScriptPath, context);
    
    // Create status bar item if it doesn't exist
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        context.subscriptions.push(statusBarItem);
    }
    
    // Create terminal if it doesn't exist or reuse existing one
    if (!terminal) {
        terminal = vscode.window.createTerminal(useAI ? 'Flex with AI' : 'Flex');
    }
    terminal.show();
    
    // Clear previous process if any
    if (currentChildProcess) {
        await stopRunningProcess();
    }
    
    // Set the status bar message
    statusBarItem.text = useAI 
        ? '$(sync~spin) Running Flex with AI...' 
        : '$(sync~spin) Running Flex...';
    statusBarItem.tooltip = useAI
        ? `Running with AI: ${path.basename(fileName)}`
        : `Running: ${path.basename(fileName)}`;
    statusBarItem.show();
    
    // Quote the file path to handle spaces
    const escapedFilePath = escapePath(fileName);
    
    // Setup environment variables with AI configuration
    const env = setupAIEnvironment(useAI);
    
    // Run the command using the extensionPath to ensure scripts are found
    const scriptFullPath = path.isAbsolute(flexScriptPath) 
        ? flexScriptPath
        : path.join(context.extensionPath, flexScriptPath);
    
    // Use an absolute path to the run-flex.js script
    const command = `node "${scriptFullPath}" "${escapedFilePath}"`;
    
    vscode.window.showInformationMessage(useAI 
        ? `Running with AI: ${path.basename(fileName)}`
        : `Running: ${path.basename(fileName)}`);
    
    try {
        currentChildProcess = cp.exec(command, { env });
        
        currentChildProcess.stdout?.on('data', (data) => {
            console.log(`Flex output: ${data}`);
        });
        
        currentChildProcess.stderr?.on('data', (data) => {
            console.error(`Flex error: ${data}`);
            vscode.window.showErrorMessage(`Flex error: ${data}`);
        });
        
        currentChildProcess.on('close', (code) => {
            console.log(`Flex process exited with code ${code}`);
            if (statusBarItem) {
                statusBarItem.text = code === 0 
                    ? useAI ? '$(check) Flex with AI: Success' : '$(check) Flex: Success'
                    : useAI ? '$(error) Flex with AI: Error' : '$(error) Flex: Error';
                
                // Reset after 5 seconds
                setTimeout(() => {
                    if (statusBarItem) {
                        statusBarItem.hide();
                    }
                }, 5000);
            }
            
            currentChildProcess = null;
        });
    } catch (error) {
        console.error(`Failed to run Flex${useAI ? ' with AI' : ''}:`, error);
        vscode.window.showErrorMessage(`Failed to run Flex${useAI ? ' with AI' : ''}: ${error}`);
        if (statusBarItem) {
            statusBarItem.text = useAI ? '$(error) Flex with AI: Error' : '$(error) Flex: Error';
            setTimeout(() => {
                if (statusBarItem) {
                    statusBarItem.hide();
                }
            }, 5000);
        }
    }
}

/**
 * Stops any running Flex process
 */
async function stopRunningProcess(): Promise<void> {
    if (currentChildProcess && currentChildProcess.pid) {
        try {
            const platform = os.platform();
            if (platform === 'win32') {
                // On Windows, use taskkill
                cp.exec(`taskkill /pid ${currentChildProcess.pid} /T /F`);
            } else {
                // On Unix-like systems, use kill
                process.kill(-currentChildProcess.pid, 'SIGKILL');
            }
        } catch (error) {
            console.error('Error stopping process:', error);
        }
        
        currentChildProcess = null;
    }
    
    if (statusBarItem) {
        statusBarItem.text = '$(debug-stop) Flex: Stopped';
        setTimeout(() => {
            if (statusBarItem) {
                statusBarItem.hide();
            }
        }, 3000);
    }
}

/**
 * Escapes a file path for use in command line
 * @param filePath The file path to escape
 * @returns The escaped file path
 */
function escapePath(filePath: string): string {
    // On Windows, no additional escaping is needed for double-quoted paths
    // On Unix-like systems, escape spaces and other special characters
    if (os.platform() === 'win32') {
        return filePath;
    } else {
        // For Unix-like systems, escape spaces and special characters
        return filePath.replace(/(["\s'$`\\!])/g, '\\$1');
    }
}

/**
 * Update the checkSindbadPath function to check for Flex path instead
 */
async function checkFlexPath(context: ExtensionContext): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('flex');
    let flexPath = config.get<string>('flexPath', '');
    
    if (!flexPath) {
        const choices = ['Set Path', 'Download Flex', 'Not Now'];
        const choice = await vscode.window.showInformationMessage(
            'Flex interpreter is not found. Would you like to download it or set the path manually?',
            ...choices
        );
        
        if (choice === 'Set Path') {
            // Try to find the Flex path in common locations
            const commonLocations = getCommonFlexLocations();
            
            for (const location of commonLocations) {
                if (fs.existsSync(path.join(location, 'main.py'))) {
                    const foundPath = location;
                    await config.update('flexPath', foundPath, true);
                    vscode.window.showInformationMessage(`Flex path set to: ${foundPath}`);
                    return true;
                }
            }
            
            // If not found automatically, ask the user to browse
            const selectedPath = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Flex Interpreter Directory'
            });
            
            if (selectedPath && selectedPath.length > 0) {
                const selectedDir = selectedPath[0].fsPath;
                await config.update('flexPath', selectedDir, true);
                vscode.window.showInformationMessage(`Flex path set to: ${selectedDir}`);
                return true;
            } else {
                vscode.window.showErrorMessage('Flex path is required to run Flex files');
                return false;
            }
        } else if (choice === 'Download Flex') {
            // Offer to download Flex based on platform
            return await promptFlexDownload(context);
        } else {
            return false;
        }
    }
    
    return true;
}

/**
 * Prompt user to download the Flex interpreter
 */
async function promptFlexDownload(context: ExtensionContext): Promise<boolean> {
    const platform = os.platform();
    let downloadUrl = '';
    let installerName = '';
    
    // Get the latest release info
    try {
        const latestRelease = await getLatestReleaseInfo();
        if (!latestRelease) {
            throw new Error('Could not fetch latest release information');
        }
        
        if (platform === 'win32') {
            downloadUrl = latestRelease.windows;
            installerName = 'flex-installer-win.exe';
        } else if (platform === 'darwin') {
            downloadUrl = latestRelease.macos;
            installerName = 'flex-installer-mac.pkg';
        } else {
            downloadUrl = latestRelease.linux;
            installerName = 'flex-installer-linux.rpm';
        }
        
        // If we couldn't get a download URL, open the releases page instead
        if (!downloadUrl) {
            const result = await vscode.window.showInformationMessage(
                'Could not automatically find the installer for your platform. Would you like to open the releases page?',
                'Open Releases Page', 'Cancel'
            );
            
            if (result === 'Open Releases Page') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/mikawi/flex/releases'));
            }
            return false;
        }
        
        // Show download progress
        const downloadResult = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Downloading Flex installer...`,
            cancellable: true
        }, async (progress, token) => {
            // Create download directory
            const downloadDir = path.join(os.tmpdir(), 'flex-download');
            fs.mkdirSync(downloadDir, { recursive: true });
            const installerPath = path.join(downloadDir, installerName);
            
            try {
                // Download the installer
                await downloadFile(downloadUrl, installerPath, progress);
                return installerPath;
            } catch (err: any) {
                console.error('Download failed:', err);
                vscode.window.showErrorMessage(`Failed to download Flex: ${err.message}`);
                return null;
            }
        });
        
        if (!downloadResult) {
            return false;
        }
        
        // Run the installer
        const installResult = await vscode.window.showInformationMessage(
            'Flex installer downloaded. Would you like to run it now?',
            'Run Installer', 'Cancel'
        );
        
        if (installResult === 'Run Installer') {
            // Run the installer based on platform
            let installProcess: cp.ChildProcess;
            
            if (platform === 'win32') {
                installProcess = cp.spawn(downloadResult, [], { detached: true, stdio: 'ignore' });
            } else if (platform === 'darwin') {
                installProcess = cp.spawn('open', [downloadResult], { detached: true, stdio: 'ignore' });
            } else {
                // For Linux, we might need sudo
                vscode.window.showInformationMessage(
                    'Please run the downloaded installer with sudo permissions from your terminal.',
                    { modal: true }
                );
                
                // Open the directory containing the installer
                cp.spawn('xdg-open', [path.dirname(downloadResult)], { detached: true, stdio: 'ignore' });
            }
            
            // After installation, check if Flex path exists in common locations
            vscode.window.showInformationMessage(
                'After installation completes, please restart VS Code for the changes to take effect.'
            );
            
            return true;
        }
    } catch (error: any) {
        console.error('Error during download process:', error);
        vscode.window.showErrorMessage(`Error downloading Flex: ${error.message}`);
        return false;
    }
    
    return false;
}

/**
 * Get information about the latest release from GitHub
 */
async function getLatestReleaseInfo(): Promise<{ version: string, windows: string, macos: string, linux: string } | null> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/mikawi/flex/releases/latest',
            headers: {
                'User-Agent': 'VS Code Flex Extension'
            },
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`GitHub API returned status code ${res.statusCode}`);
                    reject(new Error(`GitHub API returned status code ${res.statusCode}`));
                    return;
                }
                
                try {
                    const release = JSON.parse(data);
                    const result = {
                        version: release.tag_name,
                        windows: '',
                        macos: '',
                        linux: ''
                    };
                    
                    // Find asset URLs for each platform
                    for (const asset of release.assets) {
                        if (asset.name.includes('win.exe')) {
                            result.windows = asset.browser_download_url;
                        } else if (asset.name.includes('mac.pkg')) {
                            result.macos = asset.browser_download_url;
                        } else if (asset.name.includes('linux.rpm')) {
                            result.linux = asset.browser_download_url;
                        }
                    }
                    
                    resolve(result);
                } catch (err) {
                    console.error('Error parsing GitHub response:', err);
                    reject(err);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('Error fetching release info:', err);
            reject(err);
        });
        
        req.end();
    });
}

/**
 * Download a file from a URL to a local path with progress reporting
 */
async function downloadFile(url: string, destination: string, progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        
        http.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download, status code: ${response.statusCode}`));
                return;
            }
            
            const totalSize = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (progress && totalSize > 0) {
                    const percent = Math.round((downloadedSize / totalSize) * 100);
                    progress.report({
                        message: `${percent}% (${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB)`,
                        increment: 100 / (totalSize / chunk.length)
                    });
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destination, () => {});
            reject(err);
        });
    });
}

/**
 * Get common Flex installation locations based on platform
 */
function getCommonFlexLocations(): string[] {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    if (platform === 'win32') {
        return [
            path.join(homeDir, 'Flex', 'src'),
            path.join('C:', 'Program Files', 'Flex', 'src'),
            path.join('C:', 'Flex', 'src')
        ];
    } else if (platform === 'darwin') {
        return [
            path.join(homeDir, 'Developer', 'Flex', 'src'),
            path.join(homeDir, 'Library', 'Application Support', 'Flex', 'src'),
            '/usr/local/flex/src',
            '/opt/flex/src'
        ];
    } else {
        // Linux and others
        return [
            path.join(homeDir, 'flex', 'src'),
            path.join(homeDir, '.local', 'share', 'flex', 'src'),
            '/usr/local/share/flex/src',
            '/usr/share/flex/src',
            '/opt/flex/src'
        ];
    }
}