import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ActionState } from '~/lib/runtime/action-runner';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import {
  acknowledgeAudit,
  auditStore,
  dismissAudit,
  setAuditError,
  setAuditPending,
  setAuditReady,
} from '~/lib/stores/audit';
import { workbenchStore, type ArtifactState } from '~/lib/stores/workbench';
import type { AuditFinding, ContractAuditReport, ContractAuditResponse } from '~/types/audit';
import { WORK_DIR } from '~/utils/constants';

interface AuditPanelProps {
  isStreaming: boolean;
}

type SeverityKey = keyof ContractAuditReport;

const SEVERITY_META: Record<SeverityKey, { label: string; icon: string; toneClasses: string }> = {
  critical: {
    label: 'Critical',
    icon: 'i-ph:warning-octagon-fill',
    toneClasses:
      'text-igriz-elements-item-contentDanger bg-igriz-elements-item-backgroundDanger border-igriz-elements-borderColor',
  },
  high: {
    label: 'High',
    icon: 'i-ph:warning-circle-fill',
    toneClasses:
      'text-igriz-elements-item-contentAccent bg-igriz-elements-item-backgroundAccent border-igriz-elements-borderColor',
  },
  medium: {
    label: 'Medium',
    icon: 'i-ph:info-fill',
    toneClasses:
      'text-igriz-elements-textSecondary bg-igriz-elements-background-depth-2 border-igriz-elements-borderColor',
  },
  low: {
    label: 'Low',
    icon: 'i-ph:seal-check-fill',
    toneClasses:
      'text-igriz-elements-textSecondary bg-igriz-elements-background-depth-2 border-igriz-elements-borderColor',
  },
  polkadot: {
    label: 'Polkadot',
    icon: 'i-ph:hexagon-fill',
    toneClasses:
      'text-igriz-elements-item-contentAccent bg-igriz-elements-item-backgroundAccent border-igriz-elements-borderColor',
  },
};

