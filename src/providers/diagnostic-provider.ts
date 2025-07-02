import * as vscode from 'vscode';
import { builtInFunctions } from '../language/builtins';

export class FlexDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private errorDecorationType: vscode.TextEditorDecorationType;
    private warningDecorationType: vscode.TextEditorDecorationType;
    private hintDecorationType: vscode.TextEditorDecorationType;
    private decorationsMap: Map<string, vscode.Range[]> = new Map();
    private builtInFunctionNames: string[];

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('flex');

        // Create decoration types for different error severities
        this.errorDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy #ff4757'
        });

        this.warningDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline wavy #ffa502'
        });

        this.hintDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline dotted #70a1ff'
        });

        // Extract all built-in function names for spell checking
        this.builtInFunctionNames = Object.keys(builtInFunctions);
    }

    /**
     * Provide diagnostics for a Flex document
     */
    public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'flex') {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        const lines = document.getText().split('\n');

        this.checkBracesBalance(lines, diagnostics);
        this.checkCommonErrors(lines, diagnostics, document);

        this.diagnosticCollection.set(document.uri, diagnostics);

        // Apply underline decorations based on diagnostics
        this.applyDecorations(document, diagnostics);
    }

    /**
     * Apply underline decorations based on diagnostic severity
     */
    private applyDecorations(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === document.uri.toString());
        if (!editor) {
            return;
        }

        // Clear existing decorations for this document
        this.clearDecorations(editor);

        // Group diagnostics by severity
        const errorRanges: vscode.Range[] = [];
        const warningRanges: vscode.Range[] = [];
        const hintRanges: vscode.Range[] = [];

        for (const diagnostic of diagnostics) {
            switch (diagnostic.severity) {
                case vscode.DiagnosticSeverity.Error:
                    errorRanges.push(diagnostic.range);
                    break;
                case vscode.DiagnosticSeverity.Warning:
                    warningRanges.push(diagnostic.range);
                    break;
                case vscode.DiagnosticSeverity.Information:
                case vscode.DiagnosticSeverity.Hint:
                    hintRanges.push(diagnostic.range);
                    break;
            }
        }

        // Apply decorations
        editor.setDecorations(this.errorDecorationType, errorRanges);
        editor.setDecorations(this.warningDecorationType, warningRanges);
        editor.setDecorations(this.hintDecorationType, hintRanges);

        // Store ranges for cleanup
        const documentKey = document.uri.toString();
        this.decorationsMap.set(documentKey, [...errorRanges, ...warningRanges, ...hintRanges]);
    }

    /**
     * Clear decorations for a specific editor
     */
    private clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.errorDecorationType, []);
        editor.setDecorations(this.warningDecorationType, []);
        editor.setDecorations(this.hintDecorationType, []);
    }

    /**
     * Check for balanced braces in the document
     */
    private checkBracesBalance(lines: string[], diagnostics: vscode.Diagnostic[]): void {
        let braceCount = 0;
        let openBraces: { line: number; char: number }[] = [];

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            // Skip content inside strings
            let inString = false;
            let stringChar = '';

            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const prevChar = charIndex > 0 ? line[charIndex - 1] : '';

                // Handle string boundaries
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = '';
                    }
                }

                // Only count braces outside of strings
                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                        openBraces.push({ line: lineIndex, char: charIndex });
                    } else if (char === '}') {
                        braceCount--;
                        if (openBraces.length > 0) {
                            openBraces.pop();
                        }

                        if (braceCount < 0) {
                            // Extra closing brace
                            const range = new vscode.Range(lineIndex, charIndex, lineIndex, charIndex + 1);
                            const diagnostic = new vscode.Diagnostic(
                                range,
                                'Unexpected closing brace - no matching opening brace found',
                                vscode.DiagnosticSeverity.Error
                            );
                            diagnostic.code = 'extra-closing-brace';
                            diagnostics.push(diagnostic);
                            braceCount = 0; // Reset to continue checking
                        }
                    }
                }
            }
        }

        // Check for unclosed braces
        if (braceCount > 0 && openBraces.length > 0) {
            for (const openBrace of openBraces) {
                const range = new vscode.Range(openBrace.line, openBrace.char, openBrace.line, openBrace.char + 1);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'Unclosed brace - missing closing brace',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.code = 'unclosed-brace';
                diagnostics.push(diagnostic);
            }
        }
    }

    /**
     * Check for common Flex coding errors
     */
    private checkCommonErrors(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex].trim();
            const originalLine = lines[lineIndex];

            // Skip comments and empty lines
            if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line === '') {
                continue;
            }

            // Check for incorrect karr loop syntax
            if (line.includes('karr') || line.includes('krr') || line.includes('karar')) {
                this.checkKarrLoopSyntax(line, lineIndex, diagnostics, document);
            }

            // Check for unassigned input functions
            this.checkUnassignedInput(line, lineIndex, diagnostics, document);

            // Check for incorrect logical operators
            this.checkLogicalOperators(line, lineIndex, diagnostics, document);

            // Check for semicolon usage (not required in Flex)
            this.checkSemicolonUsage(originalLine, lineIndex, diagnostics, document);

            // Boolean values (both English and Franco Arabic are equally valid)
            // No need to suggest one over the other

            // Check for missing braces in control structures
            this.checkMissingBraces(line, lineIndex, lines, diagnostics, document);

            // Check for misspelled built-in functions
            this.checkBuiltInFunctionSpelling(line, lineIndex, diagnostics, document);

            // Check for undeclared variables (if strict mode is enabled)
            this.checkVariableDeclarations(line, lineIndex, diagnostics, document);
        }
    }

    private checkKarrLoopSyntax(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Check if karr loop is using C-style syntax
        if (line.match(/karr\s*\([^)]*;[^)]*;[^)]*\)/)) {
            const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Incorrect karr loop syntax. Use: karr i=0 l7d 10 { ... } instead of C-style for loop',
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.code = 'karr-c-style';
            diagnostics.push(diagnostic);
        }

        // Check if karr loop is missing l7d
        if (line.match(/karr\s+\w+\s*=\s*\d+\s+\d+/) && !line.includes('l7d')) {
            const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Missing "l7d" in karr loop. Use: karr i=0 l7d 10 { ... }',
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.code = 'karr-missing-l7d';
            diagnostics.push(diagnostic);
        }
    }

    private checkUnassignedInput(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const inputFunctions = ['da5l()', 'da5al()', 'd5l()', 'scan()', 'read()', 'input()'];

        for (const func of inputFunctions) {
            if (line.includes(func) && !line.includes('=')) {
                const funcIndex = line.indexOf(func);
                const range = new vscode.Range(lineIndex, funcIndex, lineIndex, funcIndex + func.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Input function ${func} should be assigned to a variable. Example: x = ${func}`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'unassigned-input';
                diagnostics.push(diagnostic);
            }
        }
    }

    private checkLogicalOperators(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Flex supports both C-style (&&, ||) and English (and, or) logical operators
        // Provide helpful suggestions for consistency

        const andMatch = line.match(/&&/);
        if (andMatch) {
            const index = line.indexOf('&&');
            const range = new vscode.Range(lineIndex, index, lineIndex, index + 2);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Consider using "and" instead of "&&" for better Flex readability',
                vscode.DiagnosticSeverity.Hint
            );
            diagnostic.code = 'logical-and-suggestion';
            diagnostics.push(diagnostic);
        }

        const orMatch = line.match(/\|\|/);
        if (orMatch) {
            const index = line.indexOf('||');
            const range = new vscode.Range(lineIndex, index, lineIndex, index + 2);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Consider using "or" instead of "||" for better Flex readability',
                vscode.DiagnosticSeverity.Hint
            );
            diagnostic.code = 'logical-or-suggestion';
            diagnostics.push(diagnostic);
        }
    }

    private checkSemicolonUsage(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Check for semicolons at end of statements (not required in Flex)
        if (line.trim().endsWith(';') && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
            const index = line.lastIndexOf(';');
            const range = new vscode.Range(lineIndex, index, lineIndex, index + 1);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Semicolons are not required in Flex. You can remove this semicolon.',
                vscode.DiagnosticSeverity.Information
            );
            diagnostic.code = 'unnecessary-semicolon';
            diagnostics.push(diagnostic);
        }
    }



    private checkMissingBraces(line: string, lineIndex: number, lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Skip comments and empty lines
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*') || trimmedLine === '') {
            return;
        }

        // More precise control structure patterns
        const patterns = [
            // Franco patterns
            { regex: /\blw\b.*(?:\{|$)/, keyword: 'lw', requiresBrace: true },
            { regex: /\baw\b.*(?:\{|$)/, keyword: 'aw', requiresBrace: true },
            { regex: /\bgher\s*(?:\{|$)/, keyword: 'gher', requiresBrace: true },
            { regex: /\btalama\b.*(?:\{|$)/, keyword: 'talama', requiresBrace: true },
            { regex: /\btalma\b.*(?:\{|$)/, keyword: 'talma', requiresBrace: true },
            { regex: /\btlma\b.*(?:\{|$)/, keyword: 'tlma', requiresBrace: true },
            { regex: /\bkarr\b.*l7d.*(?:\{|$)/, keyword: 'karr', requiresBrace: true },
            { regex: /\bkrr\b.*l7d.*(?:\{|$)/, keyword: 'krr', requiresBrace: true },
            { regex: /\bkarar\b.*l7d.*(?:\{|$)/, keyword: 'karar', requiresBrace: true },

            // English patterns
            { regex: /\bif\s*\(.*\).*(?:\{|$)/, keyword: 'if', requiresBrace: true },
            { regex: /\belif\s*\(.*\).*(?:\{|$)/, keyword: 'elif', requiresBrace: true },
            { regex: /\belse\s*(?:\{|$)/, keyword: 'else', requiresBrace: true },
            { regex: /\botherwise\s*(?:\{|$)/, keyword: 'otherwise', requiresBrace: true },
            { regex: /\bwhile\s*\(.*\).*(?:\{|$)/, keyword: 'while', requiresBrace: true },
            { regex: /\bloop\s*\(.*\).*(?:\{|$)/, keyword: 'loop', requiresBrace: true },
            { regex: /\bfor\s*\(.*\).*(?:\{|$)/, keyword: 'for', requiresBrace: true },
        ];

        for (const pattern of patterns) {
            const match = trimmedLine.match(pattern.regex);
            if (match && pattern.requiresBrace) {
                // Check if this line contains the control keyword
                const keywordIndex = trimmedLine.indexOf(pattern.keyword);
                if (keywordIndex === -1) {
                    continue;
                }

                // Check if there's an opening brace in the logical place
                let hasBrace = false;

                // Case 1: Brace on the same line
                if (trimmedLine.includes('{')) {
                    // Make sure the brace comes after the control structure, not in a string or comment
                    const braceIndex = trimmedLine.indexOf('{');
                    const keywordEndIndex = keywordIndex + pattern.keyword.length;

                    // Simple check: brace should come after the keyword (including immediately after)
                    if (braceIndex >= keywordEndIndex) {
                        hasBrace = true;
                    }
                }

                // Case 2: Brace on the next line
                if (!hasBrace && lineIndex + 1 < lines.length) {
                    const nextLine = lines[lineIndex + 1].trim();
                    if (nextLine.startsWith('{') || nextLine === '{') {
                        hasBrace = true;
                    }
                }

                // Case 3: Single-line control structures (valid in some contexts)
                // For now, we'll be strict and require braces

                // Only flag as error if no brace is found
                if (!hasBrace) {
                    // Additional check: make sure this isn't part of a larger expression
                    // Skip if the line appears to be inside a string or has unmatched quotes
                    const quoteCount = (trimmedLine.match(/"/g) || []).length;
                    const singleQuoteCount = (trimmedLine.match(/'/g) || []).length;

                    // Skip if we're likely inside a string
                    if (quoteCount % 2 !== 0 || singleQuoteCount % 2 !== 0) {
                        continue;
                    }

                    // Skip if this looks like a function parameter or similar
                    if (trimmedLine.includes('(') && trimmedLine.includes(')') &&
                        trimmedLine.indexOf(pattern.keyword) > trimmedLine.indexOf('(')) {
                        continue;
                    }

                    const range = new vscode.Range(lineIndex, keywordIndex, lineIndex, keywordIndex + pattern.keyword.length);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Missing opening brace after ${pattern.keyword}. Flex requires braces around all code blocks.`,
                        vscode.DiagnosticSeverity.Error
                    );
                    diagnostic.code = 'missing-braces';
                    diagnostics.push(diagnostic);
                }
            }
        }
    }

    /**
     * Remove string content and string interpolation from a line for analysis
     */
    private removeStringContent(line: string): string {
        let result = '';
        let inString = false;
        let stringChar = '';
        let inInterpolation = false;
        let braceCount = 0;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const prevChar = i > 0 ? line[i - 1] : '';

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
                result += ' '; // Replace string start with space
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = '';
                result += ' '; // Replace string end with space
            } else if (inString && char === '{' && stringChar === '"') {
                // Start of string interpolation
                inInterpolation = true;
                braceCount = 1;
                result += ' '; // Replace { with space
            } else if (inInterpolation && char === '{') {
                braceCount++;
                result += ' ';
            } else if (inInterpolation && char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    inInterpolation = false;
                }
                result += ' ';
            } else if (inString && !inInterpolation) {
                result += ' '; // Replace string content with space
            } else {
                result += char; // Keep non-string content
            }
        }

        return result;
    }

    private checkBuiltInFunctionSpelling(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Remove string content to avoid false positives
        const cleanLine = this.removeStringContent(line);

        // Get user-defined functions from the document
        const userDefinedFunctions = this.extractUserDefinedFunctions(document);

        // Find function calls in the line (word followed by opening parenthesis)
        const functionCallRegex = /\b([a-zA-Z_][a-zA-Z0-9_?]*)\s*\(/g;
        let match;

        while ((match = functionCallRegex.exec(cleanLine)) !== null) {
            const functionName = match[1];
            const functionStartIndex = match.index;

            // Skip if it's a known built-in function
            if (this.builtInFunctionNames.includes(functionName)) {
                continue;
            }

            // Skip if it's a user-defined function
            if (userDefinedFunctions.includes(functionName)) {
                continue;
            }

            // Skip common keywords that aren't functions
            const nonFunctionKeywords = [
                'lw', 'if', 'aw', 'elif', 'gher', 'else', 'otherwise',
                'karr', 'for', 'talama', 'while', 'loop',
                'fun', 'sndo2', 'sando2', 'fn', 'function'
            ];
            if (nonFunctionKeywords.includes(functionName)) {
                continue;
            }

            // Find the closest matching built-in function
            const suggestion = this.findClosestBuiltInFunction(functionName);

            if (suggestion && this.calculateEditDistance(functionName, suggestion) <= 2) {
                const range = new vscode.Range(lineIndex, functionStartIndex, lineIndex, functionStartIndex + functionName.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Unknown function '${functionName}'. Did you mean '${suggestion}'?`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.code = 'misspelled-builtin-function';
                diagnostics.push(diagnostic);
            }
        }
    }

    private findClosestBuiltInFunction(input: string): string | null {
        let closestMatch: string | null = null;
        let minDistance = Infinity;

        for (const functionName of this.builtInFunctionNames) {
            const distance = this.calculateEditDistance(input, functionName);

            // Prefer shorter distances and functions with similar prefixes
            if (distance < minDistance ||
                (distance === minDistance && functionName.startsWith(input.substring(0, 2)))) {
                minDistance = distance;
                closestMatch = functionName;
            }
        }

        // Only suggest if the distance is reasonable (not more than half the length)
        if (closestMatch && minDistance <= Math.max(2, Math.floor(input.length / 2))) {
            return closestMatch;
        }

        return null;
    }

    private calculateEditDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private checkVariableDeclarations(line: string, lineIndex: number, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Check if strict variable declarations is enabled
        const config = vscode.workspace.getConfiguration('flex');
        const strictMode = config.get<boolean>('strictVariableDeclarations', false);

        if (!strictMode) {
            return;
        }

        if (!strictMode) {
            return;
        }

        const trimmedLine = line.trim();

        // Skip comments and empty lines
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*') || trimmedLine === '') {
            return;
        }

        // Remove string content to avoid false positives
        const cleanLine = this.removeStringContent(trimmedLine);

        // Skip lines that are declarations
        if (this.isDeclarationLine(cleanLine)) {
            return;
        }

        // Get all declared variables and functions from the document
        const declaredVariables = this.extractDeclaredVariables(document);
        const userDefinedFunctions = this.extractUserDefinedFunctions(document);

        // Find variable usage (word not followed by parenthesis)
        const variableUsageRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/g;
        let match;

        while ((match = variableUsageRegex.exec(cleanLine)) !== null) {
            const variableName = match[1];
            const variableStartIndex = match.index;

            // Skip built-in functions and keywords
            if (this.isFlexKeywordOrBuiltin(variableName)) {
                continue;
            }

            // Skip user-defined functions
            if (userDefinedFunctions.includes(variableName)) {
                continue;
            }

            // Skip numbers and operators
            if (/^\d+$/.test(variableName)) {
                continue;
            }

            // Check if variable is declared
            if (!declaredVariables.includes(variableName)) {
                const range = new vscode.Range(lineIndex, variableStartIndex, lineIndex, variableStartIndex + variableName.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Variable '${variableName}' is used without declaration. Consider declaring it with a type (e.g., rakm ${variableName} = ...)`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'undeclared-variable';
                diagnostics.push(diagnostic);
            }
        }
    }

    private isDeclarationLine(line: string): boolean {
        // Check for Flex type declarations
        const typeKeywords = ['rakm', 'kasr', 'klma', 'so2al', 'dorg', 'int', 'float', 'string', 'bool', 'list'];
        const functionKeywords = ['sndo2', 'sando2', 'fun', 'function'];

        // Variable declaration patterns
        for (const keyword of typeKeywords) {
            if (line.match(new RegExp(`\\b${keyword}\\s+[a-zA-Z_][a-zA-Z0-9_]*\\s*=`))) {
                return true;
            }
        }

        // Function declaration patterns
        for (const keyword of functionKeywords) {
            if (line.includes(keyword)) {
                return true;
            }
        }

        // Simple assignment (variable = value) at start of line
        if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/)) {
            return true;
        }

        // Loop variable declarations
        if (line.match(/\bkarr\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/)) {
            return true;
        }

        // C-style for loop variable declarations
        if (line.match(/\bfor\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=/)) {
            return true;
        }

        return false;
    }

    private isFlexKeywordOrBuiltin(word: string): boolean {
        // Built-in functions
        if (this.builtInFunctionNames.includes(word)) {
            return true;
        }

        // Comprehensive Flex keywords
        const flexKeywords = [
            // Type keywords
            'rakm', 'kasr', 'klma', 'so2al', 'dorg', 'int', 'float', 'string', 'bool', 'list',

            // Control flow
            'lw', 'if', 'aw', 'elif', 'gher', 'else', 'otherwise',
            'karr', 'for', 'talama', 'while', 'loop', 'l7d',

            // Function keywords
            'fun', 'sndo2', 'sando2', 'fn', 'function', 'rg3', 'return',

            // Boolean values
            'true', 'false', 'sa7', 'ghalt',

            // Logical operators
            'and', 'or', 'not', 'wa', 'aw', 'msh',

            // Built-in functions (common ones)
            'etb3', 'print', 'da5l', 'scan', 'geep', 'geeb', 'import',

            // List methods
            'push', 'pop', 'length', 'size', 'd7af', 'shyl', '2leb', 'rtb',

            // Common variable names that are often used as keywords
            'null', 'undefined', 'void'
        ];

        return flexKeywords.includes(word);
    }

    private extractUserDefinedFunctions(document: vscode.TextDocument): string[] {
        const userDefinedFunctions: string[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip comments
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*')) {
                continue;
            }

            // Look for function definitions
            const functionPatterns = [
                /\bsndo2\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
                /\bsando2\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
                /\bfun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
                /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
            ];

            for (const pattern of functionPatterns) {
                const match = trimmedLine.match(pattern);
                if (match) {
                    const functionName = match[1];
                    if (!userDefinedFunctions.includes(functionName)) {
                        userDefinedFunctions.push(functionName);
                    }
                }
            }
        }

        return userDefinedFunctions;
    }

    private extractDeclaredVariables(document: vscode.TextDocument): string[] {
        const declaredVariables: string[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip comments
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*')) {
                continue;
            }

            // Remove string content
            const cleanLine = this.removeStringContent(trimmedLine);

            // Look for variable declarations with type keywords
            const typeKeywords = ['rakm', 'kasr', 'klma', 'so2al', 'dorg', 'int', 'float', 'string', 'bool', 'list'];

            for (const keyword of typeKeywords) {
                const declarationRegex = new RegExp(`\\b${keyword}\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=`, 'g');
                let match;

                while ((match = declarationRegex.exec(cleanLine)) !== null) {
                    const variableName = match[1];
                    if (!declaredVariables.includes(variableName)) {
                        declaredVariables.push(variableName);
                    }
                }
            }

            // Look for simple assignments (variable = value) at start of line
            const assignmentRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
            const assignmentMatch = cleanLine.match(assignmentRegex);
            if (assignmentMatch) {
                const variableName = assignmentMatch[1];
                if (!declaredVariables.includes(variableName)) {
                    declaredVariables.push(variableName);
                }
            }

            // Look for loop variable declarations
            const loopVarRegex = /\bkarr\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
            const loopMatch = cleanLine.match(loopVarRegex);
            if (loopMatch) {
                const variableName = loopMatch[1];
                if (!declaredVariables.includes(variableName)) {
                    declaredVariables.push(variableName);
                }
            }

            // Look for C-style for loop variable declarations
            const forLoopRegex = /\bfor\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
            const forMatch = cleanLine.match(forLoopRegex);
            if (forMatch) {
                const variableName = forMatch[1];
                if (!declaredVariables.includes(variableName)) {
                    declaredVariables.push(variableName);
                }
            }

            // Look for function parameters
            const functionParamRegex = /\b(?:sndo2|sando2|fun|function)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/;
            const funcMatch = cleanLine.match(functionParamRegex);
            if (funcMatch) {
                const params = funcMatch[1];
                // Extract parameter names (skip type keywords)
                const paramRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
                let paramMatch;
                while ((paramMatch = paramRegex.exec(params)) !== null) {
                    const paramName = paramMatch[1];
                    // Skip type keywords
                    if (!typeKeywords.includes(paramName)) {
                        if (!declaredVariables.includes(paramName)) {
                            declaredVariables.push(paramName);
                        }
                    }
                }
            }
        }

        return declaredVariables;
    }

    /**
     * Clear diagnostics for a document
     */
    public clearDiagnostics(document: vscode.TextDocument): void {
        this.diagnosticCollection.delete(document.uri);

        // Clear decorations for this document
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === document.uri.toString());
        if (editor) {
            this.clearDecorations(editor);
        }

        // Remove from decorations map
        this.decorationsMap.delete(document.uri.toString());
    }

    /**
     * Clear all diagnostics
     */
    public clearAllDiagnostics(): void {
        this.diagnosticCollection.clear();

        // Clear all decorations
        for (const editor of vscode.window.visibleTextEditors) {
            this.clearDecorations(editor);
        }

        // Clear decorations map
        this.decorationsMap.clear();
    }

    /**
     * Dispose of the diagnostic collection and decoration types
     */
    public dispose(): void {
        this.diagnosticCollection.dispose();
        this.errorDecorationType.dispose();
        this.warningDecorationType.dispose();
        this.hintDecorationType.dispose();
        this.decorationsMap.clear();
    }
} 