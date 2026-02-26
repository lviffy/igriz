import { useStore } from '@nanostores/react';
import { useState, useEffect } from 'react';
import { walletStore, connectWallet, disconnectWallet, initWalletListeners } from '~/lib/stores/wallet';

interface WalletButtonProps {
  variant?: 'landing' | 'header';
}

export function WalletButton({ variant = 'landing' }: WalletButtonProps) {
  const wallet = useStore(walletStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWalletListeners();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      await connectWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const baseClass = variant === 'header' ? 'header-wallet-btn' : 'landing-wallet-btn';

  if (wallet.connected && wallet.shortAddress) {
    return (
      <button
        className={`${baseClass} connected`}
        onClick={handleDisconnect}
        title={`Connected: ${wallet.address}\nClick to disconnect`}
      >
        <span className={`${baseClass}-dot`} />
        <span>{wallet.shortAddress}</span>
      </button>
    );
  }

  return (
    <button
      className={baseClass}
      onClick={handleConnect}
      disabled={loading}
      title={error || 'Connect Pelagus Wallet'}
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
