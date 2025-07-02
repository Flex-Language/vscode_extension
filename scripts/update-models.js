#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Fetch models from OpenRouter API
 */
function fetchOpenRouterModels() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/models',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Flex-VSCode-Extension/1.0.0'
            },
            timeout: 15000
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

                    console.log(`✅ Fetched ${jsonData.data.length} models from OpenRouter`);
                    resolve(jsonData.data);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Network error: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * Get popular models first, then others
 */
function organizeModels(models) {
    const popularModels = [
        'openai/gpt-4o-mini',
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.3-70b-instruct',
        'google/gemini-pro',
        'anthropic/claude-3-haiku',
        'microsoft/wizardlm-2-8x22b',
        'cohere/command-r-plus',
        'anthropic/claude-3-opus',
        'openai/gpt-3.5-turbo',
        'meta-llama/llama-3-8b-instruct',
        'meta-llama/llama-3-70b-instruct',
        'google/gemini-flash-1.5',
        'anthropic/claude-3-sonnet',
        'perplexity/llama-3.1-sonar-large-128k-online'
    ];

    // Start with default and custom
    const enumValues = ['default', 'custom'];
    const enumDescriptions = [
        'Use the Flex compiler\'s built-in default AI model',
        'Use a custom model specified in the \'flex.customAIModel\' setting'
    ];

    // Add popular models that exist in the API response
    const modelMap = new Map(models.map(m => [m.id, m]));

    for (const popularId of popularModels) {
        const model = modelMap.get(popularId);
        if (model) {
            enumValues.push(model.id);
            let description = `${model.name || model.id} - ${model.description || 'No description available'}`;
            if (model.pricing) {
                const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
                const completionPrice = parseFloat(model.pricing.completion) * 1000000;
                description += ` ($${promptPrice.toFixed(2)}/$${completionPrice.toFixed(2)} per 1M tokens)`;
            }
            enumDescriptions.push(description);
        }
    }

    // Add remaining models (limited to keep settings UI manageable)
    const remainingModels = models
        .filter(m => !popularModels.includes(m.id))
        .slice(0, 30) // Limit to 30 additional models
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    for (const model of remainingModels) {
        enumValues.push(model.id);
        let description = `${model.name || model.id} - ${model.description || 'No description available'}`;
        if (model.pricing) {
            const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
            const completionPrice = parseFloat(model.pricing.completion) * 1000000;
            description += ` ($${promptPrice.toFixed(2)}/$${completionPrice.toFixed(2)} per 1M tokens)`;
        }
        enumDescriptions.push(description);
    }

    return { enumValues, enumDescriptions };
}

/**
 * Update package.json with the latest models
 */
async function updatePackageJson() {
    try {
        console.log('🔄 Fetching latest OpenRouter models...');

        // Fetch models from OpenRouter
        const models = await fetchOpenRouterModels();

        // Organize models with popular ones first
        const { enumValues, enumDescriptions } = organizeModels(models);

        // Read package.json
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Update the aiModel configuration
        if (packageJson.contributes &&
            packageJson.contributes.configuration &&
            packageJson.contributes.configuration.properties &&
            packageJson.contributes.configuration.properties['flex.aiModel']) {

            const aiModelConfig = packageJson.contributes.configuration.properties['flex.aiModel'];
            aiModelConfig.enum = enumValues;
            aiModelConfig.enumDescriptions = enumDescriptions;
            aiModelConfig.description = `Select an AI model from ${models.length} available OpenRouter models. Popular models are shown first.`;

            console.log(`✅ Updated package.json with ${enumValues.length} model options`);
        }

        // Write updated package.json
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

        console.log('✅ package.json updated successfully!');
        console.log(`📊 Total models: ${models.length}, Included in settings: ${enumValues.length}`);

    } catch (error) {
        console.error('❌ Failed to update package.json:', error.message);
        process.exit(1);
    }
}

// Run the update
if (require.main === module) {
    updatePackageJson();
}

module.exports = { updatePackageJson }; 