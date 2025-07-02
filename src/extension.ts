import * as vscode from 'vscode';
import { FlexHoverProvider } from './providers/hover-provider';
import { FlexDiagnosticProvider } from './providers/diagnostic-provider';
import {
    runFlexFile,
    runFlexFileWithAI,
    validateFlexFile,
    testCompilerDirectly,
    configureCompilerPath
} from './compiler/execution';
import { verifyCompilerInstallation } from './compiler/detection';
import { OpenRouterService, OpenRouterModel } from './services/openrouter-service';

let diagnosticProvider: FlexDiagnosticProvider;

/**
 * Show information about current AI model configuration
 */
async function showModelConfigurationInfo(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Get the extension's package.json to see current model count
        const extension = vscode.extensions.getExtension('mikawi.flex-language');
        if (!extension) {
            vscode.window.showWarningMessage('Could not find extension information');
            return;
        }

        const packageJSON = extension.packageJSON;
        const aiModelConfig = packageJSON.contributes?.configuration?.properties?.['flex.aiModel'];
        const modelCount = aiModelConfig?.enum?.length || 0;

        vscode.window.showInformationMessage(
            `📊 Current AI model dropdown contains ${modelCount} models. Package was built with latest OpenRouter models.`
        );

    } catch (error) {
        console.error('❌ Failed to show model configuration info:', error);
        vscode.window.showErrorMessage('Failed to get model configuration information');
    }
}

/**
 * Refresh OpenRouter models and show current configuration info
 */
async function refreshOpenRouterModels(context: vscode.ExtensionContext): Promise<void> {
    try {
        vscode.window.showInformationMessage('🔄 Refreshing OpenRouter model cache...');

        // Refresh the runtime cache
        await OpenRouterService.refreshModels(context);

        // Show current configuration info
        await showModelConfigurationInfo(context);

        // Inform user about updating the static dropdown
        const response = await vscode.window.showInformationMessage(
            '💡 The dropdown list in settings is built at package time. To get the absolute latest models in the dropdown, update the extension or use "Flex: Select AI Model" command.',
            'Show Model Selector',
            'Got it'
        );

        if (response === 'Show Model Selector') {
            await selectAIModel(context);
        }

    } catch (error) {
        console.error('Error refreshing OpenRouter models:', error);
        vscode.window.showErrorMessage('Failed to refresh models');
    }
}

/**
 * Show a quick pick to select an AI model from all available OpenRouter models
 */
