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
import { ModelSearchInput } from './ui/ModelSearchInput';

let diagnosticProvider: FlexDiagnosticProvider;

interface ModelQuickPickItem extends vscode.QuickPickItem {
    model: OpenRouterModel;
    isSeparator?: boolean;
    kind?: vscode.QuickPickItemKind;
}

/**
 * Creates quick pick items from OpenRouter models with proper categorization
 */
function createModelQuickPickItems(models: OpenRouterModel[]): ModelQuickPickItem[] {
    const items: ModelQuickPickItem[] = [];
    
    // Add default options first
    items.push({
        label: '$(symbol-method) Default Model',
        description: 'Use the default model',
        detail: 'The default model configured in settings',
        model: { 
            id: 'default', 
            name: 'Default Model', 
            description: 'Use the default model',
            context_length: 0
        }
    });

    items.push({
        label: '$(edit) Custom Model',
        description: 'Specify a custom model ID',
        detail: 'Manually enter a model ID not in the list',
        model: { 
            id: 'custom', 
            name: 'Custom Model', 
            description: 'Specify a custom model ID',
            context_length: 0
        }
    });

    // Categorize models
    const categories = {
        openai: models.filter(m => m.id.startsWith('openai/')),
        anthropic: models.filter(m => m.id.startsWith('anthropic/') || m.id.includes('claude')),
        google: models.filter(m => m.id.startsWith('google/') || m.id.includes('gemini')),
        meta: models.filter(m => m.id.startsWith('meta-llama/') || m.id.includes('llama')),
        mistral: models.filter(m => m.id.includes('mistral') || m.id.includes('mixtral')),
        deepseek: models.filter(m => m.id.includes('deepseek')),
        other: models.filter(m => 
            !m.id.startsWith('openai/') && 
            !m.id.startsWith('anthropic/') && 
            !m.id.startsWith('google/') && 
            !m.id.startsWith('meta-llama/') &&
            !m.id.includes('claude') &&
            !m.id.includes('gemini') &&
            !m.id.includes('llama') &&
            !m.id.includes('mistral') &&
            !m.id.includes('mixtral') &&
            !m.id.includes('deepseek')
        )
    };

    // Add models by category
    const addCategory = (name: string, models: OpenRouterModel[]) => {
        if (models.length === 0) return;
        
        items.push({
            label: `$(folder) ${name}`,
            kind: vscode.QuickPickItemKind.Separator,
            model: { 
                id: '', 
                name: '', 
                description: '',
                context_length: 0
            },
            isSeparator: true
        });

        models.forEach(model => {
            const pricing = model.pricing ? 
                `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)}` : 
                'Pricing not available';
            
            items.push({
                label: `$(symbol-class) ${model.name || model.id}`,
                description: model.id,
                detail: `${model.description || 'No description'}\nPricing (prompt/completion per 1M tokens): ${pricing}`,
                model: model
            });
        });
    };

    // Add categories
    addCategory('OpenAI', categories.openai);
    addCategory('Anthropic', categories.anthropic);
    addCategory('Google', categories.google);
    addCategory('Meta (Llama)', categories.meta);
    addCategory('Mistral', categories.mistral);
    addCategory('DeepSeek', categories.deepseek);
    addCategory('Other Models', categories.other);

    return items;
}

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
 * Show a searchable interface to select an AI model
 */
