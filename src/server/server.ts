import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    Position,
    Range,
    Hover,
    HoverParams,
    DocumentSymbolParams,
    DocumentSymbol,
    SymbolKind,
    CodeActionParams,
    CodeAction,
    CodeActionKind,
    Definition,
    ReferenceParams,
    Location
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Define Flex keywords, types, and built-in functions
const flexKeywords: string[] = [
    'cond', 'else', 'elif', 'for', 'fun', 'rg3', 'geeb', 'etb3', 'da5l',
    // Adding common string literals from the sample file
    'Test', 'Flex', 'program', 'with', 'lx', 'extension', 'Variable', 'declarations',
    'Function', 'definition', 'Main', 'Loop', 'example', 'Conditional',
    'Using', 'imported', 'functionality', 'User', 'input',
    // Adding common words in strings and comments
    'Hello', 'true', 'Welcome', 'to', 'The', 'factorial', 'of', 'is', 'Counting', 'from',
    'Number', 'greater', 'than', 'equal', 'less', 'This', 'would', 'another', 'file',
    'Please', 'enter', 'your', 'name', 'multiple', 'parameters', 'area'
];

const flexTypes = [
    'int', 'rakm', 'float', 'kasr', 'string', 
    'nass', 'bool', 'so2al', 'list', 'dorg'
];

const flexBuiltinFunctions = [
    'print', 'etb3', 'da5l', 'input'
];

// Comment patterns
const singleLineCommentPattern = /\/\/.*$/;
const multiLineCommentStartPattern = /\/\*/;
const multiLineCommentEndPattern = /\*\//;

// Variable declaration patterns - enhanced to detect variables in comments
const variableDeclarationPattern = /(?:int|rakm|float|kasr|string|nass|bool|so2al|list|dorg)[ \t]+([a-zA-Z_][a-zA-Z0-9_]*)[ \t]*(?:=|$)/;
const commentedVariablePattern = /\/\/[ \t]*(?:int|rakm|float|kasr|string|nass|bool|so2al|list|dorg)[ \t]+([a-zA-Z_][a-zA-Z0-9_]*)[ \t]*(?:=|$)/;

