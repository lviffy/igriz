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

    const text = await readTextStream(result.textStream);

    let payload: unknown;

    try {
      payload = extractReportPayload(text);
    } catch {
      const normalizedText = await normalizeAuditJsonWithModel({
        context,
        provider,
        model,
        rawAuditOutput: text,
      });

      payload = extractReportPayload(normalizedText);
    }

    const report = normalizeReport(payload);
    return json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit failed';

    // Keep audit flow alive even when model formatting is poor.
    if (message.includes('Model returned non-JSON audit response')) {
      return json({ report: EMPTY_REPORT, warning: message });
    }

    return json({ error: message }, { status: 500 });
  }
}

async function readTextStream(stream: AsyncIterable<string>): Promise<string> {
  let text = '';

  for await (const chunk of stream) {
    text += chunk;
  }

  return text;
}

async function normalizeAuditJsonWithModel({
  context,
  provider,
  model,
  rawAuditOutput,
}: {
  context: ActionFunctionArgs['context'];
  provider?: string;
  model?: string;
  rawAuditOutput: string;
}): Promise<string> {
  const repairPrompt = `You are a strict JSON formatter.

Convert the following audit output into valid JSON with EXACT top-level shape:
{
  "critical": [],
  "high": [],
  "medium": [],
  "low": [],
  "polkadot": []
}

Each finding item must be an object with:
- title (string)
- description (string)
- recommendation (string)
- location (string, optional)

Rules:
- Return JSON only.
- No markdown fences.
- No explanation text.
- If a category has no findings, return [].

Input to normalize:
<audit_output>
${rawAuditOutput}
</audit_output>`;

  const repairMessageContent =
    provider && model
      ? `[Model: ${model}]\n\n[Provider: ${provider}]\n\n${repairPrompt}`
      : repairPrompt;

  const repaired = await streamText({
    messages: [{ role: 'user', content: repairMessageContent }],
    env: context.cloudflare?.env,
    chatMode: 'build',
    contextOptimization: false,
  });

  return readTextStream(repaired.textStream);
}

function extractReportPayload(raw: string): unknown {
  const trimmed = raw.trim();
  const candidates: string[] = [];

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);

  if (fencedJsonMatch?.[1]) {
    candidates.push(fencedJsonMatch[1].trim());
  }

  const fencedGenericMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/i);

  if (fencedGenericMatch?.[1]) {
    candidates.push(fencedGenericMatch[1].trim());
  }

  candidates.push(trimmed);

  const firstObject = extractFirstJsonObject(trimmed);

  if (firstObject) {
    candidates.push(firstObject);
  }

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);

    if (parsed !== undefined) {
      return parsed;
    }
  }

  throw new Error('Model returned non-JSON audit response');
}

function parseJsonCandidate(candidate: string): unknown {
  if (!candidate) {
    return undefined;
  }

  const normalized = candidate.replace(/^\uFEFF/, '').trim();

  try {
    return JSON.parse(normalized);
  } catch {
    // Retry with a minimal repair for a common LLM issue: trailing commas.
    const noTrailingCommas = normalized.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(noTrailingCommas);
    } catch {
      return undefined;
    }
  }
}

function extractFirstJsonObject(input: string): string | undefined {
  const start = input.indexOf('{');

  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth++;
      continue;
    }

    if (ch === '}') {
      depth--;

      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return undefined;
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
