import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { parseDataStreamPart } from 'ai';
import { streamTextWithFallback } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import type { LLMProvider } from '~/lib/.server/llm/model';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message, provider, model } = await request.json<{
    message: string;
    provider?: LLMProvider;
    model?: string;
  }>();

  console.log('[ENHANCER] Processing prompt enhancement');

  try {
    const result = await streamTextWithFallback(
      [
        {
          role: 'user',
          content: stripIndents`
          I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

          IMPORTANT: Only respond with the improved prompt and nothing else!

          <original_prompt>
            ${message}
          </original_prompt>
        `,
        },
      ],
      context.cloudflare.env,
      undefined,
      provider || 'groq',
      model,
    );

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const processedChunk = decoder
          .decode(chunk)
          .split('\n')
          .filter((line) => line !== '')
          .map(parseDataStreamPart)
          .map((part) => part.type === 'text' ? part.value : '')
          .join('');

        controller.enqueue(encoder.encode(processedChunk));
      },
    });

    const transformedStream = result.toDataStream().pipeThrough(transformStream);

    console.log('[ENHANCER] Successfully started streaming enhanced prompt');

    return new Response(transformedStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[ENHANCER] Enhancement error:', error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
