import { json } from '@remix-run/cloudflare';

export function loader() {
  return json({ error: 'Not Found' }, { status: 404 });
}

export default function CatchAll() {
  return null;
}
