interface Env {
  // AI Provider Selection
  AI_PROVIDER?: string; // 'openrouter' | 'lmstudio'
  
  // OpenRouter Configuration
  OPEN_ROUTER_API_KEY?: string;
  
  // LM Studio Configuration
  LMSTUDIO_BASE_URL?: string; // Default: ws://localhost:1234 (WebSocket)
  LMSTUDIO_MODEL_ID?: string; // Model identifier from LM Studio
}
