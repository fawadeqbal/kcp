'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonClass,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Icon,
  PageSpinner,
  SectionHeading,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { Markdown } from '../learn/markdown';
import {
  MemberStatusBadge,
  Money,
  NoticeArea,
  ProjectStatusBadge,
  TaskStatusBadge,
  useAction,
  useDuration,
  useLoad,
} from './hub-common';
import { EarningsCard, RulesSummary, StepList } from './student-hub';

type Approval = components['schemas']['ParentApprovalDto'];
type Story = components['schemas']['HubStoryDto'];
type FamilyChild = components['schemas']['HubFamilyChildDto'];

function ApprovalCard({ approval, onDone }: { approval: Approval; onDone: () => Promise<void> }) {
  const t = useTranslations('hub.approval');
  const duration = useDuration();
  const { busy, notice, run } = useAction();
  const decide = async (approve: boolean) => {
    const ok = await run(
      approve ? 'yes' : 'no',
      () =>
        api.POST('/v1/hub/approvals/{memberId}', {
          params: { path: { memberId: approval.memberId } },
          body: { approve },
        }),
      approve ? t('approved') : t('declined'),
    );
    if (ok) await onDone();
  };
  return (
    <Card
      tone="brand"
      kicker={t('kicker', { nickname: isolate(approval.nickname) })}
      title={isolate(approval.title)}
    >
      <p className="whitespace-pre-line">{approval.summary}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {approval.taskTitle ? (
          <div>
            <dt className="text-muted">{t('task')}</dt>
            <dd className="font-semibold">{isolate(approval.taskTitle)}</dd>
          </div>
        ) : null}
        {approval.estimateMinutes ? (
          <div>
            <dt className="text-muted">{t('time')}</dt>
            <dd className="font-semibold">{duration(approval.estimateMinutes)}</dd>
          </div>
        ) : null}
        {approval.estimatedEarningsMinor ? (
          <div>
            <dt className="text-muted">{t('earnings')}</dt>
            <dd className="font-semibold">
              <Money minor={approval.estimatedEarningsMinor} currency={approval.currency} />
            </dd>
          </div>
        ) : null}
        {approval.leadName ? (
          <div>
            <dt className="text-muted">{t('lead')}</dt>
            <dd className="font-semibold">{isolate(approval.leadName)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-sm text-muted">{t('safety')}</p>
      <NoticeArea notice={notice} />
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button loading={busy === 'yes'} disabled={busy !== null} onClick={() => void decide(true)}>
          <Icon name="check" />
          {t('approve')}
        </Button>
        <Button
          variant="ghost"
          loading={busy === 'no'}
          disabled={busy !== null}
          onClick={() => void decide(false)}
        >
          {t('decline')}
        </Button>
      </div>
    </Card>
  );
}

function StoryCard({ story, onDone }: { story: Story; onDone: () => Promise<void> }) {
  const t = useTranslations('hub.story');
  const { busy, notice, run } = useAction();
  const act = async (kind: 'yes' | 'no' | 'withdraw') => {
    const ok = await run(
      kind,
      () =>
        kind === 'withdraw'
          ? api.POST('/v1/hub/stories/{id}/withdraw', { params: { path: { id: story.id } } })
          : api.POST('/v1/hub/stories/{id}/answer', {
              params: { path: { id: story.id } },
              body: { approve: kind === 'yes' },
            }),
      kind === 'yes' ? t('approved') : t('withdrawn'),
    );
    if (ok) await onDone();
  };
  return (
    <Card kicker={t('kicker', { nickname: isolate(story.childNickname) })} title={story.headline}>
      <p className="font-semibold">{t('shownAs', { name: story.firstName })}</p>
      <p className="mt-2 whitespace-pre-line">{story.body}</p>
      <p className="mt-3 text-sm text-muted">{t('rules')}</p>
      <NoticeArea notice={notice} />
      <div className="mt-4 flex flex-wrap gap-2.5">
        {story.status === 'AWAITING_PARENT' ? (
          <>
            <Button
              loading={busy === 'yes'}
              disabled={busy !== null}
              onClick={() => void act('yes')}
            >
              {t('approve')}
            </Button>
            <Button
              variant="ghost"
              loading={busy === 'no'}
              disabled={busy !== null}
              onClick={() => void act('no')}
            >
              {t('decline')}
            </Button>
          </>
        ) : story.status === 'WITHDRAWN' ? (
          <Badge>{t('statusWithdrawn')}</Badge>
        ) : (
          <>
            <Badge tone={story.status === 'PUBLISHED' ? 'success' : 'brand'}>
              {story.status === 'PUBLISHED' ? t('statusPublished') : t('statusApproved')}
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              loading={busy === 'withdraw'}
              onClick={() => void act('withdraw')}
            >
              {t('withdraw')}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function ChildCard({ child }: { child: FamilyChild }) {
  const t = useTranslations('hub.family');
  const done = child.eligibility.steps.filter((s) => s.done).length;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4">
      <Avatar avatarKey={child.avatarKey} size="sm" />
      <span className="flex min-w-48 flex-1 flex-col">
        <span className="font-bold">{isolate(child.nickname)}</span>
        <span className="text-sm text-muted">
          {child.eligibility.eligible
            ? t('ready')
            : t('steps', { done, total: child.eligibility.steps.length })}
        </span>
      </span>
      {child.eligibility.paused ? <Badge tone="warning">{t('paused')}</Badge> : null}
      {child.readinessPassed && !child.consent ? (
        <Badge tone="warning">{t('consentNeeded')}</Badge>
      ) : null}
      <Link href={`/children/${child.childId}/hub`} className={buttonClass('secondary', 'sm')}>
        {t('open')}
      </Link>
    </li>
  );
}

/**
 * The family's hub: projects waiting for the parent's approval, stories about their
 * children to answer, each child's way into the hub, and payouts.
 */
export function ParentHubPage() {
  const t = useTranslations('hub.family');
  const user = useAccount('PARENT');
  const family = useLoad(async () => (await api.GET('/v1/hub/family')).data, [user?.id]);
  const approvals = useLoad(async () => (await api.GET('/v1/hub/approvals')).data, [user?.id]);
  const stories = useLoad(async () => (await api.GET('/v1/hub/stories')).data, [user?.id]);
  if (!user || (!family.data && !family.failed)) return <PageSpinner />;
  const children = (family.data ?? []).filter(
    (c) => c.eligibility.steps.find((s) => s.key === 'AGE')?.done || c.readinessPassed,
  );
  const waiting = (approvals.data ?? []).filter((a) => a.status === 'ACCEPTED');
  const toAnswer = (stories.data ?? []).filter((s) => s.status !== 'WITHDRAWN');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <SectionHeading level={1}>{t('title')}</SectionHeading>
        <p className="text-lg text-muted">{t('intro')}</p>
      </header>
      {waiting.map((approval) => (
        <ApprovalCard
          key={approval.memberId}
          approval={approval}
          onDone={async () => {
            await approvals.reload();
          }}
        />
      ))}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">{t('children')}</h2>
        {children.length === 0 ? (
          <EmptyState icon="rocket" title={t('noneOld')} body={t('noneOldHint')} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {children.map((child) => (
              <ChildCard key={child.childId} child={child} />
            ))}
          </ul>
        )}
      </section>
      {toAnswer.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl">{t('stories')}</h2>
          {toAnswer.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onDone={async () => {
                await stories.reload();
              }}
            />
          ))}
        </section>
      ) : null}
      <Card tone="sage" title={t('payoutsTitle')}>
        <p>{t('payoutsIntro')}</p>
        <Link href="/payouts" className={clsx(buttonClass('primary', 'sm'), 'mt-3')}>
          <Icon name="wallet" />
          {t('payoutsLink')}
        </Link>
      </Card>
    </div>
  );
}

/** The parent agreement and the parent's yes (or taking it back). */
function AgreementCard({
  child,
  onChange,
}: {
  child: FamilyChild;
  onChange: (next: FamilyChild) => void;
}) {
  const t = useTranslations('hub.agreement');
  const locale = useLocale();
  const format = useFormatter();
  const [agree, setAgree] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const { busy, notice, run } = useAction();
  const contract = useLoad(
    async () =>
      (
        await api.GET('/v1/hub/contracts/{kind}', {
          params: { path: { kind: 'parent' }, query: { language: locale as 'en' } },
        })
      ).data,
    [locale],
  );
  const current = child.consent?.version === child.eligibility.agreementVersion;
  return (
    <Card title={t('title')}>
      {child.consent && current ? (
        <Alert tone="success">
          {t('given', {
            date: format.dateTime(new Date(child.consent.grantedAt), { dateStyle: 'medium' }),
          })}
        </Alert>
      ) : child.readinessPassed ? (
        <p className="mb-3">{t('askNow', { nickname: isolate(child.nickname) })}</p>
      ) : (
        <p className="mb-3 text-muted">{t('notYet')}</p>
      )}
      {contract.data ? (
        <details className="mt-3 rounded-inner bg-raised p-4" open={!child.consent}>
          <summary className="cursor-pointer font-bold">
            {t('read', { version: contract.data.version })}
          </summary>
          <div className="mt-3 max-h-96 overflow-auto">
            <Markdown sections="h3">{contract.data.body}</Markdown>
          </div>
        </details>
      ) : null}
      <NoticeArea notice={notice} />
      {child.readinessPassed && !(child.consent && current) && contract.data ? (
        <div className="mt-4 flex flex-col gap-3">
          <Checkbox
            label={t('agree', { nickname: isolate(child.nickname) })}
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <Button
            className="self-start"
            disabled={!agree}
            loading={busy === 'consent'}
            onClick={() =>
              void run(
                'consent',
                async () => {
                  const result = await api.POST('/v1/children/{childId}/hub/consent', {
                    params: { path: { childId: child.childId } },
                    body: { version: contract.data!.version, agree: true },
                  });
                  if (result.data) onChange(result.data);
                  return result;
                },
                t('thanks'),
              )
            }
          >
            {t('give')}
          </Button>
        </div>
      ) : null}
      {child.consent ? (
        <Button className="mt-4" variant="ghost" onClick={() => setConfirmWithdraw(true)}>
          {t('withdraw')}
        </Button>
      ) : null}
      <Dialog
        open={confirmWithdraw}
        onClose={() => setConfirmWithdraw(false)}
        title={t('withdrawTitle')}
      >
        <p>{t('withdrawBody', { nickname: isolate(child.nickname) })}</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            variant="danger"
            loading={busy === 'withdraw'}
            onClick={() =>
              void run(
                'withdraw',
                async () => {
                  const result = await api.DELETE('/v1/children/{childId}/hub/consent', {
                    params: { path: { childId: child.childId } },
                  });
                  if (result.data) onChange(result.data);
                  setConfirmWithdraw(false);
                  return result;
                },
                t('withdrawn'),
              )
            }
          >
            {t('withdrawConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmWithdraw(false)}>
            {t('keep')}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

/**
 * One child's hub, for their parent: the steps, the parent agreement, their projects
 * (what they do, how long it takes) and their earnings.
 */
export function ChildHubPage({ childId }: { childId: string }) {
  const t = useTranslations('hub.child');
  const user = useAccount('PARENT');
  const duration = useDuration();
  const child = useLoad(
    async () =>
      (await api.GET('/v1/children/{childId}/hub', { params: { path: { childId } } })).data,
    [childId, user?.id],
  );
  const projects = useLoad(
    async () =>
      (await api.GET('/v1/children/{childId}/hub/projects', { params: { path: { childId } } }))
        .data,
    [childId, user?.id],
  );
  const earnings = useLoad(
    async () =>
      (await api.GET('/v1/children/{childId}/hub/earnings', { params: { path: { childId } } }))
        .data,
    [childId, user?.id],
  );
  if (!user || (!child.data && !child.failed)) return <PageSpinner />;
  if (!child.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/hub">{t('back')}</BackLink>
        <Alert tone="error">{t('loadFailed')}</Alert>
      </div>
    );
  }
  const c = child.data;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <BackLink href="/hub">{t('back')}</BackLink>
      <header className="flex flex-wrap items-center gap-3">
        <Avatar avatarKey={c.avatarKey} />
        <h1 className="text-3xl">{t('title', { nickname: isolate(c.nickname) })}</h1>
        {c.eligibility.eligible ? <Badge tone="success">{t('ready')}</Badge> : null}
        {c.eligibility.paused ? <Badge tone="warning">{t('paused')}</Badge> : null}
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('steps')}>
          <StepList eligibility={c.eligibility} />
        </Card>
        <Card title={t('rules')}>
          <RulesSummary rules={c.eligibility.rules} />
          <p className="mt-3 text-sm text-muted">{t('rulesNote')}</p>
        </Card>
      </div>
      <AgreementCard child={c} onChange={(next) => child.setData(next)} />
      <Card title={t('projects')}>
        {(projects.data ?? []).length === 0 ? (
          <p className="text-muted">{t('noProjects')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(projects.data ?? []).map((project) => (
              <li key={project.projectId} className="rounded-inner bg-raised p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 font-bold">{isolate(project.title)}</span>
                  <MemberStatusBadge status={project.memberStatus} />
                  <ProjectStatusBadge status={project.status} />
                </p>
                <p className="mt-1 text-sm text-muted">
                  {project.leadName ? t('lead', { name: isolate(project.leadName) }) : null}
                  {' · '}
                  {t('time', { time: duration(project.minutes) })}
                </p>
                {project.tasks.length ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {project.tasks.map((task, index) => (
                      <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="flex-1">{isolate(task.title)}</span>
                        <TaskStatusBadge status={task.status} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {earnings.data ? <EarningsCard statement={earnings.data} forParent /> : null}
    </div>
  );
}
