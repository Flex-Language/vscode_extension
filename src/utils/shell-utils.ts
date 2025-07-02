import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  timeout?: number;
}

/**
 * Execute a command with proper argument separation to handle paths with spaces
 * @param command The command to execute
 * @param args Array of arguments for the command
 * @param options Execution options (timeout, etc.)
 * @returns Command output
 */
export function execCommand(command: string, args: string[] = [], options: CommandOptions = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const { timeout = 5000 } = options;

    const child: ChildProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // Don't use shell to avoid quoting issues
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeout) {
      timeoutId = setTimeout(() => {
        // Use platform-appropriate kill signal for cross-platform compatibility
        if (os.platform() === 'win32') {
          child.kill(); // Windows doesn't support SIGTERM, use default termination
        } else {
          child.kill('SIGTERM'); // Unix-like systems support SIGTERM
        }
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (code !== 0) {
        const error = new Error(`Command failed with exit code ${code}`) as any;
        error.code = code;
        error.stderr = stderr;
        error.stdout = stdout;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Escape a file path for safe shell execution across platforms.
 * 
 * WARNING: This function is intended ONLY for escaping file paths when sending 
 * commands to a shell. It handles common shell meta-characters but may not cover
 * all edge cases. For production applications, consider using a well-tested 
 * library like npm's 'shell-quote' for more robust shell argument escaping.
 * 
 * @param filePath Path to escape
 * @returns Escaped path safe for shell execution
 */
export function escapeShellPath(filePath: string): string {
  // Return empty string if input is falsy
  if (!filePath) {
    return '""';
  }

  // Comprehensive regex covering cross-platform shell meta-characters:
  // - \s: whitespace (spaces, tabs, newlines)
  // - "': quotes that need escaping
  // - `$: command substitution and variable expansion
  // - \\: backslash escape character
  // - |&;<>: pipe, background, command separators, redirections
  // - (){}[]: grouping and brace expansion
  // - *?: globbing patterns
  // - ~: home directory expansion
  // - ^: Windows CMD escape character
  // - %: Windows environment variable expansion
  // - !: Windows delayed expansion and bash history expansion
  // - =,+: potential issues in various shell contexts
  const shellMetaChars = /[\s"'`$\\|&;<>(){}[\]*?~^%!=,+]/;

  if (shellMetaChars.test(filePath)) {
    // For paths containing shell meta-characters:
    // 1. Escape any existing double quotes by doubling them (Windows) or backslash-escaping (Unix)
    // 2. Wrap the entire path in double quotes
    if (os.platform() === 'win32') {
      // Windows CMD/PowerShell: double quotes are escaped by doubling
      return `"${filePath.replace(/"/g, '""')}"`;
    } else {
      // Unix shells: escape quotes with backslashes  
      return `"${filePath.replace(/"/g, '\\"')}"`;
    }
  }

  return filePath;
}