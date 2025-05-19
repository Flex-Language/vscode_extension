# Flex Language Support for Visual Studio Code

This extension provides comprehensive language support for the Flex programming language, a flexible multi-syntax language designed for both beginners and advanced developers.

## Features

- **Syntax highlighting** for:
  - Comments (single-line `//` and `#`, multi-line `/* */`, and documentation `''' '''`)
  - Strings with interpolation (`"Hello, {name}"`)
  - Keywords in both English and Franco syntax
  - Types (rakm, kasr, so2al, klma, dorg / int, float, bool, string, list)
  - Functions and function calls
  - Operators (arithmetic, comparison, logical)
  - Numbers (integers and floats)
  - Variables
  - List operations

- **Smart code completion** for:
  - Keywords and language constructs
  - List operations (push, pop, remove, length)
  - Operators and common functions
  - Built-in functions (absolute, do_modulus, isprime, etc.)

- **Hover information** for:
  - Keywords and syntax elements
  - Operators and their functionality
  - Function signatures and parameters

- **Error detection** for common Flex coding mistakes:
  - Missing curly braces in blocks
  - Incorrect karr loop syntax
  - Unassigned input functions
  - Incorrect logical operators
  - Semicolon usage (not required in Flex)
  - Boolean value syntax (sa7/ghalt vs true/false)

- **Function signature help** that shows:
  - Parameter information
  - Function descriptions
  - Return types

- **Code snippets** for common patterns:
  - If statements and if-else blocks
  - Loops (while, for, C-style for)
  - Function definitions
  - Print statements with formatting
  - Input handling
  - Variable declarations
  - Import statements
  - List operations
  - Complete program templates

- **Editor features**:
  - Bracket matching and auto-closing
  - Code folding for blocks and regions
  - Smart indentation for control structures and functions
  - Comment toggling (single and multi-line)
  - Word pattern recognition
  - Auto-indent when entering control blocks
  
- **Run Flex files** directly from VSCode:
  - Run button in the status bar when editing Flex files
  - Run button in the editor title area
  - Command palette option: "Run Flex File"
  - Automatic Flex interpreter detection with download prompt if not found
  - On macOS, directly uses the 'flex' command without complex path searching

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install flex-language`
4. Press Enter

## Requirements

- **Flex Interpreter**: The extension requires the Flex interpreter to run Flex files
  - The extension automatically checks if the Flex interpreter is installed
  - If not found, it will prompt you to download it from the [Flex Releases page](https://github.com/Flex-Language/Flex/releases/latest)
  - **macOS Users**: Install the Flex interpreter to `/usr/local/bin/flex` or ensure it's in your PATH as the 'flex' command
  - **Windows/Linux Users**: Make sure to add the Flex interpreter to your PATH after installation

## Platform-specific Notes

### macOS
- The extension directly uses the 'flex' command without searching for other paths
- Ensure the Flex compiler is installed as 'flex' in your PATH (typically in `/usr/local/bin/flex`)
- To install: `brew install flex` or manually place the executable at `/usr/local/bin/flex`

### Windows
- The extension searches for the Flex compiler in standard installation locations
- Add the Flex compiler directory to your PATH or specify a custom path in settings

### Linux
- The extension primarily looks for the 'flex' command in your PATH
- You can also specify a custom path in settings if needed

## Usage

Files with `.lx`, `.fx`, or `.flex` extensions will automatically be recognized as Flex files.

### Code Completion

Type any keyword or start of a construct to see completion suggestions:

- Type `lw` to get suggestions for an if statement
- Type `.` after a list variable to see available list operations
- Use snippets by typing their prefix (e.g., `if-block`, `while-loop`, `function-arabic`)

### Hover Information

Hover over any keyword, function, or operator to see a description:
- For keywords: explains the purpose and syntax variants
- For operators: explains operation and usage
- For built-in functions: shows parameter information and description

### Error Detection

The extension will highlight common Flex errors as you type:
- Missing curly braces around blocks
- Using C-style syntax with Arabic keywords
- Missing l7d in karr loops
- Using da5l() without assigning to a variable
- Using && or || instead of "and" and "or"
- Using "true/false" instead of "sa7/ghalt"

### Function Signatures

When typing function calls, you'll see parameter information:
- Parameter names and types
- Function description
- Return type information

### Running Flex Programs

To run a Flex program:
1. Open a Flex file (with `.lx`, `.fx`, or `.flex` extension)
2. Click the "Run Flex" button in the status bar at the bottom of the window
3. Alternatively, click the "Run" icon in the editor title area
4. Or use the Command Palette (Ctrl+Shift+P) and search for "Run Flex File"

If the Flex interpreter is not installed, the extension will:
- Show an error message indicating that the interpreter is missing
- Provide a "Download Flex" button that will take you to the Flex releases page
- You'll need to download and install the appropriate version for your operating system

### Example

```flex
# Variable declarations
rakm x = 42
klma message = "Hello, World!"

# Function definition
sndo2 calculateSum(rakm a, rakm b) {
    rg3 a + b
}

# Control structures
lw (x > 0) {
    etb3("Positive number")
} gher {
    etb3("Non-positive number")
}

# Loops
talama (x > 0) {
    etb3(x)
    x = x - 1
}

# List operations
dorg numbers = [1, 2, 3, 4, 5]
numbers.push(6)
etb3("List length: {length(numbers)}")
```

## Language Features

Flex is a flexible language that supports multiple programming styles:

- **Franco-Arabic keywords**: lw, gher, talama, karr, sndo2, rg3
- **English keywords**: if, else, while, for, function, return
- **Mixed syntax**: Use any combination of styles in your code
- **String interpolation**: Include variables in strings with `{variable}`
- **List operations**: push, pop, remove, length
- **I/O functions**: etb3/print for output, da5l/input for input
- **Built-in functions**: Several utility functions like absolute, isprime, calculator
- **No semicolons**: End of line defines the end of a statement
- **Required braces**: All blocks must be enclosed in curly braces {}

## Common Errors and Fixes

The extension helps you avoid these common errors in Flex:

| Error | Fix |
|-------|-----|
| Missing curly braces | Always use `{` and `}` around code blocks |
| Using semicolons | Flex doesn't require semicolons at end of statements |
| Wrong Arabic loop | Use `karr i=0 l7d 10 { }` not `karr (i=0; i<10; i++)` |
| Missing l7d | In karr loops, always include l7d between start and end values |
| Incorrect function declaration | Use `sndo2` or `fun` keywords for functions |
| Missing input assignment | Always assign input: `x = da5l()` |
| Adding parameters to input | Don't use: `x = da5l("Enter a value")` |
| Wrong logical operators | Use `and`, `or`, not `&&`, `||` |
| Incorrect boolean values | Use `sa7` and `ghalt`, not `true` and `false` |

## Contributing

Found a bug or want to contribute? Visit our [GitHub repository](https://github.com/Flex-Language/vscode_extension).

## License

This extension is licensed under the MIT License. 