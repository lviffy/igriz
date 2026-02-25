import { env } from 'node:process';
import { AI_PROVIDERS, DEFAULT_PROVIDER, LMSTUDIO_BASE_URL, type AIProvider } from './provider';

export function getAPIKey(cloudflareEnv: Env) {
  /**
   * The `cloudflareEnv` is only used when deployed or when previewing locally.
   * In development the environment variables are available through `env`.
   */
  const apiKey = env.OPEN_ROUTER_API_KEY || cloudflareEnv.OPEN_ROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPEN_ROUTER_API_KEY is not set. Please set it in your .env.local file.');
  }

  return apiKey;
}

export function getProviderFromEnv(cloudflareEnv: Env): AIProvider {
  const provider = env.AI_PROVIDER || cloudflareEnv.AI_PROVIDER || DEFAULT_PROVIDER;
  
  if (provider !== AI_PROVIDERS.OPENROUTER && provider !== AI_PROVIDERS.LMSTUDIO) {
    console.warn(`Unknown AI provider "${provider}", falling back to ${DEFAULT_PROVIDER}`);
    return DEFAULT_PROVIDER;
  }
  
  return provider as AIProvider;
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
}

export function getProviderConfig(cloudflareEnv: Env): ProviderConfig {
  const provider = getProviderFromEnv(cloudflareEnv);
  
  if (provider === AI_PROVIDERS.OPENROUTER) {
    return {
      provider: AI_PROVIDERS.OPENROUTER,
      apiKey: getAPIKey(cloudflareEnv),
    };
  }
  
  if (provider === AI_PROVIDERS.LMSTUDIO) {
    const baseUrl = env.LMSTUDIO_BASE_URL || cloudflareEnv.LMSTUDIO_BASE_URL || LMSTUDIO_BASE_URL;
    const modelId = env.LMSTUDIO_MODEL_ID || cloudflareEnv.LMSTUDIO_MODEL_ID;
    
    return {
      provider: AI_PROVIDERS.LMSTUDIO,
      baseUrl,
      modelId,
    };
  }
  
  throw new Error(`Unsupported AI provider: ${provider}`);
}
