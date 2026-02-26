import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, streamTextWithFallback, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { LLMProvider } from '~/lib/.server/llm/model';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, provider, model } = await request.json<{
    messages: Messages;
    provider?: LLMProvider;
    model?: string;
  }>();

  const selectedProvider = provider || 'groq';
  const selectedModel = model;

  logger.debug(`[CHAT] Processing chat request`);

  const stream = new SwitchableStream();

  try {
    const getErrorMessage = (error: unknown) => {
      if (error instanceof Error) {
        const msg = error.message || '';

        // try to extract JSON error from Groq
        try {
          const jsonMatch = msg.match(/\{[\s\S]*"error"[\s\S]*\}/);

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const orError = parsed.error || parsed;

            return orError.message || orError.detail || msg;
          }
        } catch {
          /* fall through */
        }

        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          return `Invalid API Key — check your ${selectedProvider.toUpperCase()} API key in .env.local`;
        }

        if (msg.includes('402') || msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('credit')) {
          return `Insufficient credits — check your ${selectedProvider} account usage`;
        }

        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          return 'All API keys rate-limited — wait a moment and try again';
        }

        if (msg.includes('403')) {
          return 'Forbidden — your API key does not have access to this model';
        }

        return msg || 'An unknown error occurred';
      }

      return 'An unknown error occurred';
    };

    const dataStreamOptions = { getErrorMessage };

    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        if (finishReason !== 'length') {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        logger.info(`[CHAT] Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamTextWithFallback(messages, context.cloudflare.env, options, selectedProvider, selectedModel);

        return stream.switchSource(result.toDataStream(dataStreamOptions));
      },
    };

    const result = await streamTextWithFallback(messages, context.cloudflare.env, options, selectedProvider, selectedModel);

    stream.switchSource(result.toDataStream(dataStreamOptions));

    logger.info('[CHAT] Successfully started streaming response');

    return new Response(stream.readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: unknown) {
    logger.error('[CHAT] Chat error:', error);

    const detail = extractErrorDetail(error);
    logger.error('[CHAT] Error detail:', detail);

    return new Response(JSON.stringify({ error: detail.message, code: detail.code }), {
      status: detail.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function extractErrorDetail(error: unknown): { message: string; status: number; code?: string } {
  if (!(error instanceof Error)) {
    return { message: 'Internal Server Error', status: 500 };
  }

  const msg = error.message || '';

  // Groq returns structured errors — try to parse from the message or cause
  try {
    // The AI SDK sometimes wraps the upstream error body in the message
    const jsonMatch = msg.match(/\{[\s\S]*"error"[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const orError = parsed.error || parsed;
      const code = orError.code || orError.type;
      const detail = orError.message || orError.detail || msg;
      const status = orError.status || (code === 'invalid_api_key' ? 401 : code === 'insufficient_quota' ? 402 : 500);

      return { message: detail, status, code };
    }
  } catch {
    // JSON parse failed, fall through
  }

  // Known status patterns in error messages
  if (msg.includes('401') || msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('unauthorized')) {
    return { message: `Invalid API Key: ${msg}`, status: 401, code: 'invalid_api_key' };
  }

  if (msg.includes('402') || msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('credit')) {
    return { message: `Insufficient Credits: ${msg}`, status: 402, code: 'insufficient_quota' };
  }

  if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return { message: `Rate Limited: ${msg}`, status: 429, code: 'rate_limited' };
  }

  if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
    return { message: `Forbidden: ${msg}`, status: 403, code: 'forbidden' };
  }

  return { message: msg, status: 500 };
}