async function searchAIModel(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Show loading indicator
        const models = await vscode.window.withProgress<OpenRouterModel[]>({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading AI Models',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Loading available models...' });
            return await OpenRouterService.getCachedOrFreshModels(context);
        });

        // Create quick pick items from models
        const items = createModelQuickPickItems(models);
        
        // Create and configure quick pick
        const quickPick = vscode.window.createQuickPick<ModelQuickPickItem>();
        quickPick.title = 'Select AI Model';
        quickPick.placeholder = 'Type to search models...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.items = items;
        
        // Add refresh button
        quickPick.buttons = [{
            iconPath: new vscode.ThemeIcon('refresh'),
            tooltip: 'Refresh Models'
        }];
        
        // Handle button click
        quickPick.onDidTriggerButton(async () => {
            quickPick.busy = true;
            quickPick.placeholder = 'Refreshing models...';
            
            try {
                const freshModels = await OpenRouterService.refreshModels(context);
                quickPick.items = createModelQuickPickItems(freshModels);
                quickPick.placeholder = 'Type to search models...';
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to refresh models: ${errorMessage}`);
            } finally {
                quickPick.busy = false;
            }
        });
        
        // Show the quick pick and wait for selection
        quickPick.show();
        
        const selectedItem = await new Promise<ModelQuickPickItem | undefined>(resolve => {
            quickPick.onDidAccept(() => {
                const selection = quickPick.activeItems[0];
                if (selection && !selection.isSeparator) {
                    resolve(selection);
                }
            });
            
            quickPick.onDidHide(() => resolve(undefined));
        });
        
        quickPick.hide();
        
        if (selectedItem) {
            const modelId = selectedItem.model.id;
            const config = vscode.workspace.getConfiguration('flex');
            
            if (modelId === 'custom') {
                // Prompt for custom model ID
                const customModel = await vscode.window.showInputBox({
                    prompt: 'Enter the custom model ID',
                    placeHolder: 'e.g., provider/model-name',
                    value: config.get<string>('aiModel')
                });
                
                if (customModel !== undefined) {
                    await config.update('aiModel', customModel.trim(), vscode.ConfigurationTarget.Global);
                    await config.update('aiModel', 'custom', vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(`Using custom model: ${customModel}`);
                }
            } else {
                // Update the selected model
                await config.update('aiModel', modelId, vscode.ConfigurationTarget.Global);
                
                // Show confirmation
                const modelName = selectedItem.model.name || modelId;
                vscode.window.showInformationMessage(`Selected model: ${modelName}`);
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to select AI model: ${errorMessage}`);
    }
}

/**
 * Show an enhanced quick pick to select an AI model with search, filtering, and details
 */
