import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { AI_PROVIDERS, DEFAULT_MODELS } from './provider';
import type { ProviderConfig } from './api-key';
import { createLMStudioProvider } from './lmstudio-provider';

export function getModel(providerConfig: ProviderConfig, model?: string) {
  const { provider, apiKey, baseUrl } = providerConfig;

  // OpenRouter provider (existing implementation)
  if (provider === AI_PROVIDERS.OPENROUTER) {
    const openRouter = createOpenRouter({
      apiKey: apiKey!,
    });

    return openRouter(model || DEFAULT_MODELS[AI_PROVIDERS.OPENROUTER]);
  }

  // LM Studio provider (local LLM)
  if (provider === AI_PROVIDERS.LMSTUDIO) {
    const lmStudio = createLMStudioProvider(
      baseUrl || 'http://localhost:1234',
    );

    // Use custom model ID if provided, otherwise use default
    const modelToUse = providerConfig.modelId || model || DEFAULT_MODELS[AI_PROVIDERS.LMSTUDIO];
    return lmStudio(modelToUse);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// eslint-disable-next-line @blitz/comment-syntax
/*
 * Supported Providers:
 * 
 * 1. OpenRouter (default) - Cloud-based LLMs
 *    Popular models:
 *      google/gemini-2.0-flash-001          (very cheap, fast)
 *      google/gemini-2.5-flash              (powerful, affordable)
 *      deepseek/deepseek-chat               (very cheap, capable)
 *      meta-llama/llama-3.1-70b-instruct    (open-source, solid)
 *      mistralai/mistral-large-latest       (balanced)
 *      x-ai/grok-2-1212                     (Grok)
 *      anthropic/claude-3.5-sonnet          (if you still want Claude)
 *    Full list: https://openrouter.ai/models
 * 
 * 2. LM Studio - Local LLMs
 *    - Run models locally on your machine
 *    - No API costs, full privacy
 *    - Requires LM Studio running on ws://localhost:1234 (WebSocket)
 *    - Model name: whatever model you have loaded in LM Studio
 *    - Configure via AI_PROVIDER=lmstudio and LMSTUDIO_BASE_URL=ws://localhost:1234 in .env.local
 */
