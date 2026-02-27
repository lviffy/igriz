import { useCallback, useState } from 'react';
import { json, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { LandingPage } from '~/components/landing/LandingPage';

export const meta: MetaFunction = () => {
  return [{ title: 'Igriz' }, { name: 'description', content: 'Build decentralized applications with Igriz, your AI-powered dApp builder' }];
};

export const loader = () => json({});

export default function Index() {
  const { id } = useLoaderData<{ id?: string }>();
  const [showChat, setShowChat] = useState(!!id);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  const handleLaunch = useCallback((prompt?: string) => {
    setInitialPrompt(prompt);
    setShowChat(true);
  }, []);

  if (!showChat) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat initialPrompt={initialPrompt} />}</ClientOnly>
    </div>
  );
}
