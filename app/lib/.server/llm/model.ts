import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type LLMProvider = 'groq' | 'openrouter' | 'google';

export interface ProviderConfig {
  id: LLMProvider;
  label: string;
  defaultModel: string;
  models: { id: string; label: string }[];
}

export const PROVIDER_LIST: ProviderConfig[] = [
  {
    id: 'groq',
    label: 'Groq',
    defaultModel: 'moonshotai/kimi-k2-instruct-0905',
    models: [
      { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2 Instruct' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultModel: 'google/gemini-2.5-flash',
    models: [
      { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
      { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
];

export function getProviderConfig(providerId: LLMProvider): ProviderConfig {
  return PROVIDER_LIST.find((p) => p.id === providerId) || PROVIDER_LIST[0];
}

export function getModel(apiKey: string, provider: LLMProvider = 'groq', model?: string) {
  const config = getProviderConfig(provider);
  const modelId = model || config.defaultModel;

  switch (provider) {
    case 'groq': {
      const groq = createGroq({ apiKey });
      return groq(modelId);
    }
    case 'openrouter': {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    default: {
      const groq = createGroq({ apiKey });
      return groq(modelId);
    }
  }
}
