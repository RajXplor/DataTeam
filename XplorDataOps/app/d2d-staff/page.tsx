import type { Metadata } from 'next';
import D2DStaffWorkspace from '@/components/d2d-staff/D2DStaffWorkspace';

export const metadata: Metadata = {
  title: 'D > D Staff — XplorDataOps',
};

export default function D2DStaffPage() {
  return <D2DStaffWorkspace />;
}