// Function declaration pattern
const functionDeclarationPattern = /fun[ \t]+([a-zA-Z_][a-zA-Z0-9_]*)[ \t]*\(/;

// Server state
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

// Document symbol information
interface FlexDocumentSymbol {
    name: string;
    kind: SymbolKind;
    range: Range;
    selectionRange: Range;
    detail?: string;
    children?: FlexDocumentSymbol[];
}

// Store variable declarations per document
const documentVariables = new Map<string, Set<string>>();
// Store document symbols per document
const documentSymbols = new Map<string, FlexDocumentSymbol[]>();

// Documentation for Flex constructs
const flexKeywordsDocumentation = new Map<string, string>([
    ['fun', 'Flex function definition keyword.\n\nUsage: fun functionName(parameters) { ... }'],
    ['cond', 'Flex conditional statement.\n\nUsage: cond (condition) { ... } [elif (condition) { ... }] [else { ... }]'],
    ['for', 'Flex for loop.\n\nUsage: for (initialization; condition; increment) { ... }'],
    ['while', 'Flex while loop.\n\nUsage: while (condition) { ... }'],
    ['rg3', 'Return a value from a function.\n\nUsage: rg3 expression'],
    ['etb3', 'Print to the console.\n\nUsage: etb3(expression)'],
    ['geeb', 'Import functionality from another file.\n\nUsage: geeb "filename.lx|filename.flex|filename.fx"'],
    ['rakm', 'Integer data type.\n\nUsage: rakm variableName = value'],
    ['kasr', 'Floating-point number data type.\n\nUsage: kasr variableName = value'],
    ['nass', 'String data type.\n\nUsage: nass variableName = "value"'],
    ['so2al', 'Boolean data type.\n\nUsage: so2al variableName = true/false'],
    ['dorg', 'List/Array data type.\n\nUsage: dorg variableName = [value1, value2, ...]'],
    ['true', 'Boolean true value'],
    ['false', 'Boolean false value']
]);

const flexTypesDocumentation = new Map<string, string>([
    ['int', 'Integer data type.\n\nUsage: int variableName = value'],
    ['rakm', 'Integer data type.\n\nUsage: rakm variableName = value'],
    ['float', 'Floating-point number data type.\n\nUsage: float variableName = value'],
    ['kasr', 'Floating-point number data type.\n\nUsage: kasr variableName = value'],
    ['string', 'String data type.\n\nUsage: string variableName = "value"'],
    ['nass', 'String data type.\n\nUsage: nass variableName = "value"'],
    ['bool', 'Boolean data type.\n\nUsage: bool variableName = true/false'],
    ['so2al', 'Boolean data type.\n\nUsage: so2al variableName = true/false'],
    ['list', 'List/Array data type.\n\nUsage: list variableName = [value1, value2, ...]'],
    ['dorg', 'List/Array data type.\n\nUsage: dorg variableName = [value1, value2, ...]']
]);

const flexBuiltinFunctionsDocumentation = new Map<string, string>([
    ['print', 'Print to the console.\n\nUsage: print(expression)'],
    ['etb3', 'Print to the console.\n\nUsage: etb3(expression)'],
    ['geeb', 'Import functionality from another file.\n\nUsage: geeb "filename.lx|filename.flex|filename.fx"'],
    ['rakm', 'Integer data type.\n\nUsage: rakm variableName = value'],
    ['da5l', 'Gets input from the user.\n\nUsage: da5l'],
    ['input', 'Gets input from the user.\n\nUsage: input']
]);

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Check if client supports configuration
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    
    // Check if client supports workspace folders
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    
    // Check if client supports diagnostic related information
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.']
            },
            // Add definition provider capability
            definitionProvider: true,
            // Add references provider capability
            referencesProvider: true,
            // Add hover provider capability
            hoverProvider: true,
            // Add document symbol provider capability
            documentSymbolProvider: true,
            // Add code action provider capability
            codeActionProvider: {
                codeActionKinds: [CodeActionKind.QuickFix]
            }
        }
    };
    
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// Define settings interface
interface FlexSettings {
    linting: {
        enable: boolean;
        maxNumberOfProblems?: number;
    };
    formatting: {
        enable: boolean;
    };
    path: string;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client
const defaultSettings: FlexSettings = {
    linting: {
        enable: true,
        maxNumberOfProblems: 100
    },
    formatting: {
        enable: true
    },
    path: ''
};
let globalSettings: FlexSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<FlexSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <FlexSettings>(
            (change.settings.flex || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    // Also clear document variables and symbols
    documentVariables.delete(e.document.uri);
    documentSymbols.delete(e.document.uri);
});

// Track symbol definitions and references
interface SymbolDefinition {
    name: string;
    kind: 'variable' | 'function' | 'parameter';
    range: Range;
    uri: string;
    references: Range[];
}

// Store symbol definitions per document
const documentSymbolDefinitions = new Map<string, SymbolDefinition[]>();

// Update symbol definitions for a document
function updateSymbolDefinitions(document: TextDocument): void {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const uri = document.uri;
    
    const symbols: SymbolDefinition[] = [];
    
    // Track if we're inside a function declaration
    let currentFunction: SymbolDefinition | null = null;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip comments
        if (line.trim().startsWith('//')) {
            continue;
        }
        
        // Check for function declarations
        const funcMatch = line.match(/\b(fun|sndo2)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (funcMatch) {
            const funcName = funcMatch[2];
            const startChar = line.indexOf(funcName);
            
            currentFunction = {
                name: funcName,
                kind: 'function',
                range: {
                    start: { line: i, character: startChar },
                    end: { line: i, character: startChar + funcName.length }
                },
                uri,
                references: []
            };
            
            symbols.push(currentFunction);
            
            // Extract parameters
            const paramSection = line.substring(line.indexOf('(') + 1);
            const paramEnd = paramSection.indexOf(')');
            if (paramEnd !== -1) {
                const params = paramSection.substring(0, paramEnd).split(',');
                
                for (const param of params) {
                    const paramMatch = param.trim().match(/(?:(int|rakm|float|kasr|string|nass|bool|so2al|list|dorg)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/);
                    if (paramMatch) {
                        const paramName = paramMatch[2];
                        const paramStartChar = line.indexOf(paramName);
                        
                        symbols.push({
                            name: paramName,
                            kind: 'parameter',
                            range: {
                                start: { line: i, character: paramStartChar },
                                end: { line: i, character: paramStartChar + paramName.length }
                            },
                            uri,
                            references: []
                        });
                    }
                }
            }
        }
        
        // Check for variable declarations
        const varMatch = line.match(/\b(int|rakm|float|kasr|string|nass|bool|so2al|list|dorg)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/);
        if (varMatch) {
            const varName = varMatch[2];
            const startChar = line.indexOf(varName);
            
            symbols.push({
                name: varName,
                kind: 'variable',
                range: {
                    start: { line: i, character: startChar },
                    end: { line: i, character: startChar + varName.length }
                },
                uri,
                references: []
            });
        }
        
        // Check for variable assignments without type (inferred type)
        const assignMatch = line.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
        if (assignMatch && !varMatch) { // Only if not already matched as a typed variable
            const varName = assignMatch[1];
            const startChar = line.indexOf(varName);
            
            // Skip if it's a known keyword
            if (flexKeywords.includes(varName) || flexTypes.includes(varName) || flexBuiltinFunctions.includes(varName)) {
                continue;
            }
            
            // Check if this variable is already defined
            const existingVar = symbols.find(s => s.name === varName && s.kind === 'variable');
            if (!existingVar) {
                symbols.push({
                    name: varName,
                    kind: 'variable',
                    range: {
                        start: { line: i, character: startChar },
                        end: { line: i, character: startChar + varName.length }
                    },
                    uri,
                    references: []
                });
            }
        }
    }
    
    // Find references for all symbols
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip comments
        if (line.trim().startsWith('//')) {
            continue;
        }
        
        // Check each symbol
        for (const symbol of symbols) {
            const pattern = new RegExp(`\\b${symbol.name}\\b`, 'g');
            let match;
            
            while ((match = pattern.exec(line)) !== null) {
                const startChar = match.index;
                
                // Skip if this is the definition itself
                if (i === symbol.range.start.line && startChar === symbol.range.start.character) {
                    continue;
                }
                
                // Add as a reference
                symbol.references.push({
                    start: { line: i, character: startChar },
                    end: { line: i, character: startChar + symbol.name.length }
                });
            }
        }
    }
    
    // Store the symbols
    documentSymbolDefinitions.set(uri, symbols);
}

// Handle definition requests
connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    
    // Get the word at the position
    const wordRange = getWordRangeAtPosition(document, params.position);
    if (!wordRange) {
        return null;
    }
    
