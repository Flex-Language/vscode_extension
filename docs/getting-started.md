# Getting Started with Flex in VS Code

This guide will help you set up the Flex programming language extension in Visual Studio Code and write your first Flex program.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **[Visual Studio Code](https://code.visualstudio.com/)** (version 1.60.0 or higher)
2. **[Node.js](https://nodejs.org/)** (version 12.0.0 or higher)
3. **[Python](https://www.python.org/)** (version 3.8 or higher)
4. **Sindbad** (the Flex language interpreter)

## Installing the Flex Extension

1. Open VS Code
2. Click on the Extensions icon in the sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Flex Language"
4. Click "Install" on the Flex Programming Language extension

## Setting Up Sindbad

The Flex extension requires the Sindbad interpreter to run Flex programs. If you haven't installed Sindbad yet:

1. Download the Sindbad package from the [Flex language website](https://flex-lang.org/download)
2. Extract the package to a suitable location on your computer
3. Note the path to the `src` directory within the Sindbad installation

## Configuring the Extension

After installing the extension, you need to configure it to work with Sindbad:

1. Open VS Code settings (File > Preferences > Settings or `Ctrl+,` / `Cmd+,`)
2. Search for "flex.sindbadPath"
3. Set the value to the path of your Sindbad/src directory
   - Example Windows: `C:\Program Files\Sindbad\src`
   - Example macOS: `/Users/username/Developer/Sindbad/src`
   - Example Linux: `/opt/sindbad/src`

Alternatively, when you first try to run a Flex file, the extension will prompt you to provide the Sindbad path if it's not set.

## Creating Your First Flex Program

1. Create a new file with the `.lx` extension (File > New File, then save with `.lx` extension)
2. Type the following sample Flex code:

```flex
// My first Flex program
sout("Hello, Flex World!");

// Calculate and display the answer
rakm answer = 6 * 7;
sout("The answer is: " + answer);

// Loop from 1 to 5
sout("Counting from 1 to 5:");
lep (rakm i = 1; i <= 5; i = i + 1) {
    sout(i);
}

// Conditional statement
if (answer > 40) {
    sout("Answer is greater than 40");
} alif (answer > 30) {
    sout("Answer is greater than 30");
} alas {
    sout("Answer is 30 or less");
}
```

3. Save the file (File > Save or `Ctrl+S` / `Cmd+S`)

## Running Your Flex Program

There are two ways to run your Flex program:

### Method 1: Using the Run Command

1. With your Flex file open, press `F5` to run the file
2. The extension will execute the program and show the output in a terminal

### Method 2: Using the Command Palette

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P` to open the Command Palette
2. Type "Flex: Run File" and select that command
3. The program will execute, and output will appear in a terminal

## Running with AI (Optional)

If you want to use AI features with your Flex programs:

1. Enable AI in settings: Set `flex.ai.enable` to `true`
2. Run your program with `Shift+F5` or use the Command Palette and select "Flex: Run File with AI"

## Flex Language Basics

Here's a quick overview of Flex language basics:

### Variables

```flex
// Declaring variables
rakm number = 42;       // integer
3jfa decimal = 3.14;    // float
7arf text = "Hello";    // string
mnt5k isTrue = 9a7;     // boolean (true)
mnt5k isFalse = 53ta;   // boolean (false)
```

### Functions

```flex
// Defining a function
sndo2 add(rakm a, rakm b) {
    araj3 a + b;
}

// Calling a function
rakm result = add(5, 3);
sout("5 + 3 = " + result);
```

### Control Structures

```flex
// If-else statement
if (condition) {
    // Code to execute if condition is true
} alif (anotherCondition) {
    // Code to execute if anotherCondition is true
} alas {
    // Code to execute if all conditions are false
}

// While loop
wa9t (condition) {
    // Code to execute while condition is true
}

// For loop
lep (rakm i = 0; i < 10; i = i + 1) {
    // Code to execute 10 times
}
```

## Using VS Code Features with Flex

The Flex extension provides several powerful features:

### Syntax Highlighting

Flex code is automatically highlighted with colors to make it easier to read and understand.

### Code Completion

As you type, the extension will suggest completions for keywords, variables, and functions.

### Error Highlighting

The extension will underline code that contains syntax errors or potential issues.

### Code Formatting

You can format your Flex code by pressing `Alt+Shift+F` or using the Command Palette and selecting "Format Document".

## Next Steps

After getting familiar with the basics:

1. Explore the example files in the Flex documentation
2. Try the AI-powered features for code explanation and generation
3. Learn about advanced Flex language features like custom types and modules
4. Join the Flex community Discord for help and discussion

## Troubleshooting

If you encounter issues:

1. Check the [Troubleshooting Guide](troubleshooting.md) for common problems and solutions
2. Review the [Cross-Platform Considerations](cross-platform.md) if you're using Windows, macOS, or Linux
3. For AI-related issues, see the [AI Integration](ai-integration.md) guide

---

Happy coding with Flex! 