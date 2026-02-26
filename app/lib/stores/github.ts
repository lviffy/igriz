import { atom, map } from 'nanostores';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export interface ExportState {
  status: ExportStatus;
  repoUrl?: string;
  error?: string;
}

const GITHUB_TOKEN_KEY = 'igriz_github_token';
const GITHUB_USER_KEY = 'igriz_github_user';

function loadToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(GITHUB_TOKEN_KEY);
}

function loadUser(): GitHubUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(GITHUB_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const githubTokenStore = atom<string | null>(loadToken());
export const githubUserStore = atom<GitHubUser | null>(loadUser());
export const githubExportStore = map<ExportState>({ status: 'idle' });

export function setGitHubToken(token: string) {
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
  githubTokenStore.set(token);
}

export function setGitHubUser(user: GitHubUser) {
  localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
  githubUserStore.set(user);
}

export function disconnectGitHub() {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  localStorage.removeItem(GITHUB_USER_KEY);
  githubTokenStore.set(null);
  githubUserStore.set(null);
  githubExportStore.set({ status: 'idle' });
}
