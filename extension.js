const vscode = require("vscode");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const execAsync = promisify(exec);
const fs = require("fs");
const os = require("os");

// Define built-in functions and their descriptions for hover information
const builtInFunctions = {
  etb3: '```flex\n(method) etb3(message?: any, ...optionalParams: any[]): void\n```\n\nPrints to stdout with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values similar to printf().\n\n```flex\nconst x = 5;\netb3("Value: {x}");\n// Prints: Value: 5, to stdout\n```\n\nSee `print()`, `out()`, `output()` for more information.',

  print:
    '```flex\n(method) print(message?: any, ...optionalParams: any[]): void\n```\n\nPrints to stdout with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values.\n\n```flex\nconst count = 5;\nprint("count: {count}");\n// Prints: count: 5, to stdout\n```\n\nSee `etb3()`, `out()`, `output()` for more information.',

  out: '```flex\n(method) out(message?: any, ...optionalParams: any[]): void\n```\n\nAlias for print - outputs the given value with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values.\n\n```flex\nconst x = 10;\nout("x = {x}");\n// Prints: x = 10, to stdout\n```\n\nSee `print()`, `etb3()`, `output()` for more information.',

  output:
    '```flex\n(method) output(message?: any, ...optionalParams: any[]): void\n```\n\nAlias for print - outputs the given value with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values.\n\n```flex\nconst result = 42;\noutput("The answer is {result}");\n// Prints: The answer is 42, to stdout\n```\n\nSee `print()`, `etb3()`, `out()` for more information.',

  printf:
    '```flex\n(method) printf(format: string, ...args: any[]): void\n```\n\nPrints formatted string to stdout with newline. Supports string interpolation with curly braces {} similar to f-strings.\n\n```flex\nconst name = "Alice";\nconst age = 30;\nprintf("Name: {name}, Age: {age}");\n// Prints: Name: Alice, Age: 30, to stdout\n```\n\nSee `print()`, `etb3()` for more information.',

  cout: '```flex\n(method) cout(message?: any, ...optionalParams: any[]): void\n```\n\nC++-style alias for print - outputs the given value to stdout. Multiple arguments can be passed.\n\n```flex\nconst score = 95;\ncout("Score: {score}");\n// Prints: Score: 95, to stdout\n```\n\nSee `print()`, `etb3()` for more information.',

  scan: '```flex\n(method) scan(): string\n```\n\nReads a line of input from stdin and returns it as a string.\n\n```flex\netb3("Enter your name:");\nconst name = scan();\netb3("Hello, {name}!");\n// If user inputs "Bob", prints: Hello, Bob!\n```\n\nSee `input()`, `read()`, `da5l()` for more information.',

  read: '```flex\n(method) read(): string\n```\n\nAlias for input - reads a line from stdin and returns it as a string.\n\n```flex\netb3("Enter your age:");\nconst age = read();\netb3("You are {age} years old.");\n// If user inputs "25", prints: You are 25 years old.\n```\n\nSee `input()`, `scan()`, `da5l()` for more information.',

  input:
    '```flex\n(method) input(): string\n```\n\nReads a line of input from stdin and returns it as a string.\n\n```flex\netb3("Enter a number:");\nconst num = input();\netb3("You entered: {num}");\n// If user inputs "42", prints: You entered: 42\n```\n\nSee `read()`, `scan()`, `da5l()` for more information.',

  da5l: '```flex\n(method) da5l(): string\n```\n\nArabic alias for input - reads a line from stdin and returns it as a string.\n\n```flex\netb3("أدخل اسمك:");\nconst name = da5l();\netb3("مرحبًا، {name}!");\n// If user inputs "محمد", prints: مرحبًا، محمد!\n```\n\nSee `input()`, `read()`, `scan()` for more information.',

  da5al:
    '```flex\n(method) da5al(): string\n```\n\nArabic alias for input - reads a line from stdin and returns it as a string.\n\n```flex\netb3("أدخل رقمًا:");\nconst number = da5al();\netb3("الرقم المدخل: {number}");\n// If user inputs "10", prints: الرقم المدخل: 10\n```\n\nSee `input()`, `read()`, `scan()`, `da5l()` for more information.',

  d5l: '```flex\n(method) d5l(): string\n```\n\nShortened Arabic alias for input - reads a line from stdin and returns it as a string.\n\n```flex\netb3("أدخل قيمة:");\nconst value = d5l();\netb3("القيمة: {value}");\n// If user inputs "صحيح", prints: القيمة: صحيح\n```\n\nSee `input()`, `read()`, `scan()`, `da5l()` for more information.'
};

