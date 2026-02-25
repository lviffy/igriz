import { LMStudioClient } from '@lmstudio/sdk';
import type { LanguageModelV1, LanguageModelV1StreamPart, LanguageModelV1Prompt } from 'ai';

type FinishReasonValue = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';

interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AISDKMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; [key: string]: any }>;
}

/**
 * Convert AI SDK v1 messages to LM Studio format
 * AI SDK messages can have complex content arrays, but LM Studio expects simple strings
 */
function convertMessages(messages: LanguageModelV1Prompt): LMStudioMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((msg: any) => {
    let content = '';
    
    // Handle different content types
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Extract text from content parts
      content = msg.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    return {
      role: msg.role as 'system' | 'user' | 'assistant',
      content,
    };
  });
}

// Cache loaded models to avoid reloading on every request (major performance optimization)
const modelCache = new Map<string, any>();

export function createLMStudioProvider(baseURL: string) {
  return (modelId: string): LanguageModelV1 => {
    const client = new LMStudioClient({ baseUrl: baseURL });
    
    // Helper to get or load model (cached)
    async function getModel() {
      const cacheKey = `${baseURL}:${modelId}`;
      
      if (!modelCache.has(cacheKey)) {
        console.log(`[LMStudio] Loading model: ${modelId} with 8192 context length`);
        const llm = await client.llm.load(modelId, {
          verbose: false, // Disable verbose logging for better performance
          config: {
            contextLength: 8192, // Increase context window from default 4096 to 8192 tokens
          },
        });
        modelCache.set(cacheKey, llm);
        console.log(`[LMStudio] Model loaded and cached: ${modelId}`);
      }
      
      return modelCache.get(cacheKey);
    }

    return {
      specificationVersion: 'v1',
      provider: 'lmstudio',
      modelId,
      defaultObjectGenerationMode: undefined,

      async doGenerate(options) {
        const { prompt, mode, ...settings } = options;

        if (mode.type !== 'regular') {
          throw new Error('Only regular text generation is supported for LM Studio');
        }

        // Convert AI SDK messages to LM Studio format
        const messages = Array.isArray(prompt) ? convertMessages(prompt) : [];

        if (messages.length === 0) {
          throw new Error('No messages provided for generation');
        }

        const llm = await getModel();
        
        const prediction = llm.respond(messages, {
          temperature: settings.temperature,
          maxTokens: settings.maxTokens !== undefined ? settings.maxTokens : false,
        });

        const result = await prediction;

        return {
          text: result.content,
          finishReason: mapFinishReason(result.stats.stopReason) as FinishReasonValue,
          usage: {
            promptTokens: 0, // LM Studio SDK doesn't provide this directly
            completionTokens: 0, // LM Studio SDK doesn't provide this directly
          },
          rawCall: {
            rawPrompt: options.prompt,
            rawSettings: settings,
          },
        };
      },

      async doStream(options) {
        const { prompt, mode, ...settings } = options;

        if (mode.type !== 'regular') {
          throw new Error('Only regular text generation is supported for LM Studio');
        }

        // Convert AI SDK messages to LM Studio format
        const messages = Array.isArray(prompt) ? convertMessages(prompt) : [];

        if (messages.length === 0) {
          throw new Error('No messages provided for streaming');
        }

        const llm = await getModel();
        
        const prediction = llm.respond(messages, {
          temperature: settings.temperature,
          maxTokens: settings.maxTokens !== undefined ? settings.maxTokens : false,
        });

        const stream = new ReadableStream<LanguageModelV1StreamPart>({
          async start(controller) {
            try {
              for await (const fragment of prediction) {
                controller.enqueue({
                  type: 'text-delta',
                  textDelta: fragment.content,
                });
              }

              const result = await prediction;
              
              controller.enqueue({
                type: 'finish',
                finishReason: mapFinishReason(result.stats.stopReason) as FinishReasonValue,
                usage: {
                  promptTokens: 0,
                  completionTokens: 0,
                },
              });
            } catch (error) {
              controller.error(error);
            } finally {
              controller.close();
            }
          },
        });

        return {
          stream,
          rawCall: {
            rawPrompt: options.prompt,
            rawSettings: settings,
          },
        };
      },
    };
  };
}

function mapFinishReason(stopReason: string | undefined): FinishReasonValue {
  switch (stopReason) {
    case 'eosFound':
      return 'stop';
    case 'stop StringFound':
      return 'stop';
    case 'maxPredictedTokensReached':
      return 'length';
    case 'contextLengthReached':
      return 'length';
    case 'userStopped':
      return 'stop';
    case 'modelUnloaded':
      return 'error';
    case 'failed':
      return 'error';
    default:
      return 'unknown';
  }
}