async function selectAIModel(context: vscode.ExtensionContext): Promise<void> {
    try {
        vscode.window.showInformationMessage('📋 Loading available AI models...');
        const models = await OpenRouterService.getCachedOrFreshModels(context);
        const popularModels = OpenRouterService.getPopularModels();

        // Separate popular and other models
        const popularModelData = models.filter(m => popularModels.includes(m.id));
        const otherModels = models.filter(m => !popularModels.includes(m.id)).slice(0, 30); // Limit for better UX

        // Create quick pick items
        const quickPickItems: vscode.QuickPickItem[] = [
            {
                label: '$(gear) Default',
                description: 'default',
                detail: '🎯 Use Flex compiler\'s built-in default model (Recommended for beginners)'
            },
            {
                label: '$(edit) Custom',
                description: 'custom',
                detail: '⚙️ Use custom model specified in the Custom AI Model setting'
            },
            { label: '🔥 Popular Models', kind: vscode.QuickPickItemKind.Separator },
            ...popularModelData.map(model => ({
                label: `$(star) ${model.name}`,
                description: model.id,
                detail: `${model.description}${model.pricing ?
                    ` • $${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)} per 1M tokens` :
                    ''}`
            })),
            { label: '📚 More Models', kind: vscode.QuickPickItemKind.Separator },
            ...otherModels.map(model => ({
                label: `$(symbol-class) ${model.name}`,
                description: model.id,
                detail: `${model.description}${model.pricing ?
                    ` • $${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)} per 1M tokens` :
                    ''}`
            })),
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            {
                label: '$(refresh) Refresh Model List',
                description: 'refresh',
                detail: '🔄 Fetch the latest models from OpenRouter API'
            }
        ];

        const selected = await vscode.window.showQuickPick(quickPickItems, {
            title: `Select AI Model for Flex (${models.length} models available)`,
            placeHolder: 'Choose an AI model to use with Flex AI commands',
            matchOnDescription: true,
            matchOnDetail: true,
        });

        if (selected) {
            if (selected.description === 'refresh') {
                // Refresh models and show the selection again
                await OpenRouterService.refreshModels(context);
                return selectAIModel(context); // Recursive call to show updated list
            }

            const config = vscode.workspace.getConfiguration('flex');
            const modelValue = selected.description || '';

            await config.update('aiModel', modelValue, vscode.ConfigurationTarget.Global);

            const displayName = selected.label.replace(/\$\([^)]+\)\s*/, '');
            if (modelValue === 'default') {
                vscode.window.showInformationMessage(`✅ AI model set to: Default (Flex compiler's built-in model)`);
            } else if (modelValue === 'custom') {
                vscode.window.showInformationMessage(`✅ AI model set to: Custom (check Custom AI Model setting)`);
            } else {
                vscode.window.showInformationMessage(`✅ AI model set to: ${displayName}`);
            }
        }
    } catch (error) {
        console.error('Error selecting AI model:', error);
        vscode.window.showErrorMessage(`❌ Failed to load AI models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('🚀 Activating Flex Language Extension...');

    // Initialize diagnostic provider
    diagnosticProvider = new FlexDiagnosticProvider();

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: 'file', language: 'flex' },
        new FlexHoverProvider()
    );

    // Register commands
    const runCommand = vscode.commands.registerCommand('flex.runFile', runFlexFile);
    const runAICommand = vscode.commands.registerCommand('flex.runFileWithAI', runFlexFileWithAI);
    const verifyCommand = vscode.commands.registerCommand('flex.verifyCompiler', async () => {
        const compiler = await verifyCompilerInstallation(context);
        if (compiler) {
            vscode.window.showInformationMessage(`✅ Flex compiler verified: ${compiler}`);
        } else {
            vscode.window.showErrorMessage('❌ No Flex compiler found');
        }
    });
    const testCommand = vscode.commands.registerCommand('flex.testCompiler', testCompilerDirectly);
    const configureCommand = vscode.commands.registerCommand('flex.configureCompilerPath', configureCompilerPath);
    const validateCommand = vscode.commands.registerCommand('flex.validateFile', validateFlexFile);

    // OpenRouter-related commands
    const refreshModelsCommand = vscode.commands.registerCommand('flex.refreshOpenRouterModels', async () => {
        await refreshOpenRouterModels(context);
    });

    const selectModelCommand = vscode.commands.registerCommand('flex.selectAIModel', async () => {
        await selectAIModel(context);
    });

    const openOpenRouterSettingsCommand = vscode.commands.registerCommand('flex.openOpenRouterSettings', async () => {
        await vscode.env.openExternal(vscode.Uri.parse('https://openrouter.ai/settings/keys'));
        vscode.window.showInformationMessage('🔗 Opened OpenRouter API key settings in your browser');
    });

    // Register document change listeners for diagnostics
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document.languageId === 'flex') {
            await diagnosticProvider.provideDiagnostics(event.document);
        }
    });

    const documentOpenListener = vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (document.languageId === 'flex') {
            await diagnosticProvider.provideDiagnostics(document);
        }
    });

    const documentCloseListener = vscode.workspace.onDidCloseTextDocument((document) => {
        if (document.languageId === 'flex') {
            diagnosticProvider.clearDiagnostics(document);
        }
    });

    // Provide diagnostics for already open Flex documents
    vscode.workspace.textDocuments.forEach(async (document) => {
        if (document.languageId === 'flex') {
            await diagnosticProvider.provideDiagnostics(document);
        }
    });

    // Add all disposables to context
    context.subscriptions.push(
        hoverProvider,
        runCommand,
        runAICommand,
        verifyCommand,
        testCommand,
        configureCommand,
        validateCommand,
        refreshModelsCommand,
        selectModelCommand,
        openOpenRouterSettingsCommand,
        documentChangeListener,
        documentOpenListener,
        documentCloseListener,
        diagnosticProvider
    );

    // Verify compiler installation on startup
    await verifyCompilerInstallation(context);

    // Show AI model configuration info
    console.log('📊 Extension activated with pre-built AI model list');

    // Preload OpenRouter models in the background for the command interface
    OpenRouterService.getCachedOrFreshModels(context).catch(error => {
        console.warn('Background model preload failed:', error);
    });

    console.log('✅ Flex Language Extension activated successfully!');
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
    console.log('🔌 Deactivating Flex Language Extension...');

    if (diagnosticProvider) {
        diagnosticProvider.dispose();
    }

    console.log('✅ Flex Language Extension deactivated.');
} 