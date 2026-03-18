import { atom } from 'nanostores';

export type AccentTheme = 'ember' | 'ocean' | 'emerald' | 'sunset';

export const kAccentTheme = 'igriz_accent_theme';
export const DEFAULT_ACCENT_THEME: AccentTheme = 'ember';

export const ACCENT_THEME_OPTIONS: Array<{ id: AccentTheme; name: string; swatch: string }> = [
  { id: 'ember', name: 'Ember Red', swatch: '#dc2626' },
  { id: 'ocean', name: 'Ocean Blue', swatch: '#2563eb' },
  { id: 'emerald', name: 'Emerald', swatch: '#059669' },
  { id: 'sunset', name: 'Sunset Orange', swatch: '#ea580c' },
];

export const accentThemeStore = atom<AccentTheme>(initStore());

function initStore(): AccentTheme {
  if (!import.meta.env.SSR) {
    const persistedAccentTheme = localStorage.getItem(kAccentTheme) as AccentTheme | null;
    const accentThemeAttribute = document.querySelector('html')?.getAttribute('data-accent') as AccentTheme | null;

    if (persistedAccentTheme && ACCENT_THEME_OPTIONS.some((option) => option.id === persistedAccentTheme)) {
      return persistedAccentTheme;
    }

    if (accentThemeAttribute && ACCENT_THEME_OPTIONS.some((option) => option.id === accentThemeAttribute)) {
      return accentThemeAttribute;
    }
  }

  return DEFAULT_ACCENT_THEME;
}

export function setAccentTheme(theme: AccentTheme) {
  accentThemeStore.set(theme);
  localStorage.setItem(kAccentTheme, theme);
  document.querySelector('html')?.setAttribute('data-accent', theme);
}
