import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CertificateVerify } from '@/features/certificates/certificate-verify';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; code: string }> };

const CODE = /^KCP-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('certificates.verifyTitle'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: Params) {
  const { locale, code } = await params;
  if (!hasLocale(routing.locales, locale) || !CODE.test(code)) notFound();
  setRequestLocale(locale);
  return <CertificateVerify code={code} />;
}
