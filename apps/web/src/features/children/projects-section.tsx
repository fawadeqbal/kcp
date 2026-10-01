'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { isolate } from '../auth/validation';
import { HubWork } from '../portfolio/hub-work';
import { PortfolioItems } from '../portfolio/portfolio-items';
import { sharedPortfolioUrl } from '../portfolio/shared-portfolio';

type Child = components['schemas']['ChildDto'];
type ChildPortfolio = components['schemas']['ChildPortfolioDto'];

/**
 * A child's shipped projects, and the link that shares them. The link only exists
 * while "Public projects" is on; switching it off retires the link for good.
 */
export function ProjectsSection({ child }: { child: Child }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const inputId = useId();
  const [portfolio, setPortfolio] = useState<ChildPortfolio | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  /** Numbers each load and link change, so an older answer never replaces a newer one. */
  const latest = useRef(0);
  const publicOn = child.consents.publicPortfolio;

  useEffect(() => {
    const request = ++latest.current;
    api
      .GET('/v1/children/{id}/portfolio', {
        params: { path: { id: child.id }, query: { lang: locale } },
      })
      .then(({ data }) => {
        if (request !== latest.current) return;
        if (data) setPortfolio(data);
        else setFailed(true);
      })
      .catch(() => {
        if (request === latest.current) setFailed(true);
      });
    return () => {
      latest.current++;
    };
    // Reload when "Public projects" changes and again once the change is saved (the
    // child is replaced by the server's copy): the link may have been retired.
  }, [child, locale]);

  // Sharing follows what the server says, not the switch while it is still saving.
  const allowed = publicOn && (portfolio?.share.allowed ?? false);
  const token = portfolio?.share.token ?? null;
  const link = token ? sharedPortfolioUrl(locale, token) : null;
  const nickname = isolate(child.nickname);

  async function makeLink() {
    latest.current++;
    setBusy(true);
    setStatus(null);
    try {
      const { data } = await api.POST('/v1/children/{id}/portfolio/share-link', {
        params: { path: { id: child.id } },
      });
      if (!data) throw new Error('failed');
      setPortfolio((current) => (current ? { ...current, share: data } : current));
    } catch {
      setStatus({ tone: 'error', text: t('shareFailed') });
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    latest.current++;
    setBusy(true);
    setStatus(null);
    try {
      const { response } = await api.DELETE('/v1/children/{id}/portfolio/share-link', {
        params: { path: { id: child.id } },
      });
      if (!response.ok) throw new Error('failed');
      setPortfolio((current) =>
        current ? { ...current, share: { ...current.share, token: null } } : current,
      );
    } catch {
      setStatus({ tone: 'error', text: t('shareFailed') });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus({ tone: 'success', text: t('shareCopied') });
    } catch {
      // Clipboard blocked: the link is selected in the field for copying by hand.
      (document.getElementById(inputId) as HTMLInputElement | null)?.select();
    }
  }

  return (
    <>
      {failed ? <Alert tone="error">{t('projectsFailed')}</Alert> : null}
      {portfolio && portfolio.items.length === 0 && portfolio.hubWork.length === 0 ? (
        <p className="text-sm text-muted">{t('projectsEmpty', { nickname })}</p>
      ) : null}
      {portfolio && portfolio.items.length > 0 ? (
        <PortfolioItems items={portfolio.items} headingLevel={5} compact />
      ) : null}
      {portfolio ? <HubWork items={portfolio.hubWork} headingLevel={5} compact /> : null}

      {portfolio ? (
        <div className="flex flex-col gap-3">
          <h5 className="font-sans text-sm font-bold">{t('shareTitle')}</h5>
          {!allowed ? (
            <p className="flex gap-2.5 rounded-row border-2 border-dashed border-line p-3.5 text-sm text-muted">
              <Icon name="share" className="mt-0.5 shrink-0 text-base" />
              {t('shareOff', { nickname })}
            </p>
          ) : link ? (
            <>
              <label htmlFor={inputId} className="text-sm font-semibold">
                {t('shareLabel', { nickname })}
              </label>
              <input
                id={inputId}
                readOnly
                dir="ltr"
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                className="font-latin w-full rounded-full border border-line bg-canvas px-4 py-2 text-start text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void copy()}>
                  {t('shareCopy')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void makeLink()}
                  loading={busy}
                >
                  {t('shareRenew')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void stopSharing()}
                  disabled={busy}
                >
                  {t('shareStop')}
                </Button>
              </div>
              <p className="text-xs text-muted">{t('shareRenewHint')}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{t('shareNone', { nickname })}</p>
              <Button
                className="self-start"
                size="sm"
                onClick={() => void makeLink()}
                loading={busy}
              >
                {t('shareCreate')}
              </Button>
            </>
          )}
          <p
            aria-live="polite"
            className={status?.tone === 'error' ? 'text-sm text-danger' : 'text-sm text-sage-text'}
          >
            {status?.text}
          </p>
        </div>
      ) : null}
    </>
  );
}
