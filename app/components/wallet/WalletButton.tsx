import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { clearPrivateKey, setPrivateKey, walletStore } from '~/lib/stores/wallet';

interface WalletButtonProps {
  variant?: 'landing' | 'header';
}

export function WalletButton({ variant = 'header' }: WalletButtonProps) {
  const wallet = useStore(walletStore);
  const [open, setOpen] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isLanding = variant === 'landing';

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setKeyValue(wallet.privateKey ?? '');
  }, [open, wallet.privateKey]);

  const handleSave = () => {
    if (!keyValue.trim()) {
      return;
    }

    setPrivateKey(keyValue.trim());
    setOpen(false);
  };

  const handleClear = () => {
    clearPrivateKey();
    setKeyValue('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={isLanding ? 'wallet-wrapper' : 'relative'}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={
          isLanding
            ? `landing-wallet-btn${wallet.hasKey ? ' connected' : ''}`
            : 'h-8 px-3 rounded-md border border-igriz-elements-borderColor bg-igriz-elements-button-secondary-background text-xs text-igriz-elements-textPrimary hover:bg-igriz-elements-button-secondary-backgroundHover'
        }
        title="Configure wallet private key (in-memory only)"
      >
        {isLanding && wallet.hasKey && <span className="landing-wallet-btn-dot" aria-hidden="true" />}
        {wallet.hasKey ? 'Wallet Ready' : 'Add Wallet Key'}
      </button>

      {open && (
        <div
          className={
            isLanding
              ? 'wallet-dropdown'
              : 'absolute right-0 z-50 mt-2 w-80 rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-2 p-3 shadow-2xl'
          }
        >
          <div className={isLanding ? 'wallet-dropdown-label' : 'text-xs font-semibold text-igriz-elements-textPrimary'}>
            Private Key (in-memory only)
          </div>
          <p className={isLanding ? 'wallet-dropdown-hint' : 'mt-1 text-[11px] text-igriz-elements-textSecondary'}>
            This key stays in browser memory and is cleared on refresh.
          </p>

          <input
            type="password"
            value={keyValue}
            onChange={(event) => setKeyValue(event.target.value)}
            placeholder="0x..."
            className={
              isLanding
                ? 'wallet-dropdown-input'
                : 'mt-2 w-full rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-3 px-2 py-2 text-xs text-igriz-elements-textPrimary outline-none focus:border-accent-500'
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
              }
            }}
          />

          <div className={isLanding ? 'wallet-dropdown-actions' : 'mt-3 flex items-center justify-end gap-2'}>
            {wallet.hasKey && (
              <button
                onClick={handleClear}
                className={
                  isLanding
                    ? 'wallet-dropdown-clear'
                    : 'rounded-md border border-igriz-elements-borderColor px-2 py-1 text-xs text-igriz-elements-textSecondary hover:text-igriz-elements-textPrimary'
                }
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!keyValue.trim()}
              className={isLanding ? 'wallet-dropdown-save' : 'rounded-md bg-accent-500 px-2 py-1 text-xs text-white disabled:opacity-50'}
            >
              {wallet.hasKey ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