// Language keywords with descriptions
const languageKeywords = {
  lw: '```flex\nlw (condition) { statements }\n```\n\nConditional statement in Flex (equivalent to "if" in other languages). Executes the code block if the condition evaluates to true.\n\n```flex\nconst x = 10;\nlw x > 5 {\n  etb3("x is greater than 5");\n}\n// Prints: x is greater than 5\n```\n\nSee `aw`, `gher` for related conditional statements.',

  aw: '```flex\naw (condition) { statements }\n```\n\nSecondary conditional statement (equivalent to "else if" in other languages). Must follow a `lw` or another `aw` block.\n\n```flex\nconst x = 3;\nlw x > 5 {\n  etb3("x is greater than 5");\n} aw x > 0 {\n  etb3("x is positive but not greater than 5");\n}\n// Prints: x is positive but not greater than 5\n```\n\nSee `lw`, `gher` for related conditional statements.',

  gher: '```flex\ngher { statements }\n```\n\nAlternative conditional block (equivalent to "else" in other languages). Executes when no preceding `lw` or `aw` conditions are true.\n\n```flex\nconst x = -1;\nlw x > 0 {\n  etb3("x is positive");\n} gher {\n  etb3("x is zero or negative");\n}\n// Prints: x is zero or negative\n```\n\nSee `lw`, `aw` for related conditional statements.',

  talama:
    '```flex\ntalama (condition) { statements }\n```\n\nLoop that executes while condition is true (equivalent to "while" in other languages).\n\n```flex\nlet i = 0;\ntalama i < 3 {\n  etb3(i);\n  i++;\n}\n// Prints:\n// 0\n// 1\n// 2\n```\n\nSee `karr` for another loop structure.',

  karr: '```flex\nkarr variable=start l7d end { statements }\n```\n\nLoop structure in Flex (equivalent to "for" in other languages). Iterates from start value to end value.\n\n```flex\nkarr i=0 l7d 3 {\n  etb3("Index: {i}");\n}\n// Prints:\n// Index: 0\n// Index: 1\n// Index: 2\n// Index: 3\n```\n\nSee `talama` for another loop structure.',

  sndo2:
    '```flex\nsndo2 functionName(param1, param2, ...) { statements }\n```\n\nDefines a function in Flex. The function can accept parameters and return values using `rg3`.\n\n```flex\nsndo2 add(a, b) {\n  rg3 a + b;\n}\n\nconst result = add(5, 3);\netb3("Sum: {result}");\n// Prints: Sum: 8\n```\n\nSee `rg3` for returning values from functions.',

  rg3: '```flex\nrg3 value;\n```\n\nReturns a value from a function (equivalent to "return" in other languages).\n\n```flex\nsndo2 isEven(num) {\n  lw num % 2 == 0 {\n    rg3 sa7;\n  }\n  rg3 ghalt;\n}\n\nconst check = isEven(4);\netb3("Is 4 even? {check}");\n// Prints: Is 4 even? sa7\n```\n\nSee `sndo2` for function definition.',

  rakm: '```flex\nrakm variableName = value;\n```\n\nInteger data type (equivalent to "int" in other languages).\n\n```flex\nrakm age = 25;\netb3("Age: {age}");\n// Prints: Age: 25\n```\n\nSee `kasr`, `klma`, `so2al` for other data types.',

  kasr: '```flex\nkasr variableName = value;\n```\n\nFloating-point data type (equivalent to "float" in other languages).\n\n```flex\nkasr pi = 3.14159;\netb3("Pi: {pi}");\n// Prints: Pi: 3.14159\n```\n\nSee `rakm`, `klma`, `so2al` for other data types.',

  klma: '```flex\nklma variableName = "value";\n```\n\nString data type (equivalent to "string" in other languages).\n\n```flex\nklma greeting = "Hello, World!";\netb3(greeting);\n// Prints: Hello, World!\n```\n\nSee `rakm`, `kasr`, `so2al` for other data types.',

  so2al:
    '```flex\nso2al variableName = sa7|ghalt;\n```\n\nBoolean data type (equivalent to "bool" in other languages).\n\n```flex\nso2al isActive = sa7;\netlb3("Is active: {isActive}");\n// Prints: Is active: sa7\n```\n\nSee `rakm`, `kasr`, `klma` for other data types.',

  dorg: '```flex\ndorg variableName = [value1, value2, ...];\n```\n\nList/array data type (equivalent to "array" or "list" in other languages).\n\n```flex\ndorg numbers = [1, 2, 3, 4];\netb3("First number: {numbers[0]}");\n// Prints: First number: 1\n```\n\nSee `rakm`, `kasr`, `klma` for other data types.',

  w2f: '```flex\nw2f;\n```\n\nExits the current loop (equivalent to "break" in other languages).\n\n```flex\nkarr i=0 l7d 10 {\n  lw i == 5 {\n    w2f;\n  }\n  etb3(i);\n}\n// Prints: 0, 1, 2, 3, 4\n```\n\nSee `talama`, `karr` for loop structures.',

  sa7: '```flex\nsa7\n```\n\nBoolean true value (equivalent to "true" in other languages).\n\n```flex\nso2al flag = sa7;\nlw flag {\n  etb3("Flag is true");\n}\n// Prints: Flag is true\n```\n\nSee `ghalt`, `so2al` for related boolean concepts.',

  ghalt:
    '```flex\nghalt\n```\n\nBoolean false value (equivalent to "false" in other languages).\n\n```flex\nso2al flag = ghalt;\nlw flag {\n  etb3("This won\'t print");\n} gher {\n  etb3("Flag is false");\n}\n// Prints: Flag is false\n```\n\nSee `sa7`, `so2al` for related boolean concepts.',

  geep: '```flex\ngeep "filename.lx";\n```\n\nImports code from another file (equivalent to "import" or "include" in other languages).\n\n```flex\n// In main.lx\ngeep "math.lx";\nconst result = add(5, 3);\netb3("Result: {result}");\n// If math.lx contains add function, prints: Result: 8\n```'
};

