import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStore } from '@nanostores/react';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { classNames } from '~/utils/classNames';
import { useState } from 'react';
import { VercelDeploymentLink } from '~/components/chat/VercelDeploymentLink.client';
import { useVercelDeploy } from '~/components/deploy/VercelDeploy.client';

interface DeployButtonProps {
  onVercelDeploy?: () => Promise<void>;
}

export const DeployButton = ({ onVercelDeploy }: DeployButtonProps) => {
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const isStreaming = useStore(streamingState);
  const { handleVercelDeploy } = useVercelDeploy();

  const handleVercelDeployClick = async () => {
    setIsDeploying(true);

    try {
      if (onVercelDeploy) {
        await onVercelDeploy();
      } else {
        await handleVercelDeploy();
      }
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex border border-igriz-elements-borderColor rounded-md overflow-hidden text-sm">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={isDeploying || !activePreview || isStreaming}
          className="rounded-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs bg-accent-500 text-white hover:text-igriz-elements-item-contentAccent [&:not(:disabled,.disabled)]:hover:bg-igriz-elements-button-primary-backgroundHover outline-accent-500 flex gap-1.7"
        >
          {isDeploying ? 'Deploying to Vercel...' : 'Deploy'}
          <span className={classNames('i-ph:caret-down transition-transform')} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className={classNames(
            'z-[250]',
            'bg-igriz-elements-background-depth-2',
            'rounded-lg shadow-lg',
            'border border-igriz-elements-borderColor',
            'animate-in fade-in-0 zoom-in-95',
            'py-1',
          )}
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className={classNames(
              'cursor-pointer flex items-center w-full px-4 py-2 text-sm text-igriz-elements-textPrimary hover:bg-igriz-elements-item-backgroundActive gap-2 rounded-md group relative',
              {
                'opacity-60 cursor-not-allowed': isDeploying || !activePreview || !vercelConn.user,
              },
            )}
            disabled={isDeploying || !activePreview || !vercelConn.user}
            onClick={handleVercelDeployClick}
          >
            <img
              className="w-5 h-5 bg-black p-1 rounded"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/vercel/white"
              alt="vercel"
            />
            <span className="mx-auto">{!vercelConn.user ? 'No Vercel Account Connected' : 'Deploy to Vercel'}</span>
            {vercelConn.user && <VercelDeploymentLink />}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};