    const word = document.getText(wordRange);
    
    // Get the symbols for this document
    const symbols = documentSymbolDefinitions.get(params.textDocument.uri) || [];
    
    // Find the symbol definition
    const symbol = symbols.find(s => s.name === word);
    if (symbol) {
        return {
            uri: symbol.uri,
            range: symbol.range
        };
    }
    
    return null;
});

// Handle references requests
connection.onReferences((params: ReferenceParams): Location[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    
    // Get the word at the position
    const wordRange = getWordRangeAtPosition(document, params.position);
    if (!wordRange) {
        return [];
    }
    
    const word = document.getText(wordRange);
    
    // Get the symbols for this document
    const symbols = documentSymbolDefinitions.get(params.textDocument.uri) || [];
    
    // Find the symbol
    const symbol = symbols.find(s => s.name === word);
    if (!symbol) {
        return [];
    }
    
    // Create locations for the definition and all references
    const locations: Location[] = [
        {
            uri: symbol.uri,
            range: symbol.range
        }
    ];
    
    // Add all references
    for (const refRange of symbol.references) {
        locations.push({
            uri: symbol.uri,
            range: refRange
        });
    }
    
    return locations;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    updateDocumentSymbols(change.document);
    updateSymbolDefinitions(change.document);
    validateTextDocument(change.document);
});