/**
 * Verify that the compiler produces the expected usage output
 * @param {string} compilerPath Path or command to test
 * @returns {Promise<boolean>} True if output matches, false otherwise
 */
async function verifyCompilerOutput(compilerPath) {
  try {
    const { stderr, stdout } = await execAsync(`"${compilerPath}"`, {
      timeout: 2000
    });
    // Check for any output that suggests this is the Flex compiler
    // More permissive checking for flexibility
    return (
      (stdout.includes("flex") && stdout.includes("Usage")) ||
      (stderr.includes("flex") && stderr.includes("Usage")) ||
      stdout.includes(".lx") ||
      stderr.includes(".lx") ||
      stdout.includes(".flex") ||
      stderr.includes(".flex")
    );
  } catch (error) {
    // Some compilers might return exit code 1 when run without arguments
    return (
      (error.stdout &&
        (error.stdout.includes("flex") ||
          error.stdout.includes(".lx") ||
          error.stdout.includes(".flex"))) ||
      (error.stderr &&
        (error.stderr.includes("flex") ||
          error.stderr.includes(".lx") ||
          error.stderr.includes(".flex")))
    );
  }
}

/**
 * Get OS-specific Flex compiler paths
 * @returns {string[]} Array of possible compiler paths
 */
function getOSSpecificPaths() {
  // Direct paths that don't need joining
  const directPaths = [];

  // Platform-specific paths
  if (os.platform() === "darwin") {
    // macOS
    // On macOS, just use the 'flex' command directly
    return ["flex"];
  } else if (os.platform() === "win32") {
    // Windows
    directPaths.push("C:\\Program Files (x86)\\Flex\\flex.exe");
    directPaths.push("C:\\Program Files\\Flex\\flex.exe");
    directPaths.push("C:\\Flex\\flex.exe");
  } else if (os.platform() === "linux") {
    // Linux
    // directPaths.push('/usr/local/bin/flex');
    // directPaths.push('/usr/bin/flex');
    // directPaths.push('/bin/flex');
    return ["flex"];
  }

  const home = process.env.HOME || process.env.USERPROFILE;

  // Base paths to join with compiler names
  const basePaths = [
    path.join(home, "Developer/Flex-1"),
    path.join(home, "Flex-1"),
    path.join(home, "flex"),
    "/usr/local/flex",
    "/opt/flex"
  ];

  // Compiler names to join with base paths
  const compilerNames = [
    "flex",
    "bin/flex",
    "build/flex",
    "src/flex_tester/flex"
  ];

  // Combine all paths
  const paths = [...directPaths];

  // Add composed paths
  basePaths.forEach((base) => {
    compilerNames.forEach((compiler) => {
      paths.push(path.join(base, compiler));
    });
  });

  return paths;
}

/**
 * Show download prompt for Flex compiler
 */
function showFlexDownloadPrompt() {
  const releasesUrl = "https://github.com/Flex-Language/Flex/releases/latest";
  const message =
    "Flex compiler not found. You need to install it and ensure it's in your PATH to run Flex programs.";

  vscode.window
    .showErrorMessage(message, "Download Flex", "Installation Guide", "Dismiss")
    .then((selection) => {
      if (selection === "Download Flex") {
        vscode.env.openExternal(vscode.Uri.parse(releasesUrl));
      } else if (selection === "Installation Guide") {
        // Both options point to releases since that's where the compiler is
        vscode.env.openExternal(vscode.Uri.parse(releasesUrl));
      }
    });
}

/**
 * Show first-time welcome prompt for Flex compiler installation
 * @param {vscode.ExtensionContext} context Extension context for storing state
 */
