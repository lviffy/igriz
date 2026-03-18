import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { AuditFinding, ContractAuditReport } from '~/types/audit';

const EMPTY_REPORT: ContractAuditReport = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  polkadot: [],
};

export async function action({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { source, provider, model } = await request.json<{
    source?: string;
    provider?: string;
    model?: string;
  }>();

  if (!source || typeof source !== 'string') {
    return json({ error: 'Missing Solidity source' }, { status: 400 });
  }

  const prompt = `You are a Solidity smart contract security auditor.

Analyze the provided contract and return ONLY valid JSON with this exact top-level shape:
{
  "critical": [],
  "high": [],
  "medium": [],
  "low": [],
  "polkadot": []
}

Each item in each array MUST be an object with fields:
- title: string
- description: string
- recommendation: string
- location: string (optional)

Categories to scan:
- critical: reentrancy, unchecked external calls, fund loss vectors
- high: missing access control, unsafe privileged ops, dangerous upgrade paths
- medium: tx.origin auth usage, front-running risks, missing events on state changes
- low: SPDX/license missing, NatSpec gaps, magic numbers, readability/security hygiene
- polkadot: SELFDESTRUCT usage, PUSH0/raw assembly edge cases, PolkaVM incompatibilities

Rules:
- If no findings in a category, return an empty array.
- Do not include markdown.
- Do not include code fences.
- Do not include prose outside JSON.

Solidity source:
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

    const report = normalizeReport(extractReportPayload(text));
    return json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit failed';
    return json({ error: message }, { status: 500 });
  }
}

function extractReportPayload(raw: string): unknown {
  const trimmed = raw.trim();
  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);

  if (fencedJsonMatch?.[1]) {
    return JSON.parse(fencedJsonMatch[1]);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('Model returned non-JSON audit response');
  }
}

function normalizeReport(value: unknown): ContractAuditReport {
  if (!value || typeof value !== 'object') {
    return EMPTY_REPORT;
  }

  const source = value as Partial<Record<keyof ContractAuditReport, unknown>>;

  return {
    critical: normalizeFindings(source.critical),
    high: normalizeFindings(source.high),
    medium: normalizeFindings(source.medium),
    low: normalizeFindings(source.low),
    polkadot: normalizeFindings(source.polkadot),
  };
}

function normalizeFindings(input: unknown): AuditFinding[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item) => normalizeFinding(item)).filter((finding): finding is AuditFinding => finding !== undefined);
}

function normalizeFinding(input: unknown): AuditFinding | undefined {
  if (typeof input === 'string') {
    const title = input.trim();

    if (!title) {
      return undefined;
    }

    return {
      title,
      description: title,
      recommendation: 'Review this issue and apply a secure pattern-based fix.',
    };
  }

  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const obj = input as Partial<Record<keyof AuditFinding, unknown>>;
  const title = toNonEmptyString(obj.title);

  if (!title) {
    return undefined;
  }

  return {
    title,
    description: toNonEmptyString(obj.description) ?? title,
    recommendation:
      toNonEmptyString(obj.recommendation) ?? 'Review this issue and apply a secure pattern-based fix.',
    location: toNonEmptyString(obj.location),
  };
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
