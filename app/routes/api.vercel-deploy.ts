import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';

const encoder = new TextEncoder();

/**
 * Compute a hex-encoded SHA-1 hash (what Vercel's /v2/files API expects).
 */
async function sha1Hex(content: string): Promise<string> {
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface FileEntry {
  file: string;    // relative path
  data: string;    // file content
}

interface DeployRequest {
  token: string;
  files: FileEntry[];
  projectName?: string;
}

/**
 * Deploys files to Vercel using their Create Deployment API.
 *
 * Steps:
 * 1. Upload each file to Vercel's blob store
 * 2. Create a deployment with file references
 * 3. Return the deployment URL
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { token, files, projectName } = (await request.json()) as DeployRequest;

    if (!token) {
      return json({ error: 'Missing Vercel token' }, { status: 401 });
    }

    if (!files || files.length === 0) {
      return json({ error: 'No files to deploy' }, { status: 400 });
    }

    // Step 1: Upload files to Vercel's blob store and collect sha/size info
    const fileUploads = await Promise.all(
      files.map(async (entry) => {
        const content = entry.data;
        const sha = await sha1Hex(content);
        const encoded = encoder.encode(content);
        const size = encoded.byteLength;

        // Upload the file (Vercel deduplicates by digest automatically)
        const uploadResponse = await fetch('https://api.vercel.com/v2/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'x-vercel-digest': sha,
            'Content-Length': size.toString(),
          },
          body: encoded,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Failed to upload file ${entry.file}: ${errText}`);
        }

        return {
          file: entry.file,
          sha,
          size,
        };
      }),
    );

    // Step 2: Create the deployment
    const name = projectName || `igriz-deploy-${Date.now()}`;

    const deployPayload = {
      name,
      files: fileUploads,
      projectSettings: {
        framework: null, // auto-detect
      },
    };

    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployPayload),
    });

    if (!deployResponse.ok) {
      const errBody = await deployResponse.text();
      return json(
        { error: `Deployment failed: ${errBody}` },
        { status: deployResponse.status },
      );
    }

    const deployData = (await deployResponse.json()) as {
      id: string;
      url: string;
      readyState: string;
      alias?: string[];
    };

    return json({
      success: true,
      id: deployData.id,
      url: `https://${deployData.url}`,
      readyState: deployData.readyState,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Deployment failed';
    return json({ error: message }, { status: 500 });
  }
}
