import { type ActionFunctionArgs } from '@remix-run/node';

export async function action(args: ActionFunctionArgs) {
  const { enhancerAction } = await import('~/lib/.server/actions/enhancer');
  return enhancerAction(args);
}
