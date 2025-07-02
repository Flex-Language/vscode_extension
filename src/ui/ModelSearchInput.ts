import * as vscode from 'vscode';
import { OpenRouterService, OpenRouterModel } from '../services/openrouter-service';

interface ModelQuickPickItem extends vscode.QuickPickItem {
    id: string;
}

export class ModelSearchInput {
    private static instance: ModelSearchInput;
    private quickPick: vscode.QuickPick<vscode.QuickPickItem>;
    private models: OpenRouterModel[] = [];
    private selectedModel: string | undefined;

    private constructor(private context: vscode.ExtensionContext) {
        this.quickPick = vscode.window.createQuickPick();
        this.quickPick.placeholder = 'Search for a model...';
        this.quickPick.matchOnDescription = true;
        this.quickPick.matchOnDetail = true;
        this.quickPick.ignoreFocusOut = true;

        this.setupEventListeners();
    }

    public static getInstance(context: vscode.ExtensionContext): ModelSearchInput {
        if (!ModelSearchInput.instance) {
            ModelSearchInput.instance = new ModelSearchInput(context);
        }
        return ModelSearchInput.instance;
    }

    private async setupEventListeners() {
        this.quickPick.onDidChangeValue(async (value) => {
            await this.updateModelList(value);
        });

        this.quickPick.onDidAccept(() => {
            const selection = this.quickPick.activeItems[0];
            if (selection) {
                this.selectedModel = selection.label;
                this.quickPick.hide();
            }
        });
    }

    private async updateModelList(searchTerm: string) {
        if (this.models.length === 0) {
            try {
                this.models = await OpenRouterService.getModels(this.context);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load models: ${error}`);
                return;
            }
        }

        const filtered = searchTerm
            ? this.models.filter(model => 
                model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (model.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            : this.models;

        this.quickPick.items = filtered.map(model => ({
            label: model.id,
            description: model.name || '',
            detail: model.description || ''
        }));
    }

    public async show(): Promise<string | undefined> {
        this.selectedModel = undefined;
        this.quickPick.show();
        await this.updateModelList('');
        
        return new Promise(resolve => {
            const dispose = this.quickPick.onDidHide(() => {
                dispose.dispose();
                resolve(this.selectedModel);
            });
        });
    }

    public dispose() {
        this.quickPick.dispose();
    }
}