// Implement hover support
connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    
    const position = params.position;
    const offset = document.offsetAt(position);
    const text = document.getText();
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line + 1, character: 0 }
    });
    
    // Extract the word under cursor
    const wordRange = getWordRangeAtPosition(document, position);
    if (!wordRange) {
        return null;
    }
    
    const word = document.getText(wordRange);
    
    // Check if it's a keyword
    if (flexKeywords.includes(word) || flexTypes.includes(word) || flexBuiltinFunctions.includes(word)) {
        const documentation = flexKeywordsDocumentation.get(word) || `Flex keyword: ${word}`;
        return {
            contents: {
                kind: 'markdown',
                value: documentation
            }
        };
    }
    
    // Check if it's a variable
    const docVariables = documentVariables.get(document.uri);
    if (docVariables && docVariables.has(word)) {
        return {
            contents: {
                kind: 'markdown',
                value: `Variable: \`${word}\``
            }
        };
    }
    
    // Check if it's a function
    const docSymbols = documentSymbols.get(document.uri);
    if (docSymbols) {
        const symbol = findSymbol(docSymbols, word);
        if (symbol && symbol.kind === SymbolKind.Function) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `Function: \`${word}\`${symbol.detail ? `\n\n${symbol.detail}` : ''}`
                }
            };
        }
    }
    
    return null;
});

// Helper to find symbol in the document symbols
function findSymbol(symbols: FlexDocumentSymbol[], name: string): FlexDocumentSymbol | undefined {
    for (const symbol of symbols) {
        if (symbol.name === name) {
            return symbol;
        }
        if (symbol.children) {
            const found = findSymbol(symbol.children, name);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

// Helper function to get the word range at a position
function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    
    if (position.line >= lines.length) {
        return null;
    }
    
    const line = lines[position.line];
    
    if (position.character >= line.length) {
        return null;
    }
    
    // Find the start of the word
    let start = position.character;
    while (start > 0 && /[a-zA-Z0-9_]/.test(line[start - 1])) {
        start--;
    }
    
    // Find the end of the word
    let end = position.character;
    while (end < line.length && /[a-zA-Z0-9_]/.test(line[end])) {
        end++;
    }
    
    // If the cursor is not on a word, return null
    if (start === end) {
        return null;
    }
    
    return {
        start: { line: position.line, character: start },
        end: { line: position.line, character: end }
    };
}

// Implement document symbol provider
connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
    const uri = params.textDocument.uri;
    const document = documents.get(uri);
    if (!document) {
        return [];
    }
    
    // Check if we have cached symbols
    const cachedSymbols = documentSymbols.get(uri);
    if (cachedSymbols) {
        return cachedSymbols as DocumentSymbol[];
    }
    
    // If not, update the symbols and return
    updateDocumentSymbols(document);
    return documentSymbols.get(uri) as DocumentSymbol[] || [];
});

// Update document symbols
function updateDocumentSymbols(document: TextDocument): void {
    const uri = document.uri;
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    
    const symbols: FlexDocumentSymbol[] = [];
    const variables = new Set<string>();
    
    // Process each line
    lines.forEach((line, lineIndex) => {
        // Check for function declarations
        const functionMatch = functionDeclarationPattern.exec(line);
        if (functionMatch) {
            const functionName = functionMatch[1];
            const startChar = line.indexOf(functionName);
            const endChar = startChar + functionName.length;
            
            symbols.push({
                name: functionName,
                kind: SymbolKind.Function,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: line.length }
                },
                selectionRange: {
                    start: { line: lineIndex, character: startChar },
                    end: { line: lineIndex, character: endChar }
                }
            });
        }
        
        // Check for variable declarations
        const variableMatch = variableDeclarationPattern.exec(line);
        if (variableMatch) {
            const variableName = variableMatch[1];
            variables.add(variableName);
            
            const startChar = line.indexOf(variableName);
            const endChar = startChar + variableName.length;
            
            symbols.push({
                name: variableName,
                kind: SymbolKind.Variable,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: line.length }
                },
                selectionRange: {
                    start: { line: lineIndex, character: startChar },
                    end: { line: lineIndex, character: endChar }
                }
            });
        }
        
        // Check for commented variable declarations
        const commentedVarMatch = commentedVariablePattern.exec(line);
        if (commentedVarMatch) {
            const variableName = commentedVarMatch[1];
            variables.add(variableName);
            
            const startChar = line.indexOf(variableName);
            const endChar = startChar + variableName.length;
            
            symbols.push({
                name: variableName,
                kind: SymbolKind.Variable,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: line.length }
                },
                selectionRange: {
                    start: { line: lineIndex, character: startChar },
                    end: { line: lineIndex, character: endChar }
                }
            });
        }
    });
    
    // Store symbols and variables for the document
    documentSymbols.set(uri, symbols);
    documentVariables.set(uri, variables);
}