function showFirstTimeWelcomePrompt(context) {
  const releasesUrl = "https://github.com/Flex-Language/Flex/releases/latest";
  const message =
    "🎉 Welcome to Flex Language Support! To run .lx files, you'll need the Flex compiler.";

  vscode.window
    .showInformationMessage(
      message,
      "Download Compiler",
      "I Already Have It",
      "Remind Me Later"
    )
    .then((selection) => {
      if (selection === "Download Compiler") {
        vscode.env.openExternal(vscode.Uri.parse(releasesUrl));
        // Still mark as prompted even if they download it now
        context.globalState.update("hasPromptedForCompiler", true);
      } else if (selection === "I Already Have It") {
        // User claims they have the compiler, mark as prompted
        context.globalState.update("hasPromptedForCompiler", true);
        // Offer to verify if their compiler installation works
        verifyCompilerInstallation(context);
      }
      // For 'Remind Me Later' we don't mark as prompted, so they'll see it again next time
    });
}

/**
 * Verify if the compiler installation works properly
 * @param {vscode.ExtensionContext} context Extension context
 */
async function verifyCompilerInstallation(context) {
  const compilerPath = await findFlexCompiler();
  if (compilerPath) {
    vscode.window.showInformationMessage(
      "✅ Flex compiler found successfully! You're all set."
    );
  } else {
    vscode.window
      .showWarningMessage(
        "Flex compiler not found in PATH. Would you like to download it now?",
        "Download",
        "Not Now"
      )
      .then((selection) => {
        if (selection === "Download") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/Flex-Language/Flex/releases/latest")
          );
        }
      });
  }
}

/**
 * Find the Flex compiler path
 * @returns {Promise<string|null>} Path to the compiler if found, null otherwise
 */
async function findFlexCompiler() {
  // First, check workspace or user settings for a configured path
  const config = vscode.workspace.getConfiguration("flex");
  const configuredPath = config.get("compilerPath");

  if (configuredPath && configuredPath.trim() !== "") {
    try {
      if (fs.existsSync(configuredPath)) {
        const isValid = await verifyCompilerOutput(configuredPath);
        if (isValid) {
          console.log(`Using configured Flex compiler path: ${configuredPath}`);
          return configuredPath;
        }
      }
    } catch (error) {
      console.error("Error checking configured compiler path:", error);
    }
  }

  // Try the 'flex' command - this is the only valid command for Flex
  try {
    const isValid = await verifyCompilerOutput("flex");
    if (isValid) {
      console.log(`Found Flex compiler in PATH as 'flex'`);
      return "flex";
    }
  } catch (error) {
    console.log("Flex compiler not found in PATH");
  }

  // If we reach here, try OS-specific paths
  const paths = getOSSpecificPaths();
  for (const flexPath of paths) {
    try {
      if (fs.existsSync(flexPath)) {
        const isValid = await verifyCompilerOutput(flexPath);
        if (isValid) {
          console.log(`Found Flex compiler at: ${flexPath}`);
          return flexPath;
        }
      }
    } catch (error) {
      continue;
    }
  }

  console.log("Flex compiler not found in any location");
  return null;
}

// Add diagnostic collection for error highlighting
let diagnosticCollection;

/**
 * Check for balanced braces in the entire document
 * @param {string[]} lines Array of text lines
 * @returns {vscode.Diagnostic[]} Array of diagnostics for unbalanced braces
 */
function checkBracesBalance(lines) {
  const diagnostics = [];
  const stack = [];

  // Map to keep track of opening brace positions
  const openingPositions = {
    "{": [],
    "(": [],
    "[": []
  };

  // Track state across multiple lines
  let inComment = false;
  let inString = false;
  let inTripleQuote = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : "";

      // Handle triple-quoted strings
      if (
        j + 2 < line.length &&
        char === "'" &&
        line[j + 1] === "'" &&
        line[j + 2] === "'"
      ) {
        inTripleQuote = !inTripleQuote;
        j += 2; // Skip the next two quotes
        continue;
      }

      // Skip everything inside triple quotes
      if (inTripleQuote) {
        continue;
      }

      // Skip characters in regular strings
      if (char === '"' && prevChar !== "\\") {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "/" && j + 1 < line.length && line[j + 1] === "/") {
          // Line comment, skip rest of line
          break;
        }

        if (char === "#") {
          // Another line comment style, skip rest of line
          break;
        }

        if (char === "/" && j + 1 < line.length && line[j + 1] === "*") {
          inComment = true;
          j++; // Skip '*'
          continue;
        }

        if (
          inComment &&
          char === "*" &&
          j + 1 < line.length &&
          line[j + 1] === "/"
        ) {
          inComment = false;
          j++; // Skip '/'
          continue;
        }
      }

      if (inComment || inString) {
        continue;
      }

      // Check braces
      if (char === "{" || char === "(" || char === "[") {
        stack.push(char);
        // Record position
        if (!openingPositions[char]) {
          openingPositions[char] = [];
        }
        openingPositions[char].push({ line: i, col: j });
      } else if (char === "}" || char === ")" || char === "]") {
        const matchingOpening = char === "}" ? "{" : char === ")" ? "(" : "[";

        if (stack.length === 0 || stack[stack.length - 1] !== matchingOpening) {
          // Unmatched closing brace
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(i, j, i, j + 1),
              `Unmatched closing ${char}`,
              vscode.DiagnosticSeverity.Error
            )
          );
        } else {
          stack.pop();
          // Remove the matched opening position
          if (
            openingPositions[matchingOpening] &&
            openingPositions[matchingOpening].length > 0
          ) {
            openingPositions[matchingOpening].pop();
          }
        }
      }
    }
  }

  // Any remaining braces on the stack are unmatched opening braces
  for (const brace in openingPositions) {
    for (const pos of openingPositions[brace]) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(pos.line, pos.col, pos.line, pos.col + 1),
          `Unmatched opening ${brace}`,
          vscode.DiagnosticSeverity.Error
        )
      );
    }
  }

  return diagnostics;
}

