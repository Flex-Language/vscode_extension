#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Get the input file from command line arguments
const inputFile = process.argv[2];

if (!inputFile) {
    console.error('Error: No input file specified');
    process.exit(1);
}

// Resolve the input file path to an absolute path
let absoluteInputPath;
try {
    absoluteInputPath = path.resolve(process.cwd(), inputFile);
    
    // Verify the file exists
    if (!fs.existsSync(absoluteInputPath)) {
        console.error(`Error: Input file "${absoluteInputPath}" does not exist`);
        process.exit(1);
    }
} catch (error) {
    console.error(`Error resolving input file path: ${error.message}`);
    process.exit(1);
}

// Determine platform
const isWindows = os.platform() === 'win32';

// Get the directory where this script is located
const scriptDir = path.dirname(path.resolve(__dirname, process.argv[1]));

// Get the Sindbad directory path
let sindbadDir = '';

// Check for AI settings
const useAI = process.env.USE_AI === 'true';
const aiModel = process.env.FLEX_AI_MODEL || 'qwen';

// Read settings from .vscode/settings.json
try {
    const settingsPath = path.join(scriptDir, '.vscode', 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        sindbadDir = settings['flex.sindbadPath'] || '';
    }
} catch (error) {
    console.warn(`Warning: Could not read settings: ${error.message}`);
}

// If no path in settings, use default
if (!sindbadDir) {
    // For demonstration purposes, use hardcoded defaults
    sindbadDir = isWindows 
        ? 'C:\\path\\to\\Sindbad\\src' 
        : '/Users/mikawi/Developer/python/grad/Sindbad/src';
    
    console.log(`Using default Sindbad path: ${sindbadDir}`);
    console.log('To change this, update the flex.sindbadPath setting in .vscode/settings.json');
}

// Update the platform-specific script with the correct Sindbad path
const updatePlatformScript = () => {
    try {
        if (isWindows) {
            const batScriptPath = path.join(scriptDir, 'run-flex.bat');
            
            // Set environment variables for AI
            let envSetup = '';
            if (useAI) {
                envSetup = `REM Set AI environment variables
SET USE_AI=true
SET FLEX_AI_MODEL=${aiModel}
`;
                console.log(`Running with AI using model: ${aiModel}`);
            } else {
                envSetup = `REM Set AI environment variables
SET USE_AI=false
`;
            }
            
            let batScript = `@echo off
REM Windows batch file to run Flex programs

${envSetup}
REM Path to the Sindbad directory
SET SINDBAD_DIR=${sindbadDir.replace(/\\/g, '\\\\')}

REM Change to the Sindbad/src directory
cd /d "%SINDBAD_DIR%"

REM Run the Flex interpreter with the absolute path
python main.py "${absoluteInputPath.replace(/\\/g, '\\\\')}"`;

            fs.writeFileSync(batScriptPath, batScript);
            console.log(`Updated Windows script at: ${batScriptPath}`);
        } else {
            const shScriptPath = path.join(scriptDir, 'run-flex.sh');
            
            // Set environment variables for AI
            let envSetup = '';
            if (useAI) {
                envSetup = `# Set AI environment variables
export USE_AI=true
export FLEX_AI_MODEL=${aiModel}
`;
                console.log(`Running with AI using model: ${aiModel}`);
            } else {
                envSetup = `# Set AI environment variables
export USE_AI=false
`;
            }
            
            let shScript = `#!/bin/bash

${envSetup}
# Path to the Sindbad directory
SINDBAD_DIR="${sindbadDir.replace(/"/g, '\\"')}"

# Change to the Sindbad/src directory
cd "$SINDBAD_DIR"

# Run the Flex interpreter with the absolute path
python3 main.py "${absoluteInputPath.replace(/"/g, '\\"')}"`;

            // Ensure there's no % character at the end
            shScript = shScript.replace(/%$/, '');

            fs.writeFileSync(shScriptPath, shScript);
            fs.chmodSync(shScriptPath, '755');
            console.log(`Updated Unix script at: ${shScriptPath}`);
        }
        
        return true;
    } catch (error) {
        console.error(`Error updating platform script: ${error.message}`);
        return false;
    }
};

// Update the appropriate script based on platform
if (!updatePlatformScript()) {
    console.error('Failed to update platform-specific script');
    process.exit(1);
}

// Determine which script to run based on OS
const scriptToRun = isWindows ? path.join(scriptDir, 'run-flex.bat') : path.join(scriptDir, 'run-flex.sh');

// Check if the script exists
if (!fs.existsSync(scriptToRun)) {
    console.error(`Error: Script ${scriptToRun} not found`);
    process.exit(1);
}

// Make the script executable on Unix-like systems
if (!isWindows) {
    try {
        fs.chmodSync(scriptToRun, '755');
    } catch (error) {
        console.warn(`Warning: Could not make ${scriptToRun} executable: ${error.message}`);
    }
}

// Run the appropriate script
const child = isWindows
    ? spawn('cmd.exe', ['/c', scriptToRun], { stdio: 'inherit' })
    : spawn(scriptToRun, [], { stdio: 'inherit' });

// Handle process exit
child.on('exit', (code) => {
    process.exit(code);
});

// Handle errors
child.on('error', (error) => {
    console.error(`Error executing script: ${error.message}`);
    process.exit(1);
}); 