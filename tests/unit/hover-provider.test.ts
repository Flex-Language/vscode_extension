import * as assert from 'assert';
import * as vscode from 'vscode';
import { FlexHoverProvider } from '../../src/providers/hover-provider';
import { createMockDocument } from './test-utils';

suite('FlexHoverProvider Tests', () => {
    let hoverProvider: FlexHoverProvider;

    setup(() => {
        hoverProvider = new FlexHoverProvider();
    });

    test('Should provide hover for built-in function etb3', async () => {
        const document = createMockDocument('etb3("Hello World")');
        const position = new vscode.Position(0, 2); // Position within 'etb3'

        const hover = await hoverProvider.provideHover(document, position, {} as vscode.CancellationToken);

        assert.ok(hover, 'Hover should be provided');
        assert.ok(hover.contents.length > 0, 'Hover should have content');

        const content = hover.contents[0] as vscode.MarkdownString;
        assert.ok(content.value.includes('Franco Arabic print function'), 'Should contain function description');
    });

    test('Should provide hover for keyword lw', async () => {
        const document = createMockDocument('lw x > 5 { etb3("greater") }');
        const position = new vscode.Position(0, 1); // Position within 'lw'

        const hover = await hoverProvider.provideHover(document, position, {} as vscode.CancellationToken);

        assert.ok(hover, 'Hover should be provided');
        assert.ok(hover.contents.length > 0, 'Hover should have content');

        const content = hover.contents[0] as vscode.MarkdownString;
        assert.ok(content.value.includes('Franco Arabic IF statement'), 'Should contain keyword description');
    });

    test('Should provide hover for special Franco Arabic function with numbers', async () => {
        const document = createMockDocument('rakm len = 7ajm(text)');
        const position = new vscode.Position(0, 13); // Position within '7ajm'

        const hover = await hoverProvider.provideHover(document, position, {} as vscode.CancellationToken);

        assert.ok(hover, 'Hover should be provided for special function');
        assert.ok(hover.contents.length > 0, 'Hover should have content');

        const content = hover.contents[0] as vscode.MarkdownString;
        assert.ok(content.value.includes('Franco Arabic size function'), 'Should contain special function description');
    });

    test('Should return undefined for unknown words', async () => {
        const document = createMockDocument('unknownFunction()');
        const position = new vscode.Position(0, 5); // Position within 'unknownFunction'

        const hover = await hoverProvider.provideHover(document, position, {} as vscode.CancellationToken);

        assert.strictEqual(hover, undefined, 'Should not provide hover for unknown words');
    });

    test('Should return undefined when no word at position', async () => {
        const document = createMockDocument('etb3("Hello")');
        const position = new vscode.Position(0, 20); // Position beyond text

        const hover = await hoverProvider.provideHover(document, position, {} as vscode.CancellationToken);

        assert.strictEqual(hover, undefined, 'Should not provide hover when no word at position');
    });
}); 