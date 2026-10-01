'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useRef, useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  PageSpinner,
  SectionHeading,
  SelectField,
  Spinner,
  TextField,
  textareaClass,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, API_URL, freshAccessToken } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { Markdown } from '../learn/markdown';
import {
  DeliveryStatusBadge,
  InvoiceStatusBadge,
  Money,
  NoticeArea,
  ProjectStatusBadge,
  previewUrl,
  TaskStatusBadge,
  useAction,
  useDuration,
  useErrorText,
  useLoad,
} from './hub-common';
import { MessagesCard } from './lead-project';

type Me = components['schemas']['ClientMeDto'];
type Intake = components['schemas']['IntakeDto'];
type Invoice = components['schemas']['HubInvoiceDto'];

const BUDGETS = ['UNDER_500', 'FROM_500', 'FROM_2000', 'FROM_5000', 'UNSURE'] as const;

/** The client agreement: read it, then the owner signs it (nothing else works before). */
function AgreementGate({ me, onSigned }: { me: Me; onSigned: (me: Me) => void }) {
  const t = useTranslations('client.agreement');
  const [agree, setAgree] = useState(false);
  const { busy, notice, run } = useAction();
  const contract = useLoad(
    async () =>
      (await api.GET('/v1/hub/contracts/{kind}', { params: { path: { kind: 'client' } } })).data,
    [],
  );
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <SectionHeading level={1}>{t('title')}</SectionHeading>
      <p className="text-lg text-muted">{t('intro', { org: isolate(me.org.name) })}</p>
      {contract.data ? (
        <Card>
          <div className="max-h-[28rem] overflow-auto">
            <Markdown sections="h3">{contract.data.body}</Markdown>
          </div>
        </Card>
      ) : (
        <Spinner />
      )}
      {me.role === 'OWNER' ? (
        <>
          <Checkbox
            label={t('agree', { org: isolate(me.org.name) })}
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <NoticeArea notice={notice} />
          <Button
            className="self-start"
            disabled={!agree || !contract.data}
            loading={busy === 'sign'}
            onClick={() =>
              void run('sign', async () => {
                const result = await api.POST('/v1/client/agreement', {
                  body: { version: contract.data!.version, agree: true },
                });
                if (result.data) onSigned(result.data);
                return result;
              })
            }
          >
            {t('sign')}
          </Button>
        </>
      ) : (
        <Alert tone="info">{t('ownerSigns')}</Alert>
      )}
    </div>
  );
}

/** The client's account, signed in; with the agreement signed (or the gate). */
function useClient() {
  const user = useAccount('CLIENT');
  const me = useLoad(async () => (await api.GET('/v1/client/me')).data, [user?.id]);
  return { user, me };
}

function RequestForm({ onMade }: { onMade: (intake: Intake) => void }) {
  const t = useTranslations('client.request');
  const { busy, notice, run } = useAction();
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>('FROM_500');
  const [deadline, setDeadline] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run('make', async () => {
      const result = await api.POST('/v1/client/intakes', {
        body: {
          title: title.trim(),
          brief: brief.trim(),
          budget,
          ...(deadline ? { deadline } : {}),
        },
      });
      if (result.data) onMade(result.data);
      return result;
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label={t('title')}
        value={title}
        maxLength={120}
        required
        onChange={(e) => setTitle(e.target.value)}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t('brief')}</span>
        <textarea
          className={clsx(textareaClass(), 'min-h-32')}
          value={brief}
          maxLength={5000}
          required
          onChange={(e) => setBrief(e.target.value)}
        />
        <span className="text-sm text-muted">{t('briefHint')}</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t('budget')}
          value={budget}
          onChange={(e) => setBudget(e.target.value as typeof budget)}
        >
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {t(`budgets.${b}`)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('deadline')}
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <NoticeArea notice={notice} />
      <Button
        type="submit"
        className="self-start"
        loading={busy === 'make'}
        disabled={title.trim().length < 3 || brief.trim().length < 20}
      >
        <Icon name="send" />
        {t('send')}
      </Button>
    </form>
  );
}