async function selectAIModel(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Show loading message with progress
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: 'Loading AI Models',
            cancellable: false
        };

        const models = await vscode.window.withProgress(progressOptions, async (progress) => {
            progress.report({ message: 'Fetching latest models from OpenRouter...' });
            try {
                return await OpenRouterService.getCachedOrFreshModels(context);
            } catch (error) {
                console.error('Error fetching models:', error);
                throw error;
            }
        });

        // Helper function to create quick pick items from models
        function createModelQuickPickItems(models: OpenRouterModel[]): ModelQuickPickItem[] {
            const items: ModelQuickPickItem[] = [];
            
            // Add default options first
            items.push({
                label: '$(symbol-method) Default Model',
                description: 'Use the default model',
                detail: 'The default model configured in settings',
                model: { 
                    id: 'default', 
                    name: 'Default Model', 
                    description: 'Use the default model',
                    context_length: 0
                }
            });

            items.push({
                label: '$(edit) Custom Model',
                description: 'Specify a custom model ID',
                detail: 'Manually enter a model ID not in the list',
                model: { 
                    id: 'custom', 
                    name: 'Custom Model', 
                    description: 'Specify a custom model ID',
                    context_length: 0
                }
            });

            // Categorize models
            const categories = {
                openai: models.filter(m => m.id.startsWith('openai/')),
                anthropic: models.filter(m => m.id.startsWith('anthropic/') || m.id.includes('claude')),
                google: models.filter(m => m.id.startsWith('google/') || m.id.includes('gemini')),
                meta: models.filter(m => m.id.startsWith('meta-llama/') || m.id.includes('llama')),
                mistral: models.filter(m => m.id.includes('mistral') || m.id.includes('mixtral')),
                deepseek: models.filter(m => m.id.includes('deepseek')),
                other: models.filter(m => 
                    !m.id.startsWith('openai/') && 
                    !m.id.startsWith('anthropic/') && 
                    !m.id.startsWith('google/') && 
                    !m.id.startsWith('meta-llama/') &&
                    !m.id.includes('claude') &&
                    !m.id.includes('gemini') &&
                    !m.id.includes('llama') &&
                    !m.id.includes('mistral') &&
                    !m.id.includes('mixtral') &&
                    !m.id.includes('deepseek')
                )
            };

            // Add models by category
            const addCategory = (name: string, models: OpenRouterModel[]) => {
                if (models.length === 0) return;
                
                items.push({
                    label: `$(folder) ${name}`,
                    kind: vscode.QuickPickItemKind.Separator,
                    model: { 
                        id: '', 
                        name: '', 
                        description: '',
                        context_length: 0
                    },
                    isSeparator: true
                });

                models.forEach(model => {
                    const pricing = model.pricing ? 
                        `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(model.pricing.completion) * 1000000).toFixed(2)}` : 
                        'Pricing not available';
                    
                    items.push({
                        label: `$(symbol-class) ${model.name || model.id}`,
                        description: model.id,
                        detail: `${model.description || 'No description'}\nPricing (prompt/completion per 1M tokens): ${pricing}`,
                        model: model
                    });
                });
            };

            // Add categories
            addCategory('OpenAI', categories.openai);
            addCategory('Anthropic', categories.anthropic);
            addCategory('Google', categories.google);
            addCategory('Meta (Llama)', categories.meta);
            addCategory('Mistral', categories.mistral);
            addCategory('DeepSeek', categories.deepseek);
            addCategory('Other Models', categories.other);

            return items;
        };

        // Create the quick pick
        const quickPick = vscode.window.createQuickPick<ModelQuickPickItem>();
        quickPick.title = `Select AI Model (${models.length} models available)`;
        quickPick.placeholder = 'Search models by name, provider, or description...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        
        // Add buttons
        quickPick.buttons = [
            {
                iconPath: new vscode.ThemeIcon('refresh'),
                tooltip: 'Refresh Models'
            },
            {
                iconPath: new vscode.ThemeIcon('settings'),
                tooltip: 'Open Settings'
            }
        ];

        // Create the initial items list
        const modelItems = createModelQuickPickItems(models);
        quickPick.items = modelItems;
        
        // Show the quick pick and wait for selection
        const selectedItem = await new Promise<ModelQuickPickItem | undefined>((resolve) => {
            quickPick.onDidAccept(() => {
                const activeItem = quickPick.activeItems[0];
                if (activeItem && !('isSeparator' in activeItem)) {
                    resolve(activeItem);
                }
            });
            quickPick.onDidHide(() => resolve(undefined));
            quickPick.show();
        });

        quickPick.dispose();

        // Process the selected item
        if (selectedItem && selectedItem.model) {
            const config = vscode.workspace.getConfiguration('flex');
            const modelId = selectedItem.model.id;
            
            await config.update('aiModel', modelId, vscode.ConfigurationTarget.Global);
            
            // Show confirmation with model details
            const displayName = selectedItem.model.name || modelId;
            const detail = selectedItem.model.description ? 
                `\n\n${selectedItem.model.description}` : '';
            
            let pricingInfo = '';
            if (selectedItem.model.pricing) {
                const inputPrice = (parseFloat(selectedItem.model.pricing.prompt) * 1000000).toFixed(2);
                const outputPrice = (parseFloat(selectedItem.model.pricing.completion) * 1000000).toFixed(2);
                pricingInfo = `\n\nPricing (per 1M tokens):\n- Input: $${inputPrice}\n- Output: $${outputPrice}`;
            }
            
            await vscode.window.showInformationMessage(
                `✅ Selected AI Model: ${displayName}${detail}${pricingInfo}`,
                { modal: false }
            );
        }
    } catch (error) {
        console.error('Error in selectAIModel:', error);
        vscode.window.showErrorMessage(
            `❌ Failed to load AI models: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { modal: true, detail: 'Please check your internet connection and try again. You can also set a custom model ID in settings.' }
        );
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
    context.subscriptions.push(
        vscode.commands.registerCommand('flex.runFile', () => runFlexFile()),
        vscode.commands.registerCommand('flex.runFileWithAI', () => runFlexFileWithAI()),
        vscode.commands.registerCommand('flex.validateFile', () => validateFlexFile()),
        vscode.commands.registerCommand('flex.configureCompilerPath', () => configureCompilerPath()),
        vscode.commands.registerCommand('flex.testCompilerDirectly', () => testCompilerDirectly()),
        vscode.commands.registerCommand('flex.selectAIModel', async () => {
            const modelSearch = ModelSearchInput.getInstance(context);
            const selectedModel = await modelSearch.show();
            if (selectedModel) {
                const config = vscode.workspace.getConfiguration('flex');
                await config.update('aiModel', selectedModel, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Selected model: ${selectedModel}`);
            }
        }),
        vscode.commands.registerCommand('flex.searchAIModel', () => searchAIModel(context)),
        vscode.commands.registerCommand('flex.refreshModels', () => refreshOpenRouterModels(context)),
        vscode.commands.registerCommand('flex.openOpenRouterSettings', async () => {
            await vscode.env.openExternal(vscode.Uri.parse('https://openrouter.ai/settings/keys'));
            vscode.window.showInformationMessage('🔗 Opened OpenRouter API key settings in your browser');
        }),
        vscode.commands.registerCommand('flex.verifyCompiler', async () => {
            const compiler = await verifyCompilerInstallation(context);
            if (compiler) {
                vscode.window.showInformationMessage(`✅ Flex compiler verified: ${compiler}`);
            } else {
                vscode.window.showErrorMessage('❌ No Flex compiler found');
            }
        })
    );

    const searchAIModelCommand = vscode.commands.registerCommand('flex.searchAIModel', async () => {
        await searchAIModel(context);
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