import { AnimatePresence, motion } from 'framer-motion';
import type { ActionAlert } from '~/types/actions';
import { classNames } from '~/utils/classNames';

interface Props {
  alert: ActionAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

export function buildActionAlertPrompt(alert: ActionAlert) {
  const source = alert.source === 'preview' ? 'preview' : 'terminal';
  const descriptionSection = alert.description ? `Error summary: ${alert.description}\n\n` : '';
  const failedCommandSection = alert.failedCommand
    ? `Failed command:\n\`\`\`sh\n${alert.failedCommand}\n\`\`\`\n\n`
    : '';
  const remainingCommandsSection =
    alert.remainingCommands && alert.remainingCommands.length > 0
      ? `Remaining queued commands:\n\`\`\`sh\n${alert.remainingCommands.join('\n')}\n\`\`\`\n\n`
      : '';
  const defaultRecoveryInstructions =
    source === 'terminal'
      ? [
          'Follow this repair flow strictly:',
          '1. Read the terminal output and identify the root cause.',
          '2. Fix the relevant code, files, or config before retrying.',
          '3. Do not rerun the same failed command unchanged unless the failure is clearly transient and no fix is needed.',
          '4. Rerun only the failed command after the fix.',
          '5. Continue with the remaining queued commands only after the failed command succeeds.',
        ].join('\n')
      : 'Fix this preview error.';
  const instruction = alert.recoveryInstructions || defaultRecoveryInstructions;

  return `*${instruction}*\n\n${descriptionSection}${failedCommandSection}${remainingCommandsSection}\`\`\`${source === 'preview' ? 'js' : 'sh'}\n${alert.content}\n\`\`\`\n`;
}

export default function ChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { description, source } = alert;

  const isPreview = source === 'preview';
  const title = isPreview ? 'Preview Error' : 'Terminal Error';
  const message = isPreview
    ? 'We encountered an error while running the preview. Would you like igriz to analyze and help resolve this issue?'
    : 'We encountered an error while running terminal commands. Would you like igriz to analyze and help resolve this issue?';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg border border-igriz-elements-borderColor bg-igriz-elements-background-depth-2 p-4 mb-2`}
      >
        <div className="flex items-start">
          {/* Icon */}
          <motion.div
            className="flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className={`i-ph:warning-duotone text-xl text-igriz-elements-button-danger-text`}></div>
          </motion.div>
          {/* Content */}
          <div className="ml-3 flex-1">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`text-sm font-medium text-igriz-elements-textPrimary`}
            >
              {title}
            </motion.h3>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`mt-2 text-sm text-igriz-elements-textSecondary`}
            >
              <p>{message}</p>
              {description && (
                <div className="text-xs text-igriz-elements-textSecondary p-2 bg-igriz-elements-background-depth-3 rounded mt-4 mb-4">
                  Error: {description}
                </div>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={classNames(' flex gap-2')}>
                <button
                  onClick={() => postMessage(buildActionAlertPrompt(alert))}
                  className={classNames(
                    `px-2 py-1.5 rounded-md text-sm font-medium`,
                    'bg-igriz-elements-button-primary-background',
                    'hover:bg-igriz-elements-button-primary-backgroundHover',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-igriz-elements-button-danger-background',
                    'text-igriz-elements-button-primary-text',
                    'flex items-center gap-1.5',
                  )}
                >
                  <div className="i-ph:chat-circle-duotone"></div>
                  Ask igriz
                </button>
                <button
                  onClick={clearAlert}
                  className={classNames(
                    `px-2 py-1.5 rounded-md text-sm font-medium`,
                    'bg-igriz-elements-button-secondary-background',
                    'hover:bg-igriz-elements-button-secondary-backgroundHover',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-igriz-elements-button-secondary-background',
                    'text-igriz-elements-button-secondary-text',
                  )}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
