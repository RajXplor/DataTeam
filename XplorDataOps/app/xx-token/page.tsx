import type { Metadata } from 'next';
import XxTokenWorkspace from '@/components/xx-token/XxTokenWorkspace';

export const metadata: Metadata = {
  title: 'X>X TokenImport-XplorDataOps',
};

export default function XxTokenPage() {
  return <XxTokenWorkspace />;
}