export function AuditPanel({ isStreaming }: AuditPanelProps) {
  const auditState = useStore(auditStore);
  const artifacts = useStore(workbenchStore.artifacts);
  const [expanded, setExpanded] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const autoAuditFailureRef = useRef<{ sourceHash: string; nextRetryAt: number } | null>(null);

  const reportCounts = useMemo(() => {
    const report = auditState.report;

    return {
      critical: report?.critical.length ?? 0,
      high: report?.high.length ?? 0,
      medium: report?.medium.length ?? 0,
      low: report?.low.length ?? 0,
      polkadot: report?.polkadot.length ?? 0,
    };
  }, [auditState.report]);

  const totalFindings =
    reportCounts.critical + reportCounts.high + reportCounts.medium + reportCounts.low + reportCounts.polkadot;
  const canFix = auditState.status === 'ready' && Boolean(auditState.report) && !isFixing;

  const runAudit = useCallback(
    async (forced = false) => {
      const candidate = getLatestSolidityContract(artifacts);

      if (!candidate) {
        if (forced) {
          toast.error('No Solidity contract found to audit');
        }

        return 'no-source' as const;
      }

      const sourceHash = hashSource(candidate.source);

      if (!forced && sourceHash === auditState.sourceHash && auditState.status === 'ready') {
        return 'skipped' as const;
      }

      if (!forced && sourceHash === auditState.sourceHash && auditState.status === 'auditing') {
        return 'skipped' as const;
      }

      if (!forced && sourceHash === auditState.sourceHash && auditState.status === 'error') {
        const retryMeta = autoAuditFailureRef.current;

        if (retryMeta && retryMeta.sourceHash === sourceHash && Date.now() < retryMeta.nextRetryAt) {
          return 'skipped' as const;
        }
      }

      setAuditPending(sourceHash, candidate.filePath);

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: candidate.source,
          }),
        });

        const payload = (await response.json()) as ContractAuditResponse | { error: string };

        if (!response.ok || !('report' in payload)) {
          const error = 'error' in payload ? payload.error : 'Audit failed';
          throw new Error(error);
        }

        setAuditReady(sourceHash, candidate.filePath, payload.report);

        if (forced) {
          toast.success('Contract audit completed');
        }

        return 'success' as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Audit failed';
        setAuditError(sourceHash, candidate.filePath, message);

        if (!forced) {
          autoAuditFailureRef.current = {
            sourceHash,
            nextRetryAt: Date.now() + 30_000,
          };
        }

        if (forced) {
          toast.error(`Audit failed: ${message}`);
        }

        return 'error' as const;
      }
    },
    [artifacts, auditState.sourceHash, auditState.status],
  );

  useEffect(() => {
    if (auditState.status === 'idle') {
      return;
    }

    setExpanded(true);
  }, [auditState.sourceHash, auditState.status]);

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const MAX_AUTO_AUDIT_RETRIES = 20;
    const RETRY_MS = 800;

    const tryRunAudit = async (attempt: number) => {
      if (cancelled) {
        return;
      }

      const result = await runAudit(false);

      if (cancelled) {
        return;
      }

      if (result === 'no-source' && attempt < MAX_AUTO_AUDIT_RETRIES) {
        retryTimer = setTimeout(() => {
          tryRunAudit(attempt + 1);
        }, RETRY_MS);
      }
    };

    const timer = setTimeout(async () => {
      if (cancelled) {
        return;
      }

      await tryRunAudit(0);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [artifacts, isStreaming, runAudit]);

  const handleFixAndRedeploy = useCallback(async () => {
    if (isFixing) {
      return;
    }

    if (auditState.status !== 'ready' || !auditState.report) {
      toast.error('Run an audit first before using Fix');
      return;
    }

    const candidate = getLatestSolidityContract(artifacts);

    if (!candidate) {
      toast.error('No Solidity contract found to fix');
      return;
    }

    setIsFixing(true);

    try {
      const response = await fetch('/api/audit-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: candidate.source,
          report: auditState.report,
        }),
      });

      const payload = (await response.json()) as { source?: string; error?: string };

      if (!response.ok || !payload.source) {
        throw new Error(payload.error ?? 'Failed to generate fixed contract');
      }

      const filePath = normalizeWorkbenchFilePath(candidate.filePath);
      const fixedSource = payload.source.trim();
      const artifactId = `audit-fix-${Date.now()}`;

      workbenchStore.addArtifact({
        messageId: artifactId,
        id: artifactId,
        title: 'Audit fix + redeploy',
      });

      const actions: ActionCallbackData[] = [
        {
          artifactId,
          messageId: artifactId,
          actionId: '0',
          action: {
            type: 'file',
            filePath,
            content: fixedSource,
          },
        },
        {
          artifactId,
          messageId: artifactId,
          actionId: '1',
          action: {
            type: 'shell',
            content: 'node scripts/compile.cjs',
          },
        },
        {
          artifactId,
          messageId: artifactId,
          actionId: '2',
          action: {
            type: 'shell',
            content: 'rm -f src/contracts/deployedContract.json && node scripts/deploy.cjs',
          },
        },
      ];

      for (const action of actions) {
        workbenchStore.addAction(action);
        workbenchStore.runAction(action);
      }

      workbenchStore.showWorkbench.set(true);
      workbenchStore.currentView.set('code');
      workbenchStore.setSelectedFile(filePath);

      toast.success('Applied audit fixes and triggered compile/deploy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fix and redeploy';
      toast.error(message);
    } finally {
      setIsFixing(false);
    }
  }, [artifacts, auditState.report, auditState.status, isFixing]);

  return (
    <div className="border-b border-igriz-elements-borderColor bg-igriz-elements-background-depth-2/80 backdrop-blur-sm">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-igriz-elements-borderColor">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-igriz-elements-item-backgroundAccent text-igriz-elements-item-contentAccent">
          <div className="i-ph:shield-check text-base" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-igriz-elements-textPrimary leading-tight">Contract Audit</div>
          <div className="text-[10px] uppercase tracking-wide text-igriz-elements-textTertiary leading-tight">
            {auditState.status}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <StatusPill label="Critical" value={reportCounts.critical} tone="danger" />
          <StatusPill label="High" value={reportCounts.high} tone="accent" />
        </div>
        <button
          className="ml-1 text-[11px] px-2 py-1 rounded border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 text-igriz-elements-textSecondary hover:text-igriz-elements-textPrimary"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-3 space-y-3 max-h-80 overflow-y-auto">
          <div className="rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 px-2.5 py-2 text-[11px] text-igriz-elements-textTertiary truncate">
            Source: {auditState.sourceFile ?? 'Unknown contract'}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-2.5 py-1.5 text-xs rounded border border-igriz-elements-borderColor bg-igriz-elements-button-secondary-background text-igriz-elements-button-secondary-text hover:bg-igriz-elements-button-secondary-backgroundHover"
              onClick={() => runAudit(true)}
            >
              {auditState.status === 'ready' ? 'Re-audit' : 'Run audit'}
            </button>
            <button
              className="px-2.5 py-1.5 text-xs rounded border border-igriz-elements-borderColor bg-igriz-elements-item-backgroundAccent text-igriz-elements-item-contentAccent hover:bg-igriz-elements-button-primary-backgroundHover disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleFixAndRedeploy}
              disabled={!canFix}
              title={
                canFix ? 'Generate fixed contract from audit and redeploy' : 'Run audit first to enable Fix and Redeploy'
              }
            >
              {isFixing ? 'Fixing...' : 'Fix and Redeploy'}
            </button>
          </div>

          {auditState.status === 'idle' && (
            <div className="rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 p-2.5 text-xs text-igriz-elements-textSecondary">
              Waiting for generated Solidity contract. Audit starts automatically when contract files are ready.
            </div>
          )}

          {auditState.status === 'auditing' && (
            <div className="flex items-center gap-2 rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 p-2.5 text-xs text-igriz-elements-textSecondary">
              <div className="i-svg-spinners:90-ring-with-bg text-base" />
              Running AI security audit...
            </div>
          )}

          {auditState.status === 'error' && (
            <div className="text-xs text-igriz-elements-button-danger-text border border-igriz-elements-borderColor bg-igriz-elements-button-danger-background rounded-md p-2.5">
              {auditState.error ?? 'Audit failed'}
            </div>
          )}

          {auditState.status === 'ready' && (
            <>
              <div className="rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 p-2.5">
                <div className="text-xs text-igriz-elements-textPrimary font-medium">
                  {totalFindings === 0 ? 'Audit completed with no findings' : `${totalFindings} findings detected`}
                </div>
                <div className="mt-1 text-[11px] text-igriz-elements-textTertiary">
                  Review findings below, then acknowledge or dismiss to enable deployment.
                </div>
              </div>

              {(Object.keys(SEVERITY_META) as SeverityKey[]).map((severity) => (
                <SeveritySection
                  key={severity}
                  severity={severity}
                  findings={auditState.report?.[severity] ?? []}
                />
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="px-2.5 py-1.5 text-xs rounded border border-igriz-elements-borderColor bg-igriz-elements-button-primary-background text-igriz-elements-button-primary-text hover:bg-igriz-elements-button-primary-backgroundHover"
                  onClick={() => acknowledgeAudit()}
                >
                  Acknowledge
                </button>
                <button
                  className="px-2.5 py-1.5 text-xs rounded border border-igriz-elements-borderColor bg-igriz-elements-button-secondary-background text-igriz-elements-button-secondary-text hover:bg-igriz-elements-button-secondary-backgroundHover"
                  onClick={() => dismissAudit()}
                >
                  Dismiss
                </button>
              </div>

              {(auditState.acknowledged || auditState.dismissed) && (
                <div className="rounded-md border border-igriz-elements-borderColor bg-igriz-elements-item-backgroundAccent px-2.5 py-2 text-[11px] text-igriz-elements-item-contentAccent">
                  Audit acknowledged. Deployment is now unlocked.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SeveritySection({ severity, findings }: { severity: SeverityKey; findings: AuditFinding[] }) {
  const meta = SEVERITY_META[severity];

  return (
    <div className="rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-1 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-igriz-elements-borderColor">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-6 w-6 rounded-md border flex items-center justify-center ${meta.toneClasses}`}>
            <div className={`${meta.icon} text-sm`} />
          </div>
          <span className="text-xs font-semibold text-igriz-elements-textPrimary truncate">{meta.label}</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full border border-igriz-elements-borderColor text-igriz-elements-textSecondary bg-igriz-elements-background-depth-2">
          {findings.length}
        </span>
      </div>

      {findings.length > 0 && (
        <div className="p-2.5 space-y-2">
          {findings.map((finding, index) => (
            <div
              key={`${finding.title}-${index}`}
              className="text-[11px] rounded-md border border-igriz-elements-borderColor bg-igriz-elements-background-depth-2 p-2"
            >
              <div className="font-medium text-igriz-elements-textPrimary">{finding.title}</div>
              <div className="mt-1 text-igriz-elements-textSecondary">{finding.description}</div>
              <div className="mt-1 text-igriz-elements-textSecondary">
                <span className="text-igriz-elements-textPrimary">Fix:</span> {finding.recommendation}
              </div>
              {finding.location && (
                <div className="mt-1 text-igriz-elements-textTertiary">
                  <span className="text-igriz-elements-textSecondary">Location:</span> {finding.location}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {findings.length === 0 && (
        <div className="px-2.5 py-2 text-[11px] text-igriz-elements-textTertiary">No findings in this category.</div>
      )}
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'accent' }) {
  const toneClasses =
    tone === 'danger'
      ? 'text-igriz-elements-item-contentDanger bg-igriz-elements-item-backgroundDanger'
      : 'text-igriz-elements-item-contentAccent bg-igriz-elements-item-backgroundAccent';

  return (
    <div
      className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-igriz-elements-borderColor ${toneClasses}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function getLatestArtifact(artifacts: Record<string, ArtifactState>): ArtifactState | undefined {
  for (let i = workbenchStore.artifactIdList.length - 1; i >= 0; i--) {
    const artifactId = workbenchStore.artifactIdList[i];
    const artifact = artifacts[artifactId];

    if (artifact) {
      return artifact;
    }
  }

  return undefined;
}

function getLatestSolidityContract(
  artifacts: Record<string, ArtifactState>,
): { filePath: string; source: string } | undefined {
  const artifact = getLatestArtifact(artifacts);

  if (artifact) {
    const actionEntries = Object.entries(artifact.runner.actions.get()).sort(([a], [b]) => Number(a) - Number(b));

    for (let i = actionEntries.length - 1; i >= 0; i--) {
      const action = actionEntries[i][1];

      if (isSolidityFileAction(action)) {
        return {
          filePath: action.filePath,
          source: action.content,
        };
      }
    }
  }

  const files = Object.entries(workbenchStore.files.get())
    .filter((entry): entry is [string, { type: 'file'; content: string; isBinary: boolean }] => {
      return entry[1]?.type === 'file' && entry[0].toLowerCase().endsWith('.sol') && !entry[1].isBinary;
    })
    .sort(([a], [b]) => b.localeCompare(a));

  if (files.length === 0) {
    return undefined;
  }

  return {
    filePath: files[0][0],
    source: files[0][1].content,
  };
}

function isSolidityFileAction(action: ActionState): action is Extract<ActionState, { type: 'file' }> {
  return action.type === 'file' && action.filePath.toLowerCase().endsWith('.sol') && action.content.trim().length > 0;
}

function hashSource(source: string): string {
  let hash = 5381;

  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }

  return `sol-${hash >>> 0}`;
}

function normalizeWorkbenchFilePath(filePath: string): string {
  if (filePath.startsWith(`${WORK_DIR}/`)) {
    return filePath.slice(WORK_DIR.length + 1);
  }

  return filePath;
}
