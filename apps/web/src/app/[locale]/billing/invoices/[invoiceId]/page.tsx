import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { InvoicePage } from '@/features/billing/invoice-page';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; invoiceId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('billing.invoicesTitle'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, invoiceId } = await params;
  if (!hasLocale(routing.locales, locale) || !UUID.test(invoiceId)) notFound();
  setRequestLocale(locale);
  return <InvoicePage invoiceId={invoiceId} />;
}
