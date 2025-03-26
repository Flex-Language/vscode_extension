const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');

/**
 * Check if the Flex interpreter is installed
 * @returns {Promise<boolean>} True if installed, false otherwise
 */
async function checkFlexInstalled() {
    try {
        // Try to run 'flex --version' to check if it's installed
        const { stdout } = await execAsync('flex --version', { timeout: 2000 });
        console.log('Flex interpreter found:', stdout.trim());
        return true;
    } catch (error) {
        console.log('Flex interpreter not found:', error.message);
        return false;
    }
}

/**
 * Show download prompt for Flex interpreter
 */
function showFlexDownloadPrompt() {
    const downloadUrl = 'https://github.com/Flex-Language/Flex/releases/';
    const message = 'Flex interpreter not found. You need to install it to run Flex programs.';
    
    vscode.window.showErrorMessage(message, 'Download Flex', 'Dismiss').then(selection => {
        if (selection === 'Download Flex') {
            vscode.env.openExternal(vscode.Uri.parse(downloadUrl));
        }
    });
}

/**
 * Show hover information for Flex language features
 */
function provideHoverInfo(document, position, token) {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return null;
    }

    const word = document.getText(wordRange);
    
    // Keywords info with examples and explanations
    const keywordInfo = {
        // Control flow
        'lw': {
            description: 'Conditional statement (Arabic syntax for "if")',
            example: 'lw x > 5 {\n  etb3("x is greater than 5")\n}',
            explanation: 'Used to execute code only if a condition is true'
        },
        'aw': {
            description: 'Alternative conditional (Arabic syntax for "else if")',
            example: 'lw x > 5 {\n  etb3("x is greater than 5")\n} aw x == 5 {\n  etb3("x is equal to 5")\n}',
            explanation: 'Used with lw to specify an alternative condition'
        },
        'gher': {
            description: 'Alternative branch (Arabic syntax for "else")',
            example: 'lw x > 5 {\n  etb3("x is greater than 5")\n} gher {\n  etb3("x is not greater than 5")\n}',
            explanation: 'Used with lw to specify code to run when the condition is false'
        },
        'if': {
            description: 'Conditional statement',
            example: 'if x > 5 {\n  print("x is greater than 5")\n}',
            explanation: 'English syntax version of lw'
        },
        'elif': {
            description: 'Alternative conditional (short for "else if")',
            example: 'if x > 5 {\n  print("x is greater than 5")\n} elif x == 5 {\n  print("x is equal to 5")\n}',
            explanation: 'English syntax version of aw'
        },
        'else': {
            description: 'Alternative branch',
            example: 'if x > 5 {\n  print("x is greater than 5")\n} else {\n  print("x is not greater than 5")\n}',
            explanation: 'English syntax version of gher'
        },
        'otherwise': {
            description: 'Alternative branch (synonym for "else")',
            example: 'if x > 5 {\n  print("x is greater than 5")\n} otherwise {\n  print("x is not greater than 5")\n}',
            explanation: 'Alternative for "else"'
        },
        'talama': {
            description: 'Loop while condition is true (Arabic syntax for "while")',
            example: 'talama x < 10 {\n  etb3(x)\n  x = x + 1\n}',
            explanation: 'Repeats a block of code while a condition is true'
        },
        'talma': {
            description: 'Loop while condition is true (shortened Arabic syntax for "while")',
            example: 'talma x < 10 {\n  etb3(x)\n  x = x + 1\n}',
            explanation: 'Shortened version of talama'
        },
        'tlma': {
            description: 'Loop while condition is true (shortened Arabic syntax for "while")',
            example: 'tlma x < 10 {\n  etb3(x)\n  x = x + 1\n}',
            explanation: 'Shortened version of talama'
        },
        'while': {
            description: 'Loop while condition is true',
            example: 'while x < 10 {\n  print(x)\n  x = x + 1\n}',
            explanation: 'English syntax version of talama'
        },
        'loop': {
            description: 'Loop while condition is true (synonym for "while")',
            example: 'loop x < 10 {\n  print(x)\n  x = x + 1\n}',
            explanation: 'Alternative for "while"'
        },
        'karr': {
            description: 'Repeat loop (Arabic syntax for "for")',
            example: 'karr i = 1 l7d 5 {\n  etb3(i)\n}',
            explanation: 'Repeats a block of code for a range of values. Must include "l7d" to specify the upper limit.'
        },
        'l7d': {
            description: 'Until (used in "karr" loops to specify upper limit)',
            example: 'karr i = 1 l7d 5 {\n  etb3(i)\n}',
            explanation: 'Used with "karr" to specify the upper limit of the loop'
        },
        'for': {
            description: 'For loop',
            example: 'for(i=0; i<5; i++) {\n  print(i)\n}',
            explanation: 'English syntax for loops, similar to C-style'
        },
        'w2f': {
            description: 'Exit a loop (Arabic syntax for "break")',
            example: 'talama sa7 {\n  lw x > 10 {\n    w2f\n  }\n  x++\n}',
            explanation: 'Immediately exits the current loop'
        },
        'break': {
            description: 'Exit a loop',
            example: 'while (true) {\n  if (x > 10) {\n    break\n  }\n  x++\n}',
            explanation: 'English syntax version of w2f'
        },
        'stop': {
            description: 'Exit a loop (synonym for "break")',
            example: 'while (true) {\n  if (x > 10) {\n    stop\n  }\n  x++\n}',
            explanation: 'Alternative for "break"'
        },
        'rg3': {
            description: 'Return a value from a function (Arabic syntax for "return")',
            example: 'sndo2 add(rakm a, rakm b) {\n  rg3 a + b\n}',
            explanation: 'Exits a function and optionally returns a value'
        },
        'return': {
            description: 'Return a value from a function',
            example: 'fun add(rakm a, rakm b) {\n  return a + b\n}',
            explanation: 'English syntax version of rg3'
        },
        'cond': {
            description: 'Conditional statement (synonym for "if")',
            example: 'cond x > 5 {\n  print("x is greater than 5")\n}',
            explanation: 'Alternative for "if"'
        },
        
        // Types
        'rakm': {
            description: 'Integer variable declaration (Arabic syntax for "int")',
            example: 'rakm x = 10',
            explanation: 'Declares a variable that can hold whole numbers'
        },
        'kasr': {
            description: 'Floating-point variable declaration (Arabic syntax for "float")',
            example: 'kasr pi = 3.14',
            explanation: 'Declares a variable that can hold decimal numbers'
        },
        'so2al': {
            description: 'Boolean variable declaration (Arabic syntax for "bool")',
            example: 'so2al isActive = sa7',
            explanation: 'Declares a variable that can hold boolean values (sa7/ghalt)'
        },
        'klma': {
            description: 'String variable declaration (Arabic syntax for "string")',
            example: 'klma message = "Hello, Flex!"',
            explanation: 'Declares a variable that can hold text'
        },
        'dorg': {
            description: 'List variable declaration (Arabic syntax for "list")',
            example: 'dorg myList = [1, 2, 3]',
            explanation: 'Declares a variable that can hold a list of values'
        },
        'int': {
            description: 'Integer variable declaration',
            example: 'int x = 10',
            explanation: 'English syntax version of rakm'
        },
        'float': {
            description: 'Floating-point variable declaration',
            example: 'float pi = 3.14',
            explanation: 'English syntax version of kasr'
        },
        'bool': {
            description: 'Boolean variable declaration',
            example: 'bool isActive = true',
            explanation: 'English syntax version of so2al'
        },
        'string': {
            description: 'String variable declaration',
            example: 'string message = "Hello, Flex!"',
            explanation: 'English syntax version of klma'
        },
        'list': {
            description: 'List variable declaration',
            example: 'list myList = [1, 2, 3]',
            explanation: 'English syntax version of dorg'
        },
        
        // Function declarations
        'sndo2': {
            description: 'Function declaration (Arabic syntax)',
            example: 'sndo2 add(rakm a, rakm b) {\n  rg3 a + b\n}',
            explanation: 'Defines a reusable block of code that can take parameters and return a value'
        },
        'sando2': {
            description: 'Function declaration (alternate Arabic syntax)',
            example: 'sando2 add(rakm a, rakm b) {\n  rg3 a + b\n}',
            explanation: 'Alternative spelling of sndo2'
        },
        'fn': {
            description: 'Function declaration (short for "function")',
            example: 'fn add(rakm a, rakm b) {\n  return a + b\n}',
            explanation: 'Short English syntax for function declaration'
        },
        'fun': {
            description: 'Function declaration (short for "function")',
            example: 'fun add(rakm a, rakm b) {\n  return a + b\n}',
            explanation: 'English syntax for function declaration'
        },
        'function': {
            description: 'Function declaration',
            example: 'function add(rakm a, rakm b) {\n  return a + b\n}',
            explanation: 'Full English syntax for function declaration'
        },
        
        // I/O
        'etb3': {
            description: 'Output text or values (Arabic syntax for "print")',
            example: 'etb3("Hello, {name}!")',
            explanation: 'Displays text or values to the console, supports string interpolation using {}'
        },
        'out': {
            description: 'Output text or values (synonym for "print")',
            example: 'out("Hello, {name}!")',
            explanation: 'Alternative for "print"'
        },
        'output': {
            description: 'Output text or values (synonym for "print")',
            example: 'output("Hello, {name}!")',
            explanation: 'Alternative for "print"'
        },
        'print': {
            description: 'Output text or values',
            example: 'print("Hello, {name}!")',
            explanation: 'English syntax version of etb3'
        },
        'printf': {
            description: 'Output formatted text (similar to C\'s printf)',
            example: 'printf("Hello, {name}!")',
            explanation: 'Alternative for "print" with C-style naming'
        },
        'cout': {
            description: 'Output text or values (similar to C++\'s cout)',
            example: 'cout("Hello, {name}!")',
            explanation: 'Alternative for "print" with C++-style naming'
        },
        'scan': {
            description: 'Get input from user (synonym for "input")',
            example: 'x = scan()',
            explanation: 'Alternative for "input"'
        },
        'read': {
            description: 'Get input from user (synonym for "input")',
            example: 'x = read()',
            explanation: 'Alternative for "input"'
        },
        'input': {
            description: 'Get input from user',
            example: 'name = input()',
            explanation: 'English syntax version of da5l'
        },
        'da5l': {
            description: 'Get input from user (Arabic syntax for "input")',
            example: 'name = da5l()',
            explanation: 'Gets input from the user and returns it as a string'
        },
        'da5al': {
            description: 'Get input from user (alternate Arabic syntax for "input")',
            example: 'name = da5al()',
            explanation: 'Alternative spelling of da5l'
        },
        'd5l': {
            description: 'Get input from user (shortened Arabic syntax for "input")',
            example: 'name = d5l()',
            explanation: 'Shortened version of da5l'
        },
        
        // Import
        'geep': {
            description: 'Import statement (Arabic syntax)',
            example: 'geep "math"',
            explanation: 'Imports a module or library'
        },
        'geeb': {
            description: 'Import statement (alternate Arabic syntax)',
            example: 'geeb "math"',
            explanation: 'Alternative spelling of geep'
        },
        'import': {
            description: 'Import statement',
            example: 'import "math"',
            explanation: 'English syntax version of geep'
        },
        
        // Boolean values
        'sa7': {
            description: 'Boolean true value (Arabic syntax)',
            example: 'so2al isActive = sa7',
            explanation: 'Represents the boolean value "true"'
        },
        'ghalt': {
            description: 'Boolean false value (Arabic syntax)',
            example: 'so2al isActive = ghalt',
            explanation: 'Represents the boolean value "false"'
        },
        'true': {
            description: 'Boolean true value',
            example: 'bool isActive = true',
            explanation: 'English syntax version of sa7'
        },
        'false': {
            description: 'Boolean false value',
            example: 'bool isActive = false',
            explanation: 'English syntax version of ghalt'
        },
        'True': {
            description: 'Boolean true value (Python-style)',
            example: 'bool isActive = True',
            explanation: 'Python-style capitalized version of true'
        },
        'False': {
            description: 'Boolean false value (Python-style)',
            example: 'bool isActive = False',
            explanation: 'Python-style capitalized version of false'
        },
        
        // List operations
        'push': {
            description: 'Add an item to the end of a list',
            example: 'myList.push(42)',
            explanation: 'Adds a new element to the end of a list'
        },
        'pop': {
            description: 'Remove and return the last item from a list',
            example: 'lastItem = myList.pop()',
            explanation: 'Removes the last element from a list and returns it'
        },
        'remove': {
            description: 'Remove a specific item from a list',
            example: 'myList.remove(2)',
            explanation: 'Removes the element at the specified index from a list'
        },
        'length': {
            description: 'Get the number of items in a list',
            example: 'size = length(myList)',
            explanation: 'Returns the number of elements in a list'
        }
    };

    // Operator info with examples and explanations
    const operatorInfo = {
        '+': {
            description: 'Addition operator',
            example: 'x = 5 + 3  # x becomes 8',
            explanation: 'Adds two values together'
        },
        '-': {
            description: 'Subtraction operator',
            example: 'x = 5 - 3  # x becomes 2',
            explanation: 'Subtracts the second value from the first'
        },
        '*': {
            description: 'Multiplication operator',
            example: 'x = 5 * 3  # x becomes 15',
            explanation: 'Multiplies two values together'
        },
        '/': {
            description: 'Division operator',
            example: 'x = 6 / 3  # x becomes 2',
            explanation: 'Divides the first value by the second'
        },
        '++': {
            description: 'Increment operator (increase by 1)',
            example: 'x++  # equivalent to x = x + 1',
            explanation: 'Increases a variable\'s value by 1'
        },
        '--': {
            description: 'Decrement operator (decrease by 1)',
            example: 'x--  # equivalent to x = x - 1',
            explanation: 'Decreases a variable\'s value by 1'
        },
        '==': {
            description: 'Equality comparison operator',
            example: 'lw x == 5 { etb3("x is 5") }',
            explanation: 'Checks if two values are equal'
        },
        '!=': {
            description: 'Inequality comparison operator',
            example: 'lw x != 5 { etb3("x is not 5") }',
            explanation: 'Checks if two values are not equal'
        },
        '>': {
            description: 'Greater than comparison operator',
            example: 'lw x > 5 { etb3("x is greater than 5") }',
            explanation: 'Checks if the first value is greater than the second'
        },
        '<': {
            description: 'Less than comparison operator',
            example: 'lw x < 5 { etb3("x is less than 5") }',
            explanation: 'Checks if the first value is less than the second'
        },
        '>=': {
            description: 'Greater than or equal comparison operator',
            example: 'lw x >= 5 { etb3("x is greater than or equal to 5") }',
            explanation: 'Checks if the first value is greater than or equal to the second'
        },
        '<=': {
            description: 'Less than or equal comparison operator',
            example: 'lw x <= 5 { etb3("x is less than or equal to 5") }',
            explanation: 'Checks if the first value is less than or equal to the second'
        },
        'and': {
            description: 'Logical AND operator',
            example: 'lw x > 5 and y < 10 { etb3("Both conditions are true") }',
            explanation: 'Returns true only if both conditions are true'
        },
        'or': {
            description: 'Logical OR operator',
            example: 'lw x > 5 or y < 10 { etb3("At least one condition is true") }',
            explanation: 'Returns true if at least one condition is true'
        },
        'not': {
            description: 'Logical NOT operator',
            example: 'lw not(x > 5) { etb3("x is not greater than 5") }',
            explanation: 'Inverts a boolean value or condition'
        }
    };

    // Function info with examples and explanations
    const functionInfo = {
        'absolute': {
            description: 'Returns the absolute value of a number',
            example: 'absolute(-5)  # Returns 5',
            explanation: 'Calculates the absolute (positive) value of a number'
        },
        'do_modulus': {
            description: 'Calculates the modulus (remainder) of a division',
            example: 'do_modulus(10, 3)  # Returns 1',
            explanation: 'Returns the remainder when dividing the first number by the second'
        },
        'add': {
            description: 'Adds two numbers together',
            example: 'add(5, 3)  # Returns 8',
            explanation: 'Returns the sum of two numbers'
        },
        'sub': {
            description: 'Subtracts the second number from the first',
            example: 'sub(5, 3)  # Returns 2',
            explanation: 'Returns the difference between two numbers'
        },
        'mul': {
            description: 'Multiplies two numbers together',
            example: 'mul(5, 3)  # Returns 15',
            explanation: 'Returns the product of two numbers'
        },
        'div': {
            description: 'Divides the first number by the second',
            example: 'div(6, 3)  # Returns 2',
            explanation: 'Returns the quotient of dividing the first number by the second'
        },
        'isprime': {
            description: 'Checks if a number is prime',
            example: 'isprime(17)  # Prints "17 is a prime number" and returns true',
            explanation: 'Tests if a number is only divisible by 1 and itself'
        },
        'calculator': {
            description: 'Performs arithmetic operations based on a string command',
            example: 'calculator("add", 5, 3)  # Prints "result is 8"',
            explanation: 'Executes the specified operation on two numbers'
        },
        'timetable': {
            description: 'Prints a multiplication table for a number',
            example: 'timetable(5)  # Prints multiplication table for 5',
            explanation: 'Generates and displays the multiplication table for a given number'
        }
    };

    if (keywordInfo[word]) {
        const info = keywordInfo[word];
        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**${word}**: ${info.description}\n\n`);
        markdown.appendMarkdown(`**Example:**\n\`\`\`flex\n${info.example}\n\`\`\`\n\n`);
        markdown.appendMarkdown(`**Explanation:** ${info.explanation}`);
        return new vscode.Hover(markdown);
    }
    
    if (operatorInfo[word]) {
        const info = operatorInfo[word];
        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**${word}**: ${info.description}\n\n`);
        markdown.appendMarkdown(`**Example:**\n\`\`\`flex\n${info.example}\n\`\`\`\n\n`);
        markdown.appendMarkdown(`**Explanation:** ${info.explanation}`);
        return new vscode.Hover(markdown);
    }
    
    if (functionInfo[word]) {
        const info = functionInfo[word];
        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**${word}**: ${info.description}\n\n`);
        markdown.appendMarkdown(`**Example:**\n\`\`\`flex\n${info.example}\n\`\`\`\n\n`);
        markdown.appendMarkdown(`**Explanation:** ${info.explanation}`);
        return new vscode.Hover(markdown);
    }
    
    return null;
}

