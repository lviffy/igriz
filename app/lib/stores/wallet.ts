import { atom } from 'nanostores';

export interface WalletState {
  connected: boolean;
  address: string | null;
  shortAddress: string | null;
}

export const walletStore = atom<WalletState>({
  connected: false,
  address: null,
  shortAddress: null,
});

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function connectWallet(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const pelagus = (window as any).pelagus;

  if (!pelagus) {
    throw new Error('Pelagus wallet not found. Please install the Pelagus browser extension from https://pelaguswallet.io');
  }

  const accounts = await pelagus.request({ method: 'quai_requestAccounts' });

  if (accounts && accounts.length > 0) {
    const address = accounts[0];

    walletStore.set({
      connected: true,
      address,
      shortAddress: shortenAddress(address),
    });
  }
}

export async function disconnectWallet(): Promise<void> {
  walletStore.set({
    connected: false,
    address: null,
    shortAddress: null,
  });
}

/**
 * Initialize wallet event listeners for account changes.
 * Call this once on app startup (client-side only).
 */
export function initWalletListeners(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const pelagus = (window as any).pelagus;

  if (pelagus && typeof pelagus.on === 'function') {
    pelagus.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        walletStore.set({
          connected: true,
          address: accounts[0],
          shortAddress: shortenAddress(accounts[0]),
        });
      }
    });
  }
}
