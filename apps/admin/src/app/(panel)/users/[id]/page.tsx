import type { Metadata } from 'next';
import { UserDetail } from '@/components/user-detail';

export const metadata: Metadata = { title: 'User' };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserDetail id={id} />;
}
