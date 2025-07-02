import * as vscode from 'vscode';
import { builtInFunctions } from '../language/builtins';
import { languageKeywords } from '../language/keywords';

export class FlexHoverProvider implements vscode.HoverProvider {

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const word = document.getText(wordRange);

        // Check if it's a built-in function
        if (builtInFunctions[word]) {
            const markdown = new vscode.MarkdownString(builtInFunctions[word].description);
            markdown.isTrusted = true;
            return new vscode.Hover(markdown, wordRange);
        }

        // Check if it's a language keyword
        if (languageKeywords[word]) {
            const markdown = new vscode.MarkdownString(languageKeywords[word].description);
            markdown.isTrusted = true;
            return new vscode.Hover(markdown, wordRange);
        }

        // Check for special cases with numbers in function names (Franco Arabic)
        const specialWords = ['7ajm', '2sm', '2ss', '2rb', 'rakm?', 'klma?', 'dorg?', 'so2al?', '2ra2File', 'l7d'];

        for (const specialWord of specialWords) {
            if (word === specialWord) {
                if (builtInFunctions[specialWord]) {
                    const markdown = new vscode.MarkdownString(builtInFunctions[specialWord].description);
                    markdown.isTrusted = true;
                    return new vscode.Hover(markdown, wordRange);
                }
                if (languageKeywords[specialWord]) {
                    const markdown = new vscode.MarkdownString(languageKeywords[specialWord].description);
                    markdown.isTrusted = true;
                    return new vscode.Hover(markdown, wordRange);
                }
            }
        }

        return undefined;
    }
} 