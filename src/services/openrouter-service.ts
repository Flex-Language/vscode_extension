import * as vscode from 'vscode';
import * as https from 'https';

export interface OpenRouterModel {
    id: string;
    name: string;
    description: string;
    pricing?: {
        prompt: string;
        completion: string;
    };
    context_length?: number;
}

export class OpenRouterService {
    private static readonly MODELS_API_URL = 'https://openrouter.ai/api/v1/models';
    private static readonly CACHE_KEY = 'flex.openrouter.models';
    private static readonly CACHE_EXPIRY_KEY = 'flex.openrouter.models.expiry';
    private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    /**
 * Fetch available models from OpenRouter API
 */
    public static async fetchAvailableModels(): Promise<OpenRouterModel[]> {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔄 Fetching OpenRouter models...');

                const url = new URL(this.MODELS_API_URL);

                const options = {
                    hostname: url.hostname,
                    path: url.pathname,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Flex-VSCode-Extension/1.0.0'
                    },
                    timeout: 10000 // 10 second timeout
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200) {
                                reject(new Error(`HTTP error! status: ${res.statusCode}`));
                                return;
                            }

                            const jsonData = JSON.parse(data);

                            if (!jsonData.data || !Array.isArray(jsonData.data)) {
                                reject(new Error('Invalid response format from OpenRouter API'));
                                return;
                            }

                            const models: OpenRouterModel[] = jsonData.data.map((model: any) => ({
                                id: model.id,
                                name: model.name || model.id,
                                description: model.description || 'No description available',
                                pricing: model.pricing ? {
                                    prompt: model.pricing.prompt,
                                    completion: model.pricing.completion,
                                } : undefined,
                                context_length: model.context_length,
                            }));

