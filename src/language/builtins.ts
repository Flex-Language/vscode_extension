export interface BuiltInFunction {
    description: string;
}

// Output Functions - Franco Arabic and English
export const outputFunctions: Record<string, BuiltInFunction> = {
    etb3: {
        description: '```flex\n(method) etb3(message?: any, ...optionalParams: any[]): void\n```\n\n**Franco Arabic print function** - Prints to stdout with newline. Supports string interpolation with {variable}.\n\n```flex\nrakm x = 5;\netb3("Value: {x}");\n// Prints: Value: 5\n```\n\nSee `print()`, `out()`, `output()` for English equivalents.'
    },
    print: {
        description: '```flex\n(method) print(message?: any, ...optionalParams: any[]): void\n```\n\n**English print function** - Prints to stdout with newline. Supports string interpolation with {variable}.\n\n```flex\nint count = 5;\nprint("count: {count}");\n// Prints: count: 5\n```\n\nSee `etb3()`, `out()`, `output()` for alternatives.'
    },
    out: {
        description: '```flex\n(method) out(message?: any, ...optionalParams: any[]): void\n```\n\n**Short output function** - Alternative print function with newline.'
    },
    output: {
        description: '```flex\n(method) output(message?: any, ...optionalParams: any[]): void\n```\n\n**Verbose output function** - Alternative print function with newline.'
    },
    printf: {
        description: '```flex\n(method) printf(format: string, ...args: any[]): void\n```\n\n**C-style printf** - Formatted output with string interpolation.'
    },
    cout: {
        description: '```flex\n(method) cout(message?: any, ...optionalParams: any[]): void\n```\n\n**C++-style output** - Stream-style output function.'
    }
};

// Input Functions
export const inputFunctions: Record<string, BuiltInFunction> = {
    da5l: {
        description: '```flex\n(method) da5l(): string\n```\n\n**Franco Arabic input function** - Reads a line from stdin (Arabic: "enter").'
    },
    da5al: {
        description: '```flex\n(method) da5al(): string\n```\n\n**Franco Arabic input variant** - Alternative spelling for da5l().'
    },
    d5l: {
        description: '```flex\n(method) d5l(): string\n```\n\n**Short Franco Arabic input** - Shortened version of da5l().'
    },
    scan: {
        description: '```flex\n(method) scan(): string\n```\n\n**English input function** - Reads a line from stdin.'
    },
    read: {
        description: '```flex\n(method) read(): string\n```\n\n**Read input function** - Alternative input function.'
    },
    input: {
        description: '```flex\n(method) input(): string\n```\n\n**Standard input function** - Reads a line from stdin.'
    }
};

// String Functions
export const stringFunctions: Record<string, BuiltInFunction> = {
    length: {
        description: '```flex\n(method) length(str: string | list): int\n```\n\n**English length function** - Returns length of string or list.'
    },
    tool: {
        description: '```flex\n(method) tool(str: string | list): rakm\n```\n\n**Franco Arabic length function** - Returns length of string or list.'
    },
    toul: {
        description: '```flex\n(method) toul(str: string | list): rakm\n```\n\n**Franco Arabic length variant** - Alternative spelling for tool().'
    },
    "7ajm": {
        description: '```flex\n(method) 7ajm(str: string | list): rakm\n```\n\n**Franco Arabic size function** - Returns size/length (Arabic: "hajm").'
    },
    split: {
        description: '```flex\n(method) split(str: string, delimiter: string): list\n```\n\n**String split function** - Splits string into list by delimiter.'
    },
    "2sm": {
        description: '```flex\n(method) 2sm(str: string, delimiter: string): dorg\n```\n\n**Franco Arabic split function** - Splits string into list.'
    },
    join: {
        description: '```flex\n(method) join(list: list, delimiter: string): string\n```\n\n**List join function** - Joins list elements into string.'
    },
    jam3: {
        description: '```flex\n(method) jam3(list: dorg, delimiter: string): klma\n```\n\n**Franco Arabic join function** - Joins list elements.'
    },
    trim: {
        description: '```flex\n(method) trim(str: string): string\n```\n\n**String trim function** - Removes whitespace from both ends of string.'
    },
    n7f: {
        description: '```flex\n(method) n7f(str: klma): klma\n```\n\n**Franco Arabic trim function** - Removes whitespace (Arabic: "nadhif").'
    },
    upper: {
        description: '```flex\n(method) upper(str: string): string\n```\n\n**Uppercase function** - Converts string to uppercase.'
    },
    kbr: {
        description: '```flex\n(method) kbr(str: klma): klma\n```\n\n**Franco Arabic uppercase function** - Converts to uppercase (Arabic: "kabir").'
    },
    lower: {
        description: '```flex\n(method) lower(str: string): string\n```\n\n**Lowercase function** - Converts string to lowercase.'
    },
    sg7r: {
        description: '```flex\n(method) sg7r(str: klma): klma\n```\n\n**Franco Arabic lowercase function** - Converts to lowercase (Arabic: "saghir").'
    },
    contains: {
        description: '```flex\n(method) contains(str: string, substring: string): bool\n```\n\n**String contains function** - Checks if string contains substring.'
    },
    fy: {
        description: '```flex\n(method) fy(str: klma, substring: klma): so2al\n```\n\n**Franco Arabic contains function** - Checks if string contains substring (Arabic: "fi").'
    }
};