/**
 * Parse Flex file and provide diagnostics
 * @param {vscode.TextDocument} document
 */
async function provideDiagnostics(document) {
  if (!diagnosticCollection) {
    return;
  }

  if (document.languageId !== "flex") {
    return;
  }

  const diagnostics = [];
  const text = document.getText();
  const lines = text.split("\n");

  // Check for braces balance in the entire document
  const braceDiagnostics = checkBracesBalance(lines);
  diagnostics.push(...braceDiagnostics);

  // Simple regex-based error detection - will be expanded with more sophisticated parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments
    if (
      line.startsWith("//") ||
      line.startsWith("#") ||
      line.startsWith("/*") ||
      line.startsWith("'''")
    ) {
      continue;
    }

    // Check for unclosed string literals
    const stringQuotes = line.match(/"/g);
    if (stringQuotes && stringQuotes.length % 2 !== 0) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, 0, i, line.length),
        "Unclosed string literal",
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }

    // Check for semicolons (Flex doesn't use semicolons)
    if (line.endsWith(";")) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, line.length - 1, i, line.length),
        "Semicolons are not required in Flex",
        vscode.DiagnosticSeverity.Information
      );
      diagnostics.push(diagnostic);
    }

    // Check for potentially incorrect variable declarations
    const variableDeclarations = line.match(
      /\b(int|float|string|bool|rakm|kasr|klma|so2al|dorg|list)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/
    );
    if (variableDeclarations) {
      const type = variableDeclarations[1];
      const varName = variableDeclarations[2];
      const value = variableDeclarations[3];

      // Type-specific validation
      if (type === "int" || type === "rakm") {
        if (
          value.includes(".") &&
          !value.includes("parseInt") &&
          !value.includes("Math.floor")
        ) {
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(
              i,
              line.indexOf(value),
              i,
              line.indexOf(value) + value.length
            ),
            "Possible implicit float to integer conversion",
            vscode.DiagnosticSeverity.Warning
          );
          diagnostics.push(diagnostic);
        }
      }

      if (
        (type === "bool" || type === "so2al") &&
        !(
          value.includes("true") ||
          value.includes("false") ||
          value.includes("sa7") ||
          value.includes("ghalt") ||
          value.includes("==") ||
          value.includes("!=") ||
          value.includes("<") ||
          value.includes(">")
        )
      ) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            i,
            line.indexOf(value),
            i,
            line.indexOf(value) + value.length
          ),
          "Non-boolean value assigned to boolean variable",
          vscode.DiagnosticSeverity.Warning
        );
        diagnostics.push(diagnostic);
      }

      // Check for incorrect boolean values in Arabic syntax
      if (
        (type === "bool" || type === "so2al") &&
        (value.includes("true") || value.includes("false")) &&
        !(value.includes("sa7") || value.includes("ghalt"))
      ) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            i,
            line.indexOf(value),
            i,
            line.indexOf(value) + value.length
          ),
          "Consider using 'sa7' or 'ghalt' for boolean values in Arabic syntax",
          vscode.DiagnosticSeverity.Information
        );
        diagnostics.push(diagnostic);
      }
    }

    // Check for undeclared variables (basic implementation, would need symbol tracking for accuracy)
    const assignmentWithoutDeclaration = line.match(
      /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/
    );
    if (
      assignmentWithoutDeclaration &&
      !line.match(
        /\b(int|float|string|bool|rakm|kasr|klma|so2al|dorg|list)\s+/
      ) &&
      !line.includes("var ") &&
      !line.includes("let ")
    ) {
      // This is a very simplistic check and will produce false positives
      // A real implementation would track symbols/scope
      const varName = assignmentWithoutDeclaration[1];

      // Flex allows implicit variable declarations, so we shouldn't flag simple assignments
      // Only report the warning for more complex scenarios or if configured to be strict
      const config = vscode.workspace.getConfiguration("flex");
      const strictMode = config.get("strictVariableDeclarations", false);

      // Add this setting to package.json if it doesn't exist
      if (
        strictMode &&
        ![
          "i",
          "j",
          "k",
          "x",
          "y",
          "z",
          "temp",
          "index",
          "sum",
          "count",
          "result"
        ].includes(varName)
      ) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            i,
            line.indexOf(varName),
            i,
            line.indexOf(varName) + varName.length
          ),
          "Variable possibly used without declaration",
          vscode.DiagnosticSeverity.Information
        );
        diagnostics.push(diagnostic);
      }
    }

    // Check for incorrect Arabic loop syntax
    const wrongArabicLoop = line.match(/\bkarr\s*\(/);
    if (wrongArabicLoop) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, line.indexOf("karr"), i, line.indexOf("(") + 1),
        "Arabic loop should use 'karr i=0 l7d 10' syntax, not C-style 'karr (i=0; i<10; i++)'",
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }

    // Check for missing l7d in karr loops
    const missingL7d = line.match(
      /\bkarr\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\d+\s+(\d+)/
    );
    if (missingL7d) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, 0, i, line.length),
        "Missing 'l7d' in Arabic for loop. Use 'karr i=0 l7d 10'",
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }

    // Check for using da5l without assignment
    const da5lWithoutAssignment = line.match(/^da5l\(.*\)$/);
    if (da5lWithoutAssignment) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, 0, i, line.length),
        "Input function 'da5l()' must be assigned to a variable",
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }

    // Check for parameters in da5l
    const da5lWithParams = line.match(/da5l\(([^)]+)\)/);
    if (da5lWithParams && da5lWithParams[1].trim() !== "") {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(i, line.indexOf("da5l("), i, line.indexOf(")") + 1),
        "Input function 'da5l()' doesn't accept parameters. Use etb3() for prompts",
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }

    // Check for incorrect logical operators
    const incorrectLogicalOps = line.match(/(\&\&|\|\|)/);
    if (incorrectLogicalOps) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          i,
          line.indexOf(incorrectLogicalOps[1]),
          i,
          line.indexOf(incorrectLogicalOps[1]) + incorrectLogicalOps[1].length
        ),
        "Use 'and' or 'or' for logical operators, not '&&' or '||'",
        vscode.DiagnosticSeverity.Warning
      );
      diagnostics.push(diagnostic);
    }

    // Check for missing parentheses in function calls
    const functionCallsWithoutParens = line.match(
      /\b(etb3|print|out|output|printf|cout|scan|read|input|da5l|da5al|d5l)\s+(?!\()/
    );
    if (functionCallsWithoutParens) {
      // Make sure we're not detecting a function that actually has parentheses
      const fullLine = line.trim();
      const funcName = functionCallsWithoutParens[1];
      const funcPattern = new RegExp(`\\b${funcName}\\s*\\(`);

      // Check if we're in a string context
      const lineBeforeMatch = line.substring(
        0,
        line.indexOf(functionCallsWithoutParens[1])
      );
      const quotesBeforeMatch = (lineBeforeMatch.match(/"/g) || []).length;
      const isInString = quotesBeforeMatch % 2 !== 0;

      // Only report the error if:
      // 1. The function is not followed by parentheses anywhere in the line
      // 2. We're not inside a string
      // 3. The function name is not part of another word (like "printing")
      if (
        !funcPattern.test(fullLine) &&
        !isInString &&
        // Check the character after the function name+whitespace to ensure it's not part of another word
        /\s+[^a-zA-Z0-9_]/.test(
          line.substring(
            line.indexOf(functionCallsWithoutParens[0]) +
              functionCallsWithoutParens[0].length
          )
        )
      ) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            i,
            line.indexOf(functionCallsWithoutParens[1]),
            i,
            line.indexOf(functionCallsWithoutParens[1]) +
              functionCallsWithoutParens[1].length
          ),
          "Function calls require parentheses",
          vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      }
    }
  }

  // If we have the Flex compiler, try to use it for real error checking
  const compilerPath = await findFlexCompiler();
  if (compilerPath) {
    try {
      // Save the document to a temporary file
      const tempFilePath = path.join(os.tmpdir(), `flex-${Date.now()}.lx`);
      fs.writeFileSync(tempFilePath, text);

      // Run the compiler with a check-only flag, if it supports one
      try {
        const { stderr } = await execAsync(
          `"${compilerPath}" --check "${tempFilePath}"`,
          { timeout: 5000 }
        );

        // Parse compiler errors - this regex will need to be adjusted based on the actual error format
        const errorRegex = /line (\d+)(?:, col (\d+))?: (.+)/g;
        let match;
        while ((match = errorRegex.exec(stderr)) !== null) {
          const lineNum = parseInt(match[1], 10) - 1; // Convert to 0-based
          const colNum = match[2] ? parseInt(match[2], 10) - 1 : 0; // Convert to 0-based
          const message = match[3];

          if (lineNum >= 0 && lineNum < lines.length) {
            const diagnostic = new vscode.Diagnostic(
              new vscode.Range(lineNum, colNum, lineNum, lines[lineNum].length),
              message,
              vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
          }
        }
      } catch (execError) {
        // If the command failed, try parsing stderr for error messages
        if (execError.stderr) {
          const errorRegex = /line (\d+)(?:, col (\d+))?: (.+)/g;
          let match;
          while ((match = errorRegex.exec(execError.stderr)) !== null) {
            const lineNum = parseInt(match[1], 10) - 1;
            const colNum = match[2] ? parseInt(match[2], 10) - 1 : 0;
            const message = match[3];

            if (lineNum >= 0 && lineNum < lines.length) {
              const diagnostic = new vscode.Diagnostic(
                new vscode.Range(
                  lineNum,
                  colNum,
                  lineNum,
                  lines[lineNum].length
                ),
                message,
                vscode.DiagnosticSeverity.Error
              );
              diagnostics.push(diagnostic);
            }
          }
        }
      }

      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (unlinkError) {
        console.error("Error removing temp file:", unlinkError);
      }
    } catch (error) {
      console.error("Error running Flex compiler for diagnostics:", error);
    }
  }

  // Update diagnostics
  diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Flex Language Support is now active");

  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection("flex");
  context.subscriptions.push(diagnosticCollection);

  // Register hover provider for built-in functions and keywords
  const hoverProvider = vscode.languages.registerHoverProvider("flex", {
    provideHover(document, position, token) {
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) return null;

      const word = document.getText(wordRange);

      // Check if this is a function
      if (builtInFunctions[word]) {
        return new vscode.Hover(builtInFunctions[word]);
      }

      // Check if this is a keyword
      if (languageKeywords[word]) {
        return new vscode.Hover(languageKeywords[word]);
      }

      return null;
    }
  });
  context.subscriptions.push(hoverProvider);

  // Register event listeners for diagnostics
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) =>
      provideDiagnostics(document)
    ),
    vscode.workspace.onDidChangeTextDocument((event) =>
      provideDiagnostics(event.document)
    ),
    vscode.workspace.onDidSaveTextDocument((document) =>
      provideDiagnostics(document)
    )
  );

  // Analyze all flex documents that are already open
  vscode.workspace.textDocuments.forEach((document) => {
    if (document.languageId === "flex") {
      provideDiagnostics(document);
    }
  });

  // Show first-time welcome prompt
  const hasPrompted = context.globalState.get("hasPromptedForCompiler", false);
  if (!hasPrompted) {
    showFirstTimeWelcomePrompt(context);
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("flex.runFile", runFlexFile),
    vscode.commands.registerCommand("flex.verifyCompiler", () =>
      verifyCompilerInstallation(context)
    ),
    vscode.commands.registerCommand("flex.validateFile", validateFlexFile)
  );
}

