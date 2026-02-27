import { type ActionFunctionArgs, json } from '@remix-run/node';

/**
 * Validates a GitHub personal access token and returns user info.
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
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Igriz-App',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      return json({ error: `GitHub API error (${response.status})` }, { status: response.status });
    }

    const data = (await response.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
      html_url: string;
    };

    return json({
      valid: true,
      user: {
        id: data.id,
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url,
        html_url: data.html_url,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate token';
    return json({ error: message }, { status: 500 });
  }
}
