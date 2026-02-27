import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect } from 'react';
import { walletStore, setPrivateKey, clearPrivateKey } from '~/lib/stores/wallet';

interface WalletButtonProps {
  variant?: 'landing' | 'header';
}

export function WalletButton({ variant = 'landing' }: WalletButtonProps) {
  const wallet = useStore(walletStore);
  const [showInput, setShowInput] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showInput) {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowInput(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => document.removeEventListener('mousedown', handler);
  }, [showInput]);

  const handleSave = () => {
    if (keyValue.trim()) {
      setPrivateKey(keyValue.trim());
      setShowInput(false);
    }
  };

  const handleClear = () => {
    clearPrivateKey();
    setKeyValue('');
    setShowInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }

    if (e.key === 'Escape') {
      setShowInput(false);
    }
  };

  const baseClass = variant === 'header' ? 'header-wallet-btn' : 'landing-wallet-btn';

  return (
    <div ref={wrapperRef} className="wallet-wrapper">
      {wallet.hasKey ? (
        <button
          className={`${baseClass} connected`}
          onClick={() => setShowInput(!showInput)}
          title="Wallet key configured (in-memory only). Click to manage."
        >
          <span className={`${baseClass}-dot`} />
          <span>Wallet Ready</span>
        </button>
      ) : (
        <button
          className={baseClass}
          onClick={() => setShowInput(!showInput)}
          title="Add your Quai private key for contract deployment"
        >
          Add Wallet Key
        </button>
      )}

      {showInput && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown-label">
            Private Key <span className="wallet-dropdown-badge">in-memory only</span>
          </div>
          <p className="wallet-dropdown-hint">
            Your key is stored in browser memory only. It is never saved to disk and clears on page refresh.
          </p>
          <input
            type="password"
            className="wallet-dropdown-input"
            placeholder="0x..."
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="wallet-dropdown-actions">
            {wallet.hasKey && (
              <button className="wallet-dropdown-clear" onClick={handleClear}>
                Clear Key
              </button>
            )}
            <button
              className="wallet-dropdown-save"
              onClick={handleSave}
              disabled={!keyValue.trim()}
            >
              {wallet.hasKey ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
