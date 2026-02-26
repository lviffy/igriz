import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';

interface FileEntry {
  file: string;
  data: string;
}

interface ExportRequest {
  token: string;
  files: FileEntry[];
  repoName: string;
  isPrivate: boolean;
  description?: string;
}

/**
 * Exports project files to a new GitHub repository.
 *
 * Steps:
 * 1. Create a new repository
 * 2. Build a file tree and create a Git tree
 * 3. Create an initial commit
 * 4. Update the default branch ref
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { token, files, repoName, isPrivate, description } =
      (await request.json()) as ExportRequest;

    if (!token) {
      return json({ error: 'Missing GitHub token' }, { status: 401 });
    }

    if (!files || files.length === 0) {
      return json({ error: 'No files to export' }, { status: 400 });
    }

    if (!repoName) {
      return json({ error: 'Repository name is required' }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Igriz-App',
    };

    // Step 1: Create the repository (auto_init creates a first commit so the Git Data API works)
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repoName,
        description: description || 'Created with Igriz',
        private: isPrivate,
        auto_init: true,
      }),
    });

    if (!createRepoResponse.ok) {
      const err = (await createRepoResponse.json()) as { message?: string; errors?: Array<{ message: string }> };
      const msg =
        err.errors?.[0]?.message || err.message || `Failed to create repo (${createRepoResponse.status})`;

      return json({ error: msg }, { status: createRepoResponse.status });
    }

    const repo = (await createRepoResponse.json()) as {
      full_name: string;
      html_url: string;
      default_branch: string;
    };

    const branch = repo.default_branch || 'main';

    // Give GitHub a moment to finalize the auto-init commit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Get the latest commit SHA on the default branch
    const refGetResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/ref/heads/${branch}`,
      { headers },
    );

    if (!refGetResponse.ok) {
      const errText = await refGetResponse.text();
      return json({ error: `Failed to get branch ref: ${errText}` }, { status: 500 });
    }

    const refData = (await refGetResponse.json()) as { object: { sha: string } };
    const parentCommitSha = refData.object.sha;

    // Step 3: Create blobs for each file
    const blobResults = await Promise.all(
      files.map(async (entry) => {
        const blobResponse = await fetch(
          `https://api.github.com/repos/${repo.full_name}/git/blobs`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              content: entry.data,
              encoding: 'utf-8',
            }),
          },
        );

        if (!blobResponse.ok) {
          const errText = await blobResponse.text();
          throw new Error(`Failed to create blob for ${entry.file}: ${errText}`);
        }

        const blob = (await blobResponse.json()) as { sha: string };

        return {
          path: entry.file,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      }),
    );

    // Step 4: Create a tree based on the parent commit's tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ tree: blobResults }),
      },
    );

    if (!treeResponse.ok) {
      const errText = await treeResponse.text();
      return json({ error: `Failed to create tree: ${errText}` }, { status: 500 });
    }

    const tree = (await treeResponse.json()) as { sha: string };

    // Step 5: Create commit with the auto-init commit as parent
    const commitResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: 'Initial commit from Igriz',
          tree: tree.sha,
          parents: [parentCommitSha],
        }),
      },
    );

    if (!commitResponse.ok) {
      const errText = await commitResponse.text();
      return json({ error: `Failed to create commit: ${errText}` }, { status: 500 });
    }

    const commit = (await commitResponse.json()) as { sha: string };

    // Step 6: Update the branch ref to point to our new commit
    const refResponse = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: commit.sha,
          force: true,
        }),
      },
    );

    if (!refResponse.ok) {
      const errText = await refResponse.text();
      return json({ error: `Failed to update ref: ${errText}` }, { status: 500 });
    }

    return json({
      success: true,
      repoUrl: repo.html_url,
      fullName: repo.full_name,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return json({ error: message }, { status: 500 });
  }
}
