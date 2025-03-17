# AI Integration for VS Code Flex Extension

This guide explains how to use the AI integration features of the Flex extension, including configuration options, available models, and troubleshooting tips.

## Available AI Models

The Flex extension supports three AI models:

1. **Qwen**: Default model, does not require additional configuration
2. **OpenAI**: Requires an API key
3. **LMStudio**: Local AI model that runs on your machine

## Enabling AI Features

To enable AI features:

1. Open VS Code settings
2. Search for "flex.ai.enable"
3. Set the value to `true`
4. Configure your preferred AI model (default is Qwen)

```json
{
    "flex.ai.enable": true,
    "flex.ai.model": "qwen"
}
```

## Model-Specific Configuration

### Qwen (Default)

No additional configuration is required for the Qwen model. It's the default model and works out of the box.

```json
{
    "flex.ai.enable": true,
    "flex.ai.model": "qwen"
}
```

### OpenAI

To use OpenAI's models, you need to provide your API key:

1. Obtain an API key from [OpenAI](https://platform.openai.com/)
2. Add the API key to your VS Code settings:

```json
{
    "flex.ai.enable": true,
    "flex.ai.model": "openai",
    "flex.ai.apiKey": "sk-your-api-key-here"
}
```

### LMStudio

To use LMStudio:

1. Install [LMStudio](https://lmstudio.ai/)
2. Open LMStudio and start the local API server (typically on port 1234)
3. Configure the VS Code settings:

```json
{
    "flex.ai.enable": true,
    "flex.ai.model": "lmstudio",
    "flex.ai.lmstudioUrl": "http://localhost:1234/v1"
}
```

## AI Features

### Running Flex with AI

To run a Flex file with AI assistance:

1. Open a Flex file in VS Code
2. Press `Shift+F5` or use the command palette to select "Flex: Run with AI"
3. The file will run with AI features enabled

### AI Explain

This feature provides explanations for selected Flex code:

1. Select a portion of Flex code in your editor
2. Right-click and select "Flex: Explain Code" or use the command palette
3. A webview panel will open with an explanation of the selected code

### AI Generate

This feature generates Flex code based on natural language descriptions:

1. Use the command palette to select "Flex: Generate Code"
2. Enter a description of the code you want to generate
3. The AI will generate Flex code based on your description
4. You can insert the generated code directly into your editor

### AI Translate

This feature translates code from other languages to Flex:

1. Select code written in another language (JavaScript, Python, etc.)
2. Right-click and select "Flex: Translate to Flex" or use the command palette
3. Select the source language
4. The AI will translate the code to equivalent Flex code
5. You can replace the selected code with the translated version

## Environment Variables

When AI is enabled, the following environment variables are set automatically:

- `USE_AI=true` (when `flex.ai.enable` is true)
- `FLEX_AI_MODEL=<selected-model>` (based on your configuration)
- `OPENAI_API_KEY=<your-key>` (only when using OpenAI)

## Troubleshooting AI Features

### AI Not Working

If AI features aren't working:

1. Verify `flex.ai.enable` is set to `true`
2. Check that the selected model is properly configured
3. Look for error messages in the terminal output

### OpenAI API Key Issues

If you see authentication errors with OpenAI:

1. Verify your API key is correct and hasn't expired
2. Check your OpenAI account for usage limits or billing issues
3. Try regenerating your API key

### LMStudio Connection Issues

If the extension can't connect to LMStudio:

1. Make sure LMStudio is running and the API server is enabled
2. Verify the URL in `flex.ai.lmstudioUrl` matches your LMStudio configuration
3. Check for firewall or network issues that might block the connection

### Slow AI Response

If AI features are slow:

1. For OpenAI: Network speed can affect response times
2. For LMStudio: Your computer's resources will affect performance
3. For Qwen: No additional configuration options are available

## Advanced AI Configuration

### Customizing AI Output

When using AI features like "Explain Code" or "Generate Code", you can adjust the display in settings:

```json
{
    "flex.ai.explanationStyle": "detailed", // or "concise"
    "flex.ai.codeStyle": "commented" // or "minimal"
}
```

### Debugging AI Integration

To troubleshoot AI integration issues, enable debug logging:

```json
{
    "flex.debug.enable": true,
    "flex.debug.verboseLogging": true
}
```

This will show detailed logs in the Output panel, including API calls and responses.

## Best Practices

1. **Start Small**: When using AI generation, start with small, focused requests
2. **Verify Output**: Always review AI-generated code before using it
3. **Use Context**: For code explanation, select complete functions or blocks for better results
4. **Combine Features**: Use AI explanation to understand complex code, then generate improvements

## Performance Considerations

- AI features will consume additional resources
- OpenAI integration requires internet connectivity
- LMStudio requires significant system resources
- Consider disabling AI when not needed for better performance 