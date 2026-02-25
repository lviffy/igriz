import { env } from 'node:process';
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt, getBlockchainSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
  state: 'result';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

function getQuaiPrivateKey(cloudflareEnv: Env): string | undefined {
  return env.PRIVATE_KEY_QUAI || cloudflareEnv.PRIVATE_KEY_QUAI;
}

function getDataHavenPrivateKey(cloudflareEnv: Env): string | undefined {
  return env.PRIVATE_KEY_DATAHAVEN || cloudflareEnv.PRIVATE_KEY_DATAHAVEN;
}

export function streamText(messages: Messages, cloudflareEnv: Env, options?: StreamingOptions) {
  const quaiPrivateKey = getQuaiPrivateKey(cloudflareEnv);
  const dataHavenPrivateKey = getDataHavenPrivateKey(cloudflareEnv);
  const systemPrompt = getSystemPrompt() + '\n\n' + getBlockchainSystemPrompt(quaiPrivateKey, undefined, dataHavenPrivateKey);

  return _streamText({
    model: getModel(getAPIKey(cloudflareEnv)),
    system: systemPrompt,
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
