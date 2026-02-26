import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { DeployButton } from './DeployButton.client';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const currentView = useStore(workbenchStore.currentView);
  const isPreview = currentView === 'preview';

  const toggle = () => {
    workbenchStore.currentView.set(isPreview ? 'code' : 'preview');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Code label */}
      <span
        className={classNames(
          'text-xs font-medium transition-colors duration-200 cursor-pointer',
          !isPreview ? 'text-bolt-elements-item-contentAccent' : 'text-bolt-elements-textTertiary'
        )}
        onClick={() => workbenchStore.currentView.set('code')}
      >
        Code
      </span>

      {/* Toggle switch */}
      <button
        onClick={toggle}
        className="relative w-9 h-[18px] bg-gray-800 border border-gray-700 transition-colors duration-200 focus:outline-none"
        aria-label="Toggle between code and preview"
      >
        {/* Track background when active */}
        <div
          className={classNames(
            'absolute inset-0 transition-opacity duration-200',
            isPreview ? 'bg-bolt-elements-item-backgroundAccent opacity-100' : 'opacity-0'
          )}
        />
        {/* Knob */}
        <div
          className={classNames(
            'absolute top-[-1px] w-4 h-4 bg-gray-200 border border-gray-500 transition-all duration-300 ease-out',
            isPreview ? 'left-[18px]' : 'left-[-1px]'
          )}
        />
      </button>

      {/* Preview label */}
      <span
        className={classNames(
          'text-xs font-medium transition-colors duration-200 cursor-pointer',
          isPreview ? 'text-bolt-elements-item-contentAccent' : 'text-bolt-elements-textTertiary'
        )}
        onClick={() => workbenchStore.currentView.set('preview')}
      >
        Preview
      </span>

      {/* Vercel Deploy */}
      <div className="ml-2 pl-2 border-l border-bolt-elements-borderColor">
        <DeployButton />
      </div>
    </div>
  );
}
