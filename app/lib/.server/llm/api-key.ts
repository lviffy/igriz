import { env } from 'node:process';

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
