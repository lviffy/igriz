import { type ActionFunctionArgs } from '@remix-run/node';

export async function action(args: ActionFunctionArgs) {
  const { chatAction } = await import('~/lib/.server/actions/chat');
  return chatAction(args);
}
