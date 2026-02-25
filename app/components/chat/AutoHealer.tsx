import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import { detectedErrors, clearErrors, generateFixPrompt } from '~/lib/runtime/error-monitor';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('AutoHealer');

interface AutoHealerProps {
  onErrorDetected: (fixPrompt: string) => void;
  isLoading: boolean;
}

/**
 * Monitors for errors and automatically triggers fixes
 */
export function AutoHealer({ onErrorDetected, isLoading }: AutoHealerProps) {
  const errors = useStore(detectedErrors);
  const processedErrorIds = useRef(new Set<number>());
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Don't process if already loading or processing
    if (isLoading || isProcessingRef.current) {
      return;
    }

    // Check for new errors
    const newErrors = errors.filter(error => !processedErrorIds.current.has(error.timestamp));

    if (newErrors.length === 0) {
      return;
    }

    // Process the first unprocessed error
    const errorToFix = newErrors[0];
    
    logger.info('Auto-healing triggered for error:', {
      command: errorToFix.command,
      timestamp: errorToFix.timestamp,
    });

    // Mark as processed
    processedErrorIds.current.add(errorToFix.timestamp);
    isProcessingRef.current = true;

    // Generate fix prompt and trigger healing
    const fixPrompt = generateFixPrompt(errorToFix);
    
    // Small delay to ensure UI is ready
    setTimeout(() => {
      onErrorDetected(fixPrompt);
      isProcessingRef.current = false;
    }, 500);

    // Clear old errors after 30 seconds
    setTimeout(() => {
      const now = Date.now();
      processedErrorIds.current.forEach(timestamp => {
        if (now - timestamp > 30000) {
          processedErrorIds.current.delete(timestamp);
        }
      });
    }, 30000);
  }, [errors, isLoading, onErrorDetected]);

  // Reset processing flag when loading completes
  useEffect(() => {
    if (!isLoading) {
      isProcessingRef.current = false;
    }
  }, [isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearErrors();
      processedErrorIds.current.clear();
    };
  }, []);

  return null; // This is a logic-only component
}
