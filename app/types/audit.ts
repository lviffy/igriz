export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'polkadot';

export interface AuditFinding {
  title: string;
  description: string;
  recommendation: string;
  location?: string;
}

export interface ContractAuditReport {
  critical: AuditFinding[];
  high: AuditFinding[];
  medium: AuditFinding[];
  low: AuditFinding[];
  polkadot: AuditFinding[];
}

export interface ContractAuditResponse {
  report: ContractAuditReport;
}
