import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { getAllAPIKeys } from '~/lib/.server/llm/api-key';

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const apiKeys = getAllAPIKeys(context.cloudflare.env);

    /*
     * Groq doesn't have a dedicated key-info endpoint, so we make a lightweight
     * models list request to verify each key is valid.
     */
    const results = await Promise.all(
      apiKeys.map(async (key, index) => {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
          });
          return { index: index + 1, valid: response.ok, status: response.status };
        } catch {
          return { index: index + 1, valid: false, status: 0 };
        }
      }),
    );

    const validCount = results.filter((r) => r.valid).length;

    if (validCount === 0) {
      return json(
        {
          valid: false,
          error: `None of the ${apiKeys.length} GROQ API key(s) are valid`,
          keys: results,
        },
        { status: 401 },
      );
    }

    return json({
      valid: true,
      label: `Groq API Keys (${validCount}/${apiKeys.length} valid)`,
      totalKeys: apiKeys.length,
      validKeys: validCount,
      keys: results,
      isFreeTier: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ valid: false, error: message }, { status: 500 });
  }
}
