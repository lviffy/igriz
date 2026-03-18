import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { ContractAuditReport } from '~/types/audit';

export async function action({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { source, report, provider, model } = await request.json<{
    source?: string;
    report?: ContractAuditReport;
    provider?: string;
    model?: string;
  }>();

  if (!source || typeof source !== 'string') {
    return json({ error: 'Missing Solidity source' }, { status: 400 });
  }

  if (!report || typeof report !== 'object') {
    return json({ error: 'Missing audit report' }, { status: 400 });
  }

  const prompt = `You are a senior Solidity security engineer.

Task:
- Fix the contract based on the audit findings below.
- Keep contract behavior intact unless a change is required for security.
- Preserve public/external APIs where possible.
- Keep pragma/version and imports valid.
- Ensure the output is deployable Solidity code.
- Do not output markdown, explanations, or code fences.
- Return ONLY the full fixed Solidity source code.

Audit findings JSON:
${JSON.stringify(report, null, 2)}

Original Solidity source:
<contract>
${source}
</contract>`;

  const messageContent =
    provider && model
      ? `[Model: ${model}]\n\n[Provider: ${provider}]\n\n${prompt}`
      : prompt;

  try {
    const result = await streamText({
      messages: [{ role: 'user', content: messageContent }],
      env: context.cloudflare?.env,
      chatMode: 'build',
      contextOptimization: false,
    });

    let text = '';

    for await (const chunk of result.textStream) {
      text += chunk;
    }

    const fixedSource = extractSoliditySource(text);

    if (!fixedSource.includes('contract ')) {
      return json({ error: 'Model did not return valid Solidity source' }, { status: 500 });
    }

    return json({ source: fixedSource });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fix contract';
    return json({ error: message }, { status: 500 });
  }
}

function extractSoliditySource(raw: string): string {
  const fencedSolidityMatch = raw.match(/```solidity\s*([\s\S]*?)\s*```/i);

  if (fencedSolidityMatch?.[1]) {
    return fencedSolidityMatch[1].trim();
  }

  const fencedGenericMatch = raw.match(/```\s*([\s\S]*?)\s*```/i);

  if (fencedGenericMatch?.[1]) {
    return fencedGenericMatch[1].trim();
  }

  return raw.trim();
}
