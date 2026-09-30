import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const features = [
    { title: t('safetyTitle'), body: t('safety') },
    { title: t('languagesTitle'), body: t('languages') },
    { title: t('buildTitle'), body: t('build') },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12">
      <section className="flex flex-col items-start gap-6 py-6">
        <h1 className="max-w-3xl text-4xl font-bold sm:text-5xl">{t('title')}</h1>
        <p className="max-w-2xl text-lg text-muted">{t('subtitle')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
          >
            {t('ctaParent')}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 font-semibold hover:bg-brand-50"
          >
            {t('ctaLogIn')}
          </Link>
          <Link
            href="/login/student"
            className="inline-flex min-h-11 items-center rounded-xl px-5 font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {t('ctaStudent')}
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
          >
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-muted">{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
