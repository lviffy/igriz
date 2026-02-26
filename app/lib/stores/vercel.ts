import { atom, map } from 'nanostores';

export interface VercelUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export type DeployStatus = 'idle' | 'deploying' | 'success' | 'error';

export interface DeployState {
  status: DeployStatus;
  url?: string;
  error?: string;
}

const VERCEL_TOKEN_KEY = 'igriz_vercel_token';
const VERCEL_USER_KEY = 'igriz_vercel_user';

function loadToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(VERCEL_TOKEN_KEY);
}

function loadUser(): VercelUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(VERCEL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const vercelTokenStore = atom<string | null>(loadToken());
export const vercelUserStore = atom<VercelUser | null>(loadUser());
export const vercelDeployStore = map<DeployState>({ status: 'idle' });

export function setVercelToken(token: string) {
  localStorage.setItem(VERCEL_TOKEN_KEY, token);
  vercelTokenStore.set(token);
}

export function setVercelUser(user: VercelUser) {
  localStorage.setItem(VERCEL_USER_KEY, JSON.stringify(user));
  vercelUserStore.set(user);
}

export function disconnectVercel() {
  localStorage.removeItem(VERCEL_TOKEN_KEY);
  localStorage.removeItem(VERCEL_USER_KEY);
  vercelTokenStore.set(null);
  vercelUserStore.set(null);
  vercelDeployStore.set({ status: 'idle' });
}

export function isVercelConnected(): boolean {
  return vercelTokenStore.get() !== null;
}