/**
 * Run a Flex file
 */
async function runFlexFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  // Make sure the file is saved
  if (editor.document.isDirty) {
    await editor.document.save();
  }

  const filePath = editor.document.uri.fsPath;

  // On macOS, directly use the flex command without searching for paths
  if (os.platform() === "darwin") {
    const terminal = vscode.window.createTerminal("Flex");
    terminal.show(true);
    // Check if AI integration is enabled and pass OPENROUTER_API_KEY if needed
    const aiEnabled = vscode.workspace
      .getConfiguration("flex")
      .get("checkAI", false);
    const apiKey = vscode.workspace
      .getConfiguration("flex")
      .get("apiKey", "");
    if (aiEnabled && apiKey) {
      terminal.sendText(
        `export OPENROUTER_API_KEY='${apiKey}'`
      );
      terminal.sendText("clear");
      const flexModel = vscode.workspace
        .getConfiguration("flex")
        .get("model", "openai/gpt-4.1-mini");
      terminal.sendText(`flex --ai ${flexModel} "${filePath}"`);
    } else {
      terminal.sendText("clear");
      terminal.sendText(`flex "${filePath}"`);
      return;
    }
  }

  // For other platforms, find the Flex compiler
  const compilerPath = await findFlexCompiler();
  if (!compilerPath) {
    vscode.window
      .showErrorMessage(
        "Flex compiler not found. Please install it or add it to your PATH.",
        "Download"
      )
      .then((selection) => {
        if (selection === "Download") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/Flex-Language/Flex/releases/latest")
          );
        }
      });
    return;
  }

  // Create a new terminal
  const terminal = vscode.window.createTerminal("Flex");
  terminal.show(true);

  // Clear terminal and run the Flex file
  terminal.sendText("cls");

  // Check if AI integration is enabled and pass OPENROUTER_API_KEY if needed
  const aiEnabled = vscode.workspace
    .getConfiguration("flex")
    .get("checkAI", false);
  const apiKey = vscode.workspace
    .getConfiguration("flex")
    .get("apiKey", "");
  if (aiEnabled && apiKey) {
    terminal.sendText(
      `$env:OPENROUTER_API_KEY="${apiKey}"`
    );
    // Clear terminal and run the Flex file
    terminal.sendText("cls");
  
    const flexModel = vscode.workspace
      .getConfiguration("flex")
      .get("model", "openai/gpt-4.1-mini");
    // Execute the Flex compiler
    if (compilerPath === "flex") {
      terminal.sendText(`flex --ai ${flexModel} "${filePath}"`);
    } else {
      terminal.sendText(`"${compilerPath}" --ai ${flexModel} "${filePath}"`);
    }
  } else {
    // Clear terminal and run the Flex file
    terminal.sendText("cls");

    if (compilerPath === "flex") {
      terminal.sendText(`flex "${filePath}"`);
    } else {
      terminal.sendText(`"${compilerPath}" "${filePath}"`);
    }
  }
}

