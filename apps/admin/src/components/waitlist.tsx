'use client';

import { Alert, Card, PageSpinner } from '@kcp/ui';
import { api } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

const AGE_BANDS: Record<string, string> = { AGE_9_12: '9–12', AGE_13_16: '13–16' };
const LANGUAGES: Record<string, string> = { en: 'English', ar: 'Arabic', ur: 'Urdu' };
const countryName = (code: string) =>
  new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;

/**
 * Families waiting for their country to open, from the marketing site's waitlist. Only
 * confirmed addresses count; unconfirmed ones are forgotten after 30 days.
 */
export function WaitlistSummary() {
  const { data, error } = useLoad(() => api.GET('/v1/admin/waitlist'), 'waitlist');
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <PageSpinner label="Loading" />;
  const confirmed = data.countries.reduce((sum, c) => sum + c.confirmed, 0);
  return (
    <>
      <PageHeader
        title="Waitlist"
        description="Families who asked to hear when we open in their country. Only confirmed addresses count; ones never confirmed are removed after 30 days."
      />
      <div className="flex flex-col gap-6">
        <Card title={`By country · ${confirmed.toLocaleString('en')} confirmed`}>
          <Table
            bare
            caption="Waitlist by country"
            columns={['Country', 'Confirmed', 'Waiting for confirmation']}
            empty={data.countries.length === 0}
            emptyText="No one has joined yet."
          >
            {data.countries.map((c) => (
              <tr key={c.countryCode}>
                <Cell>
                  {countryName(c.countryCode)} <span className="text-muted">({c.countryCode})</span>
                </Cell>
                <Cell className="font-semibold">{c.confirmed.toLocaleString('en')}</Cell>
                <Cell>{c.pending.toLocaleString('en')}</Cell>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Latest confirmed (50)">
          <Table
            bare
            caption="Latest confirmed addresses"
            columns={['Email', 'Country', 'Child’s age', 'Language', 'Confirmed']}
            empty={data.latest.length === 0}
            emptyText="No confirmed addresses yet."
          >
            {data.latest.map((entry) => (
              <tr key={entry.email}>
                <Cell className="font-latin break-all">{entry.email}</Cell>
                <Cell>{entry.countryCode}</Cell>
                <Cell>{AGE_BANDS[entry.ageBand] ?? humanize(entry.ageBand)}</Cell>
                <Cell>{LANGUAGES[entry.languageCode] ?? entry.languageCode}</Cell>
                <Cell>{formatDateTime(entry.confirmedAt)}</Cell>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
