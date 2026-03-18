import { json, type MetaFunction } from '@remix-run/cloudflare';
import { LandingPage } from '~/components/landing/LandingPage';

export const meta: MetaFunction = () => {
  return [{ title: 'igriz' }, { name: 'description', content: 'Talk with igriz, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

export default function Index() {
  return <LandingPage />;
}
