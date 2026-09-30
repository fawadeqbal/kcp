import type { Locale } from '@kcp/i18n';
import { Container } from './layout';
import { SignUpLink, WaitlistLink } from './links';

/** The closing band of a page: sign up now, or join the waitlist. */
export function FinalCallToAction({
  title,
  body,
  locale,
}: {
  title: string;
  body: string;
  locale: Locale;
}) {
  return (
    <section aria-labelledby="final-title" className="bg-brand-700 text-white">
      <Container className="flex flex-col items-start gap-6 py-14 sm:py-16 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 id="final-title" className="text-2xl font-bold text-balance sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-lg text-brand-50">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <SignUpLink locale={locale} variant="light" />
          <WaitlistLink variant="outline-light" />
        </div>
      </Container>
    </section>
  );
}
