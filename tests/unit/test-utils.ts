import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Utility functions for testing the Flex extension
 */

export function createMockDocument(content: string, languageId: string = 'flex'): any {
    const lines = content.split('\n');

    return {
        uri: vscode.Uri.file('/mock/test.lx'),
        fileName: '/mock/test.lx',
        isUntitled: false,
        languageId,
        version: 1,
        isDirty: false,
        isClosed: false,
        save: async () => true,
        eol: vscode.EndOfLine.LF,
        encoding: 'utf8',
        lineCount: lines.length,
        getText: (range?: vscode.Range) => {
            if (!range) {
                return content;
            }
            return lines.slice(range.start.line, range.end.line + 1).join('\n');
        },
        getWordRangeAtPosition: (position: vscode.Position) => {
            const line = lines[position.line];
            if (!line) {
                return undefined;
            }

            const wordPattern = /\w+/g;
            let match;
            while ((match = wordPattern.exec(line)) !== null) {
                if (match.index <= position.character && position.character <= match.index + match[0].length) {
                    return new vscode.Range(
                        position.line, match.index,
                        position.line, match.index + match[0].length
                    );
                }
            }
            return undefined;
        },
        lineAt: (lineOrPosition: number | vscode.Position) => {
            const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
            const text = lines[lineNumber] || '';
            return {
                lineNumber,
                text,
                range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
                rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
                firstNonWhitespaceCharacterIndex: text.search(/\S/),
                isEmptyOrWhitespace: text.trim().length === 0
            };
        },
        offsetAt: (position: vscode.Position) => {
            let offset = 0;
            for (let i = 0; i < position.line; i++) {
                offset += lines[i].length + 1; // +1 for newline
            }
            return offset + position.character;
        },
        positionAt: (offset: number) => {
            let currentOffset = 0;
            for (let line = 0; line < lines.length; line++) {
                if (currentOffset + lines[line].length >= offset) {
                    return new vscode.Position(line, offset - currentOffset);
                }
                currentOffset += lines[line].length + 1; // +1 for newline
            }
            return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        },
        validateRange: (range: vscode.Range) => range,
        validatePosition: (position: vscode.Position) => position
    };
}

export function assertDiagnostic(
    diagnostic: vscode.Diagnostic,
    expectedMessage: string,
    expectedSeverity: vscode.DiagnosticSeverity,
    expectedCode?: string
): void {
    assert.strictEqual(diagnostic.message, expectedMessage, 'Diagnostic message mismatch');
    assert.strictEqual(diagnostic.severity, expectedSeverity, 'Diagnostic severity mismatch');
    if (expectedCode) {
        assert.strictEqual(diagnostic.code, expectedCode, 'Diagnostic code mismatch');
    }
}

export function createMockContext(): any {
    const globalState = new Map<string, any>();
    const workspaceState = new Map<string, any>();

    return {
        subscriptions: [],
        workspaceState: {
            get: <T>(key: string, defaultValue?: T) => workspaceState.get(key) ?? defaultValue,
            update: async (key: string, value: any) => { workspaceState.set(key, value); },
            keys: () => Array.from(workspaceState.keys())
        },
        globalState: {
            get: <T>(key: string, defaultValue?: T) => globalState.get(key) ?? defaultValue,
            update: async (key: string, value: any) => { globalState.set(key, value); },
            keys: () => Array.from(globalState.keys()),
            setKeysForSync: () => { }
        },
        extensionUri: vscode.Uri.file('/mock/extension'),
        extensionPath: '/mock/extension',
        environmentVariableCollection: {} as any,
        asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
        storageUri: vscode.Uri.file('/mock/storage'),
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        logUri: vscode.Uri.file('/mock/logs'),
        secrets: {} as any,
        extensionMode: vscode.ExtensionMode.Test,
        extension: {} as any,
        languageModelAccessInformation: {} as any
    };
} 