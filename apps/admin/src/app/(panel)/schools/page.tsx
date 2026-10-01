import type { Metadata } from 'next';
import { SchoolsList } from '@/components/schools';

export const metadata: Metadata = { title: 'Schools' };

export default function SchoolsPage() {
  return <SchoolsList />;
}
