const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_LENGTH = 16;

export async function encrypt(key: string, data: string) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cryptoKey = await getKey(key);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv,
    },
    cryptoKey,
    encoder.encode(data),
  );

  const bundle = new Uint8Array(IV_LENGTH + ciphertext.byteLength);

  bundle.set(new Uint8Array(ciphertext));
  bundle.set(iv, ciphertext.byteLength);

  return decodeBase64(bundle);
}

export async function decrypt(key: string, payload: string) {
  const bundle = encodeBase64(payload);

  const iv = new Uint8Array(bundle.buffer, bundle.byteLength - IV_LENGTH);
  const ciphertext = new Uint8Array(bundle.buffer, 0, bundle.byteLength - IV_LENGTH);

  const cryptoKey = await getKey(key);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv,
    },
    cryptoKey,
    ciphertext,
  );

  return decoder.decode(plaintext);
}

async function getKey(key: string) {
  return await crypto.subtle.importKey('raw', encodeBase64(key), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

function decodeBase64(encoded: Uint8Array) {
  const byteChars = Array.from(encoded, (byte) => String.fromCodePoint(byte));

  return btoa(byteChars.join(''));
}

function encodeBase64(data: string) {
  return Uint8Array.from(atob(data), (ch) => ch.codePointAt(0)!);
}

/**
 * Creates a hex-encoded SHA-256 hash of the given string.
 * Used by the Vercel deploy API to identify duplicate files.
 */
export async function createSHA256Hash(content: string): Promise<string> {
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
