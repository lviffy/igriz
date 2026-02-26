import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';

/**
 * Validates a Vercel personal access token and returns user info.
 * The token never leaves the server — we call Vercel's API on behalf of the user.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { token } = (await request.json()) as { token?: string };

  if (!token || typeof token !== 'string') {
    return json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      return json({ error: `Vercel API error (${response.status})` }, { status: response.status });
    }

    const data = (await response.json()) as {
      user: {
        uid: string;
        username: string;
        email: string;
        name: string | null;
        avatar?: string;
      };
    };

    return json({
      valid: true,
      user: {
        id: data.user.uid,
        username: data.user.username,
        email: data.user.email,
        name: data.user.name || '',
        avatar: data.user.avatar || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate token';
    return json({ error: message }, { status: 500 });
  }
}
