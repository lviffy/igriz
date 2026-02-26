import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('API:KeyCheck');

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const apiKey = getAPIKey(context.cloudflare.env);

    logger.debug('[KEY-CHECK] Checking API key validity...');

    /*
     * Groq doesn't have a dedicated key-info endpoint, so we make a lightweight
     * models list request to verify the key is valid.
     */
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const text = await response.text();
      logger.warn(`[KEY-CHECK] API validation failed`);
      return json(
        {
          valid: false,
          error: `Groq returned ${response.status}: ${text}`,
        },
        { status: response.status },
      );
    }

    logger.debug('[KEY-CHECK] API key valid');
    return json({
      valid: true,
      label: 'Groq API Key',
      limit: null,
      limitRemaining: null,
      usage: 0,
      isFreeTier: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[KEY-CHECK] Validation error:', message);
    return json({ valid: false, error: message }, { status: 500 });
  }
}