// Math Functions
export const mathFunctions: Record<string, BuiltInFunction> = {
    sqrt: {
        description: '```flex\n(method) sqrt(number: float): float\n```\n\n**Square root function** - Returns square root of number.'
    },
    jzr: {
        description: '```flex\n(method) jzr(number: kasr): kasr\n```\n\n**Franco Arabic square root** - Returns square root (Arabic: "jazr").'
    },
    power: {
        description: '```flex\n(method) power(base: float, exponent: float): float\n```\n\n**Power function** - Raises base to exponent power.'
    },
    "2ss": {
        description: '```flex\n(method) 2ss(base: kasr, exponent: kasr): kasr\n```\n\n**Franco Arabic power function** - Raises to power (Arabic: "ass").'
    },
    abs: {
        description: '```flex\n(method) abs(number: float): float\n```\n\n**Absolute value function** - Returns absolute value.'
    },
    mtl2: {
        description: '```flex\n(method) mtl2(number: kasr): kasr\n```\n\n**Franco Arabic absolute value** - Returns absolute value (Arabic: "mutlaq").'
    },
    round: {
        description: '```flex\n(method) round(number: float): int\n```\n\n**Round function** - Rounds number to nearest integer.'
    },
    "2rb": {
        description: '```flex\n(method) 2rb(number: kasr): rakm\n```\n\n**Franco Arabic round function** - Rounds to nearest integer (Arabic: "aqrab").'
    },
    floor: {
        description: '```flex\n(method) floor(number: float): int\n```\n\n**Floor function** - Rounds down to nearest integer.'
    },
    ceil: {
        description: '```flex\n(method) ceil(number: float): int\n```\n\n**Ceiling function** - Rounds up to nearest integer.'
    },
    min: {
        description: '```flex\n(method) min(a: float, b: float): float\n```\n\n**Minimum function** - Returns smaller of two numbers.'
    },
    asgar: {
        description: '```flex\n(method) asgar(a: kasr, b: kasr): kasr\n```\n\n**Franco Arabic minimum function** - Returns smaller number (Arabic: "asgar").'
    },
    max: {
        description: '```flex\n(method) max(a: float, b: float): float\n```\n\n**Maximum function** - Returns larger of two numbers.'
    },
    akbar: {
        description: '```flex\n(method) akbar(a: kasr, b: kasr): kasr\n```\n\n**Franco Arabic maximum function** - Returns larger number (Arabic: "akbar").'
    },
    random: {
        description: '```flex\n(method) random(): float\n```\n\n**Random function** - Returns random number between 0 and 1.'
    }
};

// Type Checking Functions
export const typeCheckingFunctions: Record<string, BuiltInFunction> = {
    isNumber: {
        description: '```flex\n(method) isNumber(value: any): bool\n```\n\n**Number type check** - Returns true if value is a number.'
    },
    isString: {
        description: '```flex\n(method) isString(value: any): bool\n```\n\n**String type check** - Returns true if value is a string.'
    },
    isList: {
        description: '```flex\n(method) isList(value: any): bool\n```\n\n**List type check** - Returns true if value is a list.'
    },
    isBool: {
        description: '```flex\n(method) isBool(value: any): bool\n```\n\n**Boolean type check** - Returns true if value is a boolean.'
    },
    "rakm?": {
        description: '```flex\n(method) rakm?(value: any): so2al\n```\n\n**Franco Arabic number check** - Returns true if value is a number.'
    },
    "klma?": {
        description: '```flex\n(method) klma?(value: any): so2al\n```\n\n**Franco Arabic string check** - Returns true if value is a string.'
    },
    "dorg?": {
        description: '```flex\n(method) dorg?(value: any): so2al\n```\n\n**Franco Arabic list check** - Returns true if value is a list.'
    },
    "so2al?": {
        description: '```flex\n(method) so2al?(value: any): so2al\n```\n\n**Franco Arabic boolean check** - Returns true if value is a boolean.'
    }
};

