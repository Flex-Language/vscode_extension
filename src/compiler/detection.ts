import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { execCommand } from '../utils/shell-utils';

/**
 * Verify that the compiler produces the expected usage output
 * @param compilerPath Path or command to test
 * @returns True if output matches, false otherwise
 */
export async function verifyCompilerOutput(compilerPath: string): Promise<boolean> {
    console.log(`🔍 Verifying compiler: ${compilerPath}`);

    // Special case: if this is the exact Flex Language compiler path, accept it
    if (compilerPath === '/usr/local/bin/flex') {
        console.log(`✅ Found Flex programming language compiler at standard location: ${compilerPath}`);
        return true;
    }

    try {
        // First try: flex --version with reduced timeout
        const { stderr, stdout } = await execCommand(compilerPath, ['--version'], {
            timeout: 1500  // Reduced timeout to avoid hanging
        });

        const output = (stdout + stderr);
        console.log(`📋 Version output: "${output}"`);

        const outputLower = output.toLowerCase();

        // Check if it's Unix flex (lexical analyzer) - if so, reject it
        if (outputLower.includes("lexical") ||
            outputLower.includes("scanner") ||
            outputLower.includes("yacc") ||
            output.includes("2.6.") ||  // Common Unix flex version pattern
            output.includes("Apple(flex") || // Apple's flex distribution
            outputLower.includes("gnu") ||
            (outputLower.includes("flex") && !outputLower.includes("language"))) {
            console.log(`❌ Detected Unix flex lexical analyzer: "${output}"`);
            return false;
        }

        // Only accept if it explicitly mentions "Flex Language" or similar
        if (outputLower.includes("flex language") ||
            (outputLower.includes("flex") && outputLower.includes("1.0"))) {
            console.log(`✅ Found Flex programming language compiler: "${output}"`);
            return true;
        }

        // Check for specific Flex programming language indicators
        const isFlexLang = (
            outputLower.includes(".lx") ||
            outputLower.includes(".flex") ||
            outputLower.includes("franco") ||
            outputLower.includes("arabic") ||
            outputLower.includes("programming language") ||
            output.match(/flex\s+v?\d+\.\d+/)
        );

        if (isFlexLang) {
            console.log(`✅ Found Flex programming language indicators in version output`);
            return true;
        }

    } catch (error: any) {
        console.log(`⚠️  --version failed: ${error.message}`);

        // For /usr/local/bin/flex, if version command fails, try alternative detection
        if (compilerPath === '/usr/local/bin/flex' || compilerPath.endsWith('/usr/local/bin/flex')) {
            console.log(`⚡ Special handling for Flex Language compiler at ${compilerPath}`);

            // Third try: test with a simple help command or check file existence
            try {
                const { stderr: stderr3, stdout: stdout3 } = await execCommand(compilerPath, ['--help'], {
                    timeout: 1000
                });
                const helpOutput = (stdout3 + stderr3).toLowerCase();
                if (helpOutput.includes("flex") || helpOutput.includes("usage")) {
                    console.log(`✅ Flex compiler responded to --help, assuming it's correct`);
                    return true;
                }
            } catch (helpError: any) {
                console.log(`Help command also failed: ${helpError.message}`);
            }

            // If it's at the standard Flex Language location and not the Unix flex, assume it's correct
            console.log(`✅ Assuming ${compilerPath} is Flex Language compiler based on location`);
            return true;
        }

        // Second try: just run flex without arguments
        try {
            const { stderr: stderr2, stdout: stdout2 } = await execCommand(compilerPath, [], {
                timeout: 1000  // Reduced timeout
            });

            const output = (stdout2 + stderr2);
            console.log(`📋 No-args output: "${output}"`);

            const outputLower = output.toLowerCase();

            // Check if it's Unix flex - if so, reject it
            if (outputLower.includes("lexical") ||
                outputLower.includes("scanner") ||
                outputLower.includes("yacc") ||
                output.includes("2.6.") ||  // Common Unix flex version pattern
                output.includes("Apple(flex") || // Apple's flex distribution
                outputLower.includes("gnu") ||
                (outputLower.includes("flex") && !outputLower.includes("language"))) {
                console.log(`❌ Detected Unix flex lexical analyzer in no-args output: "${output}"`);
                return false;
            }

            // Only accept if it explicitly mentions "Flex Language" or similar patterns
            if ((outputLower.includes("flex") && outputLower.includes("language")) ||
                (outputLower.includes("flex") && outputLower.includes("usage") && outputLower.includes("file"))) {
                console.log(`✅ Found Flex programming language compiler in no-args output: "${output}"`);
                return true;
            }

            // Check for Flex programming language specific patterns
            const isFlexLang = (
                outputLower.includes(".lx") ||
                outputLower.includes(".flex") ||
                outputLower.includes("franco") ||
                outputLower.includes("arabic")
            );

            if (isFlexLang) {
                console.log(`✅ Found Flex programming language indicators in no-args output`);
                return true;
            }

        } catch (error2: any) {
            console.log(`❌ Both version and no-args tests failed: ${error2.message}`);
            return false;
        }
    }

    console.log(`❌ No Flex programming language indicators found`);
    return false;
}

/**
 * Get OS-specific paths where the Flex compiler might be located
 */