/**
 * Provides function signature help
 */
function provideSignatureHelp(document, position, token) {
    const lineText = document.lineAt(position.line).text;
    const beforeCursor = lineText.substring(0, position.character);
    
    // Check if we're inside function call parentheses
    const functionCallMatch = beforeCursor.match(/([a-zA-Z0-9_]+)\s*\(/);
    if (!functionCallMatch) {
        return null;
    }
    
    const functionName = functionCallMatch[1];
    
    // Standard library functions and their signatures
    const functionSignatures = {
        'absolute': {
            signature: 'absolute(rakm a)',
            params: ['a: number to find absolute value of'],
            description: 'Returns the absolute value of a number',
            code: 'sando2 absolute(rakm a){\n  lw a < 0 {\n    x = a * (-1)\n    rg3 x\n  }\n  gher{ rg3 a}\n}',
            example: 'etb3(absolute(-5))  # Outputs: 5',
            returns: 'rakm'
        },
        'do_modulus': {
            signature: 'do_modulus(rakm b, rakm c)',
            params: ['b: dividend', 'c: divisor'],
            description: 'Calculates the modulus (remainder) of b divided by c',
            code: 'sando2 do_modulus(rakm b, rakm c) {\n  lw c == 0 { etb3("error: division by zero is not allowed")}\n\n  aba = absolute(b) \n  abb = absolute(c)\n\n  lw aba < abb { rg3 b}\n\n  talama aba >= abb {\n    aba = aba - abb\n  }\n\n  lw b < 0 {\n    x = aba * (-1)\n    rg3 x\n  }\n  gher { rg3 aba}\n}',
            example: 'etb3(do_modulus(10, 3))  # Outputs: 1',
            returns: 'rakm'
        },
        'add': {
            signature: 'add(rakm a, rakm b)',
            params: ['a: first number', 'b: second number'],
            description: 'Adds two numbers together',
            code: 'sndo2 add(rakm a, rakm b) {\n  rg3 a + b\n}',
            example: 'etb3(add(3, 4))  # Outputs: 7',
            returns: 'rakm'
        },
        'sub': {
            signature: 'sub(rakm a, rakm b)',
            params: ['a: number to subtract from', 'b: number to subtract'],
            description: 'Subtracts b from a',
            code: 'sando2 sub(rakm a, rakm b) {\n  rg3 a - b\n}',
            example: 'etb3(sub(10, 4))  # Outputs: 6',
            returns: 'rakm'
        },
        'mul': {
            signature: 'mul(rakm a, rakm b)',
            params: ['a: first number', 'b: second number'],
            description: 'Multiplies two numbers',
            code: 'sando2 mul(rakm a, rakm b) {\n  rg3 a * b\n}',
            example: 'etb3(mul(3, 4))  # Outputs: 12',
            returns: 'rakm'
        },
        'div': {
            signature: 'div(rakm a, rakm b)',
            params: ['a: dividend', 'b: divisor'],
            description: 'Divides a by b',
            code: 'sando2 div(rakm a, rakm b) {\n  lw b == 0 {\n    etb3("Error: Division by zero")\n    rg3 0\n  }\n  rg3 a / b\n}',
            example: 'etb3(div(12, 4))  # Outputs: 3',
            returns: 'kasr'
        },
        'isprime': {
            signature: 'isprime(rakm num)',
            params: ['num: number to check'],
            description: 'Checks if a number is prime',
            code: 'sndo2 isprime(rakm num) {\n  rakm pos = absolute(num)\n\n  # Handle numbers <= 1\n  lw num <= 1 {\n    etb3("{num} is not a prime number")\n    rg3 false \n  }\n\n  rakm i = 2\n  rakm mul = i * i  # Initialize mul outside the loop\n\n  # Loop to check for divisibility\n  talama mul <= num {\n    lw do_modulus(pos, i) == 0 {\n      etb3("{num} is not a prime number")\n      rg3 false \n    }\n    i = i + 1\n    mul = i * i  # Update mul inside the loop\n  }\n\n  # If no divisor was found, it\'s a prime number\n  etb3("{num} is a prime number")\n  rg3 true\n}',
            example: 'isprime(17)  # Outputs: 17 is a prime number',
            returns: 'so2al'
        },
        'calculator': {
            signature: 'calculator(klma x, rakm a, rakm b)',
            params: ['x: operation ("add", "sub", "mul", "div")', 'a: first number', 'b: second number'],
            description: 'Performs basic arithmetic operations',
            code: 'sando2 calculator(klma x, rakm a, rakm b) { \n  lw x == "add" {\n    y= a + b \n    etb3("result is {y}")\n  }\n  aw x == "sub" {\n    y= a - b \n    etb3("result is {y}")\n  }\n  aw x == "mul" {\n    y= a * b \n    etb3("result is {y}")\n  }\n  aw x == "div" {\n    y= a / b \n    etb3("result is {y}")\n  }\n  gher {etb3("error it is not in the options {x}")}\n}',
            example: 'calculator("add", 5, 3)  # Outputs: result is 8',
            returns: 'void'
        },
        'timetable': {
            signature: 'timetable(rakm num)',
            params: ['num: number to generate a multiplication table for'],
            description: 'Prints the multiplication table for a number',
            code: 'fn timetable(rakm num){\n  i = 1\n  karr x=1 l7d 10 {\n    mul = num * i\n    i = i + 1\n    etb3("{num} * {i-1} = {mul}")\n  }\n}',
            example: 'timetable(5)  # Outputs multiplication table for 5',
            returns: 'void'
        },
        'etb3': {
            signature: 'etb3(message)',
            params: ['message: text to output'],
            description: 'Outputs text or values to the console',
            example: 'etb3("Hello, {name}")  # Outputs: Hello, followed by the value of name',
            returns: 'void'
        },
        'print': {
            signature: 'print(message)',
            params: ['message: text to output'],
            description: 'Outputs text or values to the console',
            example: 'print("Hello, {name}")  # Outputs: Hello, followed by the value of name',
            returns: 'void'
        },
        'da5l': {
            signature: 'da5l()',
            params: [],
            description: 'Gets input from the user',
            example: 'name = da5l()  # Reads user input and assigns it to name',
            returns: 'user input as string'
        },
        'input': {
            signature: 'input()',
            params: [],
            description: 'Gets input from the user',
            example: 'name = input()  # Reads user input and assigns it to name',
            returns: 'user input as string'
        },
        'length': {
            signature: 'length(dorg list)',
            params: ['list: the list to get the length of'],
            description: 'Returns the number of items in a list',
            example: 'etb3(length(myList))  # Outputs: number of items in myList',
            returns: 'rakm'
        }
    };
    
    if (functionSignatures[functionName]) {
        const info = functionSignatures[functionName];
        
        let documentation = new vscode.MarkdownString();
        documentation.appendMarkdown(`**${info.description}**\n\n`);
        
        if (info.returns) {
            documentation.appendMarkdown(`**Returns:** ${info.returns}\n\n`);
        }
        
        if (info.example) {
            documentation.appendMarkdown(`**Example:**\n\`\`\`flex\n${info.example}\n\`\`\`\n\n`);
        }
        
        if (info.code) {
            documentation.appendMarkdown(`**Implementation:**\n\`\`\`flex\n${info.code}\n\`\`\`\n\n`);
        }
        
        const signatureInformation = new vscode.SignatureInformation(
            info.signature,
            documentation
        );
        
        info.params.forEach(paramDesc => {
            signatureInformation.parameters.push(
                new vscode.ParameterInformation(paramDesc.split(':')[0], paramDesc)
            );
        });
        
        const signatureHelp = new vscode.SignatureHelp();
        signatureHelp.signatures = [signatureInformation];
        signatureHelp.activeSignature = 0;
        
        // Calculate active parameter based on commas
        if (info.params.length > 0) {
            let commaCount = 0;
            let inString = false;
            let stringChar = '';
            
            for (let i = 0; i < beforeCursor.length; i++) {
                const char = beforeCursor[i];
                
                if ((char === '"' || char === "'") && (i === 0 || beforeCursor[i-1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                if (char === ',' && !inString) {
                    commaCount++;
                }
            }
            
            signatureHelp.activeParameter = Math.min(commaCount, info.params.length - 1);
        }
        
        return signatureHelp;
    }
    
    return null;
}

function activate(context) {
    console.log('Flex Language Support is now active!');

    // Check for Flex interpreter on activation
    checkFlexInstalled().then(isInstalled => {
        if (!isInstalled) {
            showFlexDownloadPrompt();
        }
    });

    // Register the run command
    let runCommand = vscode.commands.registerCommand('flex.runFile', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'flex') {
            vscode.window.showErrorMessage('This is not a Flex file');
            return;
        }

        // Check if Flex interpreter is installed before running
        const isFlexInstalled = await checkFlexInstalled();
        if (!isFlexInstalled) {
            showFlexDownloadPrompt();
            return;
        }

        // Save the file before running
        document.save().then(() => {
            const filePath = document.uri.fsPath;
            const terminal = vscode.window.createTerminal('Flex Run');
            terminal.show();
            
            // Run the file with the Flex interpreter
            terminal.sendText(`flex "${filePath}"`);
        });
    });

    // Register a status bar item for the run button
    const runButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    runButton.text = "$(play) Run Flex";
    runButton.command = 'flex.runFile';
    runButton.tooltip = 'Run the current Flex file';
    
    // Show the run button only when a Flex file is active
    function updateRunButtonVisibility() {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'flex') {
            runButton.show();
        } else {
            runButton.hide();
        }
    }

    // Update button visibility when changing editors
    vscode.window.onDidChangeActiveTextEditor(updateRunButtonVisibility);
    
    // Initial update
    updateRunButtonVisibility();

    // Register hover provider for Flex files
    const hoverProvider = vscode.languages.registerHoverProvider('flex', {
        provideHover: provideHoverInfo
    });

    // Register signature help provider for Flex files
    const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider(
        'flex',
        {
            provideSignatureHelp: provideSignatureHelp
        },
        '(', ',', ' '
    );

    // Register a completion item provider for Flex files
    let provider = vscode.languages.registerCompletionItemProvider('flex', {
        provideCompletionItems(document, position) {
            // Control flow keywords
            const controlFlow = [
                'lw', 'aw', 'gher', 'if', 'elif', 'else', 'otherwise',
                'talama', 'talma', 'tlma', 'while', 'loop',
                'karr', 'l7d', 'for', 'w2f', 'break', 'stop',
                'rg3', 'return', 'cond'
            ];
            
            // Type keywords
            const types = [
                'rakm', 'kasr', 'so2al', 'klma', 'dorg',
                'int', 'float', 'bool', 'string', 'list'
            ];
            
            // Function declarations
            const functionDeclarations = [
                'sndo2', 'sando2', 'fn', 'fun', 'function'
            ];
            
            // I/O operations
            const ioOperations = [
                'etb3', 'out', 'output', 'print', 'printf', 'cout',
                'scan', 'read', 'input', 'da5l', 'da5al', 'd5l'
            ];
            
            // Import statements
            const importStatements = [
                'geep', 'geeb', 'import'
            ];
            
            // Boolean values
            const booleanValues = [
                'sa7', 'ghalt', 'true', 'false', 'True', 'False'
            ];
            
            // List operations
            const listOperations = [
                'push', 'pop', 'remove', 'length'
            ];

            // Operators
            const operators = [
                '+', '-', '*', '/', '++', '--', 
                '==', '!=', '>', '<', '>=', '<=',
                'and', 'or', 'not'
            ];

            // Built-in functions
            const builtinFunctions = [
                'absolute', 'do_modulus', 'add', 'sub', 'mul', 'div', 
                'isprime', 'calculator', 'timetable'
            ];

            // Combine all keywords
            const keywords = [
                ...controlFlow,
                ...types,
                ...functionDeclarations,
                ...ioOperations,
                ...importStatements,
                ...booleanValues
            ];

            // Convert keywords to completion items
            const keywordItems = keywords.map(keyword => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                return item;
            });

            // Convert list operations to completion items
            const listOpItems = listOperations.map(op => {
                const item = new vscode.CompletionItem(op, vscode.CompletionItemKind.Method);
                item.insertText = `.${op}`;
                return item;
            });

            // Convert operators to completion items
            const operatorItems = operators.map(op => {
                return new vscode.CompletionItem(op, vscode.CompletionItemKind.Operator);
            });

            // Convert built-in functions to completion items
            const functionItems = builtinFunctions.map(func => {
                const item = new vscode.CompletionItem(func, vscode.CompletionItemKind.Function);
                return item;
            });

            // Add snippets for common patterns
            const snippets = [
                // If statement
                {
                    label: 'if-block',
                    insertText: new vscode.SnippetString('lw ${1:condition} {\n\t${2}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'If statement'
                },
                // If-else statement
                {
                    label: 'if-else-block',
                    insertText: new vscode.SnippetString('lw ${1:condition} {\n\t${2}\n} gher {\n\t${3}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'If-else statement'
                },
                // If-elif-else statement
                {
                    label: 'if-elif-else-block',
                    insertText: new vscode.SnippetString('lw ${1:condition1} {\n\t${2}\n} aw ${3:condition2} {\n\t${4}\n} gher {\n\t${5}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'If-elif-else statement'
                },
                // While loop
                {
                    label: 'while-loop',
                    insertText: new vscode.SnippetString('talama ${1:condition} {\n\t${2}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'While loop'
                },
                // For loop (Arabic style)
                {
                    label: 'for-loop-arabic',
                    insertText: new vscode.SnippetString('karr ${1:i}=${2:start} l7d ${3:end} {\n\t${4}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'For loop (Arabic style)'
                },
                // For loop (C style)
                {
                    label: 'for-loop-c',
                    insertText: new vscode.SnippetString('for(${1:i}=0; ${1:i}<${2:max}; ${1:i}++) {\n\t${3}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'For loop (C style)'
                },
                // Function definition (Arabic)
                {
                    label: 'function-arabic',
                    insertText: new vscode.SnippetString('sndo2 ${1:name}(${2:params}) {\n\t${3}\n\trg3 ${4:result}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function definition (Arabic)'
                },
                // Function definition (English)
                {
                    label: 'function-english',
                    insertText: new vscode.SnippetString('fun ${1:name}(${2:params}) {\n\t${3}\n\treturn ${4:result}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function definition (English)'
                },
                // Print statement
                {
                    label: 'print',
                    insertText: new vscode.SnippetString('etb3("${1:message}")'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Print statement'
                },
                // Print with variable interpolation
                {
                    label: 'print-interpolation',
                    insertText: new vscode.SnippetString('etb3("${1:message} {${2:variable}}")'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Print with variable interpolation'
                },
                // Input with prompt
                {
                    label: 'input-with-prompt',
                    insertText: new vscode.SnippetString('etb3("${1:Enter a value:}")\n${2:variable} = da5l()'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Input with prompt'
                },
                // List declaration
                {
                    label: 'list-declaration',
                    insertText: new vscode.SnippetString('dorg ${1:listName} = [${2:values}]'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'List declaration'
                },
                // Variable declarations (all types)
                {
                    label: 'var-declarations',
                    insertText: new vscode.SnippetString('rakm ${1:intVar} = ${2:0}\nkasr ${3:floatVar} = ${4:0.0}\nso2al ${5:boolVar} = ${6:sa7}\nklma ${7:strVar} = "${8:text}"\ndorg ${9:listVar} = [${10:items}]'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Variable declarations (all types)'
                },
                // Simple calculator program
                {
                    label: 'calculator-program',
                    insertText: new vscode.SnippetString('etb3("Enter an operator (add,sub,mul,div):")\nklma op = da5l()\n\netb3("Enter two numbers:")\nrakm a = da5l()\nrakm b = da5l()\n\nlw op == "add" {\n\tresult = a + b\n\tetb3("{a} + {b} = {result}")\n} aw op == "sub" {\n\tresult = a - b\n\tetb3("{a} - {b} = {result}")\n} aw op == "mul" {\n\tresult = a * b\n\tetb3("{a} * {b} = {result}")\n} aw op == "div" {\n\tlw b != 0 {\n\t\tresult = a / b\n\t\tetb3("{a} / {b} = {result}")\n\t} gher {\n\t\tetb3("Cannot divide by zero")\n\t}\n} gher {\n\tetb3("Invalid operator")\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Simple calculator program'
                },
                // Fibonacci series
                {
                    label: 'fibonacci-series',
                    insertText: new vscode.SnippetString('t1 = 0\nt2 = 1\netb3("Fibonacci series")\netb3("Enter the number of terms:")\nrakm x = da5l()\netb3("the series: {t1}, {t2}")\n\nfor (i=3; i<=x; i++) {\n\tnext = t1 + t2\n\tetb3(", {next}")\n\tt1 = t2\n\tt2 = next\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Generate Fibonacci series'
                },
                // Temperature converter
                {
                    label: 'temperature-converter',
                    insertText: new vscode.SnippetString('etb3("Enter temperature in Fahrenheit:")\nkasr fahrenheit = da5l()\nkasr celsius = (fahrenheit - 32) * 5 / 9\netb3("{fahrenheit}°F = {celsius}°C")'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Convert temperature from Fahrenheit to Celsius'
                },
                // Find the largest number
                {
                    label: 'find-largest',
                    insertText: new vscode.SnippetString('etb3("Enter three different numbers:")\nx = da5l()\ny = da5l()\nz = da5l()\n\nlw x >= y {\n\tlw x >= z {\n\t\tetb3("{x} is the largest number")\n\t}\n}\n\nlw y >= x {\n\tlw y >= z {\n\t\tetb3("{y} is the largest number")\n\t}\n}\n\nlw z >= y {\n\tlw z >= x {\n\t\tetb3("{z} is the largest number")\n\t}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Find the largest of three numbers'
                },
                // Number guessing game
                {
                    label: 'guessing-game',
                    insertText: new vscode.SnippetString('# Number guessing game\nrakm secret = 42  # Secret number to guess\nrakm attempts = 0\nso2al found = ghalt\n\netb3("Welcome to the Number Guessing Game!")\netb3("I\'m thinking of a number between 1 and 100.")\n\ntalama found == ghalt {\n\tetb3("Enter your guess:")\n\trakm guess = da5l()\n\tattempts++\n\t\n\tlw guess < secret {\n\t\tetb3("Too low! Try again.")\n\t} aw guess > secret {\n\t\tetb3("Too high! Try again.")\n\t} gher {\n\t\tfound = sa7\n\t\tetb3("Congratulations! You guessed the number in {attempts} attempts!")\n\t}\n\t\n\tlw attempts >= 10 and found == ghalt {\n\t\tetb3("You\'ve reached the maximum number of attempts.")\n\t\tetb3("The secret number was {secret}.")\n\t\tw2f\n\t}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Number guessing game'
                },
                // Todo list application
                {
                    label: 'todo-app',
                    insertText: new vscode.SnippetString('# Todo List Application\ndorg todos = []\n\nsndo2 showMenu() {\n\tetb3("\\nTodo List Application")\n\tetb3("--------------------")\n\tetb3("1. Add todo")\n\tetb3("2. Remove todo")\n\tetb3("3. List todos")\n\tetb3("4. Exit")\n\tetb3("Enter your choice:")\n\trakm choice = da5l()\n\trg3 choice\n}\n\nsndo2 addTodo() {\n\tetb3("Enter a new todo:")\n\tklma todo = da5l()\n\ttodos.push(todo)\n\tetb3("Todo added successfully!")\n}\n\nsndo2 removeTodo() {\n\tlw todos.length == 0 {\n\t\tetb3("No todos to remove!")\n\t\trg3 ghalt\n\t}\n\t\n\tetb3("Current todos:")\n\tfor (i = 0; i < todos.length; i++) {\n\t\tetb3("{i+1}. {todos[i]}")\n\t}\n\t\n\tetb3("Enter the number of the todo to remove:")\n\trakm index = da5l()\n\t\n\tlw index >= 1 and index <= todos.length {\n\t\ttodos.remove(index - 1)\n\t\tetb3("Todo removed successfully!")\n\t\trg3 sa7\n\t} gher {\n\t\tetb3("Invalid todo number!")\n\t\trg3 ghalt\n\t}\n}\n\nsndo2 listTodos() {\n\tlw todos.length == 0 {\n\t\tetb3("No todos in the list!")\n\t\trg3\n\t}\n\t\n\tetb3("Your todos:")\n\tfor (i = 0; i < todos.length; i++) {\n\t\tetb3("{i+1}. {todos[i]}")\n\t}\n}\n\ntalama sa7 {\n\tchoice = showMenu()\n\t\n\tlw choice == 1 {\n\t\taddTodo()\n\t} aw choice == 2 {\n\t\tremoveTodo()\n\t} aw choice == 3 {\n\t\tlistTodos()\n\t} aw choice == 4 {\n\t\tetb3("Goodbye!")\n\t\tw2f\n\t} gher {\n\t\tetb3("Invalid choice! Please try again.")\n\t}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Todo list application'
                },
                // Temperature converter program
                {
                    label: 'temp-converter-app',
                    insertText: new vscode.SnippetString('# Temperature Converter\n\nsndo2 celsiusToFahrenheit(kasr celsius) {\n\tkasr fahrenheit = celsius * 9/5 + 32\n\trg3 fahrenheit\n}\n\nsndo2 fahrenheitToCelsius(kasr fahrenheit) {\n\tkasr celsius = (fahrenheit - 32) * 5/9\n\trg3 celsius\n}\n\ntalama sa7 {\n\tetb3("Temperature Converter")\n\tetb3("--------------------")\n\tetb3("1. Celsius to Fahrenheit")\n\tetb3("2. Fahrenheit to Celsius")\n\tetb3("3. Exit")\n\tetb3("Enter your choice:")\n\trakm choice = da5l()\n\t\n\tlw choice == 1 {\n\t\tetb3("Enter temperature in Celsius:")\n\t\tkasr celsius = da5l()\n\t\tkasr fahrenheit = celsiusToFahrenheit(celsius)\n\t\tetb3("{celsius}°C = {fahrenheit}°F")\n\t} aw choice == 2 {\n\t\tetb3("Enter temperature in Fahrenheit:")\n\t\tkasr fahrenheit = da5l()\n\t\tkasr celsius = fahrenheitToCelsius(fahrenheit)\n\t\tetb3("{fahrenheit}°F = {celsius}°C")\n\t} aw choice == 3 {\n\t\tetb3("Goodbye!")\n\t\tw2f\n\t} gher {\n\t\tetb3("Invalid choice! Please try again.")\n\t}\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Temperature converter application'
                },
                // Absolute value function
                {
                    label: 'absolute-function',
                    insertText: new vscode.SnippetString('sando2 absolute(rakm a) {\n\tlw a < 0 {\n\t\tx = a * (-1)\n\t\trg3 x\n\t}\n\tgher { rg3 a }\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function to calculate absolute value'
                },
                // Prime checker function
                {
                    label: 'isprime-function',
                    insertText: new vscode.SnippetString('sndo2 isprime(rakm num) {\n\trakm pos = absolute(num)\n\n\t# Handle numbers <= 1\n\tlw num <= 1 {\n\t\tetb3("{num} is not a prime number")\n\t\trg3 false \n\t}\n\n\trakm i = 2\n\trakm mul = i * i  # Initialize mul outside the loop\n\n\t# Loop to check for divisibility\n\ttalama mul <= num {\n\t\tlw do_modulus(pos, i) == 0 {\n\t\t\tetb3("{num} is not a prime number")\n\t\t\trg3 false \n\t\t}\n\t\ti = i + 1\n\t\tmul = i * i  # Update mul inside the loop\n\t}\n\n\t# If no divisor was found, it\'s a prime number\n\tetb3("{num} is a prime number")\n\trg3 true\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function to check if a number is prime'
                },
                // Modulus function
                {
                    label: 'modulus-function',
                    insertText: new vscode.SnippetString('sando2 do_modulus(rakm b, rakm c) {\n\tlw c == 0 { \n\t\tetb3("Error: division by zero is not allowed")\n\t\trg3 0\n\t}\n\n\taba = absolute(b) \n\tabb = absolute(c)\n\n\tlw aba < abb { rg3 b }\n\n\ttalama aba >= abb {\n\t\taba = aba - abb\n\t}\n\t\n\tlw b < 0 {\n\t\tx = aba * (-1)\n\t\trg3 x\n\t}\n\tgher { rg3 aba }\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Function to calculate modulus'
                },
                // Multiplication table
                {
                    label: 'multiplication-table',
                    insertText: new vscode.SnippetString('etb3("Enter a number:")\nrakm num = da5l()\nrakm i = 0\n\nkarr x=1 l7d 10 {\n\tmul = num * i\n\ti = i + 1\n\tetb3("{num} * {i-1} = {mul}")\n}'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Generate multiplication table'
                },
                // Variable swapping
                {
                    label: 'swap-variables',
                    insertText: new vscode.SnippetString('etb3("Enter 2 numbers to be swapped:")\nx = da5l()\ny = da5l()\n\netb3("Before swapping: x = {x}, y = {y}")\n\ntemp = x\nx = y\ny = temp\n\netb3("After swapping: x = {x}, y = {y}")'),
                    kind: vscode.CompletionItemKind.Snippet,
                    detail: 'Swap the values of two variables'
                }
            ];

            return [...keywordItems, ...listOpItems, ...operatorItems, ...functionItems, ...snippets];
        }
    });

    // Register document diagnostic provider
    const collection = vscode.languages.createDiagnosticCollection('flex');
    
    // Function to analyze document for potential issues
    function analyzeDocument(document) {
        if (document.languageId !== 'flex') {
            return;
        }
        
        const text = document.getText();
        const lines = text.split('\n');
        const diagnostics = [];
        
        // Check each line for common errors
        lines.forEach((line, lineIndex) => {
            // Check for semicolons at end of statements (unused in Flex)
            if (line.trim().endsWith(';') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.length - 1);
                const range = new vscode.Range(position, position.translate(0, 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Flex does not require semicolons at the end of statements.',
                    vscode.DiagnosticSeverity.Information
                ));
            }
            
            // Check for if statements without curly braces
            const ifMatch = line.match(/\b(lw|if|cond)\s+.+[^{]\s*$/);
            if (ifMatch && !line.includes('{') && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
                const position = new vscode.Position(lineIndex, line.length);
                const range = new vscode.Range(position, position);
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, code blocks must be enclosed in curly braces {}.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for incorrect boolean values (true/false instead of sa7/ghalt)
            if ((line.includes(' true') || line.includes('=true')) && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('true'));
                const range = new vscode.Range(position, position.translate(0, 4));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, the Arabic syntax for boolean true is "sa7".',
                    vscode.DiagnosticSeverity.Information
                ));
            }
            
            if ((line.includes(' false') || line.includes('=false')) && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('false'));
                const range = new vscode.Range(position, position.translate(0, 5));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, the Arabic syntax for boolean false is "ghalt".',
                    vscode.DiagnosticSeverity.Information
                ));
            }
            
            // Check for incorrect logical operators (&&, ||)
            if (line.includes('&&') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('&&'));
                const range = new vscode.Range(position, position.translate(0, 2));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, use "and" instead of "&&" for logical AND.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            if (line.includes('||') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('||'));
                const range = new vscode.Range(position, position.translate(0, 2));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, use "or" instead of "||" for logical OR.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for da5l() without assignment
            if (line.includes('da5l()') && !line.includes('=') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('da5l()'));
                const range = new vscode.Range(position, position.translate(0, 6));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Input functions must be assigned to a variable. Example: x = da5l()',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for input() without assignment
            if (line.includes('input()') && !line.includes('=') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('input()'));
                const range = new vscode.Range(position, position.translate(0, 7));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Input functions must be assigned to a variable. Example: x = input()',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for parameters in da5l/input
            if (line.match(/da5l\([^)]+\)/) && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('da5l('));
                const range = new vscode.Range(position, position.translate(0, line.substring(line.indexOf('da5l(')).indexOf(')') + 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Input functions do not accept parameters. Use etb3() to display prompts before input.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for parameters in input
            if (line.match(/input\([^)]+\)/) && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('input('));
                const range = new vscode.Range(position, position.translate(0, line.substring(line.indexOf('input(')).indexOf(')') + 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Input functions do not accept parameters. Use print() to display prompts before input.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check karr loop syntax
            const karrWrongSyntax = line.match(/karr\s*\([^)]*\)/);
            if (karrWrongSyntax && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('karr'));
                const range = new vscode.Range(position, position.translate(0, line.substring(line.indexOf('karr')).indexOf(')') + 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Incorrect karr syntax. Use: karr i=0 l7d 10 {}, not C-style syntax.',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for missing l7d in karr loops
            const karrNoL7d = line.match(/karr\s+[a-zA-Z0-9_]+\s*=\s*[0-9]+\s+[0-9]+/);
            if (karrNoL7d && !line.includes('l7d') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('karr'));
                const range = new vscode.Range(position, position.translate(0, line.length - line.indexOf('karr')));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Missing "l7d" in karr loop. Correct syntax: karr i=0 l7d 10 {}',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for type mismatch in variable declaration
            const intStringMismatch = line.match(/\b(rakm|int)\s+[a-zA-Z0-9_]+\s*=\s*["']/);
            if (intStringMismatch && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, intStringMismatch.index);
                const range = new vscode.Range(position, position.translate(0, line.length - intStringMismatch.index));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Type mismatch: Cannot assign a string to a variable declared as integer (rakm/int).',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for missing parentheses in function calls
            const missingParentheses = line.match(/\b(etb3|print|printf|cout)\s+["'][^)]*$/);
            if (missingParentheses && !line.includes('(') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, missingParentheses.index);
                const range = new vscode.Range(position, position.translate(0, 5));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Missing parentheses in function call. Use: etb3("message")',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for incorrect string concatenation (+ instead of interpolation)
            if (line.match(/["'].*["']\s*\+\s*[a-zA-Z0-9_]+/) && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('+'));
                const range = new vscode.Range(position, position.translate(0, 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, string interpolation is preferred over concatenation. Use: "message {variable}"',
                    vscode.DiagnosticSeverity.Information
                ));
            }
            
            // Check for assignment in conditional (= instead of ==)
            const assignmentInConditional = line.match(/\b(lw|if|cond|aw|elif|talama|while)\s+[^=]*[^=!><]=[^=]/);
            if (assignmentInConditional && !line.includes('//') && !line.includes('#')) {
                const assignPos = line.indexOf('=', assignmentInConditional.index);
                const position = new vscode.Position(lineIndex, assignPos);
                const range = new vscode.Range(position, position.translate(0, 1));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Using assignment (=) instead of equality (==) in condition.',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for incorrect list append (append instead of push)
            if (line.includes('.append(') && !line.includes('//') && !line.includes('#')) {
                const position = new vscode.Position(lineIndex, line.indexOf('.append'));
                const range = new vscode.Range(position, position.translate(0, 7));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'In Flex, use ".push()" instead of ".append()" for adding to a list.',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Check for talama loop with sa7 but no break (potential infinite loop)
            if (line.match(/\b(talama|while)\s+sa7/) && !line.includes('//') && !line.includes('#')) {
                // Look for this line and following lines to see if there's a break
                let hasBreak = false;
                let braceCount = 0;
                let i = lineIndex;
                
                while (i < lines.length) {
                    const currentLine = lines[i];
                    if (currentLine.includes('{')) braceCount++;
                    if (currentLine.includes('}')) braceCount--;
                    
                    if (currentLine.match(/\b(w2f|break|stop)\b/)) {
                        hasBreak = true;
                        break;
                    }
                    
                    if (braceCount === 0 && i > lineIndex) break;
                    i++;
                }
                
                if (!hasBreak) {
                    const position = new vscode.Position(lineIndex, line.indexOf('talama') !== -1 ? line.indexOf('talama') : line.indexOf('while'));
                    const range = new vscode.Range(position, position.translate(0, 6));
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Potential infinite loop: talama/while with constant condition (sa7) should include a break.',
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
            
            // Check for function return keyword mismatch (return in Arabic function or rg3 in English function)
            if (line.includes('return') && !line.includes('//') && !line.includes('#')) {
                // Check if we're inside an Arabic function
                let isArabicFunction = false;
                let i = lineIndex;
                
                while (i >= 0) {
                    if (lines[i].match(/\b(sndo2|sando2)\b/)) {
                        isArabicFunction = true;
                        break;
                    }
                    if (lines[i].match(/\b(fun|function|fn)\b/)) {
                        break;
                    }
                    i--;
                }
                
                if (isArabicFunction) {
                    const position = new vscode.Position(lineIndex, line.indexOf('return'));
                    const range = new vscode.Range(position, position.translate(0, 6));
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Use "rg3" instead of "return" in Arabic-style functions (sndo2/sando2).',
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
            
            if (line.includes('rg3') && !line.includes('//') && !line.includes('#')) {
                // Check if we're inside an English function
                let isEnglishFunction = false;
                let i = lineIndex;
                
                while (i >= 0) {
                    if (lines[i].match(/\b(fun|function|fn)\b/)) {
                        isEnglishFunction = true;
                        break;
                    }
                    if (lines[i].match(/\b(sndo2|sando2)\b/)) {
                        break;
                    }
                    i--;
                }
                
                if (isEnglishFunction) {
                    const position = new vscode.Position(lineIndex, line.indexOf('rg3'));
                    const range = new vscode.Range(position, position.translate(0, 3));
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Use "return" instead of "rg3" in English-style functions (fun/function/fn).',
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
            
            // Check for division by zero
            if (line.match(/\/\s*0\b/) && !line.includes('//') && !line.includes('#')) {
                const divPos = line.indexOf('/');
                const position = new vscode.Position(lineIndex, divPos);
                const range = new vscode.Range(position, position.translate(0, 2));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Division by zero will cause a runtime error.',
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for incorrect list declaration
            if (line.match(/\b(dorg|list)\s+[a-zA-Z0-9_]+\s*=\s*array\s*\(/)) {
                const position = new vscode.Position(lineIndex, line.indexOf('array'));
                const range = new vscode.Range(position, position.translate(0, 5));
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    'Incorrect list declaration. Use square brackets []: dorg myList = [1, 2, 3]',
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
        
        collection.set(document.uri, diagnostics);
    }
    
    // Analyze any active document
    if (vscode.window.activeTextEditor) {
        analyzeDocument(vscode.window.activeTextEditor.document);
    }
    
    // Analyze documents when they are opened or changed
    vscode.workspace.onDidOpenTextDocument(analyzeDocument);
    vscode.workspace.onDidChangeTextDocument(event => {
        analyzeDocument(event.document);
    });
    
    // Analyze all Flex documents in the workspace
    vscode.workspace.textDocuments.forEach(analyzeDocument);

    context.subscriptions.push(
        provider, 
        runCommand, 
        runButton,
        hoverProvider,
        signatureHelpProvider,
        collection
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};