import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const prohibitOutOfOrderStreaming = isbot(request.headers.get('user-agent') || '');

  return new Promise((resolve, reject) => {
    let shellRendered = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onAllReady() {
          // For bots: wait until entire document is ready
          if (!prohibitOutOfOrderStreaming) {
            return;
          }

          respondWith();
        },
        onShellReady() {
          // For regular users: stream as soon as shell is ready
          if (prohibitOutOfOrderStreaming) {
            return;
          }

          respondWith();
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;

          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    function respondWith() {
      shellRendered = true;

      const head = renderHeadToString({ request, remixContext, Head });
      const htmlPrefix = `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`;
      const htmlSuffix = `</div></body></html>`;

      const passthrough = new PassThrough();

      // Write opening HTML before piping React output
      passthrough.write(htmlPrefix);

      // Pipe React rendered output into passthrough
      pipe(passthrough);

      // When React finishes, append closing HTML
      passthrough.on('end', () => {});

      // We need to intercept the end to append our suffix
      const wrappedStream = new PassThrough();
      passthrough.on('data', (chunk: Buffer) => wrappedStream.write(chunk));
      passthrough.on('end', () => {
        wrappedStream.write(htmlSuffix);
        wrappedStream.end();
      });
      passthrough.on('error', (err) => wrappedStream.destroy(err));

      responseHeaders.set('Content-Type', 'text/html');
      responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
      responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

      resolve(
        new Response(createReadableStreamFromReadable(wrappedStream), {
          headers: responseHeaders,
          status: responseStatusCode,
        }),
      );
    }

    setTimeout(abort, ABORT_DELAY);
  });
}