                            console.log(`✅ Successfully fetched ${models.length} OpenRouter models`);
                            resolve(models);
                        } catch (parseError) {
                            reject(new Error(`Failed to parse OpenRouter API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(`Network error: ${error.message}`));
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout: OpenRouter API took too long to respond'));
                });

                req.end();

            } catch (error) {
                console.error('❌ Error fetching OpenRouter models:', error);
                reject(new Error(`Failed to fetch OpenRouter models: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        });
    }

    /**
     * Get cached models or fetch fresh ones if cache is expired
     */
    public static async getCachedOrFreshModels(context: vscode.ExtensionContext): Promise<OpenRouterModel[]> {
        const now = Date.now();
        const cachedModels = context.globalState.get<OpenRouterModel[]>(this.CACHE_KEY);
        const cacheExpiry = context.globalState.get<number>(this.CACHE_EXPIRY_KEY, 0);

        // If we have cached models and they're not expired, use them
        if (cachedModels && cachedModels.length > 0 && now < cacheExpiry) {
            console.log(`📋 Using cached OpenRouter models (${cachedModels.length} models)`);
            return cachedModels;
        }

        // Otherwise, fetch fresh models
        try {
            const freshModels = await this.fetchAvailableModels();

            // Cache the fresh models
            await context.globalState.update(this.CACHE_KEY, freshModels);
            await context.globalState.update(this.CACHE_EXPIRY_KEY, now + this.CACHE_DURATION);

            return freshModels;
        } catch (error) {
            // If fetching fails and we have cached models (even expired), use them
            if (cachedModels && cachedModels.length > 0) {
                console.warn('⚠️ Using expired cached models due to fetch error');
                return cachedModels;
            }

            // If no cached models and fetch failed, return fallback models
            console.warn('⚠️ Falling back to default models due to fetch error');
            return this.getFallbackModels();
        }
    }

    /**
     * Force refresh the model cache
     */
    public static async refreshModels(context: vscode.ExtensionContext): Promise<OpenRouterModel[]> {
        console.log('🔄 Force refreshing OpenRouter models...');

        try {
            const freshModels = await this.fetchAvailableModels();

            // Update cache
            await context.globalState.update(this.CACHE_KEY, freshModels);
            await context.globalState.update(this.CACHE_EXPIRY_KEY, Date.now() + this.CACHE_DURATION);

            vscode.window.showInformationMessage(`✅ Successfully refreshed ${freshModels.length} OpenRouter models`);
            return freshModels;
        } catch (error) {
            const errorMessage = `❌ Failed to refresh OpenRouter models: ${error instanceof Error ? error.message : 'Unknown error'}`;
            vscode.window.showErrorMessage(errorMessage);
            throw error;
        }
    }

    /**
     * Get fallback models when API is unavailable
     */
    private static getFallbackModels(): OpenRouterModel[] {
        return [
            {
                id: 'openai/gpt-4o-mini',
                name: 'GPT-4o Mini',
                description: 'OpenAI GPT-4o Mini - A fast and capable default model'
            },
            {
                id: 'openai/gpt-4o',
                name: 'GPT-4o',
                description: 'OpenAI GPT-4o - OpenAI\'s most advanced and powerful model'
            },
            {
                id: 'anthropic/claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                description: 'Anthropic Claude 3.5 Sonnet - A state-of-the-art model excellent for code analysis'
            },
            {
                id: 'meta-llama/llama-3.3-70b-instruct',
                name: 'Llama 3.3 70B',
                description: 'Meta Llama 3.3 70B - A powerful open-source model from Meta'
            }
        ];
    }

    /**
     * Get popular/recommended models for quick selection
     */
    public static getPopularModels(): string[] {
        return [
            'openai/gpt-4o-mini',
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet',
            'meta-llama/llama-3.3-70b-instruct',
            'google/gemini-pro',
            'anthropic/claude-3-haiku',
            'microsoft/wizardlm-2-8x22b',
            'cohere/command-r-plus'
        ];
    }

    /**
     * Create enum values for VS Code settings
     */
    public static createModelEnumValues(models: OpenRouterModel[]): string[] {
        const enumValues = ['default', 'custom'];

        // Add popular models first
        const popularModels = this.getPopularModels();
        for (const popularModel of popularModels) {
            if (models.some(m => m.id === popularModel)) {
                enumValues.push(popularModel);
            }
        }

        // Add remaining models (limit to reasonable number for UI)
        const remainingModels = models
            .filter(m => !popularModels.includes(m.id))
            .slice(0, 50) // Limit to 50 additional models to keep settings UI manageable
            .map(m => m.id);

        enumValues.push(...remainingModels);

        return enumValues;
    }

    /**
     * Create enum descriptions for VS Code settings
     */
    public static createModelEnumDescriptions(models: OpenRouterModel[]): string[] {
        const descriptions = [
            'Use the Flex compiler\'s built-in default AI model',
            'Use a custom model specified in the \'flex.customAIModel\' setting'
        ];

        // Add descriptions for enum values
        const enumValues = this.createModelEnumValues(models).slice(2); // Skip 'default' and 'custom'

        for (const modelId of enumValues) {
            const model = models.find(m => m.id === modelId);
            if (model) {
                let description = `${model.name} - ${model.description}`;
                if (model.pricing) {
                    const promptPrice = parseFloat(model.pricing.prompt) * 1000000; // Convert to per million tokens
                    const completionPrice = parseFloat(model.pricing.completion) * 1000000;
                    description += ` (${promptPrice.toFixed(2)}/${completionPrice.toFixed(2)} per 1M tokens)`;
                }
                descriptions.push(description);
            } else {
                descriptions.push(`${modelId} - Model details unavailable`);
            }
        }

        return descriptions;
    }

    /**
     * Clear the model cache
     */
    public static async clearCache(context: vscode.ExtensionContext): Promise<void> {
        await context.globalState.update(this.CACHE_KEY, undefined);
        await context.globalState.update(this.CACHE_EXPIRY_KEY, undefined);
        console.log('🗑️ OpenRouter model cache cleared');
    }
} 