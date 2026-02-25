import { env } from 'node:process';

/**
 * Collects all available GROQ API keys from environment variables.
 * Supports GROQ_API_KEY1, GROQ_API_KEY2, GROQ_API_KEY3 and the legacy GROQ_API_KEY.
 */
export function getAllAPIKeys(cloudflareEnv: Env): string[] {
  const keys: string[] = [];

  // Collect numbered keys first (preferred)
  for (let i = 1; i <= 10; i++) {
    const key = (env as Record<string, string | undefined>)[`GROQ_API_KEY${i}`] ||
      (cloudflareEnv as Record<string, string | undefined>)[`GROQ_API_KEY${i}`];

    if (key && key.trim()) {
      keys.push(key.trim());
    }
  }

  // Fall back to legacy single key if no numbered keys found
  if (keys.length === 0) {
    const legacy = env.GROQ_API_KEY || (cloudflareEnv as Record<string, string | undefined>).GROQ_API_KEY;

    if (legacy && legacy.trim()) {
      keys.push(legacy.trim());
    }
  }

  if (keys.length === 0) {
    throw new Error('No GROQ API keys set. Add GROQ_API_KEY1, GROQ_API_KEY2, etc. in your .env.local file.');
  }

  return keys;
}

/** Index of the currently active key (rotates on rate limit). */
let _currentKeyIndex = 0;

/**
 * Returns the current active API key.
 */
export function getAPIKey(cloudflareEnv: Env): string {
  const keys = getAllAPIKeys(cloudflareEnv);
  _currentKeyIndex = _currentKeyIndex % keys.length;

  return keys[_currentKeyIndex];
}

/**
 * Rotate to the next API key after a rate-limit hit.
 * Returns `true` if there is another key to try, `false` if all keys have been exhausted in this rotation.
 */
export function rotateAPIKey(cloudflareEnv: Env): boolean {
  const keys = getAllAPIKeys(cloudflareEnv);

  if (keys.length <= 1) {
    return false;
  }

  _currentKeyIndex = (_currentKeyIndex + 1) % keys.length;
  console.log(`[GROQ] Rotated to API key #${_currentKeyIndex + 1} of ${keys.length}`);

  return true;
}

/**
 * Check whether an error is a rate-limit (HTTP 429) error.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const msg = error.message || '';

  if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate_limit')) {
    return true;
  }

  // Check nested cause
  if ('cause' in error && error.cause instanceof Error) {
    const causeMsg = error.cause.message || '';
    return causeMsg.includes('429') || causeMsg.toLowerCase().includes('rate limit');
  }

  return false;
}
