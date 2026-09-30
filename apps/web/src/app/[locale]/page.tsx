import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { buttonClass } from '@kcp/ui';
import { Avatar, Icon, IconBubble } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const features = [
    { icon: 'shield', tone: 'sage', title: t('safetyTitle'), body: t('safety') },
    { icon: 'globe', tone: 'brand', title: t('languagesTitle'), body: t('languages') },
    { icon: 'rocket', tone: 'brand', title: t('buildTitle'), body: t('build') },
  ] as const;

  return (
    <div className="mx-auto flex max-w-300 flex-col gap-10">
      <section className="relative isolate overflow-hidden rounded-[2.75rem] bg-brand-100 px-6 py-12 sm:px-12 sm:py-16">
        <span
          aria-hidden="true"
          className="absolute -end-20 -top-28 -z-10 size-96 rounded-full bg-brand-200"
        />
        <span
          aria-hidden="true"
          className="absolute end-60 -bottom-20 -z-10 size-44 rounded-full bg-sage-200 max-md:hidden"
        />
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <h1 className="text-5xl leading-[1.05] text-balance sm:text-6xl">{t('title')}</h1>
          <p className="max-w-xl text-lg text-brand-900">{t('subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className={buttonClass('primary', 'lg')}>
              {t('ctaParent')}
              <Icon name="arrow" />
            </Link>
            <Link href="/login" className={buttonClass('secondary', 'lg')}>
              {t('ctaLogIn')}
            </Link>
          </div>
          <Link
            href="/login/student"
            className="flex items-center gap-3 rounded-full bg-canvas py-2 ps-2 pe-5 font-bold transition-colors hover:bg-raised"
          >
            <Avatar avatarKey="star" size="sm" className="size-9" />
            {t('ctaStudent')}
            <Icon name="arrow" className="text-brand-text" />
          </Link>
        </div>
      </section>
      <section className="grid gap-4.5 md:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="flex flex-col gap-3 rounded-card bg-surface p-7">
            <IconBubble icon={f.icon} tone={f.tone} size="lg" />
            <h2 className="text-2xl">{f.title}</h2>
            <p className="text-muted">{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
