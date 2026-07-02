import type { Metadata } from 'next';
import X2XWorkspace from '@/components/x2x/X2XWorkspace';

export const metadata: Metadata = {
  title: 'X2X Migration - XplorDataOps',
};

export default function X2XPage() {
  return <X2XWorkspace />;
}
