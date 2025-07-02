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
 * Categorize models by provider and features
 */
function categorizeModels(models) {
    const categories = {
        openai: [],
        anthropic: [],
        google: [],
        meta: [],
        mistral: [],
        deepseek: [],
        other: []
    };

    // Categorize models by provider
    models.forEach(model => {
        const id = model.id.toLowerCase();
        if (id.startsWith('openai/')) {
            categories.openai.push(model);
        } else if (id.startsWith('anthropic/') || id.startsWith('claude')) {
            categories.anthropic.push(model);
        } else if (id.startsWith('google/') || id.startsWith('gemini')) {
            categories.google.push(model);
        } else if (id.startsWith('meta-llama/') || id.startsWith('llama')) {
            categories.meta.push(model);
        } else if (id.startsWith('mistral') || id.startsWith('mixtral')) {
            categories.mistral.push(model);
        } else if (id.includes('deepseek')) {
            categories.deepseek.push(model);
        } else {
            categories.other.push(model);
        }
    });

    // Sort each category by model name/ID
    Object.values(categories).forEach(category => {
        category.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    });

    return categories;
}

/**
 * Organize models for the settings UI
 */
function organizeModels(models) {
    // Start with default model
    const enumValues = ['default'];
    
    // Categorize models
    const categories = categorizeModels(models);
    
    // Add models by provider without separators for better search
    const addModels = (models) => {
        if (!models || models.length === 0) return;
        
        // Sort models by name for better organization
        const sortedModels = [...models].sort((a, b) => 
            (a.name || a.id).localeCompare(b.name || b.id)
        );
        
        // Add model IDs
        sortedModels.forEach(model => {
            enumValues.push(model.id);
        });
    };

    // Add models in a logical order, but without category headers
    // to improve search experience in the settings dropdown
    addModels(categories.openai);
    addModels(categories.anthropic);
    addModels(categories.google);
    addModels(categories.meta);
    addModels(categories.mistral);
    addModels(categories.deepseek);
    addModels(categories.other);

    return { enumValues };
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
        const { enumValues } = organizeModels(models);

        // Read package.json
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Update the aiModel configuration
        if (packageJson.contributes?.configuration?.properties?.['flex.aiModel']) {
            packageJson.contributes.configuration.properties['flex.aiModel'].enum = enumValues;
            // Remove enumDescriptions if it exists
            if (packageJson.contributes.configuration.properties['flex.aiModel'].enumDescriptions) {
                delete packageJson.contributes.configuration.properties['flex.aiModel'].enumDescriptions;
            }
            packageJson.contributes.configuration.properties['flex.aiModel'].description = `Select an AI model from ${models.length} available OpenRouter models. Models are organized by provider for easier navigation.`;

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