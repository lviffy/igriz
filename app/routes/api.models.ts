import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

interface ModelsResponse {
  modelList: ModelInfo[];
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo;
}

const CURATED_PROVIDER_MODEL_PATTERNS: Record<string, RegExp[]> = {
  Google: [
    /gemini-3\.1.*flash.*lite/i,
    /gemini-2\.5.*flash.*lite/i,
    /gemini-2\.5.*flash/i,
    /gemini-2\.5.*pro/i,
    /gemini-2\.0.*flash/i,
    /gemini-1\.5.*flash/i,
  ],
  OpenAI: [/gpt-4\.1/i, /gpt-4o/i, /gpt-4o-mini/i, /^o4-mini/i, /^o3/i, /^o1/i],
  Anthropic: [/claude.*sonnet-4/i, /claude.*opus-4/i, /claude-3-5-sonnet/i, /claude.*haiku/i],
  Groq: [/llama-3\.3-70b/i, /llama-3\.1-8b/i, /mixtral/i, /qwen/i],
  OpenRouter: [/claude/i, /gpt-4\.1|gpt-4o/i, /gemini-2\.5/i, /deepseek/i, /llama-3\.3/i],
  HuggingFace: [/qwen/i, /llama/i, /mistral/i],
  LMStudio: [/qwen/i, /llama/i, /deepseek/i, /mistral/i],
  Nvidia: [/llama/i, /nemotron/i, /qwen/i],
};

const CURATED_MAX_PER_PROVIDER = 8;

function curateModelsForProvider(providerName: string, models: ModelInfo[]): ModelInfo[] {
  if (models.length <= CURATED_MAX_PER_PROVIDER) {
    return models;
  }

  const patterns = CURATED_PROVIDER_MODEL_PATTERNS[providerName];

  if (!patterns || patterns.length === 0) {
    return models.slice(0, CURATED_MAX_PER_PROVIDER);
  }

  const selected: ModelInfo[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    for (const model of models) {
      if (seen.has(model.name)) {
        continue;
      }

      if (pattern.test(model.name) || pattern.test(model.label)) {
        selected.push(model);
        seen.add(model.name);

        if (selected.length >= CURATED_MAX_PER_PROVIDER) {
          return selected;
        }
      }
    }
  }

  if (selected.length === 0) {
    return models.slice(0, CURATED_MAX_PER_PROVIDER);
  }

  return selected;
}

function curateModelList(modelList: ModelInfo[]): ModelInfo[] {
  const grouped = new Map<string, ModelInfo[]>();

  for (const model of modelList) {
    if (!grouped.has(model.provider)) {
      grouped.set(model.provider, []);
    }

    grouped.get(model.provider)?.push(model);
  }

  const curated: ModelInfo[] = [];

  for (const [providerName, providerModels] of grouped.entries()) {
    curated.push(...curateModelsForProvider(providerName, providerModels));
  }

  return curated;
}

let cachedProviders: ProviderInfo[] | null = null;
let cachedDefaultProvider: ProviderInfo | null = null;

function getProviderInfo(llmManager: LLMManager) {
  if (!cachedProviders) {
    cachedProviders = llmManager.getAllProviders().map((provider) => ({
      name: provider.name,
      staticModels: provider.staticModels,
      getApiKeyLink: provider.getApiKeyLink,
      labelForGetApiKey: provider.labelForGetApiKey,
      icon: provider.icon,
    }));
  }

  if (!cachedDefaultProvider) {
    const defaultProvider = llmManager.getDefaultProvider();
    cachedDefaultProvider = {
      name: defaultProvider.name,
      staticModels: defaultProvider.staticModels,
      getApiKeyLink: defaultProvider.getApiKeyLink,
      labelForGetApiKey: defaultProvider.labelForGetApiKey,
      icon: defaultProvider.icon,
    };
  }

  return { providers: cachedProviders, defaultProvider: cachedDefaultProvider };
}

export async function loader({
  request,
  params,
  context,
}: {
  request: Request;
  params: { provider?: string };
  context: {
    cloudflare?: {
      env: Record<string, string>;
    };
  };
}): Promise<Response> {
  const llmManager = LLMManager.getInstance(context.cloudflare?.env);

  // Get client side maintained API keys and provider settings from cookies
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const { providers, defaultProvider } = getProviderInfo(llmManager);

  let modelList: ModelInfo[] = [];

  if (params.provider) {
    // Only update models for the specific provider
    const provider = llmManager.getProvider(params.provider);

    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: context.cloudflare?.env,
      });
    }
  } else {
    // Update all models
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv: context.cloudflare?.env,
    });
  }

  modelList = curateModelList(modelList);

  return json<ModelsResponse>({
    modelList,
    providers,
    defaultProvider,
  });
}
