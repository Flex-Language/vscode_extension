export interface LanguageKeyword {
    description: string;
}

// Conditional Keywords
export const conditionalKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Conditionals
    lw: {
        description: '```flex\nlw (condition) { statements }\n```\n\n**Franco Arabic IF statement** - Executes code block if condition is true (Arabic: "law").\n\n```flex\nrakm x = 10;\nlw x > 5 {\n  etb3("x is greater than 5");\n}\n// Prints: x is greater than 5\n```\n\n⚠️ **CRITICAL**: Use with `aw` (elif) and `gher` (else). See `if` for English equivalent.'
    },
    aw: {
        description: '```flex\naw (condition) { statements }\n```\n\n**Franco Arabic ELIF statement** - Secondary conditional (Arabic: "aw" = or). Must follow `lw` or another `aw`.'
    },
    gher: {
        description: '```flex\ngher { statements }\n```\n\n**Franco Arabic ELSE statement** - Default condition block (Arabic: "ghayr" = other).'
    },
    // English Conditionals
    if: {
        description: '```flex\nif (condition) { statements }\n```\n\n**English IF statement** - Standard conditional statement.'
    },
    elif: {
        description: '```flex\nelif (condition) { statements }\n```\n\n**English ELIF statement** - Secondary conditional. Must follow `if` or another `elif`.'
    },
    else: {
        description: '```flex\nelse { statements }\n```\n\n**English ELSE statement** - Default condition block.'
    },
    cond: {
        description: '```flex\ncond (condition) { statements }\n```\n\n**Alternative IF statement** - Short form of conditional.'
    },
    otherwise: {
        description: '```flex\notherwise { statements }\n```\n\n**Alternative ELSE statement** - Verbose form of else.'
    }
};

// Loop Keywords
export const loopKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Loops  
    talama: {
        description: '```flex\ntalama (condition) { statements }\n```\n\n**Franco Arabic WHILE loop** - Executes while condition is true (Arabic: "talama" = as long as).'
    },
    talma: {
        description: '```flex\ntalma (condition) { statements }\n```\n\n**Franco Arabic WHILE variant** - Alternative spelling of talama.'
    },
    tlma: {
        description: '```flex\ntlma (condition) { statements }\n```\n\n**Franco Arabic WHILE short** - Shortened form of talama.'
    },
    karr: {
        description: '```flex\nkarr variable=start l7d end { statements }\n```\n\n**Franco Arabic FOR loop** - Iterates from start to end value (Arabic: "karar" = repeat).\n\n⚠️ **CRITICAL SAFETY**: Franco loops are INCLUSIVE! For arrays, use `l7d length(array) - 1`'
    },
    krr: {
        description: '```flex\nkrr variable=start l7d end { statements }\n```\n\n**Franco Arabic FOR short** - Shortened form of karr.'
    },
    karar: {
        description: '```flex\nkarar variable=start l7d end { statements }\n```\n\n**Franco Arabic FOR verbose** - Full form of karr.'
    },
    l7d: {
        description: '```flex\nkarr variable=start l7d end { statements }\n```\n\n**Franco Arabic UNTIL keyword** - Used in karr loops to specify end boundary (Arabic: "lahad" = until).\n\n⚠️ **CRITICAL**: Franco l7d is INCLUSIVE! Unlike English < operator.'
    },
    // English Loops
    while: {
        description: '```flex\nwhile (condition) { statements }\n```\n\n**English WHILE loop** - Standard while loop.'
    },
    loop: {
        description: '```flex\nloop (condition) { statements }\n```\n\n**Alternative WHILE loop** - Alternative while syntax.'
    },
    for: {
        description: '```flex\nfor(init; condition; increment) { statements }\n```\n\n**English FOR loop** - C-style for loop.'
    }
};

// Function Keywords
export const functionKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Functions
    sndo2: {
        description: '```flex\nsndo2 functionName(param1, param2, ...) { statements }\n```\n\n**Franco Arabic FUNCTION definition** - Defines a function (Arabic: "sando2" = box/container).'
    },
    sando2: {
        description: '```flex\nsando2 functionName(param1, param2, ...) { statements }\n```\n\n**Franco Arabic FUNCTION variant** - Alternative spelling of sndo2.'
    },
    rg3: {
        description: '```flex\nrg3 value;\n```\n\n**Franco Arabic RETURN statement** - Returns value from function (Arabic: "raja3" = return).'
    },
    raga3: {
        description: '```flex\nraga3 value;\n```\n\n**Franco Arabic RETURN variant** - Alternative spelling of rg3.'
    },
    // English Functions
    fun: {
        description: '```flex\nfun functionName(param1, param2, ...) { statements }\n```\n\n**English FUNCTION definition** - Short form function definition.'
    },
    function: {
        description: '```flex\nfunction functionName(param1, param2, ...) { statements }\n```\n\n**English FUNCTION verbose** - Verbose function definition.'
    },
    fn: {
        description: '```flex\nfn functionName(param1, param2, ...) { statements }\n```\n\n**English FUNCTION short** - Shortest function definition.'
    },
    return: {
        description: '```flex\nreturn value;\n```\n\n**English RETURN statement** - Returns value from function.'
    }
};

