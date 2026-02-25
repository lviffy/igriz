import { createGroq } from '@ai-sdk/groq';

// const DEFAULT_MODEL = 'qwen/qwen3-32b';
const DEFAULT_MODEL = 'moonshotai/kimi-k2-instruct-0905';

export function getModel(apiKey: string, model?: string) {
  const groq = createGroq({
    apiKey,
  });

  return groq(model || DEFAULT_MODEL);
}

// eslint-disable-next-line @blitz/comment-syntax
/*
 * Default model - change this to any Groq-supported model
 * Popular options:
 *   llama-3.3-70b-versatile         (powerful, fast)
 *   llama-3.1-8b-instant            (very fast, lightweight)
 *   mixtral-8x7b-32768              (Mixtral MoE)
 *   gemma2-9b-it                    (Google Gemma 2)
 * Full list: https://console.groq.com/docs/models
 */
