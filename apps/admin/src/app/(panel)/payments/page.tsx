import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentsList } from '@/components/payments-list';

export const metadata: Metadata = { title: 'Payments' };

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsList />
    </Suspense>
  );
}
