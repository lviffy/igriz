import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--igriz-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--igriz-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--igriz-elements-terminal-textColor'),
    background: cssVar('--igriz-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--igriz-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--igriz-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--igriz-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--igriz-elements-terminal-color-black'),
    red: cssVar('--igriz-elements-terminal-color-red'),
    green: cssVar('--igriz-elements-terminal-color-green'),
    yellow: cssVar('--igriz-elements-terminal-color-yellow'),
    blue: cssVar('--igriz-elements-terminal-color-blue'),
    magenta: cssVar('--igriz-elements-terminal-color-magenta'),
    cyan: cssVar('--igriz-elements-terminal-color-cyan'),
    white: cssVar('--igriz-elements-terminal-color-white'),
    brightBlack: cssVar('--igriz-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--igriz-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--igriz-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--igriz-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--igriz-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--igriz-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--igriz-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--igriz-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
