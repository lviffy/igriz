export const AI_PROVIDERS = {
  OPENROUTER: 'openrouter',
  LMSTUDIO: 'lmstudio',
} as const;

export type AIProvider = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS];

export const DEFAULT_PROVIDER: AIProvider = AI_PROVIDERS.OPENROUTER;

/**
 * LM Studio Configuration
 * - Default base URL for LM Studio local server
 * - Note: LM Studio SDK requires WebSocket protocol (ws://)
 * - Typically runs on ws://localhost:1234
 */
export const LMSTUDIO_BASE_URL = 'ws://localhost:1234';

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS = {
  [AI_PROVIDERS.OPENROUTER]: 'google/gemini-2.5-flash',
  [AI_PROVIDERS.LMSTUDIO]: 'local-model', // LM Studio uses whatever model is loaded
} as const;
