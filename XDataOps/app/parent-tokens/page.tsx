import type { Metadata } from 'next';
import ParentTokensWorkspace from '@/components/parent-tokens/ParentTokensWorkspace';

export const metadata: Metadata = {
  title: 'QK>X ParentTokens-XplorDataOps',
};

export default function ParentTokensPage() {
  return <ParentTokensWorkspace />;
}
