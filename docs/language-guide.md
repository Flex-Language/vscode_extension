# Flex Language Guide

## Introduction

Flex is a flexible programming language that supports multiple syntax styles, including Franko Arabic and English conventions. This guide provides an overview of the language syntax and features supported by the VS Code extension.

## Syntax Overview

### Variable Declaration

Flex supports multiple syntax styles for variable declarations:

```flex
// English style
int age = 25
float pi = 3.14159
string name = "John"
bool isActive = true
list numbers = [1, 2, 3, 4, 5]

// Franco-Arabic style
rakm age = 25
kasr pi = 3.14159
nass name = "John"
so2al isActive = true
dorg numbers = [1, 2, 3, 4, 5]
```

### Functions

Functions can be defined using either `fun` or `sndo2` keywords:

```flex
// English style
fun calculateArea(float radius) {
    return pi * radius * radius
}

// Franco-Arabic style
sndo2 calculateArea(kasr radius) {
    rg3 pi * radius * radius
}
```

### Conditional Statements

Conditional statements can use either `if` or `cond` keywords:

```flex
// English style
if (age >= 18) {
    print("You are an adult.")
} else {
    print("You are a minor.")
}

// Franco-Arabic style
cond (age >= 18) {
    etb3("You are an adult.")
} else {
    etb3("You are a minor.")
}
```

### Loops

Flex supports several loop constructs:

```flex
// For loop (English style)
for (int i = 0; i < 5; i++) {
    print(i)
}

// For loop (Franco-Arabic style)
loop (rakm i = 0; i < 5; i++) {
    etb3(i)
}

// While loop (English style)
while (counter < 3) {
    print("Counter: " + counter)
    counter = counter + 1
}

// While loop (Franco-Arabic style)
karr (counter < 3) {
    etb3("Counter: " + counter)
    counter = counter + 1
}
```

### Input/Output

```flex
// English style
print("Enter your name:")
string userName = input()

// Franco-Arabic style
etb3("Enter your name:")
nass userName = da5l()
```

### Importing

```flex
// English style
import "math.lx"  // .lx, .flex, or .fx extensions are all supported

// Franco-Arabic style
geeb "math.lx"  // .lx, .flex, or .fx extensions are all supported
```

## Extension Features

The VS Code extension for Flex provides:

1. **Syntax Highlighting**: Different colors for keywords, types, strings, comments, etc.
2. **Code Completion**: Suggests keywords, types, and functions as you type.
3. **Error Detection**: Identifies syntax errors and potential issues in real-time.
4. **Code Formatting**: Automatically formats your code for readability.
5. **Snippets**: Quick code templates for common constructs.
6. **Run Integration**: Execute Flex files directly from within VS Code.

## Learning Resources

For more information on the Flex language:

- Explore the example files in the `/examples` directory
- Visit the Flex language repository: [Sindbad Repository](https://github.com/MahmoudHanyFathalla/Sindbad)
- Check out the AI assistance features for help with errors and code understanding

## Troubleshooting

If you encounter issues with the extension:

1. Make sure the path to the Flex interpreter is correctly set in VS Code settings
2. Verify that the Flex interpreter can run correctly outside of VS Code
3. Check the extension logs for any error messages
4. Report issues to the extension repository
