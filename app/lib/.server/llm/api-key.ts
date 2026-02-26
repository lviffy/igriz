import { env } from 'node:process';
import type { LLMProvider } from './model';

/**
 * Returns the primary API key for the given provider.
 */
export function getAPIKey(cloudflareEnv: Env, provider: LLMProvider = 'groq'): string {
  const keys = getAPIKeys(cloudflareEnv, provider);

  if (keys.length === 0) {
    throw new Error(`No API key is set for ${provider}. Please set it in your .env.local file.`);
  }

  return keys[0];
}

/**
 * Returns all available API keys for the given provider (primary + fallback).
 * Used for retry/fallback logic when rate-limited or errors occur.
 */
export function getAPIKeys(cloudflareEnv: Env, provider: LLMProvider = 'groq'): string[] {
  const keys: string[] = [];

  switch (provider) {
    case 'groq': {
      const key1 = env.GROQ_API_KEY || cloudflareEnv.GROQ_API_KEY;
      const key2 = env.GROQ_API_KEY_2 || cloudflareEnv.GROQ_API_KEY_2;

      if (key1) keys.push(key1);
      if (key2) keys.push(key2);
      break;
    }
    case 'openrouter': {
      const key1 = env.OPENROUTER_API_KEY || cloudflareEnv.OPENROUTER_API_KEY;
      const key2 = env.OPENROUTER_API_KEY_2 || cloudflareEnv.OPENROUTER_API_KEY_2;

      if (key1) keys.push(key1);
      if (key2) keys.push(key2);
      break;
    }
    case 'google': {
      const key1 = env.GOOGLE_GENERATIVE_AI_API_KEY || cloudflareEnv.GOOGLE_GENERATIVE_AI_API_KEY;
      const key2 = env.GOOGLE_GENERATIVE_AI_API_KEY_2 || cloudflareEnv.GOOGLE_GENERATIVE_AI_API_KEY_2;

      if (key1) keys.push(key1);
      if (key2) keys.push(key2);
      break;
    }
    default: {
      const key1 = env.GROQ_API_KEY || cloudflareEnv.GROQ_API_KEY;
      const key2 = env.GROQ_API_KEY_2 || cloudflareEnv.GROQ_API_KEY_2;

      if (key1) keys.push(key1);
      if (key2) keys.push(key2);
      break;
    }
  }

  if (keys.length === 0) {
    throw new Error(`No API key is set for ${provider}. Please set it in your .env.local file.`);
  }

  return keys;
}
