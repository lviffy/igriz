import { map } from 'nanostores';
import type { ContractAuditReport } from '~/types/audit';

export type AuditStatus = 'idle' | 'auditing' | 'ready' | 'error';

export interface AuditState {
  status: AuditStatus;
  sourceHash?: string;
  sourceFile?: string;
  report?: ContractAuditReport;
  error?: string;
  acknowledged: boolean;
  dismissed: boolean;
  auditedAt?: number;
}

const initialState: AuditState = {
  status: 'idle',
  acknowledged: false,
  dismissed: false,
};

export const auditStore = map<AuditState>(initialState);

export function setAuditPending(sourceHash: string, sourceFile?: string) {
  auditStore.set({
    status: 'auditing',
    sourceHash,
    sourceFile,
    acknowledged: false,
    dismissed: false,
  });
}

export function setAuditReady(sourceHash: string, sourceFile: string | undefined, report: ContractAuditReport) {
  auditStore.set({
    status: 'ready',
    sourceHash,
    sourceFile,
    report,
    acknowledged: false,
    dismissed: false,
    auditedAt: Date.now(),
  });
}

export function setAuditError(sourceHash: string, sourceFile: string | undefined, error: string) {
  auditStore.set({
    status: 'error',
    sourceHash,
    sourceFile,
    error,
    acknowledged: false,
    dismissed: false,
  });
}

export function acknowledgeAudit() {
  auditStore.setKey('acknowledged', true);
  auditStore.setKey('dismissed', false);
}

export function dismissAudit() {
  auditStore.setKey('dismissed', true);
  auditStore.setKey('acknowledged', false);
}
