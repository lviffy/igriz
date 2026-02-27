import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough, Transform } from 'node:stream';
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
          if (!prohibitOutOfOrderStreaming) {
            return;
          }

          respondWith();
        },
        onShellReady() {
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

      const body = new PassThrough();
      body.write(htmlPrefix);

      // Use a transform to append suffix when React stream ends
      const appendSuffix = new Transform({
        transform(chunk, _encoding, callback) {
          callback(null, chunk);
        },
        flush(callback) {
          this.push(htmlSuffix);
          callback();
        },
      });

      pipe(appendSuffix);
      appendSuffix.pipe(body, { end: true });

      responseHeaders.set('Content-Type', 'text/html');
      responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
      responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

      resolve(
        new Response(createReadableStreamFromReadable(body), {
          headers: responseHeaders,
          status: responseStatusCode,
        }),
      );
    }

    setTimeout(abort, ABORT_DELAY);
  });
}
