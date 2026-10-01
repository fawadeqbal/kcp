'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { Alert, Button, PageSpinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAccount } from '@/lib/use-account';

type Invoice = components['schemas']['InvoiceDto'];

/** One invoice (receipt), ready to print or save as PDF from the browser. */
export function InvoicePage({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const locale = useLocale();
  const user = useAccount('PARENT');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .GET('/v1/billing/invoices/{id}', { params: { path: { id: invoiceId } } })
      .then(({ data }) => (data ? setInvoice(data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user, invoiceId]);

  if (!user) return <PageSpinner />;
  if (failed) return <Alert tone="error">{t('invoiceNotFound')}</Alert>;
  if (!invoice) return <PageSpinner />;

  const money = (minor: number) => formatMoney(locale, minor, invoice.currency);
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'long' });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav
        aria-label={t('breadcrumb')}
        className="flex flex-wrap justify-between gap-3 print:hidden"
      >
        <BackLink href="/billing">{t('backToBilling')}</BackLink>
        <Button variant="secondary" onClick={() => window.print()}>
          {t('print')}
        </Button>
      </nav>
      <article className="flex flex-col gap-6 rounded-card bg-surface p-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-brand-text">{t('seller')}</p>
            <h1 className="mt-1 text-3xl">{t('invoiceTitle', { number: invoice.number })}</h1>
          </div>
          <dl className="text-sm">
            <dt className="text-muted">{t('invoiceDate')}</dt>
            <dd className="font-semibold">{date(invoice.issuedAt)}</dd>
            <dt className="mt-2 text-muted">{t('invoiceStatus')}</dt>
            <dd className="font-semibold">{t(`invoice${invoice.status}`)}</dd>
          </dl>
        </header>
        <section>
          <h2 className="text-sm text-muted">{t('billedTo')}</h2>
          <p className="font-semibold">{invoice.billedTo.name}</p>
          <p className="font-latin">
            <bdi>{invoice.billedTo.email}</bdi>
          </p>
        </section>
        <p>
          {t('invoicePeriod', { start: date(invoice.periodStart), end: date(invoice.periodEnd) })}
        </p>
        <table className="w-full text-start text-sm">
          <caption className="sr-only">{t('invoiceLines')}</caption>
          <thead className="border-b border-line text-muted">
            <tr>
              <th scope="col" className="py-2 text-start">
                {t('lineItem')}
              </th>
              <th scope="col" className="py-2 text-end">
                {t('lineQuantity')}
              </th>
              <th scope="col" className="py-2 text-end">
                {t('linePrice')}
              </th>
              <th scope="col" className="py-2 text-end">
                {t('lineTotal')}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.kind} className="border-b border-line">
                <td className="py-2">
                  {line.kind === 'first' ? t('lineFirst') : t('lineExtra')}
                  {invoice.planKey ? ` (${t(invoice.planKey as 'monthly' | 'yearly')})` : ''}
                </td>
                <td className="py-2 text-end">{line.quantity}</td>
                <td className="py-2 text-end">
                  <bdi>{money(line.unitMinor)}</bdi>
                </td>
                <td className="py-2 text-end">
                  <bdi>{money(line.unitMinor * line.quantity)}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="py-2 text-end">
                {t('total')}
              </th>
              <td className="py-2 text-end text-lg font-bold">
                <bdi>{money(invoice.amountMinor)}</bdi>
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="text-sm">
          {invoice.paidAt
            ? t('paidOn', {
                date: date(invoice.paidAt),
                method:
                  invoice.paidWith === 'CARD'
                    ? t('paidCard')
                    : (invoice.manualMethod ?? t('paidOther')),
              })
            : null}
        </p>
        {invoice.refundedMinor > 0 ? (
          <p className="text-sm font-semibold">
            {t('refundedAmount', { amount: money(invoice.refundedMinor) })}
          </p>
        ) : null}
      </article>
    </div>
  );
}
