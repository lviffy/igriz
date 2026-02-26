import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import {
  githubTokenStore,
  githubUserStore,
  githubExportStore,
  setGitHubToken,
  setGitHubUser,
  disconnectGitHub,
  type GitHubUser,
} from '~/lib/stores/github';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';

type DropdownView = 'main' | 'token-input' | 'export-form';

export function GitHubExportButton() {
  const token = useStore(githubTokenStore);
  const user = useStore(githubUserStore);
  const exportState = useStore(githubExportStore);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<DropdownView>('main');
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);

  const isConnected = token !== null;
  const isExporting = exportState.status === 'exporting';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);

        if (view === 'token-input') {
          setView('main');
          setTokenInput('');
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, view]);

  // Auto-focus inputs
  useEffect(() => {
    if (view === 'token-input' && tokenInputRef.current) {
      tokenInputRef.current.focus();
    }

    if (view === 'export-form' && repoInputRef.current) {
      repoInputRef.current.focus();
    }
  }, [view]);

  const handleConnectWithToken = useCallback(async () => {
    const trimmed = tokenInput.trim();

    if (!trimmed) {
      toast.error('Please enter a token');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/github-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });

      const data = (await response.json()) as
        | { valid: true; user: GitHubUser }
        | { error: string };

      if (!response.ok || 'error' in data) {
        const msg = 'error' in data ? data.error : 'Invalid token';
        toast.error(msg);
        return;
      }

      setGitHubToken(trimmed);
      setGitHubUser(data.user);
      setTokenInput('');
      setView('main');
      toast.success(`Connected as ${data.user.login}`);
    } catch {
      toast.error('Failed to validate token');
    } finally {
      setIsValidating(false);
    }
  }, [tokenInput]);

  const handleDisconnect = useCallback(() => {
    disconnectGitHub();
    setIsOpen(false);
    setView('main');
    toast.info('GitHub account disconnected');
  }, []);

  const handleExport = useCallback(async () => {
    if (!token) {
      return;
    }

    const name = repoName.trim();

    if (!name) {
      toast.error('Please enter a repository name');
      return;
    }

    setIsOpen(false);
    setView('main');
    githubExportStore.set({ status: 'exporting' });

    try {
      // Gather files from the workbench
      const filesMap = workbenchStore.files.get();
      const fileEntries: { file: string; data: string }[] = [];

      for (const [path, dirent] of Object.entries(filesMap)) {
        if (dirent?.type === 'file' && !dirent.isBinary) {
          const relativePath = path.startsWith(WORK_DIR)
            ? path.slice(WORK_DIR.length + 1)
            : path;

          // Skip node_modules, .git, lock files, env files
          if (
            relativePath.startsWith('node_modules/') ||
            relativePath.startsWith('.git/') ||
            relativePath === 'pnpm-lock.yaml' ||
            relativePath === 'package-lock.json' ||
            relativePath === 'yarn.lock' ||
            relativePath === 'bun.lock' ||
            relativePath === '.env' ||
            relativePath === '.env.local' ||
            relativePath.startsWith('.env.')
          ) {
            continue;
          }

          fileEntries.push({
            file: relativePath,
            data: dirent.content,
          });
        }
      }

      if (fileEntries.length === 0) {
        githubExportStore.set({ status: 'error', error: 'No files to export' });
        toast.error('No files found to export');
        return;
      }

      const response = await fetch('/api/github-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          files: fileEntries,
          repoName: name,
          isPrivate,
          description: repoDescription.trim() || undefined,
        }),
      });

      const result = (await response.json()) as
        | { success: true; repoUrl: string; fullName: string }
        | { error: string };

      if (!response.ok || 'error' in result) {
        const errorMsg = 'error' in result ? result.error : 'Export failed';
        githubExportStore.set({ status: 'error', error: errorMsg });
        toast.error(errorMsg);
        return;
      }

      githubExportStore.set({ status: 'success', repoUrl: result.repoUrl });
      setRepoName('');
      setRepoDescription('');
      toast.success(
        <span>
          Exported!{' '}
          <a
            href={result.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Open repo ↗
          </a>
        </span>,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      githubExportStore.set({ status: 'error', error: message });
      toast.error(message);
    }
  }, [token, repoName, isPrivate, repoDescription]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);

          if (!isOpen) {
            setView('main');
          }
        }}
        disabled={isExporting}
        className={classNames(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200',
          isExporting
            ? 'bg-[#222] border-[#333] text-[#666] cursor-wait'
            : isConnected
              ? 'bg-[#24292f] border-[#444] text-white hover:bg-[#2f363d] cursor-pointer'
              : 'bg-[#1a1a1a] border-[#333] text-[#aaa] hover:text-white hover:border-[#555] cursor-pointer',
        )}
      >
        {isExporting ? (
          <>
            <div className="i-svg-spinners:90-ring-with-bg text-sm" />
            <span>Exporting…</span>
          </>
        ) : (
          <>
            <GitHubLogo size={14} />
            <span>GitHub</span>
            <div className={classNames('i-ph:caret-down-bold text-[10px] transition-transform', isOpen ? 'rotate-180' : undefined)} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg z-50 overflow-hidden">
          {/* ── Not connected: main ── */}
          {!isConnected && view === 'main' && (
            <div className="p-3">
              <p className="text-[11px] text-[#888] mb-3">
                Connect your GitHub account to export projects as new repositories.
              </p>
              <button
                onClick={() => setView('token-input')}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-white bg-[#24292f] border border-[#444] rounded-md hover:bg-[#2f363d] transition-colors cursor-pointer"
              >
                <GitHubLogo size={16} />
                <span>Connect with Access Token</span>
              </button>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Igriz"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-[10px] text-[#666] hover:text-[#999] text-center transition-colors"
              >
                Generate a token at github.com/settings/tokens ↗
              </a>
            </div>
          )}

          {/* ── Token input ── */}
          {!isConnected && view === 'token-input' && (
            <div className="p-3">
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => setView('main')}
                  className="text-[#888] hover:text-[#eee] transition-colors cursor-pointer"
                >
                  <div className="i-ph:arrow-left text-sm" />
                </button>
                <span className="text-xs font-medium text-[#eee]">Enter Access Token</span>
              </div>
              <p className="text-[10px] text-[#888] mb-2">
                Create a{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Igriz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#bbb]"
                >
                  personal access token
                </a>{' '}
                with <strong>repo</strong> scope.
              </p>
              <input
                ref={tokenInputRef}
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isValidating) {
                    handleConnectWithToken();
                  }
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-2.5 py-1.5 text-xs bg-[#111] border border-[#333] rounded-md text-[#eee] placeholder:text-[#666] focus:outline-none focus:border-[#555] font-mono"
              />
              <button
                onClick={handleConnectWithToken}
                disabled={isValidating || !tokenInput.trim()}
                className={classNames(
                  'flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isValidating || !tokenInput.trim()
                    ? 'bg-[#222] text-[#666] cursor-not-allowed'
                    : 'bg-[#24292f] text-white border border-[#444] hover:bg-[#2f363d] cursor-pointer',
                )}
              >
                {isValidating ? (
                  <>
                    <div className="i-svg-spinners:90-ring-with-bg text-xs" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <span>Connect</span>
                )}
              </button>
            </div>
          )}

          {/* ── Connected: main ── */}
          {isConnected && view === 'main' && (
            <>
              {/* User info */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#333]">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#222] text-[#aaa] shrink-0">
                    <div className="i-ph:user text-sm" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#eee] truncate">
                    {user?.name || user?.login || 'GitHub User'}
                  </div>
                  <div className="text-[10px] text-[#888] truncate">
                    @{user?.login}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Connected
                </div>
              </div>

              {/* Export action */}
              <button
                onClick={() => setView('export-form')}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#eee] hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <div className="i-ph:export text-sm" />
                <span>Export to new repository</span>
              </button>

              {/* Last export link */}
              {exportState.status === 'success' && exportState.repoUrl && (
                <a
                  href={exportState.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-green-400 hover:bg-[#252525] transition-colors"
                >
                  <div className="i-ph:check-circle text-sm" />
                  <span className="truncate">View last export ↗</span>
                </a>
              )}

              {exportState.status === 'error' && exportState.error && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400">
                  <div className="i-ph:warning-circle text-sm shrink-0" />
                  <span className="truncate">{exportState.error}</span>
                </div>
              )}

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-[#252525] transition-colors border-t border-[#333] cursor-pointer"
              >
                <div className="i-ph:sign-out text-sm" />
                <span>Disconnect account</span>
              </button>
            </>
          )}

          {/* ── Export form ── */}
          {isConnected && view === 'export-form' && (
            <div className="p-3">
              <div className="flex items-center gap-1 mb-3">
                <button
                  onClick={() => setView('main')}
                  className="text-[#888] hover:text-[#eee] transition-colors cursor-pointer"
                >
                  <div className="i-ph:arrow-left text-sm" />
                </button>
                <span className="text-xs font-medium text-[#eee]">Create new repository</span>
              </div>

              {/* Repo name */}
              <label className="block mb-2">
                <span className="text-[10px] text-[#888] mb-1 block">
                  {user?.login}/
                </span>
                <input
                  ref={repoInputRef}
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '-'))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && repoName.trim()) {
                      handleExport();
                    }
                  }}
                  placeholder="my-awesome-project"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#111] border border-[#333] rounded-md text-[#eee] placeholder:text-[#666] focus:outline-none focus:border-[#555] font-mono"
                />
              </label>

              {/* Description */}
              <label className="block mb-2">
                <span className="text-[10px] text-[#888] mb-1 block">
                  Description (optional)
                </span>
                <input
                  type="text"
                  value={repoDescription}
                  onChange={(e) => setRepoDescription(e.target.value)}
                  placeholder="Created with Igriz"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#111] border border-[#333] rounded-md text-[#eee] placeholder:text-[#666] focus:outline-none focus:border-[#555]"
                />
              </label>

              {/* Visibility toggle */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={classNames(
                    'flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border transition-colors cursor-pointer',
                    !isPrivate
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-[#333] text-[#888] hover:text-[#bbb]',
                  )}
                >
                  <div className="i-ph:globe-hemisphere-west text-xs" />
                  Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={classNames(
                    'flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border transition-colors cursor-pointer',
                    isPrivate
                      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                      : 'border-[#333] text-[#888] hover:text-[#bbb]',
                  )}
                >
                  <div className="i-ph:lock text-xs" />
                  Private
                </button>
              </div>

              {/* Submit */}
              <button
                onClick={handleExport}
                disabled={!repoName.trim()}
                className={classNames(
                  'flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  !repoName.trim()
                    ? 'bg-[#222] text-[#666] cursor-not-allowed'
                    : 'bg-[#238636] text-white hover:bg-[#2ea043] cursor-pointer',
                )}
              >
                <div className="i-ph:git-branch text-sm" />
                <span>Create repository &amp; push</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GitHubLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 98 96" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}
