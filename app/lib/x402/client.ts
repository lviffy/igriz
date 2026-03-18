import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

let cachedKey: string | null = null;
let cachedFetch: typeof fetch | null = null;

function normalizePrivateKey(key: string): `0x${string}` | null {
  const trimmed = key.trim();

  if (!trimmed) {
    return null;
  }

  const prefixed = (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`;

  if (!/^0x[a-fA-F0-9]{64}$/.test(prefixed)) {
    return null;
  }

  return prefixed;
}

export function getX402PaymentFetch(privateKey?: string | null): typeof fetch | null {
  if (!privateKey) {
    cachedKey = null;
    cachedFetch = null;
    return null;
  }

  const normalizedKey = normalizePrivateKey(privateKey);

  if (!normalizedKey) {
    return null;
  }

  if (cachedFetch && cachedKey === normalizedKey) {
    return cachedFetch;
  }

  const signer = privateKeyToAccount(normalizedKey);
  const client = new x402Client().register('eip155:*', new ExactEvmScheme(signer));

  cachedKey = normalizedKey;
  cachedFetch = wrapFetchWithPayment(fetch, client);

  return cachedFetch;
}
