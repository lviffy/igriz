import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ErrorMonitor');

export interface DetectedError {
  timestamp: number;
  command: string;
  errorMessage: string;
  fullOutput: string;
  severity: 'critical' | 'warning';
}

export const detectedErrors = atom<DetectedError[]>([]);
export const autoHealEnabled = atom(true);

/**
 * Patterns that indicate critical errors requiring immediate attention
 */
const CRITICAL_ERROR_PATTERNS = [
  /ERROR:/i,
  /SyntaxError:/i,
  /TypeError:/i,
  /ReferenceError:/i,
  /Transform failed/i,
  /Failed to compile/i,
  /Module not found/i,
  /Cannot find module/i,
  /Unexpected token/i,
  /Expected .* but found/i,
  /Parse error/i,
  /ELIFECYCLE/i,
  /npm ERR!/i,
];

/**
 * Patterns to ignore (not actual errors)
 */
const IGNORE_PATTERNS = [
  /Deprecation Warning/i,
  /deprecated/i,
  /warning.*sass/i,
  /legacy.*api/i,
];

/**
 * Analyze command output for errors
 */
export function detectErrors(output: string, command: string): DetectedError | null {
  // Skip if output is too short
  if (output.length < 10) {
    return null;
  }

  // Check ignore patterns first
  if (IGNORE_PATTERNS.some(pattern => pattern.test(output))) {
    return null;
  }

  // Check for critical errors
  const hasCriticalError = CRITICAL_ERROR_PATTERNS.some(pattern => pattern.test(output));

  if (!hasCriticalError) {
    return null;
  }

  // Extract the actual error message
  const lines = output.split('\n');
  let errorMessage = '';

  // Find the line with the error
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (CRITICAL_ERROR_PATTERNS.some(pattern => pattern.test(line))) {
      // Get context: error line + next few lines
      errorMessage = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
      break;
    }
  }

  if (!errorMessage) {
    errorMessage = output.slice(0, 500); // First 500 chars as fallback
  }

  logger.error('Detected error in command output:', { command, errorMessage });

  return {
    timestamp: Date.now(),
    command,
    errorMessage,
    fullOutput: output,
    severity: 'critical',
  };
}

/**
 * Add detected error to the store
 */
export function reportError(error: DetectedError) {
  const current = detectedErrors.get();
  detectedErrors.set([...current, error]);
}

/**
 * Clear all detected errors
 */
export function clearErrors() {
  detectedErrors.set([]);
}

/**
 * Generate a fix prompt based on detected error
 */
export function generateFixPrompt(error: DetectedError): string {
  return `I detected an error during execution:

Command: \`${error.command}\`

Error:
\`\`\`
${error.errorMessage}
\`\`\`

Please analyze this error and fix it. Update the necessary files to resolve the issue.`;
}
