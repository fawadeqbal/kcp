import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FinalCallToAction } from '@/components/final-cta';
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  CodeIcon,
  GlobeIcon,
  PlayIcon,
  StarIcon,
  TrophyIcon,
  UserPlusIcon,
} from '@/components/icons';
import { Container, IconBadge, PageIntro, Section } from '@/components/layout';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return pageMetadata(locale, '/how-it-works', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function HowItWorksPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('howItWorks');
  const home = await getTranslations('home');

  const steps = [
    { icon: <UserPlusIcon />, title: t('setupTitle'), body: t('setup') },
    { icon: <CodeIcon />, title: t('lessonTitle'), body: t('lesson') },
    { icon: <CheckIcon />, title: t('checkTitle'), body: t('check') },
    { icon: <StarIcon />, title: t('projectTitle'), body: t('project') },
  ];
  const anatomy = [
    { icon: <PlayIcon />, title: t('watchTitle'), body: t('watch') },
    { icon: <BookIcon />, title: t('readTitle'), body: t('read') },
    { icon: <CodeIcon />, title: t('tryTitle'), body: t('try') },
  ];
  const motivation = [
    { icon: <ChartIcon />, text: t('xp') },
    { icon: <StarIcon />, text: t('badges') },
    { icon: <CalendarIcon />, text: t('streaks') },
    { icon: <TrophyIcon />, text: t('boards') },
  ];

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />

      <Container className="py-14 sm:py-20">
        <ol className="relative flex flex-col gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-5 rounded-card bg-surface p-6 sm:p-8">
              <span
                className="font-latin inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-2xl">
                  <span className="text-brand">{step.icon}</span>
                  {step.title}
                </h2>
                <p className="mt-2 max-w-3xl text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <Section id="anatomy" tone="surface" title={t('anatomyTitle')}>
        <ul className="grid gap-5 md:grid-cols-3">
          {anatomy.map((part) => (
            <li key={part.title} className="flex flex-col gap-3 rounded-card bg-raised p-6">
              <IconBadge>{part.icon}</IconBadge>
              <h3 className="text-lg font-bold">{part.title}</h3>
              <p className="text-muted">{part.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="motivation" title={t('motivationTitle')} subtitle={t('motivation')}>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {motivation.map((item) => (
            <li key={item.text} className="flex flex-col gap-3 rounded-card bg-surface p-6">
              <IconBadge tone="accent">{item.icon}</IconBadge>
              <p className="font-medium">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="parents" tone="surface" title={t('parentsTitle')}>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { icon: <ChartIcon />, title: t('dashboardTitle'), body: t('parents') },
            { icon: <GlobeIcon />, title: t('languagesTitle'), body: t('languages') },
          ].map((card) => (
            <div key={card.title} className="flex gap-4 rounded-card bg-raised p-6">
              <IconBadge>{card.icon}</IconBadge>
              <div>
                <h3 className="font-bold">{card.title}</h3>
                <p className="mt-1 text-muted">{card.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <FinalCallToAction title={home('finalTitle')} body={home('finalBody')} locale={locale} />
    </>
  );
}