// System Functions
export const systemFunctions: Record<string, BuiltInFunction> = {
    getCurrentTime: {
        description: '```flex\n(method) getCurrentTime(): int\n```\n\n**Current time function** - Returns current timestamp in milliseconds.'
    },
    wa2tHali: {
        description: '```flex\n(method) wa2tHali(): rakm\n```\n\n**Franco Arabic current time** - Returns current timestamp (Arabic: "waqt hali").'
    },
    systemType: {
        description: '```flex\n(method) systemType(): string\n```\n\n**System type function** - Returns operating system type (windows, linux, mac).'
    },
    no3Nizam: {
        description: '```flex\n(method) no3Nizam(): klma\n```\n\n**Franco Arabic system type** - Returns OS type (Arabic: "no3 nizam").'
    },
    getEnv: {
        description: '```flex\n(method) getEnv(name: string): string\n```\n\n**Environment variable function** - Gets environment variable value.'
    },
    sleep: {
        description: '```flex\n(method) sleep(milliseconds: int): void\n```\n\n**Sleep function** - Pauses execution for specified milliseconds.'
    },
    nam: {
        description: '```flex\n(method) nam(milliseconds: rakm): void\n```\n\n**Franco Arabic sleep function** - Pauses execution (Arabic: "nam").'
    },
    listFiles: {
        description: '```flex\n(method) listFiles(directory: string): list\n```\n\n**List files function** - Returns list of files in directory.'
    }
};

// File Functions
export const fileFunctions: Record<string, BuiltInFunction> = {
    fileExists: {
        description: '```flex\n(method) fileExists(path: string): bool\n```\n\n**File exists function** - Checks if file exists at path.'
    },
    mlafM3jod: {
        description: '```flex\n(method) mlafM3jod(path: klma): so2al\n```\n\n**Franco Arabic file exists** - Checks if file exists (Arabic: "malaf mawjood").'
    },
    fileM3jod: {
        description: '```flex\n(method) fileM3jod(path: klma): so2al\n```\n\n**Franco Arabic file exists variant** - Alternative spelling for mlafM3jod.'
    },
    readFile: {
        description: '```flex\n(method) readFile(path: string): string\n```\n\n**Read file function** - Reads entire file content as string.'
    },
    "2ra2File": {
        description: '```flex\n(method) 2ra2File(path: klma): klma\n```\n\n**Franco Arabic read file** - Reads file content (Arabic: "iqra2").'
    },
    qra2File: {
        description: '```flex\n(method) qra2File(path: klma): klma\n```\n\n**Franco Arabic read file variant** - Alternative spelling for 2ra2File.'
    },
    writeFile: {
        description: '```flex\n(method) writeFile(path: string, content: string): void\n```\n\n**Write file function** - Writes content to file (overwrites existing).'
    },
    katbFile: {
        description: '```flex\n(method) katbFile(path: klma, content: klma): void\n```\n\n**Franco Arabic write file** - Writes to file (Arabic: "kataba").'
    },
    iktbFile: {
        description: '```flex\n(method) iktbFile(path: klma, content: klma): void\n```\n\n**Franco Arabic write file variant** - Alternative spelling for katbFile.'
    },
    appendFile: {
        description: '```flex\n(method) appendFile(path: string, content: string): void\n```\n\n**Append file function** - Appends content to end of file.'
    },
    zydFile: {
        description: '```flex\n(method) zydFile(path: klma, content: klma): void\n```\n\n**Franco Arabic append file** - Appends to file (Arabic: "zayyed").'
    },
    zayedFile: {
        description: '```flex\n(method) zayedFile(path: klma, content: klma): void\n```\n\n**Franco Arabic append file variant** - Alternative spelling for zydFile.'
    },
    deleteFile: {
        description: '```flex\n(method) deleteFile(path: string): void\n```\n\n**Delete file function** - Deletes file at specified path.'
    },
    m7yFile: {
        description: '```flex\n(method) m7yFile(path: klma): void\n```\n\n**Franco Arabic delete file** - Deletes file (Arabic: "mahiya").'
    },
    m7iFile: {
        description: '```flex\n(method) m7iFile(path: klma): void\n```\n\n**Franco Arabic delete file variant** - Alternative spelling for m7yFile.'
    }
};

// Combine all built-in functions
export const builtInFunctions: Record<string, BuiltInFunction> = {
    ...outputFunctions,
    ...inputFunctions,
    ...stringFunctions,
    ...mathFunctions,
    ...typeCheckingFunctions,
    ...systemFunctions,
    ...fileFunctions
}; 