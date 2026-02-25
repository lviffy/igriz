import { env } from 'node:process';
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey, getAllAPIKeys, rotateAPIKey, isRateLimitError } from '~/lib/.server/llm/api-key';
import { getModel } from '~/lib/.server/llm/model';
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

function getQuaiPrivateKey(cloudflareEnv: Env): string | undefined {
  return env.PRIVATE_KEY_QUAI || cloudflareEnv.PRIVATE_KEY_QUAI;
}

/**
 * Attempts to stream text, automatically rotating to the next GROQ API key
 * when a rate-limit (429) error is encountered.
 */
export async function streamText(messages: Messages, cloudflareEnv: Env, options?: StreamingOptions) {
  const quaiPrivateKey = getQuaiPrivateKey(cloudflareEnv);
  const systemPrompt = getSystemPrompt() + '\n\n' + getBlockchainSystemPrompt(quaiPrivateKey);

  const totalKeys = getAllAPIKeys(cloudflareEnv).length;
  let attempts = 0;

  while (attempts < totalKeys) {
    try {
      const apiKey = getAPIKey(cloudflareEnv);
      console.log(`[GROQ] Using API key #${attempts + 1} of ${totalKeys}`);

      const result = await _streamText({
        model: getModel(apiKey),
        system: systemPrompt,
        maxTokens: MAX_TOKENS,
        messages: convertToCoreMessages(messages),
        ...options,
      });

      return result;
    } catch (error) {
      if (isRateLimitError(error) && attempts + 1 < totalKeys) {
        console.warn(`[GROQ] Rate limited on key #${attempts + 1}, rotating to next key…`);
        rotateAPIKey(cloudflareEnv);
        attempts++;
      } else {
        throw error;
      }
    }
  }

  // Should never reach here, but just in case
  throw new Error('All GROQ API keys have been rate-limited. Please try again later.');
}
