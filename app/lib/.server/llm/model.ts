import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export function getModel(apiKey: string, model?: string) {
  const openRouter = createOpenRouter({
    apiKey,
  });

  return openRouter(model || DEFAULT_MODEL);
}

// eslint-disable-next-line @blitz/comment-syntax
/*
 * Default model - change this to any OpenRouter-supported model
 * Popular options:
 *   google/gemini-2.0-flash-001          (very cheap, fast)
 *   google/gemini-2.5-flash              (powerful, affordable)
 *   deepseek/deepseek-chat             (very cheap, capable)
 *   meta-llama/llama-3.1-70b-instruct  (open-source, solid)
 *   mistralai/mistral-large-latest     (balanced)
 *   x-ai/grok-2-1212                   (Grok)
 *   anthropic/claude-3.5-sonnet        (if you still want Claude)
 * Full list: https://openrouter.ai/models
 */
