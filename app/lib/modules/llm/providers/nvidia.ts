import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class NvidiaProvider extends BaseProvider {
  name = 'Nvidia';
  getApiKeyLink = 'https://build.nvidia.com/';

  config = {
    apiTokenKey: 'NVIDIA_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'deepseek-ai/deepseek-v3.2',
      label: 'DeepSeek V3.2',
      provider: 'Nvidia',
      maxTokenAllowed: 8192,
      maxCompletionTokens: 8192,
    },
    {
      name: 'moonshotai/kimi-k2-instruct',
      label: 'Kimi K2 Instruct',
      provider: 'Nvidia',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'mistralai/devstral-2-123b-instruct-2512',
      label: 'Devstral 2 123B Instruct',
      provider: 'Nvidia',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'qwen/qwen2.5-coder-32b-instruct',
      label: 'Qwen 2.5 Coder 32B Instruct',
      provider: 'Nvidia',
      maxTokenAllowed: 32768,
      maxCompletionTokens: 1024,
    },
    {
      name: 'deepseek-ai/deepseek-r1-distill-qwen-32b',
      label: 'DeepSeek R1 Distill Qwen 32B',
      provider: 'Nvidia',
      maxTokenAllowed: 32768,
      maxCompletionTokens: 4096,
    },
    {
      name: 'meta/llama-3.1-70b-instruct',
      label: 'Llama 3.1 70B Instruct',
      provider: 'Nvidia',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'NVIDIA_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://integrate.api.nvidia.com/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;

    if (!res || !res.data) {
      return [];
    }

    return res.data.map((m: any) => ({
      name: m.id,
      label: `${m.id} [by ${m.owned_by || 'Nvidia'}]`,
      provider: this.name,
      maxTokenAllowed: 8192,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'NVIDIA_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey,
    });

    return openai(model);
  }
}
