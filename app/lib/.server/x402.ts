import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { type HTTPAdapter, type HTTPResponseInstructions, x402HTTPResourceServer } from '@x402/core/http';
import type { Network } from '@x402/core/types';
import { ExactEvmScheme } from '@x402/evm/exact/server';

const CHAT_ROUTE = 'POST /api/chat';
const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';
const DEFAULT_CHAT_PRICE = '$0.001';
const DEFAULT_NETWORK = 'eip155:84532';
const MAINNET_CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';

type RuntimeEnv = Record<string, unknown> | undefined;

type X402GateResult =
  | { allowed: true; settlementHeaders: Record<string, string> }
  | { allowed: false; response: Response };

let httpServerPromise: Promise<x402HTTPResourceServer> | null = null;
let fileEnvCache: Record<string, string> | null = null;

class RequestAdapter implements HTTPAdapter {
  constructor(private readonly request: Request) {}

  getHeader(name: string): string | undefined {
    return this.request.headers.get(name) ?? undefined;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    return new URL(this.request.url).pathname;
  }

  getUrl(): string {
    return this.request.url;
  }

  getAcceptHeader(): string {
    return this.request.headers.get('accept') ?? '*/*';
  }

  getUserAgent(): string {
    return this.request.headers.get('user-agent') ?? 'unknown';
  }
}

function readEnv(env: RuntimeEnv, key: string): string | undefined {
  const fromContext = env?.[key];

  if (typeof fromContext === 'string' && fromContext.trim().length > 0) {
    return fromContext.trim();
  }

  const fromProcess = process.env[key];

  if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return undefined;
}

function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');

    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    result[key] = value;
  }

  return result;
}

async function readFromDotEnvFiles(key: string): Promise<string | undefined> {
  if (fileEnvCache) {
    return fileEnvCache[key];
  }

  try {
    const { existsSync, readFileSync } = await import('node:fs');
    const cwd = process.cwd();
    const files = [`${cwd}/.env.local`, `${cwd}/.env`];
    const merged: Record<string, string> = {};

    for (const file of files) {
      if (!existsSync(file)) {
        continue;
      }

      Object.assign(merged, parseDotEnv(readFileSync(file, 'utf8')));
    }

    fileEnvCache = merged;
    return merged[key];
  } catch {
    fileEnvCache = {};
    return undefined;
  }
}

async function resolveEnvValue(env: RuntimeEnv, key: string): Promise<string | undefined> {
  return readEnv(env, key) ?? (await readFromDotEnvFiles(key));
}

async function getX402Config(env: RuntimeEnv) {
  const enabled = ((await resolveEnvValue(env, 'X402_ENABLED')) ?? 'false').toLowerCase() === 'true';
  const payTo = (await resolveEnvValue(env, 'X402_PAY_TO')) ?? '';
  const configuredUrl = (await resolveEnvValue(env, 'X402_FACILITATOR_URL')) || DEFAULT_FACILITATOR_URL;
  const facilitatorBearerToken = (await resolveEnvValue(env, 'X402_FACILITATOR_BEARER_TOKEN')) || '';
  const usingCdpWithoutAuth = configuredUrl === MAINNET_CDP_FACILITATOR_URL && !facilitatorBearerToken;

  const facilitatorUrl = usingCdpWithoutAuth ? DEFAULT_FACILITATOR_URL : configuredUrl;
  const configuredNetwork = (await resolveEnvValue(env, 'X402_NETWORK')) || DEFAULT_NETWORK;
  const network = facilitatorUrl === DEFAULT_FACILITATOR_URL ? 'eip155:84532' : configuredNetwork;

  return {
    enabled,
    payTo,
    facilitatorUrl,
    network,
    price: (await resolveEnvValue(env, 'X402_CHAT_PRICE_USD')) || DEFAULT_CHAT_PRICE,
    facilitatorBearerToken,
  };
}

async function getHTTPServer(env: RuntimeEnv): Promise<x402HTTPResourceServer> {
  if (!httpServerPromise) {
    const cfg = await getX402Config(env);

    if (!cfg.payTo) {
      throw new Error('X402_PAY_TO is required when x402 is enabled');
    }

    const facilitatorClient = new HTTPFacilitatorClient({
      url: cfg.facilitatorUrl,
      createAuthHeaders: cfg.facilitatorBearerToken
        ? async () => {
            const authorization = { Authorization: `Bearer ${cfg.facilitatorBearerToken}` };
            return {
              verify: authorization,
              settle: authorization,
              supported: authorization,
            };
          }
        : undefined,
    });

    const resourceServer = new x402ResourceServer(facilitatorClient).register('eip155:*', new ExactEvmScheme());

    const httpServer = new x402HTTPResourceServer(resourceServer, {
      [CHAT_ROUTE]: {
        accepts: {
          scheme: 'exact',
          price: cfg.price,
          network: cfg.network as Network,
          payTo: cfg.payTo,
        },
        description: 'Igriz AI generation',
        mimeType: 'text/plain',
        unpaidResponseBody: () => ({
          contentType: 'application/json',
          body: {
            error: 'x402 payment required for this generation',
            code: 'payment_required',
          },
        }),
      },
    });

    httpServerPromise = httpServer
      .initialize()
      .then(() => httpServer)
      .catch((error) => {
        httpServerPromise = null;
        throw error;
      });
  }

  return httpServerPromise;
}

function toResponse(instructions: HTTPResponseInstructions): Response {
  const headers = new Headers(instructions.headers);
  const contentType = headers.get('content-type') ?? 'application/json';

  if (instructions.body === undefined) {
    return new Response(null, { status: instructions.status, headers });
  }

  if (typeof instructions.body === 'string' || instructions.body instanceof Uint8Array) {
    return new Response(instructions.body as unknown as BodyInit, { status: instructions.status, headers });
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', contentType);
  }

  return new Response(JSON.stringify(instructions.body), {
    status: instructions.status,
    headers,
  });
}

export async function enforceX402ForChat(request: Request, env?: RuntimeEnv): Promise<X402GateResult> {
  const cfg = await getX402Config(env);

  if (!cfg.enabled) {
    return { allowed: true, settlementHeaders: {} };
  }

  let httpServer: x402HTTPResourceServer;

  try {
    httpServer = await getHTTPServer(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'x402 configuration error';
    return {
      allowed: false,
      response: new Response(JSON.stringify({ error: message, code: 'x402_config_error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const processResult = await httpServer.processHTTPRequest({
    adapter: new RequestAdapter(request),
    path: '/api/chat',
    method: request.method,
    paymentHeader: request.headers.get('PAYMENT-SIGNATURE') ?? request.headers.get('X-PAYMENT') ?? undefined,
  });

  if (processResult.type === 'payment-error') {
    return { allowed: false, response: toResponse(processResult.response) };
  }

  if (processResult.type === 'no-payment-required') {
    return { allowed: true, settlementHeaders: {} };
  }

  const settlementResult = await httpServer.processSettlement(
    processResult.paymentPayload,
    processResult.paymentRequirements,
    processResult.declaredExtensions,
  );

  if (!settlementResult.success) {
    return { allowed: false, response: toResponse(settlementResult.response) };
  }

  return { allowed: true, settlementHeaders: settlementResult.headers };
}
