import { atom } from 'nanostores';

export interface WalletState {
  privateKey: string | null;
  hasKey: boolean;
}

export const walletStore = atom<WalletState>({
  privateKey: null,
  hasKey: false,
});

/**
 * Set the user's private key. Stored in memory only — never persisted to disk.
 * Cleared on page refresh.
 */
export function setPrivateKey(key: string): void {
  const trimmed = key.trim();

  if (!trimmed) {
    clearPrivateKey();
    return;
  }

  walletStore.set({
    privateKey: trimmed,
    hasKey: true,
  });
}

export function clearPrivateKey(): void {
  walletStore.set({
    privateKey: null,
    hasKey: false,
  });
}

export function getPrivateKey(): string | null {
  return walletStore.get().privateKey;
}
