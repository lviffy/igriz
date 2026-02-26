import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import {
  vercelTokenStore,
  vercelUserStore,
  vercelDeployStore,
  setVercelToken,
  setVercelUser,
  disconnectVercel,
  type VercelUser,
} from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';

type DropdownView = 'main' | 'token-input';

export function DeployButton() {
  const token = useStore(vercelTokenStore);
  const user = useStore(vercelUserStore);
  const deployState = useStore(vercelDeployStore);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<DropdownView>('main');
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const isConnected = token !== null;
  const isDeploying = deployState.status === 'deploying';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView('main');
        setTokenInput('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-focus token input when switching to that view
  useEffect(() => {
    if (view === 'token-input' && tokenInputRef.current) {
      tokenInputRef.current.focus();
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
      const response = await fetch('/api/vercel-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });

      const data = (await response.json()) as
        | { valid: true; user: VercelUser }
        | { error: string };

      if (!response.ok || 'error' in data) {
        const msg = 'error' in data ? data.error : 'Invalid token';
        toast.error(msg);
        return;
      }

      setVercelToken(trimmed);
      setVercelUser(data.user);
      setTokenInput('');
      setView('main');
      toast.success(`Connected as ${data.user.username}`);
    } catch {
      toast.error('Failed to validate token');
    } finally {
      setIsValidating(false);
    }
  }, [tokenInput]);

  const handleDisconnect = useCallback(() => {
    disconnectVercel();
    setIsOpen(false);
    setView('main');
    toast.info('Vercel account disconnected');
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsOpen(false);
    vercelDeployStore.set({ status: 'deploying' });

    try {
      // Gather files from the workbench
      const filesMap = workbenchStore.files.get();
      const fileEntries: { file: string; data: string }[] = [];

      for (const [path, dirent] of Object.entries(filesMap)) {
        if (dirent?.type === 'file' && !dirent.isBinary) {
          // Strip the WORK_DIR prefix to get relative paths
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
        vercelDeployStore.set({ status: 'error', error: 'No files to deploy' });
        toast.error('No files found to deploy');
        return;
      }

      const response = await fetch('/api/vercel-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          files: fileEntries,
        }),
      });

      const result = (await response.json()) as
        | { success: true; url: string; id: string }
        | { error: string };

      if (!response.ok || 'error' in result) {
        const errorMsg = 'error' in result ? result.error : 'Deployment failed';
        vercelDeployStore.set({ status: 'error', error: errorMsg });
        toast.error(errorMsg);
        return;
      }

      vercelDeployStore.set({ status: 'success', url: result.url });
      toast.success(
        <span>
          Deployed!{' '}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Open site ↗
          </a>
        </span>,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deployment failed';
      vercelDeployStore.set({ status: 'error', error: message });
      toast.error(message);
    }
  }, [token]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main deploy button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setView('main');
          }
        }}
        disabled={isDeploying}
        className={classNames(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200',
          isDeploying
            ? 'bg-[#222] border-[#333] text-[#666] cursor-wait'
            : isConnected
              ? 'bg-[#000] border-[#333] text-white hover:bg-[#111] cursor-pointer'
              : 'bg-[#1a1a1a] border-[#333] text-[#aaa] hover:text-white hover:border-[#555] cursor-pointer',
        )}
      >
        {isDeploying ? (
          <>
            <div className="i-svg-spinners:90-ring-with-bg text-sm" />
            <span>Deploying…</span>
          </>
        ) : (
          <>
            {/* Vercel triangle icon */}
            <VercelLogo size={12} />
            <span>Deploy</span>
            <div className={classNames('i-ph:caret-down-bold text-[10px] transition-transform', isOpen ? 'rotate-180' : undefined)} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg z-50 overflow-hidden">
          {/* ── Not connected ── */}
          {!isConnected && view === 'main' && (
            <div className="p-3">
              <p className="text-[11px] text-[#888] mb-3">
                Connect your Vercel account to deploy projects directly from here.
              </p>
              <button
                onClick={() => setView('token-input')}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-white bg-[#000] border border-[#333] rounded-md hover:bg-[#111] transition-colors cursor-pointer"
              >
                <VercelLogo size={14} />
                <span>Connect with Access Token</span>
              </button>
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-[10px] text-[#666] hover:text-[#999] text-center transition-colors"
              >
                Get your token from vercel.com/account/tokens ↗
              </a>
            </div>
          )}

          {/* ── Token input view ── */}
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
                Create a token at{' '}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#bbb]"
                >
                  vercel.com/account/tokens
                </a>{' '}
                with full access scope.
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
                placeholder="Paste your Vercel token…"
                className="w-full px-2.5 py-1.5 text-xs bg-[#111] border border-[#333] rounded-md text-[#eee] placeholder:text-[#666] focus:outline-none focus:border-[#555]"
              />
              <button
                onClick={handleConnectWithToken}
                disabled={isValidating || !tokenInput.trim()}
                className={classNames(
                  'flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isValidating || !tokenInput.trim()
                    ? 'bg-[#222] text-[#666] cursor-not-allowed'
                    : 'bg-[#000] text-white border border-[#333] hover:bg-[#111] cursor-pointer',
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

          {/* ── Connected ── */}
          {isConnected && (
            <>
              {/* User info */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#333]">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#222] text-[#aaa] shrink-0">
                  <div className="i-ph:user text-sm" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#eee] truncate">
                    {user?.name || user?.username || 'Vercel User'}
                  </div>
                  <div className="text-[10px] text-[#888] truncate">
                    {user?.email || user?.username}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Connected
                </div>
              </div>

              {/* Deploy action */}
              <button
                onClick={handleDeploy}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#eee] hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <div className="i-ph:rocket-launch text-sm" />
                <span>Deploy to Vercel</span>
                <span className="ml-auto text-[10px] text-[#888]">
                  {user?.username ? `→ ${user.username}'s account` : ''}
                </span>
              </button>

              {/* Last deployment link */}
              {deployState.status === 'success' && deployState.url && (
                <a
                  href={deployState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-green-400 hover:bg-[#252525] transition-colors"
                >
                  <div className="i-ph:check-circle text-sm" />
                  <span className="truncate">View last deployment ↗</span>
                </a>
              )}

              {deployState.status === 'error' && deployState.error && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400">
                  <div className="i-ph:warning-circle text-sm shrink-0" />
                  <span className="truncate">{deployState.error}</span>
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
        </div>
      )}
    </div>
  );
}

function VercelLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.86)} viewBox="0 0 76 65" fill="currentColor">
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  );
}