/**
 * Validate a Flex file using the compiler (if available)
 */
async function validateFlexFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  if (editor.document.languageId !== "flex") {
    vscode.window.showErrorMessage("This is not a Flex file");
    return;
  }

  // Make sure the file is saved
  if (editor.document.isDirty) {
    await editor.document.save();
  }

  const filePath = editor.document.uri.fsPath;

  // On macOS, directly use the flex command
  if (os.platform() === "darwin") {
    try {
      // Try with the check flag on macOS
      await execAsync(`flex --check "${filePath}"`, { timeout: 5000 });
      vscode.window.showInformationMessage(
        "✅ Flex code validation successful! No errors found."
      );
    } catch (error) {
      // If there was an error, check if it's related to the --check flag
      if (!error.stderr || error.stderr.includes("unknown option")) {
        try {
          // Try without the check flag, but redirect output
          await execAsync(`flex "${filePath}" > /dev/null`, { timeout: 5000 });
          vscode.window.showInformationMessage(
            "✅ Flex code validation successful! No errors found."
          );
        } catch (execError) {
          if (execError.stderr) {
            vscode.window.showErrorMessage(
              `❌ Flex code validation failed: ${execError.stderr}`
            );
          } else {
            vscode.window.showErrorMessage(
              "❌ Flex code validation failed with an unknown error"
            );
          }
        }
      } else {
        vscode.window.showErrorMessage(
          `❌ Flex code validation failed: ${error.stderr}`
        );
      }
    }
    return;
  }

  // For other platforms, find the Flex compiler
  const compilerPath = await findFlexCompiler();
  if (!compilerPath) {
    vscode.window
      .showErrorMessage(
        "Flex compiler not found. Please install it or add it to your PATH.",
        "Download"
      )
      .then((selection) => {
        if (selection === "Download") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/Flex-Language/Flex/releases/latest")
          );
        }
      });
    return;
  }

  try {
    // Run the compiler with check-only flag
    const result = await execAsync(`"${compilerPath}" --check "${filePath}"`, {
      timeout: 5000
    });

    // If we got here without error, it's valid
    vscode.window.showInformationMessage(
      "✅ Flex code validation successful! No errors found."
    );
  } catch (error) {
    // If there was an error, but no stderr, it might be an issue with --check flag
    if (!error.stderr) {
      try {
        // Try without the check flag, but redirect output to avoid execution
        if (os.platform() === "win32") {
          await execAsync(`"${compilerPath}" "${filePath}" > NUL`, {
            timeout: 5000
          });
        } else {
          await execAsync(`"${compilerPath}" "${filePath}" > /dev/null`, {
            timeout: 5000
          });
        }
        vscode.window.showInformationMessage(
          "✅ Flex code validation successful! No errors found."
        );
      } catch (execError) {
        if (execError.stderr) {
          vscode.window.showErrorMessage(
            `❌ Flex code validation failed: ${execError.stderr}`
          );
        } else {
          vscode.window.showErrorMessage(
            "❌ Flex code validation failed with an unknown error"
          );
        }
      }
    } else {
      vscode.window.showErrorMessage(
        `❌ Flex code validation failed: ${error.stderr}`
      );
    }
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
