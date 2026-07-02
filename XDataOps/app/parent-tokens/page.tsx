import type { Metadata } from 'next';
import ParentTokensWorkspace from '@/components/parent-tokens/ParentTokensWorkspace';

export const metadata: Metadata = {
  title: 'Parent Tokens & Banking - XplorDataOps',
};

export default function ParentTokensPage() {
  return <ParentTokensWorkspace />;
}
