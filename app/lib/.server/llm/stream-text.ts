import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey, getAPIKeys } from '~/lib/.server/llm/api-key';
import { getModel, type LLMProvider } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt, getBlockchainSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
  state: 'result';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

/**
 * Stream text using the given (or default) API key for the provider.
 */
export function streamText(
  messages: Messages,
  cloudflareEnv: Env,
  options?: StreamingOptions,
  provider: LLMProvider = 'groq',
  model?: string,
  apiKey?: string,
) {
  const systemPrompt = getSystemPrompt() + '\n\n' + getBlockchainSystemPrompt();
  const key = apiKey || getAPIKey(cloudflareEnv, provider);

  return _streamText({
    model: getModel(key, provider, model),
    system: systemPrompt,
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    ...options,
  });
}

/**
 * Returns true if the error is retryable (rate limit, auth, quota issues)
 * and a different API key might succeed.
 */
export function isRetryableWithDifferentKey(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const msg = error.message?.toLowerCase() || '';

  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many requests') ||
    msg.includes('quota') ||
    msg.includes('insufficient') ||
    msg.includes('credit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded')
  );
}

/**
 * Stream text with automatic fallback across all available API keys for the provider.
 * Tries each key in order. If a retryable error occurs (rate limit, quota, etc.),
 * it falls back to the next key. Non-retryable errors are thrown immediately.
 */
export async function streamTextWithFallback(
  messages: Messages,
  cloudflareEnv: Env,
  options?: StreamingOptions,
  provider: LLMProvider = 'groq',
  model?: string,
) {
  const keys = getAPIKeys(cloudflareEnv, provider);
  let lastError: unknown;

  for (let i = 0; i < keys.length; i++) {
    try {
      console.log(`[LLM] Attempting ${provider} with API key #${i + 1}`);

      const result = await streamText(messages, cloudflareEnv, options, provider, model, keys[i]);

      return result;
    } catch (error) {
      lastError = error;

      console.error(`[LLM] API key #${i + 1} for ${provider} failed:`, error instanceof Error ? error.message : error);

      // Only retry with next key if the error is retryable (rate limit, quota, etc.)
      if (isRetryableWithDifferentKey(error) && i < keys.length - 1) {
        console.log(`[LLM] Falling back to API key #${i + 2} for ${provider}...`);
        continue;
      }

      // Non-retryable error or last key — throw immediately
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}
