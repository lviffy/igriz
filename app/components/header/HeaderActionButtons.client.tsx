import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { DeployButton } from '~/components/deploy/DeployButton';
import { WalletButton } from '~/components/wallet/WalletButton';
import { ACCENT_THEME_OPTIONS, accentThemeStore, setAccentTheme } from '~/lib/stores/accentTheme';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted: _chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
  const paletteMenuRef = useRef<HTMLDivElement>(null);
  const previews = useStore(workbenchStore.previews);
  const accentTheme = useStore(accentThemeStore);
  const activePreview = previews[activePreviewIndex];

  const shouldShowButtons = activePreview;

  useEffect(() => {
    if (!isPaletteMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(event.target as Node)) {
        setIsPaletteMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPaletteMenuOpen]);

  return (
    <div className="flex items-center gap-1">
      <div ref={paletteMenuRef} className="relative">
        <button
          type="button"
          className="w-8 h-8 rounded-lg border border-igriz-elements-borderColor bg-igriz-elements-background-depth-2 text-igriz-elements-textPrimary inline-flex items-center justify-center hover:bg-igriz-elements-background-depth-3 transition-theme"
          aria-label="Choose color palette"
          onClick={() => setIsPaletteMenuOpen((open) => !open)}
        >
          <span className="i-ph:palette" />
        </button>

        {isPaletteMenuOpen && (
          <div className="absolute top-[calc(100%+0.45rem)] right-0 min-w-[184px] rounded-[10px] border border-igriz-elements-borderColor bg-igriz-elements-background-depth-2 p-2 shadow-lg z-[60]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-igriz-elements-textTertiary px-2 pb-1">Preferred colors</div>
            {ACCENT_THEME_OPTIONS.map((palette) => (
              <button
                key={palette.id}
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs transition-theme ${
                  accentTheme === palette.id
                    ? 'bg-igriz-elements-item-backgroundActive text-igriz-elements-textPrimary'
                    : 'bg-transparent border-0 text-igriz-elements-textSecondary hover:bg-igriz-elements-item-backgroundActive hover:text-igriz-elements-textPrimary'
                }`}
                onClick={() => {
                  setAccentTheme(palette.id);
                  setIsPaletteMenuOpen(false);
                }}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: palette.swatch }}
                  aria-hidden="true"
                />
                <span>{palette.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <WalletButton />

      {/* Deploy Button */}
      {shouldShowButtons && <DeployButton />}
    </div>
  );
}