// Implement code actions
connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    
    const actions: CodeAction[] = [];
    
    // Process diagnostics to offer quick fixes
    params.context.diagnostics.forEach(diagnostic => {
        if (diagnostic.message.includes("might not be declared")) {
            const match = /Variable '([^']+)' might not be declared/.exec(diagnostic.message);
            if (match) {
                const variableName = match[1];
                
                // Add a quick fix to declare the variable
                actions.push({
                    title: `Declare '${variableName}' as variable`,
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    edit: {
                        changes: {
                            [params.textDocument.uri]: [{
                                range: {
                                    start: { line: diagnostic.range.start.line, character: 0 },
                                    end: { line: diagnostic.range.start.line, character: 0 }
                                },
                                newText: `rakm ${variableName} = 0\n`
                            }]
                        }
                    }
                });
            }
        }
    });
    
    return actions;
});

// Implement code completion
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        const document = documents.get(_textDocumentPosition.textDocument.uri);
        if (!document) {
            return [];
        }
        
        const completionItems: CompletionItem[] = [];
        
        // Add keywords
        flexKeywords.forEach(keyword => {
            completionItems.push({
                label: keyword,
                kind: CompletionItemKind.Keyword,
                data: `keyword_${keyword}`
            });
        });
        
        // Add types
        flexTypes.forEach(type => {
            completionItems.push({
                label: type,
                kind: CompletionItemKind.TypeParameter,
                data: `type_${type}`
            });
        });
        
        // Add built-in functions
        flexBuiltinFunctions.forEach(func => {
            completionItems.push({
                label: func,
                kind: CompletionItemKind.Function,
                data: `function_${func}`
            });
        });

        // Add variables and functions from the current document
        const text = document.getText();
        const variableDeclarationRegex = /(rakm|kasr|nass|so2al|dorg)\s+(\w+)\s*=/g;
        const functionDeclarationRegex = /(fun|sndo2)\s+(\w+)\s*\(/g;
        
        let match;
        
        // Find variable declarations
        while ((match = variableDeclarationRegex.exec(text)) !== null) {
            const varName = match[2];
            const varType = match[1];
            
            // Avoid duplicates
            if (!completionItems.some(item => item.label === varName)) {
                completionItems.push({
                    label: varName,
                    kind: CompletionItemKind.Variable,
                    detail: `${varType} variable`,
                    data: `variable_${varName}`
                });
            }
        }
        
        // Find function declarations
        while ((match = functionDeclarationRegex.exec(text)) !== null) {
            const funcName = match[2];
            
            // Avoid duplicates
            if (!completionItems.some(item => item.label === funcName)) {
                completionItems.push({
                    label: funcName,
                    kind: CompletionItemKind.Function,
                    detail: 'User defined function',
                    data: `function_${funcName}`
                });
            }
        }
        
        return completionItems;
    }
);

// This handler resolves additional information for the item selected in the completion list
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        const dataParts = item.data.split('_');
        const type = dataParts[0];
        const value = dataParts.slice(1).join('_');
        
        if (type === 'keyword') {
            item.detail = 'Flex Keyword';
            item.documentation = flexKeywordsDocumentation.get(value) || '';
        } else if (type === 'type') {
            item.detail = 'Flex Type';
            item.documentation = flexTypesDocumentation.get(value) || '';
        } else if (type === 'function') {
            if (flexBuiltinFunctionsDocumentation.has(value)) {
                item.detail = 'Flex Built-in Function';
                item.documentation = flexBuiltinFunctionsDocumentation.get(value) || '';
            } else {
                item.detail = 'User Defined Function';
                // For user defined functions, we don't have documentation
                // We could try to extract the function signature here
                item.documentation = 'User defined function';
            }
        } else if (type === 'variable') {
            // For variables, detail is already set in the completion provider
            item.documentation = 'User defined variable';
            
            // Try to find the variable's value if possible
            const uri = item.data.split('_')[2]; // Extract URI if it was added
            if (uri) {
                const document = documents.get(uri);
                if (document) {
                    const text = document.getText();
                    const regex = new RegExp(`(rakm|kasr|nass|so2al|dorg)\\s+${value}\\s*=\\s*([^;\\n]+)`, 'g');
                    const match = regex.exec(text);
                    if (match) {
                        item.documentation += `\nInitial value: ${match[2].trim()}`;
                    }
                }
            }
        }
        
        return item;
    }
);

