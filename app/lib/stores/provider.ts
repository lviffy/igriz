import { atom } from 'nanostores';

export type LLMProvider = 'groq' | 'openrouter' | 'google';

export interface ProviderModelConfig {
  id: LLMProvider;
  label: string;
  defaultModel: string;
  models: { id: string; label: string }[];
}

/**
 * Provider/model list kept in sync with the server-side PROVIDER_LIST.
 * This is a client-safe copy (no SDK imports).
 */
export const PROVIDER_LIST: ProviderModelConfig[] = [
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

function getInitialProvider(): LLMProvider {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('selectedProvider') as LLMProvider) || 'groq';
  }

  return 'groq';
}

function getInitialModel(): string {
  if (typeof window !== 'undefined') {
    const storedProvider = (localStorage.getItem('selectedProvider') as LLMProvider) || 'groq';
    const storedModel = localStorage.getItem('selectedModel');
    const config = PROVIDER_LIST.find((p) => p.id === storedProvider) || PROVIDER_LIST[0];

    // If the stored model is valid for the current provider, use it; otherwise reset to default
    if (storedModel && config.models.some((m) => m.id === storedModel)) {
      return storedModel;
    }

    return config.defaultModel;
  }

  return PROVIDER_LIST[0].defaultModel;
}

export const selectedProviderStore = atom<LLMProvider>(getInitialProvider());
export const selectedModelStore = atom<string>(getInitialModel());

selectedProviderStore.subscribe((provider) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedProvider', provider);
  }
});

selectedModelStore.subscribe((model) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedModel', model);
  }
});

export function setProvider(provider: LLMProvider) {
  const config = PROVIDER_LIST.find((p) => p.id === provider);

  selectedProviderStore.set(provider);

  if (config) {
    selectedModelStore.set(config.defaultModel);
  }
}

export function setModel(model: string) {
  selectedModelStore.set(model);
}