// Data Type Keywords
export const dataTypeKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Types
    rakm: {
        description: '```flex\nrakm variableName = value;\n```\n\n**Franco Arabic INTEGER type** - Integer data type (Arabic: "raqam" = number).'
    },
    kasr: {
        description: '```flex\nkasr variableName = value;\n```\n\n**Franco Arabic FLOAT type** - Floating-point type (Arabic: "kasr" = fraction).'
    },
    ksr: {
        description: '```flex\nksr variableName = value;\n```\n\n**Franco Arabic FLOAT short** - Shortened form of kasr.'
    },
    klma: {
        description: '```flex\nklma variableName = "value";\n```\n\n**Franco Arabic STRING type** - String data type (Arabic: "kalima" = word).'
    },
    kalma: {
        description: '```flex\nkalma variableName = "value";\n```\n\n**Franco Arabic STRING variant** - Alternative spelling of klma.'
    },
    so2al: {
        description: '```flex\nso2al variableName = sa7|ghalt;\n```\n\n**Franco Arabic BOOLEAN type** - Boolean data type (Arabic: "soo2al" = question).'
    },
    s2al: {
        description: '```flex\ns2al variableName = sa7|ghalt;\n```\n\n**Franco Arabic BOOLEAN short** - Shortened form of so2al.'
    },
    so2l: {
        description: '```flex\nso2l variableName = sa7|ghalt;\n```\n\n**Franco Arabic BOOLEAN variant** - Alternative spelling of so2al.'
    },
    dorg: {
        description: '```flex\ndorg variableName = [value1, value2, ...];\n```\n\n**Franco Arabic LIST type** - List/array data type (Arabic: "duruuj" = drawer).'
    },
    drg: {
        description: '```flex\ndrg variableName = [value1, value2, ...];\n```\n\n**Franco Arabic LIST short** - Shortened form of dorg.'
    },
    // English Types
    int: {
        description: '```flex\nint variableName = value;\n```\n\n**English INTEGER type** - Standard integer data type.'
    },
    float: {
        description: '```flex\nfloat variableName = value;\n```\n\n**English FLOAT type** - Floating-point data type.'
    },
    string: {
        description: '```flex\nstring variableName = "value";\n```\n\n**English STRING type** - String data type.'
    },
    bool: {
        description: '```flex\nbool variableName = true|false;\n```\n\n**English BOOLEAN type** - Boolean data type.'
    },
    list: {
        description: '```flex\nlist variableName = [value1, value2, ...];\n```\n\n**English LIST type** - List/array data type.'
    }
};

// Boolean Values
export const booleanValues: Record<string, LanguageKeyword> = {
    // Franco Arabic Boolean Values
    sa7: {
        description: '```flex\nsa7\n```\n\n**Franco Arabic TRUE value** - Boolean true (Arabic: "sah" = correct).'
    },
    s7: {
        description: '```flex\ns7\n```\n\n**Franco Arabic TRUE short** - Shortened form of sa7.'
    },
    sah: {
        description: '```flex\nsah\n```\n\n**Franco Arabic TRUE variant** - Alternative spelling of sa7.'
    },
    saa7: {
        description: '```flex\nsaa7\n```\n\n**Franco Arabic TRUE extended** - Extended form of sa7.'
    },
    ghalt: {
        description: '```flex\nghalt\n```\n\n**Franco Arabic FALSE value** - Boolean false (Arabic: "ghalat" = wrong).'
    },
    ghlt: {
        description: '```flex\nghlt\n```\n\n**Franco Arabic FALSE short** - Shortened form of ghalt.'
    },
    ghalat: {
        description: '```flex\nghalat\n```\n\n**Franco Arabic FALSE extended** - Extended form of ghalt.'
    },
    // English Boolean Values
    true: {
        description: '```flex\ntrue\n```\n\n**English TRUE value** - Boolean true value.'
    },
    True: {
        description: '```flex\nTrue\n```\n\n**English TRUE capitalized** - Python-style true value.'
    },
    TRUE: {
        description: '```flex\nTRUE\n```\n\n**English TRUE uppercase** - C-style true value.'
    },
    false: {
        description: '```flex\nfalse\n```\n\n**English FALSE value** - Boolean false value.'
    },
    False: {
        description: '```flex\nFalse\n```\n\n**English FALSE capitalized** - Python-style false value.'
    },
    FALSE: {
        description: '```flex\nFALSE\n```\n\n**English FALSE uppercase** - C-style false value.'
    }
};

// Control Flow Keywords
export const controlFlowKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Control Flow
    w2f: {
        description: '```flex\nw2f;\n```\n\n**Franco Arabic BREAK statement** - Exits current loop (Arabic: "waqif" = stop).'
    },
    wa2af: {
        description: '```flex\nwa2af;\n```\n\n**Franco Arabic BREAK variant** - Alternative spelling of w2f.'
    },
    // English Control Flow
    break: {
        description: '```flex\nbreak;\n```\n\n**English BREAK statement** - Exits current loop.'
    },
    stop: {
        description: '```flex\nstop;\n```\n\n**Alternative BREAK statement** - Alternative break syntax.'
    }
};

// Import Keywords
export const importKeywords: Record<string, LanguageKeyword> = {
    // Franco Arabic Import
    geep: {
        description: '```flex\ngeep "filename.lx";\n```\n\n**Franco Arabic IMPORT statement** - Imports code from file (Arabic: "jeeb" = bring).'
    },
    geeb: {
        description: '```flex\ngeeb "filename.lx";\n```\n\n**Franco Arabic IMPORT variant** - Alternative spelling of geep.'
    },
    // English Import
    import: {
        description: '```flex\nimport "filename.lx";\n```\n\n**English IMPORT statement** - Imports code from file.'
    }
};

// Combine all language keywords
export const languageKeywords: Record<string, LanguageKeyword> = {
    ...conditionalKeywords,
    ...loopKeywords,
    ...functionKeywords,
    ...dataTypeKeywords,
    ...booleanValues,
    ...controlFlowKeywords,
    ...importKeywords
}; 