// Helper function to get document settings
function getDocumentSettings(resource: string): Thenable<FlexSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'flex'
        });
        documentSettings.set(resource, result);
    }
    
    return result;
}

// Handle lint command from client
connection.onNotification('flex/lint', () => {
    documents.all().forEach(validateTextDocument);
});

// Validate document for diagnostics
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // Get the text of the document
    const text = textDocument.getText();
    const settings = await getDocumentSettings(textDocument.uri);
    
    // Skip validation if linting is disabled
    if (!settings.linting.enable) {
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }
    
    const maxNumberOfProblems = settings.linting.maxNumberOfProblems || 100;
    const diagnostics: Diagnostic[] = [];
    
    // Track line and character positions
    let lines = text.split(/\r?\n/);
    
    // Track brace/bracket/parenthesis matching
    const openBraces: { char: string, line: number, character: number }[] = [];
    const bracePairs: { [key: string]: string } = {
        '{': '}',
        '[': ']',
        '(': ')'
    };
    
    // Track variable declarations and usages
    const declaredVariables = new Set<string>();
    const usedVariables = new Set<string>();
    
    // Track function declarations and calls
    const declaredFunctions = new Set<string>();
    const calledFunctions = new Set<string>();
    
    // Track if we're inside a multiline comment
    let inMultilineComment = false;
    
    // Process each line
    for (let i = 0; i < lines.length && diagnostics.length < maxNumberOfProblems; i++) {
        const line = lines[i];
        
        // Skip processing if we're in a multiline comment
        if (inMultilineComment) {
            const commentEndIndex = line.indexOf('*/');
            if (commentEndIndex !== -1) {
                inMultilineComment = false;
            }
            continue;
        }
        
        // Check for multiline comment start
        const commentStartIndex = line.indexOf('/*');
        if (commentStartIndex !== -1) {
            const commentEndIndex = line.indexOf('*/', commentStartIndex + 2);
            if (commentEndIndex === -1) {
                inMultilineComment = true;
            }
            continue;
        }
        
        // Skip single-line comments
        if (line.trim().startsWith('//')) {
            continue;
        }
        
        // Process each character for brace matching
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            // Check for opening braces
            if ('{[('.includes(char)) {
                openBraces.push({ char, line: i, character: j });
            }
            // Check for closing braces
            else if ('}])'.includes(char)) {
                if (openBraces.length === 0) {
                    // Unmatched closing brace
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: i, character: j },
                            end: { line: i, character: j + 1 }
                        },
                        message: `Unmatched closing '${char}'`,
                        source: 'flex-linter'
                    });
                } else {
                    const lastBrace = openBraces.pop()!;
                    const expectedClosing = bracePairs[lastBrace.char];
                    
                    if (char !== expectedClosing) {
                        // Mismatched closing brace
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: { line: i, character: j },
                                end: { line: i, character: j + 1 }
                            },
                            message: `Mismatched closing brace. Expected '${expectedClosing}' but found '${char}'`,
                            source: 'flex-linter',
                            relatedInformation: hasDiagnosticRelatedInformationCapability ? [
                                {
                                    location: {
                                        uri: textDocument.uri,
                                        range: {
                                            start: { line: lastBrace.line, character: lastBrace.character },
                                            end: { line: lastBrace.line, character: lastBrace.character + 1 }
                                        }
                                    },
                                    message: `Opening '${lastBrace.char}' is here`
                                }
                            ] : []
                        });
                    }
                }
            }
        }
    }
}