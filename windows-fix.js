#!/usr/bin/env node

/**
 * Windows Compatibility Fix for VS Code Flex Extension
 * 
 * This script helps Windows users fix common issues with:
 * - Script permissions
 * - Path resolution
 * - Environment setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Check if running on Windows
if (os.platform() !== 'win32') {
    console.error('This script is designed for Windows users only.');
    process.exit(1);
}

console.log('VS Code Flex Extension Windows Compatibility Fix');
console.log('=============================================');
console.log('This script will fix common issues with the Flex extension on Windows.');

// Get current directory
const currentDir = process.cwd();
console.log(`\nCurrent directory: ${currentDir}`);

// Check for VS Code extension directory
const extensionDir = path.join(os.homedir(), '.vscode', 'extensions');
console.log(`\nChecking VS Code extensions directory: ${extensionDir}`);

let flexExtensionDir = null;

// Find the flex extension directory
if (fs.existsSync(extensionDir)) {
    const extensions = fs.readdirSync(extensionDir);
    for (const ext of extensions) {
        if (ext.toLowerCase().startsWith('flex-language')) {
            flexExtensionDir = path.join(extensionDir, ext);
            break;
        }
    }
}

if (!flexExtensionDir) {
    console.error('\nError: Could not find the Flex extension. Make sure it is installed.');
    process.exit(1);
}

console.log(`\nFound Flex extension at: ${flexExtensionDir}`);

// Create or fix run scripts
const scriptsToFix = [
    {
        name: 'run-flex.js',
        content: generateRunFlexJsContent()
    },
    {
        name: 'run-flex.bat',
        content: generateWindowsBatchScript()
    }
];

// Create and update scripts
for (const script of scriptsToFix) {
    const scriptPath = path.join(flexExtensionDir, script.name);
    console.log(`\nUpdating ${script.name}...`);
    
    try {
        fs.writeFileSync(scriptPath, script.content);
        console.log(`✓ Successfully updated ${script.name}`);
    } catch (error) {
        console.error(`✗ Error updating ${script.name}: ${error.message}`);
        console.log('\nTrying with administrator privileges...');
        
        try {
            // Create a temporary file
            const tempFile = path.join(os.tmpdir(), script.name);
            fs.writeFileSync(tempFile, script.content);
            
            // Use PowerShell to copy with elevated privileges
            const command = `powershell -Command "Start-Process cmd -ArgumentList '/c copy /Y \"${tempFile}\" \"${scriptPath}\"' -Verb RunAs -Wait"`;
            execSync(command);
            
            console.log(`✓ Successfully updated ${script.name} with admin privileges`);
        } catch (adminError) {
            console.error(`✗ Failed to update ${script.name} even with admin privileges: ${adminError.message}`);
            console.log(`\nManual fix: Copy the following content to ${scriptPath}:`);
            console.log('\n-----------------------------------');
            console.log(script.content);
            console.log('-----------------------------------\n');
        }
    }
}

// Check and update settings
console.log('\nChecking VS Code settings...');

const settingsDir = path.join(os.homedir(), '.vscode');
const settingsFile = path.join(settingsDir, 'settings.json');

let settings = {};
if (fs.existsSync(settingsFile)) {
    try {
        const content = fs.readFileSync(settingsFile, 'utf8');
        settings = JSON.parse(content);
        console.log('✓ Found existing settings.json');
    } catch (error) {
        console.error(`✗ Error reading settings.json: ${error.message}`);
    }
}

// Update Flex settings
let settingsUpdated = false;
if (!settings['flex.path']) {
    settings['flex.path'] = 'run-flex.js';
    settingsUpdated = true;
}

if (settings['flex.sindbadPath']) {
    // Rename sindbadPath to flexPath if it exists
    settings['flex.flexPath'] = settings['flex.sindbadPath'];
    delete settings['flex.sindbadPath'];
    settingsUpdated = true;
}

if (!settings['flex.flexPath']) {
    console.log('\nFlex interpreter path not set. Please enter the path to your Flex interpreter directory:');
    console.log('(Press Enter to skip this step and configure it later in VS Code settings)');
    
    // We can't use readline synchronously in a script, so we'll just add a placeholder
    settings['flex.flexPath'] = '';
    settingsUpdated = true;
    
    console.log('\nPlease set the Flex interpreter path in VS Code settings later.');
}

// Save updated settings
if (settingsUpdated) {
    try {
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
        console.log('✓ Successfully updated settings.json');
    } catch (error) {
        console.error(`✗ Error updating settings.json: ${error.message}`);
        console.log('\nPlease update your VS Code settings manually with:');
        console.log(JSON.stringify({
            'flex.path': 'run-flex.js',
            'flex.flexPath': settings['flex.flexPath'] || ''
        }, null, 2));
    }
}

console.log('\nFixing Windows registry permissions...');
try {
    // PowerShell command to update script execution policy
    const command = 'powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"';
    execSync(command);
    console.log('✓ Successfully updated PowerShell execution policy');
} catch (error) {
    console.error(`✗ Error updating execution policy: ${error.message}`);
    console.log('\nPlease run the following command as administrator:');
    console.log('Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force');
}

console.log('\nFixing path environment variables...');
try {
    const nodeDir = path.dirname(process.execPath);
    const command = `powershell -Command "[Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH', 'User') + ';${nodeDir}', 'User')"`;
    execSync(command);
    console.log('✓ Successfully updated PATH environment variable');
} catch (error) {
    console.error(`✗ Error updating PATH environment variable: ${error.message}`);
}

console.log('\n✅ Windows compatibility fix completed!');
console.log('\nPlease restart VS Code and try running a Flex file.');
console.log('If you encounter any issues, please report them on the extension GitHub page.');

/**
 * Generates the content for run-flex.js script
 */
