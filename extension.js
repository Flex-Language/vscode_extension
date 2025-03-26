const vscode = require('vscode');

function activate(context) {
    console.log('Flex Language Support is now active!');

    // Register a completion item provider for Flex files
    let provider = vscode.languages.registerCompletionItemProvider('flex', {
        provideCompletionItems(document, position) {
            // Control flow keywords
            const controlFlow = [
                'lw', 'aw', 'gher', 'if', 'elif', 'else', 'otherwise',
                'talama', 'talma', 'tlma', 'while', 'loop',
                'karr', 'l7d', 'for', 'w2f', 'break', 'stop',
                'rg3', 'return', 'cond'
            ];
            
            // Type keywords
            const types = [
                'rakm', 'kasr', 'so2al', 'klma', 'dorg',
                'int', 'float', 'bool', 'string', 'list'
            ];
            
            // Function declarations
            const functionDeclarations = [
                'sndo2', 'sando2', 'fn', 'fun', 'function'
            ];
            
            // I/O operations
            const ioOperations = [
                'etb3', 'out', 'output', 'print', 'printf', 'cout',
                'scan', 'read', 'input', 'da5l', 'da5al', 'd5l'
            ];
            
            // Import statements
            const importStatements = [
                'geep', 'geeb', 'import'
            ];
            
            // Boolean values
            const booleanValues = [
                'sa7', 'ghalt', 'true', 'false', 'True', 'False'
            ];
            
            // List operations
            const listOperations = [
                'push', 'pop', 'remove', 'length'
            ];

            // Operators
            const operators = [
                '+', '-', '*', '/', '++', '--', 
                '==', '!=', '>', '<', '>=', '<=',
                'and', 'or', 'not'
            ];

            // Combine all keywords
            const keywords = [
                ...controlFlow,
                ...types,
                ...functionDeclarations,
                ...ioOperations,
                ...importStatements,
                ...booleanValues
            ];

            // Convert keywords to completion items
            const keywordItems = keywords.map(keyword => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                return item;
            });

            // Convert list operations to completion items
            const listOpItems = listOperations.map(op => {
                const item = new vscode.CompletionItem(op, vscode.CompletionItemKind.Method);
                item.insertText = `.${op}`;
                return item;
            });

            // Convert operators to completion items
            const operatorItems = operators.map(op => {
                return new vscode.CompletionItem(op, vscode.CompletionItemKind.Operator);
            });

            // Add snippets for common patterns
            const snippets = [
                // If statement
                {
                    label: 'if-block',
                    insertText: new vscode.SnippetString('lw ${1:condition} {\n\t${2}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'If statement'
                },
                // If-else statement
                {
                    label: 'if-else-block',
                    insertText: new vscode.SnippetString('lw ${1:condition} {\n\t${2}\n} gher {\n\t${3}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'If-else statement'
                },
                // While loop
                {
                    label: 'while-loop',
                    insertText: new vscode.SnippetString('talama ${1:condition} {\n\t${2}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'While loop'
                },
                // For loop
                {
                    label: 'for-loop',
                    insertText: new vscode.SnippetString('karr ${1:i}=${2:start} l7d ${3:end} {\n\t${4}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'For loop'
                },
                // Function definition
                {
                    label: 'function',
                    insertText: new vscode.SnippetString('sndo2 ${1:name}(${2:params}) {\n\t${3}\n\trg3 ${4:result}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function definition'
                },
                // Print statement
                {
                    label: 'print',
                    insertText: new vscode.SnippetString('etb3("${1:message}")'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Print statement'
                }
            ];

            return [...keywordItems, ...listOpItems, ...operatorItems, ...snippets];
        }
    });

    context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};