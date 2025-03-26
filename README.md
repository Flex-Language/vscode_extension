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

- **Code snippets** for common patterns:
  - If statements and if-else blocks
  - Loops (while, for, C-style for)
  - Function definitions
  - Print statements with formatting
  - Input handling
  - Variable declarations
  - Import statements
  - List operations

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

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install flex-language`
4. Press Enter

## Usage

Files with `.lx`, `.fx`, or `.flex` extensions will automatically be recognized as Flex files.

### Code Completion

Type any keyword or start of a construct to see completion suggestions:

- Type `lw` to get suggestions for an if statement
- Type `.` after a list variable to see available list operations
- Use snippets by typing their prefix (e.g., `ifelse`, `function`, `for`)

### Running Flex Programs

To run a Flex program:
1. Open a Flex file (with `.lx`, `.fx`, or `.flex` extension)
2. Click the "Run Flex" button in the status bar at the bottom of the window
3. Alternatively, click the "Run" icon in the editor title area
4. Or use the Command Palette (Ctrl+Shift+P) and search for "Run Flex File"

Note: This requires the Flex interpreter to be installed and available in your PATH. The extension uses the `flex` command to execute your programs.

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

## Contributing

Found a bug or want to contribute? Visit our [GitHub repository](https://github.com/mikawi/flex-language).

## License

This extension is licensed under the MIT License. 