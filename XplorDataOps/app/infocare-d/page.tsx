import type { Metadata } from 'next';
import InfocareDWorkspace from '@/components/infocare-d/InfocareDWorkspace';

export const metadata: Metadata = {
  title: 'Infocare > D Migration — XplorDataOps',
};

export default function InfocareDPage() {
  return <InfocareDWorkspace />;
}
