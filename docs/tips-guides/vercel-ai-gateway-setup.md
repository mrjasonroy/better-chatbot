# Vercel AI Gateway Setup Guide

This guide explains how to configure your chatbot to use the Vercel AI Gateway.

## What is Vercel AI Gateway?

The Vercel AI Gateway is a unified API gateway that allows you to access multiple AI providers (OpenAI, Anthropic, Google, etc.) through a single endpoint with:

- **Unified billing** - One invoice for all providers
- **Built-in observability** - Track usage and costs across all providers
- **Simplified configuration** - One API key instead of multiple provider keys
- **Enhanced reliability** - Built-in failover and retry mechanisms

Learn more: [Vercel AI Gateway Documentation](https://vercel.com/docs/ai-gateway)

## Configuration Options

The models configuration supports two modes:

### Option 1: Vercel AI Gateway (Recommended)

When you set the gateway environment variables, all AI providers will route through the gateway:

```bash
# .env or .env.local
VERCEL_AI_GATEWAY_URL=https://gateway.ai.vercel.com
VERCEL_AI_GATEWAY_API_KEY=your_gateway_api_key_here
```

With this setup, you'll have access to:

- **Anthropic models**: claude-sonnet-4.5, claude-3.5-sonnet, claude-3.5-haiku, claude-opus-4.1
- **OpenAI models**: gpt-5, gpt-5-mini, gpt-4o, gpt-4o-mini, o1, o1-mini, o3, o4-mini
- **Google models**: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro
- **DeepSeek models**: deepseek-chat (with vision), deepseek-reasoner (with reasoning capabilities)
- **Meta Llama models**: llama-4-maverick (1.3M context!), llama-3.3-70b

### Option 2: Direct Provider Access

If you prefer to use providers directly without the gateway, you can configure individual API keys:

```bash
# .env or .env.local
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
DEEPSEEK_API_KEY=your_deepseek_key
META_API_KEY=your_meta_key
```

## How It Works

The system automatically detects if `VERCEL_AI_GATEWAY_URL` is set:

1. **Gateway Mode**: When `VERCEL_AI_GATEWAY_URL` is configured:

   - All provider instances are configured with the gateway URL and API key
   - Provider URLs are constructed as `{GATEWAY_URL}/{provider}` (e.g., `https://gateway.ai.vercel.com/openai`)
   - Only one API key is needed (`VERCEL_AI_GATEWAY_API_KEY`)

2. **Direct Mode**: When gateway URL is not set:
   - Each provider uses its own API key and base URL
   - Individual provider keys are required (OPENAI_API_KEY, etc.)

## Getting Started

### Step 1: Get Your Gateway Credentials

1. Visit [Vercel AI Gateway](https://vercel.com/ai-gateway)
2. Sign up or log in to your Vercel account
3. Create a new gateway or use an existing one
4. Copy your Gateway URL and API Key

### Step 2: Add to Environment Variables

Add the following to your `.env.local` file:

```bash
VERCEL_AI_GATEWAY_URL=https://gateway.ai.vercel.com
VERCEL_AI_GATEWAY_API_KEY=your_gateway_api_key_here
```

### Step 3: Restart Your Application

```bash
pnpm dev
```

The application will automatically detect the gateway configuration and route all AI requests through it.

## Fallback Model

The system uses `gpt-5` from OpenAI as the fallback model for both gateway and direct modes.

## Image Input Support

The following models support image input:

- **Anthropic**: claude-sonnet-4.5, claude-3.5-sonnet, claude-opus-4.1
- **OpenAI**: gpt-5, gpt-5-mini, gpt-4o, gpt-4o-mini
- **Google**: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro
- **DeepSeek**: deepseek-chat (deepseek-reasoner does not support images)

## Troubleshooting

### API Key Not Detected

If the application doesn't detect your API key:

1. Make sure the key is in `.env.local` (not `.env`)
2. Restart your development server
3. Verify the key doesn't equal `"****"` (which is treated as a placeholder)

### Gateway Connection Issues

If you're experiencing connection issues:

1. Verify your gateway URL is correct
2. Check that your API key is valid
3. Ensure you have credits/billing set up in Vercel
4. Check the Vercel AI Gateway dashboard for error logs

### Provider Not Available

If a specific provider isn't working:

1. Verify the provider is enabled in your Vercel AI Gateway settings
2. Check that you have the necessary quotas for that provider
3. Review the gateway logs for specific error messages

## Environment Variable Reference

```bash
# Required for Gateway Mode
VERCEL_AI_GATEWAY_URL=          # Your Vercel AI Gateway URL
VERCEL_AI_GATEWAY_API_KEY=      # Your Gateway API key

# Required for Direct Mode (if not using gateway)
OPENAI_API_KEY=                 # OpenAI API key
ANTHROPIC_API_KEY=              # Anthropic API key
GOOGLE_GENERATIVE_AI_API_KEY=   # Google AI API key
DEEPSEEK_API_KEY=               # DeepSeek API key
META_API_KEY=                   # Meta Llama API key

# Optional: Custom Base URLs
OPENAI_BASE_URL=                # Default: https://api.openai.com/v1
ANTHROPIC_BASE_URL=             # Default: https://api.anthropic.com/v1
DEEPSEEK_BASE_URL=              # Default: https://api.deepseek.com/v1
META_BASE_URL=                  # Default: https://api.meta.ai/v1
```

## Migration Guide

### From Direct Providers to Gateway

1. Keep your existing provider keys for now (as backup)
2. Add gateway configuration:
   ```bash
   VERCEL_AI_GATEWAY_URL=https://gateway.ai.vercel.com
   VERCEL_AI_GATEWAY_API_KEY=your_key
   ```
3. Test the gateway integration
4. Once confirmed working, you can remove individual provider keys

### From Gateway to Direct Providers

1. Comment out or remove gateway variables:
   ```bash
   # VERCEL_AI_GATEWAY_URL=https://gateway.ai.vercel.com
   # VERCEL_AI_GATEWAY_API_KEY=your_key
   ```
2. Add individual provider keys:
   ```bash
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
   DEEPSEEK_API_KEY=your_deepseek_key
   META_API_KEY=your_meta_key
   ```
3. Restart the application

## Benefits of Using the Gateway

1. **Cost Tracking**: Monitor spending across all providers in one place
2. **Rate Limiting**: Built-in rate limiting and quota management
3. **Simplified Auth**: One API key for all providers
4. **Better Analytics**: Unified logging and metrics
5. **Reliability**: Automatic retries and failover
6. **Compliance**: Centralized data governance

## Next Steps

- [Configure Custom Models](./adding-openAI-like-providers.md)
- [System Prompts and Customization](./system-prompts-and-customization.md)
- [MCP Server Setup](./mcp-server-setup-and-tool-testing.md)
