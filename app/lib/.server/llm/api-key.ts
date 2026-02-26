import { env } from 'node:process';
import type { LLMProvider } from './model';

export function getAPIKey(cloudflareEnv: Env, provider: LLMProvider = 'groq'): string {
  switch (provider) {
    case 'groq': {
      const apiKey = env.GROQ_API_KEY || cloudflareEnv.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Please set it in your .env.local file.');
      }

      return apiKey;
    }
    case 'openrouter': {
      const apiKey = env.OPENROUTER_API_KEY || cloudflareEnv.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set. Please set it in your .env.local file.');
      }

      return apiKey;
    }
    case 'google': {
      const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || cloudflareEnv.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set. Please set it in your .env.local file.');
      }

      return apiKey;
    }
    default: {
      const apiKey = env.GROQ_API_KEY || cloudflareEnv.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Please set it in your .env.local file.');
      }

      return apiKey;
    }
  }
}
