import { useStore } from '@nanostores/react';
import { memo, useRef, useState, useEffect } from 'react';
import {
  PROVIDER_LIST,
  selectedProviderStore,
  selectedModelStore,
  setProvider,
  setModel,
} from '~/lib/stores/provider';

export const ProviderSelector = memo(() => {
  const currentProvider = useStore(selectedProviderStore);
  const currentModel = useStore(selectedModelStore);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const providerConfig = PROVIDER_LIST.find((p) => p.id === currentProvider) || PROVIDER_LIST[0];
  const modelConfig = providerConfig.models.find((m) => m.id === currentModel);
  const displayLabel = modelConfig?.label || currentModel;

  // close on outside click
  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:border-bolt-elements-borderColorActive transition-all"
      >
        <div className="i-ph:cpu text-sm" />
        <span className="max-w-[120px] truncate">{providerConfig.label}</span>
        <span className="text-bolt-elements-textTertiary">/</span>
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <div className={`i-ph:caret-down text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-[280px] max-h-[360px] overflow-y-auto rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 shadow-lg z-50">
          {PROVIDER_LIST.map((provider) => (
            <div key={provider.id}>
              {/* Provider header */}
              <div className="sticky top-0 flex items-center gap-2 px-3 py-2 bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
                <div className="i-ph:cloud text-sm text-bolt-elements-textTertiary" />
                <span className="text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wide">
                  {provider.label}
                </span>
                {provider.id === currentProvider && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500" />
                )}
              </div>

              {/* Model list */}
              {provider.models.map((model) => {
                const isActive = provider.id === currentProvider && model.id === currentModel;

                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setProvider(provider.id);
                      setModel(model.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent'
                        : 'text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-accent-500' : 'bg-bolt-elements-textTertiary opacity-30'
                      }`}
                    />
                    <span className="truncate">{model.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