function generateRunFlexJsContent() {
    return `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Get the input file from command line arguments
let inputFile = process.argv[2];
if (!inputFile) {
    console.error('Error: No input file specified');
    process.exit(1);
}

// Resolve to absolute path
const absoluteInputPath = path.resolve(process.cwd(), inputFile);

// Check if file exists
if (!fs.existsSync(absoluteInputPath)) {
    console.error(\`Error: File \${absoluteInputPath} does not exist\`);
    process.exit(1);
}

// Get script directory
const scriptDir = __dirname;

// Try to read settings.json from various locations
let flexSettings = {};
const possibleSettingsLocations = [
    path.join(process.cwd(), '.vscode', 'settings.json'),
    path.join(scriptDir, '.vscode', 'settings.json'),
    path.join(os.homedir(), '.vscode', 'settings.json')
];

for (const settingsPath of possibleSettingsLocations) {
    try {
        if (fs.existsSync(settingsPath)) {
            const settingsContent = fs.readFileSync(settingsPath, 'utf8');
            flexSettings = JSON.parse(settingsContent);
            break;
        }
    } catch (error) {
        console.error(\`Warning: Error reading settings from \${settingsPath}: \${error.message}\`);
    }
}

// Get Flex interpreter path from settings
let flexPath = '';
if (flexSettings['flex.flexPath']) {
    flexPath = flexSettings['flex.flexPath'];
} else if (flexSettings['flex.sindbadPath']) {
    // Backward compatibility
    flexPath = flexSettings['flex.sindbadPath'];
}

// Determine the platform
const isWindows = os.platform() === 'win32';

// Create and update the platform-specific script
updatePlatformScript(absoluteInputPath, isWindows, flexSettings);

// Run the appropriate script
try {
    if (isWindows) {
        // Run the batch script on Windows
        const batchPath = path.join(scriptDir, 'run-flex.bat');
        console.log(\`Running Windows script at: \${batchPath}\`);
        execSync(\`"\${batchPath}"\`, { stdio: 'inherit' });
    } else {
        // Run the shell script on Unix-like systems
        const shellPath = path.join(scriptDir, 'run-flex.sh');
        console.log(\`Running Unix script at: \${shellPath}\`);
        execSync(\`"\${shellPath}"\`, { stdio: 'inherit' });
    }
} catch (error) {
    console.error(\`Error running Flex: \${error.message}\`);
    process.exit(1);
}

/**
 * Updates the platform-specific script for running Flex
 */
function updatePlatformScript(inputFilePath, isWindows, settings) {
    // Get the USE_AI value from environment or default to false
    const useAI = process.env.USE_AI === 'true';
    const aiModel = process.env.FLEX_AI_MODEL || 'qwen';
    
    // Windows batch script
    if (isWindows) {
        const batchScript = generateWindowsBatchScript(inputFilePath, useAI, aiModel, settings);
        const batchPath = path.join(scriptDir, 'run-flex.bat');
        fs.writeFileSync(batchPath, batchScript);
    } 
    // Unix shell script
    else {
        const shellScript = generateUnixShellScript(inputFilePath, useAI, aiModel, settings);
        const shellPath = path.join(scriptDir, 'run-flex.sh');
        fs.writeFileSync(shellPath, shellScript, { mode: 0o755 });
        
        // Ensure the script is executable
        try {
            execSync(\`chmod +x "\${shellPath}"\`);
        } catch (error) {
            console.error(\`Warning: Failed to set permissions for \${shellPath}\`);
        }
    }
}

/**
 * Generates a Windows batch script for running Flex
 */
function generateWindowsBatchScript(inputFilePath, useAI, aiModel, settings) {
    const flexPath = settings['flex.flexPath'] || settings['flex.sindbadPath'] || '';
    
    return \`@echo off
setlocal enabledelayedexpansion

rem Set environment variables
set "USE_AI=\${useAI ? 'true' : 'false'}"
set "FLEX_AI_MODEL=\${aiModel}"

rem Set API key if using OpenAI
\${aiModel === 'openai' && settings['flex.ai.apiKey'] ? \`set "FLEX_API_KEY=\${settings['flex.ai.apiKey']}"\` : ''}

rem Set LMStudio URL if using LMStudio
\${aiModel === 'lmstudio' && settings['flex.ai.lmstudioUrl'] ? \`set "FLEX_LMSTUDIO_URL=\${settings['flex.ai.lmstudioUrl']}"\` : ''}

rem Change to the Flex directory if set
\${flexPath ? \`cd /d "\${flexPath}"\` : ''}

rem Run the Flex interpreter with the specified file
python main.py "\${inputFilePath}"

exit /b %errorlevel%
\`;
}

/**
 * Generates a Unix shell script for running Flex
 */
function generateUnixShellScript(inputFilePath, useAI, aiModel, settings) {
    const flexPath = settings['flex.flexPath'] || settings['flex.sindbadPath'] || '';
    
    return \`#!/bin/bash

# Set environment variables
export USE_AI="\${useAI ? 'true' : 'false'}"
export FLEX_AI_MODEL="\${aiModel}"

# Set API key if using OpenAI
\${aiModel === 'openai' && settings['flex.ai.apiKey'] ? \`export FLEX_API_KEY="\${settings['flex.ai.apiKey']}"\` : ''}

# Set LMStudio URL if using LMStudio
\${aiModel === 'lmstudio' && settings['flex.ai.lmstudioUrl'] ? \`export FLEX_LMSTUDIO_URL="\${settings['flex.ai.lmstudioUrl']}"\` : ''}

# Change to the Flex directory if set
\${flexPath ? \`cd "\${flexPath}"\` : ''}

# Run the Flex interpreter with the specified file
python3 main.py "\${inputFilePath}"

exit \$?
\`;
}
`;
}

/**
 * Generates the content for a Windows batch script
 */
function generateWindowsBatchScript() {
    return `@echo off
rem This script is dynamically managed by the VS Code Flex extension
rem It has been updated by the Windows compatibility fix script

setlocal enabledelayedexpansion

rem Default to running without AI unless explicitly enabled
set "USE_AI=false"

rem Default AI model
set "FLEX_AI_MODEL=qwen"

rem Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"

rem Execute the Flex interpreter
python "%SCRIPT_DIR%main.py" %*

exit /b %errorlevel%
`;
} 