/** The client portal's home: projects, requests and invoices. */
export function ClientHomePage() {
  const t = useTranslations('client');
  const format = useFormatter();
  const router = useRouter();
  const { user, me } = useClient();
  const projects = useLoad(
    async () => (await api.GET('/v1/client/projects')).data,
    [user?.id, me.data?.needsAgreement],
  );
  const intakes = useLoad(
    async () => (await api.GET('/v1/client/intakes')).data,
    [user?.id, me.data?.needsAgreement],
  );
  const invoices = useLoad(
    async () => (await api.GET('/v1/client/invoices')).data,
    [user?.id, me.data?.needsAgreement],
  );
  const [asking, setAsking] = useState(false);
  if (!user || (!me.data && !me.failed)) return <PageSpinner />;
  if (!me.data) return <Alert tone="error">{t('loadFailed')}</Alert>;
  if (me.data.needsAgreement)
    return <AgreementGate me={me.data} onSigned={(next) => me.setData(next)} />;
  const open = (invoices.data ?? []).filter((i) => i.status === 'OPEN');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <SectionHeading level={1}>{isolate(me.data.org.name)}</SectionHeading>
          <p className="text-muted">{t('intro')}</p>
        </div>
        <Link href="/client/settings" className={buttonClass('secondary', 'sm')}>
          <Icon name="settings" />
          {t('settingsLink')}
        </Link>
      </header>
      {open.length ? (
        <Alert tone="warning">
          {t('openInvoices', { count: open.length })}{' '}
          <Link href={`/client/invoices/${open[0]!.id}`} className="font-bold underline">
            {t('seeInvoice')}
          </Link>
        </Alert>
      ) : null}
      <Card title={t('projects')}>
        {(projects.data ?? []).length === 0 ? (
          <EmptyState icon="rocket" title={t('noProjects')} body={t('noProjectsHint')} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {(projects.data ?? []).map((project) => (
              <li key={project.id}>
                <Link
                  href={`/client/projects/${project.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-row bg-raised px-4 py-3 hover:bg-ink/5"
                >
                  <span className="text-muted">{project.reference}</span>
                  <span className="flex-1 font-bold">{isolate(project.title)}</span>
                  <ProjectStatusBadge status={project.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card
        title={t('requests')}
        actions={
          !asking ? (
            <Button size="sm" onClick={() => setAsking(true)}>
              <Icon name="plus" />
              {t('newRequest')}
            </Button>
          ) : null
        }
      >
        {asking ? (
          <div className="mb-4 rounded-inner bg-raised p-4">
            <RequestForm onMade={(intake) => router.push(`/client/requests/${intake.id}`)} />
          </div>
        ) : null}
        {(intakes.data ?? []).length === 0 ? (
          <p className="text-muted">{t('noRequests')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(intakes.data ?? []).map((intake) => (
              <li key={intake.id}>
                <Link
                  href={`/client/requests/${intake.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-4 py-2.5 hover:bg-ink/5"
                >
                  <span className="text-muted">{intake.reference}</span>
                  <span className="flex-1 font-semibold">{isolate(intake.title)}</span>
                  <span className="text-sm text-muted">
                    {format.dateTime(new Date(intake.createdAt), { dateStyle: 'medium' })}
                  </span>
                  <Badge
                    tone={
                      intake.status === 'ACCEPTED'
                        ? 'success'
                        : intake.status === 'DECLINED'
                          ? 'neutral'
                          : 'warning'
                    }
                  >
                    {t(`intakeStatus.${intake.status}`)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t('invoices')}>
        {(invoices.data ?? []).length === 0 ? (
          <p className="text-muted">{t('noInvoices')}</p>
        ) : (
          <InvoiceList invoices={invoices.data ?? []} />
        )}
      </Card>
    </div>
  );
}

function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const t = useTranslations('client');
  const format = useFormatter();
  return (
    <ul className="flex flex-col gap-2">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <Link
            href={`/client/invoices/${invoice.id}`}
            className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-4 py-2.5 hover:bg-ink/5"
          >
            <span className="font-semibold">{invoice.reference}</span>
            <span className="flex-1 text-sm text-muted">
              {isolate(invoice.projectTitle)} · {t(`invoiceKind.${invoice.kind}`)} ·{' '}
              {format.dateTime(new Date(invoice.issuedAt), { dateStyle: 'medium' })}
            </span>
            <Money minor={invoice.amountMinor} currency={invoice.currency} />
            <InvoiceStatusBadge status={invoice.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One request: what was asked, its files (up to 5), and what happened to it. */
export function ClientRequestPage({ id }: { id: string }) {
  const t = useTranslations('client.request');
  const format = useFormatter();
  const errorText = useErrorText();
  const { user, me } = useClient();
  const intake = useLoad(
    async () => (await api.GET('/v1/client/intakes/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { busy, notice, setNotice, run } = useAction();
  if (!user || (!intake.data && !intake.failed)) return <PageSpinner />;
  if (!intake.data || me.data?.needsAgreement) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/client">{t('back')}</BackLink>
        <Alert tone="error">{t('loadFailed')}</Alert>
      </div>
    );
  }
  const r = intake.data;

  async function upload(file: File) {
    setUploading(true);
    setNotice(null);
    try {
      const token = await freshAccessToken();
      const response = await fetch(`${API_URL}/v1/client/intakes/${id}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: file,
      });
      const body = (await response.json().catch(() => null)) as Intake | null;
      if (response.ok && body) {
        intake.setData(body);
        setNotice({ tone: 'success', text: t('uploaded', { name: file.name }) });
      } else setNotice({ tone: 'error', text: errorText(body) });
    } catch {
      setNotice({ tone: 'error', text: errorText(null, true) });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  async function download(fileId: string, name: string) {
    const token = await freshAccessToken();
    const response = await fetch(`${API_URL}/v1/client/intakes/${id}/files/${fileId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  const editable = r.status === 'NEW' || r.status === 'UNCONFIRMED';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <BackLink href="/client">{t('back')}</BackLink>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{isolate(r.title)}</h1>
        <span className="text-muted">{r.reference}</span>
      </header>
      {r.status === 'NEW' ? <Alert tone="info">{t('waiting')}</Alert> : null}
      {r.status === 'DECLINED' ? (
        <Alert tone="warning">{t('declined', { reason: r.declineReason ?? '' })}</Alert>
      ) : null}
      {r.status === 'ACCEPTED' && r.projectId ? (
        <Alert tone="success">
          {t('accepted')}{' '}
          <Link href={`/client/projects/${r.projectId}`} className="font-bold underline">
            {t('openProject')}
          </Link>
        </Alert>
      ) : null}
      <Card>
        <p className="whitespace-pre-line">{r.brief}</p>
        <p className="mt-3 text-sm text-muted">
          {t(`budgets.${r.budget}`)}
          {r.deadline
            ? ` · ${t('by', { date: format.dateTime(new Date(r.deadline), { dateStyle: 'medium' }) })}`
            : null}
        </p>
      </Card>
      <Card title={t('files')}>
        <NoticeArea notice={notice} />
        {r.files.length === 0 ? <p className="text-muted">{t('noFiles')}</p> : null}
        <ul className="flex flex-col gap-1.5">
          {r.files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2"
            >
              <Icon name="file" />
              <button
                type="button"
                className="flex-1 text-start font-semibold hover:underline"
                onClick={() => void download(file.id, file.name)}
              >
                <bdi>{file.name}</bdi>
              </button>
              <span className="text-sm text-muted">{Math.ceil(file.size / 1024)} KB</span>
              {editable ? (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy === file.id}
                  onClick={() =>
                    void run(file.id, async () => {
                      const result = await api.DELETE('/v1/client/intakes/{id}/files/{fileId}', {
                        params: { path: { id, fileId: file.id } },
                      });
                      if (result.data) intake.setData(result.data);
                      return result;
                    })
                  }
                >
                  <Icon name="trash" />
                  <span className="sr-only">{t('removeFile')}</span>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {editable && r.files.length < 5 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={input}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
              className="sr-only"
              id="intake-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <label htmlFor="intake-file" className={buttonClass('secondary', 'sm')}>
              {uploading ? <Spinner /> : <Icon name="plus" />}
              {t('addFile')}
            </label>
            <span className="text-sm text-muted">{t('fileHint')}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/** A project for its client: quotes to approve, deliverables, milestones, messages, invoices. */
export function ClientProjectPage({ id }: { id: string }) {
  const t = useTranslations('client.project');
  const locale = useLocale();
  const format = useFormatter();
  const duration = useDuration();
  const { user, me } = useClient();
  const project = useLoad(
    async () => (await api.GET('/v1/client/projects/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const team = useLoad(
    async () => (await api.GET('/v1/client/projects/{id}/team', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const deliveries = useLoad(
    async () =>
      (await api.GET('/v1/client/projects/{id}/deliveries', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const changes = useLoad(
    async () =>
      (await api.GET('/v1/client/projects/{id}/changes', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const [agreeSow, setAgreeSow] = useState<Record<string, boolean>>({});
  const [declineReason, setDeclineReason] = useState('');
  const [portfolio, setPortfolio] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [change, setChange] = useState('');
  const { busy, notice, run } = useAction();
  if (!user || (!project.data && !project.failed)) return <PageSpinner />;
  if (!project.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/client">{t('back')}</BackLink>
        <Alert tone="error">{t('loadFailed')}</Alert>
      </div>
    );
  }
  const p = project.data;
  const owner = me.data?.role === 'OWNER';
  const waitingQuotes = p.quotes.filter((q) => q.status === 'SENT');
  const approved = p.quotes.filter((q) => q.status === 'APPROVED');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <BackLink href="/client">{t('back')}</BackLink>
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{isolate(p.title)}</h1>
          <span className="text-muted">{p.reference}</span>
          <ProjectStatusBadge status={p.status} />
        </div>
        <p className="text-muted">
          {p.leadName ? t('lead', { name: isolate(p.leadName) }) : t('noLead')}
        </p>
      </header>
      <NoticeArea notice={notice} />

      {waitingQuotes.map((quote) => (
        <Card
          key={quote.id}
          tone="brand"
          kicker={t(`quoteKind.${quote.kind}`)}
          title={t('quoteToApprove', { version: quote.version })}
        >
          <p className="text-2xl font-bold">
            <Money minor={quote.priceMinor} currency={p.currency} />
          </p>
          {quote.depositMinor ? (
            <p className="text-muted">
              {t('deposit')} <Money minor={quote.depositMinor} currency={p.currency} />
            </p>
          ) : null}
          {quote.note ? <p className="mt-2">{quote.note}</p> : null}
          <div className="mt-3 max-h-96 overflow-auto rounded-inner bg-surface p-4">
            <Markdown>{quote.sowText}</Markdown>
          </div>
          {owner ? (
            <div className="mt-4 flex flex-col gap-3">
              <Checkbox
                label={t('agreeSow')}
                checked={agreeSow[quote.id] ?? false}
                onChange={(e) => setAgreeSow((now) => ({ ...now, [quote.id]: e.target.checked }))}
              />
              <div className="flex flex-wrap gap-2.5">
                <Button
                  disabled={!agreeSow[quote.id]}
                  loading={busy === `ok:${quote.id}`}
                  onClick={() =>
                    void run(
                      `ok:${quote.id}`,
                      async () => {
                        const result = await api.POST(
                          '/v1/client/projects/{id}/quotes/{quoteId}/approve',
                          {
                            params: { path: { id, quoteId: quote.id } },
                            body: { sowVersion: quote.sowVersion, agree: true },
                          },
                        );
                        if (result.data) project.setData(result.data);
                        return result;
                      },
                      t('approved'),
                    )
                  }
                >
                  {t('approve')}
                </Button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  {t('declineQuote')}
                </summary>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <TextField
                    label={t('declineReason')}
                    value={declineReason}
                    maxLength={500}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    disabled={declineReason.trim().length < 3}
                    loading={busy === `no:${quote.id}`}
                    onClick={() =>
                      void run(
                        `no:${quote.id}`,
                        async () => {
                          const result = await api.POST(
                            '/v1/client/projects/{id}/quotes/{quoteId}/decline',
                            {
                              params: { path: { id, quoteId: quote.id } },
                              body: { reason: declineReason.trim() },
                            },
                          );
                          if (result.data) project.setData(result.data);
                          return result;
                        },
                        t('declined'),
                      )
                    }
                  >
                    {t('decline')}
                  </Button>
                </div>
              </details>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{t('ownerApproves')}</p>
          )}
        </Card>
      ))}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card title={t('summary')}>
            <Markdown>{p.summary}</Markdown>
          </Card>
          <Card title={t('milestones')}>
            {!deliveries.data ? (
              <Spinner />
            ) : deliveries.data.length === 0 ? (
              <p className="text-muted">{t('noMilestones')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {deliveries.data.map((d) => (
                  <li key={d.id} className="flex flex-col gap-2 rounded-inner bg-raised p-4">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-muted">{d.reference}</span>
                      <span className="flex-1 font-bold">{isolate(d.title)}</span>
                      {d.final ? <Badge tone="brand">{t('final')}</Badge> : null}
                      <DeliveryStatusBadge status={d.status} />
                    </p>
                    <p className="whitespace-pre-line text-sm">{d.notes}</p>
                    <p className="text-sm text-muted">
                      {format.dateTime(new Date(d.submittedAt), { dateStyle: 'medium' })}
                    </p>
                    {d.previewToken ? (
                      <a
                        href={previewUrl(d.previewToken, locale)}
                        target="_blank"
                        rel="noreferrer"
                        className={clsx(buttonClass('secondary', 'sm'), 'self-start')}
                      >
                        <Icon name="eye" />
                        {t('openPreview')}
                      </a>
                    ) : null}
                    {d.status === 'SUBMITTED' ? (
                      <div className="flex flex-col gap-2 border-t border-line pt-3">
                        {owner ? (
                          <>
                            {d.final ? (
                              <Checkbox
                                label={t('allowPortfolio')}
                                checked={portfolio}
                                onChange={(e) => setPortfolio(e.target.checked)}
                              />
                            ) : null}
                            <Button
                              className="self-start"
                              loading={busy === `acc:${d.id}`}
                              onClick={() =>
                                void run(
                                  `acc:${d.id}`,
                                  () =>
                                    api.POST(
                                      '/v1/client/projects/{id}/deliveries/{deliveryId}/accept',
                                      {
                                        params: { path: { id, deliveryId: d.id } },
                                        body: d.final ? { allowPortfolio: portfolio } : {},
                                      },
                                    ),
                                  d.final ? t('acceptedFinal') : t('acceptedMilestone'),
                                ).then(async (ok) => {
                                  if (ok)
                                    await Promise.all([deliveries.reload(), project.reload()]);
                                })
                              }
                            >
                              <Icon name="check" />
                              {d.final ? t('acceptFinal') : t('accept')}
                            </Button>
                            {d.final ? (
                              <p className="text-sm text-muted">{t('acceptFinalNote')}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-muted">{t('ownerAccepts')}</p>
                        )}
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold">{t('changesLabel')}</span>
                          <textarea
                            className={textareaClass()}
                            maxLength={3000}
                            value={feedback[d.id] ?? ''}
                            onChange={(e) =>
                              setFeedback((now) => ({ ...now, [d.id]: e.target.value }))
                            }
                          />
                        </label>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="self-start"
                          disabled={(feedback[d.id] ?? '').trim().length < 5}
                          loading={busy === `chg:${d.id}`}
                          onClick={() =>
                            void run(
                              `chg:${d.id}`,
                              () =>
                                api.POST(
                                  '/v1/client/projects/{id}/deliveries/{deliveryId}/request-changes',
                                  {
                                    params: { path: { id, deliveryId: d.id } },
                                    body: { comment: (feedback[d.id] ?? '').trim() },
                                  },
                                ),
                              t('changesSent'),
                            ).then(async (ok) => {
                              if (ok) await Promise.all([deliveries.reload(), changes.reload()]);
                            })
                          }
                        >
                          {t('askChanges')}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <MessagesCard
            load={async () =>
              (await api.GET('/v1/client/projects/{id}/comments', { params: { path: { id } } }))
                .data
            }
            send={(body) =>
              api.POST('/v1/client/projects/{id}/comments', {
                params: { path: { id } },
                body: { body },
              })
            }
          />
        </div>
        <div className="flex flex-col gap-4">
          {approved.map((quote) => (
            <Card key={quote.id} title={t('deliverables', { version: quote.version })}>
              <ul className="flex flex-col gap-1.5">
                {quote.deliverables.map((task) => (
                  <li key={task.number} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex-1 font-semibold">{isolate(task.title)}</span>
                    <span className="text-muted">{duration(task.estimateMinutes)}</span>
                    <TaskStatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <Card title={t('team')}>
            {(team.data ?? []).length === 0 ? (
              <p className="text-muted">{t('noTeam')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(team.data ?? []).map((m) => (
                  <li key={m.pseudonym} className="rounded-row bg-raised px-3 py-2">
                    <p className="font-semibold">{m.pseudonym}</p>
                    <p className="text-sm text-muted">
                      {t('mate', { tasks: m.tasksDone, projects: m.shippedProjects })}
                      {m.skills.length ? (
                        <>
                          {' · '}
                          <span dir="ltr">{m.skills.slice(0, 5).join(', ')}</span>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted">{t('anonymous')}</p>
          </Card>
          <Card title={t('changes')}>
            {(changes.data ?? []).map((c) => (
              <div key={c.id} className="mb-2 rounded-row bg-raised px-3 py-2 text-sm">
                <p className="whitespace-pre-line">{c.body}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone={c.status === 'OPEN' ? 'warning' : 'neutral'}>
                    {t(`changeStatus.${c.status}`)}
                  </Badge>
                  {c.note ? <span>{c.note}</span> : null}
                </p>
              </div>
            ))}
            {p.status !== 'COMPLETED' && p.status !== 'CANCELLED' ? (
              <div className="mt-2 flex flex-col gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">{t('askChange')}</span>
                  <textarea
                    className={textareaClass()}
                    maxLength={3000}
                    value={change}
                    onChange={(e) => setChange(e.target.value)}
                  />
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  disabled={change.trim().length < 5}
                  loading={busy === 'change'}
                  onClick={() =>
                    void run(
                      'change',
                      async () => {
                        const result = await api.POST('/v1/client/projects/{id}/changes', {
                          params: { path: { id } },
                          body: { body: change.trim() },
                        });
                        if (result.data) {
                          changes.setData(result.data);
                          setChange('');
                        }
                        return result;
                      },
                      t('changeSent'),
                    )
                  }
                >
                  {t('sendChange')}
                </Button>
              </div>
            ) : null}
          </Card>
          <Card title={t('invoices')}>
            {p.invoices.length === 0 ? (
              <p className="text-muted">{t('noInvoices')}</p>
            ) : (
              <InvoiceList invoices={p.invoices} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** An invoice, to print or pay by card. */
export function ClientInvoicePage({ id }: { id: string }) {
  const t = useTranslations('client.invoice');
  const format = useFormatter();
  const locale = useLocale();
  const { user } = useClient();
  const invoice = useLoad(
    async () => (await api.GET('/v1/client/invoices/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const { busy, notice, run } = useAction();
  if (!user || (!invoice.data && !invoice.failed)) return <PageSpinner />;
  if (!invoice.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/client">{t('back')}</BackLink>
        <Alert tone="error">{t('loadFailed')}</Alert>
      </div>
    );
  }
  const i = invoice.data;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'long' });
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="print-hidden">
        <BackLink href="/client">{t('back')}</BackLink>
      </div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl">{t('title', { reference: i.reference })}</h1>
            <p className="text-muted">{t(`kind.${i.kind}`)}</p>
          </div>
          <InvoiceStatusBadge status={i.status} />
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">{t('billedTo')}</dt>
            <dd className="font-semibold">{isolate(i.billingName ?? i.clientName)}</dd>
            {i.billingAddress ? (
              <dd className="whitespace-pre-line text-sm">{i.billingAddress}</dd>
            ) : null}
            {i.taxId ? <dd className="text-sm">{t('taxId', { id: i.taxId })}</dd> : null}
          </div>
          <div>
            <dt className="text-sm text-muted">{t('project')}</dt>
            <dd className="font-semibold">{isolate(i.projectTitle)}</dd>
            <dd className="text-sm">{t('quote', { version: i.quoteVersion })}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('issued')}</dt>
            <dd>{date(i.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{i.paidAt ? t('paid') : t('due')}</dt>
            <dd>{date(i.paidAt ?? i.dueAt)}</dd>
          </div>
        </dl>
        <p className="mt-6 flex items-baseline justify-between border-t border-line pt-4 text-2xl font-bold">
          <span>{t('total')}</span>
          <Money minor={i.amountMinor} currency={i.currency} />
        </p>
        {i.payments.length ? (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
            {i.payments.map((payment, index) => (
              <li key={index}>
                {t('payment', {
                  date: date(payment.paidAt),
                  how: payment.provider === 'STRIPE' ? t('card') : (payment.method ?? t('bank')),
                })}
              </li>
            ))}
          </ul>
        ) : null}
        {i.voidReason ? (
          <Alert tone="warning">{t('voided', { reason: i.voidReason })}</Alert>
        ) : null}
      </Card>
      <NoticeArea notice={notice} />
      {i.status === 'OPEN' ? (
        <div className="print-hidden flex flex-col gap-3">
          <div className="flex flex-wrap gap-2.5">
            <Button
              loading={busy === 'pay'}
              onClick={() =>
                void run('pay', async () => {
                  const result = await api.POST('/v1/client/invoices/{id}/checkout', {
                    params: { path: { id }, query: { locale: locale as 'en' } },
                  });
                  if (result.data?.url) window.location.assign(result.data.url);
                  return result;
                })
              }
            >
              <Icon name="card" />
              {t('payCard')}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Icon name="printer" />
              {t('print')}
            </Button>
          </div>
          <p className="text-sm text-muted">{t('bankNote', { reference: i.reference })}</p>
        </div>
      ) : (
        <Button
          className="print-hidden self-start"
          variant="secondary"
          onClick={() => window.print()}
        >
          <Icon name="printer" />
          {t('print')}
        </Button>
      )}
    </div>
  );
}

/** The organisation: billing details, the people, and the agreement signed. */
export function ClientSettingsPage() {
  const t = useTranslations('client.settings');
  const format = useFormatter();
  const { user, me } = useClient();
  const { busy, notice, run } = useAction();
  const [form, setForm] = useState<{
    name: string;
    billingName: string;
    billingAddress: string;
    taxId: string;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  if (!user || (!me.data && !me.failed)) return <PageSpinner />;
  if (!me.data) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const m = me.data;
  const org = m.org;
  const values = form ?? {
    name: org.name,
    billingName: org.billingName ?? '',
    billingAddress: org.billingAddress ?? '',
    taxId: org.taxId ?? '',
  };
  const owner = m.role === 'OWNER';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <BackLink href="/client">{t('back')}</BackLink>
      <SectionHeading level={1}>{t('title')}</SectionHeading>
      <NoticeArea notice={notice} />
      <Card title={t('org')}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              'org',
              async () => {
                const result = await api.PATCH('/v1/client/org', {
                  body: {
                    name: values.name.trim(),
                    billingName: values.billingName.trim() || undefined,
                    billingAddress: values.billingAddress.trim() || undefined,
                    taxId: values.taxId.trim() || undefined,
                  },
                });
                if (result.data) {
                  me.setData(result.data);
                  setForm(null);
                }
                return result;
              },
              t('saved'),
            );
          }}
        >
          <TextField
            label={t('name')}
            value={values.name}
            disabled={!owner}
            maxLength={120}
            onChange={(e) => setForm({ ...values, name: e.target.value })}
          />
          <TextField
            label={t('billingName')}
            value={values.billingName}
            disabled={!owner}
            maxLength={160}
            onChange={(e) => setForm({ ...values, billingName: e.target.value })}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t('billingAddress')}</span>
            <textarea
              className={textareaClass()}
              value={values.billingAddress}
              disabled={!owner}
              maxLength={500}
              onChange={(e) => setForm({ ...values, billingAddress: e.target.value })}
            />
          </label>
          <TextField
            label={t('taxId')}
            value={values.taxId}
            disabled={!owner}
            maxLength={60}
            onChange={(e) => setForm({ ...values, taxId: e.target.value })}
          />
          {owner ? (
            <Button
              type="submit"
              size="sm"
              className="self-start"
              loading={busy === 'org'}
              disabled={!form}
            >
              {t('save')}
            </Button>
          ) : null}
        </form>
      </Card>
      <Card title={t('people')}>
        <ul className="flex flex-col gap-1.5">
          {m.colleagues.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2"
            >
              <span className="flex-1 font-semibold">{isolate(c.name)}</span>
              <span className="text-sm text-muted" dir="ltr">
                {c.email}
              </span>
              <Badge tone={c.role === 'OWNER' ? 'brand' : 'neutral'}>{t(`roles.${c.role}`)}</Badge>
              {c.invited ? <Badge tone="warning">{t('invited')}</Badge> : null}
            </li>
          ))}
        </ul>
        {owner ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                'invite',
                async () => {
                  const result = await api.POST('/v1/client/colleagues', {
                    body: { email: email.trim(), displayName: displayName.trim() },
                  });
                  if (result.data) {
                    me.setData(result.data);
                    setEmail('');
                    setDisplayName('');
                  }
                  return result;
                },
                t('inviteSent'),
              );
            }}
          >
            <TextField
              label={t('colleagueName')}
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <TextField
              label={t('colleagueEmail')}
              type="email"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              loading={busy === 'invite'}
              disabled={!email.includes('@') || displayName.trim().length < 2}
            >
              <Icon name="userPlus" />
              {t('invite')}
            </Button>
          </form>
        ) : null}
      </Card>
      <Card title={t('agreement')}>
        {org.contract ? (
          <p>
            {t('signed', {
              version: org.contract.version,
              date: format.dateTime(new Date(org.contract.signedAt), { dateStyle: 'medium' }),
              name: isolate(org.contract.signedBy),
            })}
          </p>
        ) : (
          <p className="text-muted">{t('notSigned')}</p>
        )}
      </Card>
    </div>
  );
}
