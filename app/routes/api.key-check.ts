import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { getAPIKey } from '~/lib/.server/llm/api-key';

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const apiKey = getAPIKey(context.cloudflare.env);

    /*
     * Groq doesn't have a dedicated key-info endpoint, so we make a lightweight
     * models list request to verify the key is valid.
     */
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return json(
        {
          valid: false,
          error: `Groq returned ${response.status}: ${text}`,
        },
        { status: response.status },
      );
    }

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
    return json({ valid: false, error: message }, { status: 500 });
  }
}
