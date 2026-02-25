import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { fileModificationsToHTML } from '~/utils/diff';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import type { FailedActionState } from '~/lib/runtime/action-runner';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat({ initialPrompt }: { initialPrompt?: string }) {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory } = useChatHistory();

  return (
    <>
      {ready && <ChatImpl initialMessages={initialMessages} storeMessageHistory={storeMessageHistory} initialPrompt={initialPrompt} />}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  initialPrompt?: string;
}

export const ChatImpl = memo(({ initialMessages, storeMessageHistory, initialPrompt }: ChatProps) => {
  useShortcuts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0 || !!initialPrompt);
  const initialPromptSent = useRef(false);

  const { showChat } = useStore(chatStore);

  const [animationScope, animate] = useAnimate();

  // track auto-fix attempts to prevent infinite loops
  const autoFixAttemptRef = useRef(0);
  const MAX_AUTO_FIX_ATTEMPTS = 3;
  const isAutoFixingRef = useRef(false);

  const { messages, isLoading, input, handleInputChange, setInput, stop, append } = useChat({
    api: '/api/chat',
    onError: (error) => {
      logger.error('Request failed\n\n', error);
      toast.error('There was an error processing your request');
    },
    onFinish: () => {
      logger.debug('Finished streaming');

      // after AI finishes streaming, wait for all actions to complete and check for errors
      checkForErrorsAndAutoFix();
    },
    initialMessages,
  });

  /**
   * After the AI finishes responding, wait for all actions to complete,
   * then check for any failed shell actions and auto-send the errors
   * back to the AI for fixing.
   */
  const checkForErrorsAndAutoFix = async () => {
    // don't auto-fix if we've exceeded max attempts or already fixing
    if (autoFixAttemptRef.current >= MAX_AUTO_FIX_ATTEMPTS || isAutoFixingRef.current) {
      if (autoFixAttemptRef.current >= MAX_AUTO_FIX_ATTEMPTS) {
        logger.debug('Max auto-fix attempts reached, stopping auto-fix');
      }

      return;
    }

    // wait a bit for actions to start, then find the latest artifact's runner
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const artifact = workbenchStore.latestArtifact;

    if (!artifact) {
      return;
    }

    try {
      // wait for all queued actions in the runner to finish
      await artifact.runner.onAllActionsComplete;
    } catch {
      // actions may throw on failure, that's expected
    }

    // small delay to ensure action states are updated
    await new Promise((resolve) => setTimeout(resolve, 500));

    // collect failed actions with their output
    const failedActions = artifact.runner.getFailedActions();

    if (failedActions.length === 0) {
      // no errors — reset the auto-fix counter
      autoFixAttemptRef.current = 0;

      return;
    }

    // filter out npm install failures that are just warnings, and "npm run dev" which runs indefinitely
    const meaningfulFailures = failedActions.filter((action: FailedActionState) => {
      const content = action.type === 'shell' ? action.content : '';

      // skip npm run dev since it stays running
      if (content.includes('npm run dev') || content.includes('npm start')) {
        return false;
      }

      return true;
    });

    if (meaningfulFailures.length === 0) {
      autoFixAttemptRef.current = 0;

      return;
    }

    // build the error message
    const errorDetails = meaningfulFailures
      .map((action: FailedActionState, index: number) => {
        const command = action.type === 'shell' ? action.content : 'file action';
        const output = action.output || 'No output captured';

        return `**Error ${index + 1}:** Command: \`${command}\`\n\`\`\`\n${output.slice(-2000)}\n\`\`\``;
      })
      .join('\n\n');

    const autoFixMessage = `The following errors occurred while running the project. Please analyze and fix them:\n\n${errorDetails}\n\nPlease provide the complete fixed files and commands.`;

    logger.debug(`Auto-fixing errors (attempt ${autoFixAttemptRef.current + 1}/${MAX_AUTO_FIX_ATTEMPTS})`);

    isAutoFixingRef.current = true;
    autoFixAttemptRef.current++;

    toast.info(
      `Auto-fixing ${meaningfulFailures.length} error(s)... (attempt ${autoFixAttemptRef.current}/${MAX_AUTO_FIX_ATTEMPTS})`,
    );

    // send the error message as a user message for the AI to fix
    append({ role: 'user', content: autoFixMessage });

    isAutoFixingRef.current = false;
  };

  const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
  const { parsedMessages, parseMessages } = useMessageParser();

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  useEffect(() => {
    chatStore.setKey('started', initialMessages.length > 0);

    /**
     * Enable reload mode when loading a previous chat from history.
     * In reload mode, files are restored but non-essential shell commands
     * (compile, deploy) are skipped to avoid wasting time and gas.
     */
    if (initialMessages.length > 0) {
      workbenchStore.reloadMode.set(true);
    }
  }, []);

  useEffect(() => {
    /**
     * When new messages arrive beyond the initial set, turn off reload mode
     * so that new AI-generated artifacts execute all their shell commands normally.
     */
    if (messages.length > initialMessages.length) {
      workbenchStore.reloadMode.set(false);
    }

    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  }, [messages, isLoading, parseMessages]);

  const scrollTextArea = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  };

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
    workbenchStore.abortAllActions();
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const runAnimation = async () => {
    if (chatStarted) {
      return;
    }

    await Promise.all([
      animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
      animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
    ]);

    chatStore.setKey('started', true);

    setChatStarted(true);
  };

  const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
    const _input = messageInput || input;

    if (_input.length === 0 || isLoading) {
      return;
    }

    /**
     * @note (delm) Usually saving files shouldn't take long but it may take longer if there
     * many unsaved files. In that case we need to block user input and show an indicator
     * of some kind so the user is aware that something is happening. But I consider the
     * happy case to be no unsaved files and I would expect users to save their changes
     * before they send another message.
     */
    await workbenchStore.saveAllFiles();

    const fileModifications = workbenchStore.getFileModifcations();

    chatStore.setKey('aborted', false);

    runAnimation();

    if (fileModifications !== undefined) {
      const diff = fileModificationsToHTML(fileModifications);

      /**
       * If we have file modifications we append a new user message manually since we have to prefix
       * the user input with the file modifications and we don't want the new user input to appear
       * in the prompt. Using `append` is almost the same as `handleSubmit` except that we have to
       * manually reset the input and we'd have to manually pass in file attachments. However, those
       * aren't relevant here.
       */
      append({ role: 'user', content: `${diff}\n\n${_input}` });

      /**
       * After sending a new message we reset all modifications since the model
       * should now be aware of all the changes.
       */
      workbenchStore.resetAllFileModifications();
    } else {
      append({ role: 'user', content: _input });
    }

    setInput('');

    resetEnhancer();

    textareaRef.current?.blur();
  };

  const [messageRef, scrollRef] = useSnapScroll();

  // auto-send initial prompt from landing page
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current) {
      initialPromptSent.current = true;
      chatStore.setKey('started', true);
      chatStore.setKey('aborted', false);
      append({ role: 'user', content: initialPrompt });
    }
  }, [initialPrompt]);

  return (
    <BaseChat
      ref={animationScope}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      isStreaming={isLoading}
      enhancingPrompt={enhancingPrompt}
      promptEnhanced={promptEnhanced}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={handleInputChange}
      handleStop={abort}
      messages={messages.map((message, i) => {
        if (message.role === 'user') {
          return message;
        }

        return {
          ...message,
          content: parsedMessages[i] || '',
        };
      })}
      enhancePrompt={() => {
        enhancePrompt(input, (input) => {
          setInput(input);
          scrollTextArea();
        });
      }}
    />
  );
});