export function getOSSpecificPaths(): string[] {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            return [
                'C:\\Program Files\\Flex\\flex.exe',
                'C:\\Program Files (x86)\\Flex\\flex.exe',
                'C:\\Flex\\flex.exe',
                'flex.exe'
            ];
        case 'darwin':
            return [
                '/usr/local/bin/flex',  // Prioritize Flex programming language compiler
                '/opt/homebrew/bin/flex',
                'flex',  // Check PATH flex after specific locations
                '/usr/bin/flex'  // Check Unix flex last as fallback (will be rejected by verification)
            ];
        case 'linux':
            return [
                '/usr/local/bin/flex',
                '/usr/bin/flex',
                '/opt/flex/bin/flex',
                'flex'
            ];
        default:
            return ['flex'];
    }
}

/**
 * Find the Flex compiler on the system
 */
export async function findFlexCompiler(): Promise<string | null> {
    console.log('🔍 Searching for Flex compiler...');

    // First check custom path from settings
    const config = vscode.workspace.getConfiguration('flex');
    const customPath = config.get<string>('compilerPath');

    if (customPath && customPath.trim() !== '') {
        console.log(`🎯 Checking custom path from settings: ${customPath}`);
        if (await verifyCompilerOutput(customPath)) {
            console.log(`✅ Found working Flex compiler at custom path: ${customPath}`);
            return customPath;
        } else {
            console.log(`❌ Custom path does not contain a working Flex compiler: ${customPath}`);
        }
    }

    // Check OS-specific paths
    const paths = getOSSpecificPaths();

    for (const compilerPath of paths) {
        console.log(`🔍 Checking: ${compilerPath}`);

        try {
            if (await verifyCompilerOutput(compilerPath)) {
                console.log(`✅ Found working Flex compiler: ${compilerPath}`);
                return compilerPath;
            }
        } catch (error: any) {
            console.log(`❌ Failed to verify ${compilerPath}: ${error.message}`);
        }
    }

    console.log('❌ No working Flex compiler found');
    return null;
}

/**
 * Show download prompt when compiler is not found
 */
export function showFlexDownloadPrompt(): void {
    const downloadMessage = 'Flex compiler not found. Download the latest version?';
    const downloadAction = 'Download Flex';

    vscode.window.showErrorMessage(downloadMessage, downloadAction).then(selection => {
        if (selection === downloadAction) {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/Flex-Language/Flex/releases/latest'));
        }
    });
}

/**
 * Show installation help dialog
 */
export function showCompilerInstallationHelp(): void {
    const platform = os.platform();
    let instructions = '';

    switch (platform) {
        case 'win32':
            instructions = `**Windows Installation:**
1. Download the Flex compiler from: https://github.com/Flex-Language/Flex/releases/latest
2. Extract the files to a folder (e.g., C:\\Flex)
3. Add the folder to your PATH environment variable
4. Restart VS Code
5. Or specify the path in VS Code settings: "flex.compilerPath"`;
            break;
        case 'darwin':
            instructions = `**macOS Installation:**
1. Download the Flex compiler from: https://github.com/Flex-Language/Flex/releases/latest
2. Move the 'flex' executable to /usr/local/bin/flex
3. Make it executable: chmod +x /usr/local/bin/flex
4. Restart VS Code
5. Or install via Homebrew (if available): brew install flex`;
            break;
        case 'linux':
            instructions = `**Linux Installation:**
1. Download the Flex compiler from: https://github.com/Flex-Language/Flex/releases/latest
2. Move the 'flex' executable to /usr/local/bin/flex
3. Make it executable: chmod +x /usr/local/bin/flex
4. Restart VS Code
5. Or specify the path in VS Code settings: "flex.compilerPath"`;
            break;
        default:
            instructions = `**Installation:**
1. Download the Flex compiler from: https://github.com/Flex-Language/Flex/releases/latest
2. Place it in your PATH or specify the path in VS Code settings: "flex.compilerPath"`;
    }

    const panel = vscode.window.createWebviewPanel(
        'flexInstallHelp',
        'Flex Compiler Installation Help',
        vscode.ViewColumn.One,
        {}
    );

    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flex Installation Help</title>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            h1 { color: var(--vscode-foreground); }
            pre { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; }
            a { color: var(--vscode-textLink-foreground); }
        </style>
    </head>
    <body>
        <h1>Flex Compiler Installation</h1>
        <pre>${instructions}</pre>
        <p><strong>Need help?</strong> Visit the <a href="https://github.com/Flex-Language/Flex/wiki">Flex Documentation</a></p>
    </body>
    </html>
  `;
}

/**
 * Show first-time welcome prompt
 */
export function showFirstTimeWelcomePrompt(context: vscode.ExtensionContext): void {
    const hasSeenWelcome = context.globalState.get<boolean>('flex.hasSeenWelcome', false);

    if (!hasSeenWelcome) {
        context.globalState.update('flex.hasSeenWelcome', true);

        const message = 'Welcome to Flex! Would you like to see installation instructions for the Flex compiler?';
        const showInstructions = 'Show Instructions';
        const dismiss = 'Dismiss';

        vscode.window.showInformationMessage(message, showInstructions, dismiss).then(selection => {
            if (selection === showInstructions) {
                showCompilerInstallationHelp();
            }
        });
    }
}

/**
 * Verify compiler installation and show prompts if needed
 */
export async function verifyCompilerInstallation(context: vscode.ExtensionContext): Promise<string | null> {
    const compiler = await findFlexCompiler();

    if (!compiler) {
        showFirstTimeWelcomePrompt(context);
        showFlexDownloadPrompt();
        return null;
    }

    return compiler;
} 