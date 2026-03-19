import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getApiKeysFromCookie } from '~/lib/api/cookies';

export const loader: LoaderFunction = async ({ context, request }) => {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');

    if (!provider) {
      return json({ isSet: false });
    }

    const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
    const providerInstance = llmManager.getProvider(provider);

    if (!providerInstance || !providerInstance.config.apiTokenKey) {
      return json({ isSet: false });
    }

    const envVarName = providerInstance.config.apiTokenKey;

    // Get API keys from cookie
    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = getApiKeysFromCookie(cookieHeader);

    const isSet = !!(
      apiKeys?.[provider] ||
      (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
      process.env[envVarName] ||
      llmManager.env[envVarName]
    );

    return json({ isSet });
  } catch (error: any) {
    return json({ error: error.message, stack: error.stack }, { status: 500 });
  }
};
