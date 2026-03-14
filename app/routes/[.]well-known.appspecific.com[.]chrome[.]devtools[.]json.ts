import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response(null, { status: 204 });
};
