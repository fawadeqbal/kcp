'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  Card,
  Checkbox,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
  textareaClass,
} from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type Summary = components['schemas']['AdminEventSummaryDto'];
type Detail = components['schemas']['AdminEventDto'];
type Team = components['schemas']['AdminTeamDto'];
type Member = components['schemas']['AdminTeamMemberDto'];
type Rubric = components['schemas']['RubricItemDto'];
type Status = Summary['status'];

const linkClass = 'font-semibold text-brand-text underline-offset-4 hover:underline';

export const EVENT_STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  OPEN: { label: 'Open for teams', tone: 'brand' },
  RUNNING: { label: 'Running', tone: 'success' },
  JUDGING: { label: 'Judging', tone: 'warning' },
  FINISHED: { label: 'Finished', tone: 'neutral' },
};

/** The one step each status can move on to, and what the button says. */
const NEXT_STEP: Record<Status, { status: Status; label: string; explain: string } | null> = {
  DRAFT: {
    status: 'OPEN',
    label: 'Open for teams',
    explain: 'Students see the hackathon and can make or join teams (with a parent’s approval).',
  },
  OPEN: {
    status: 'RUNNING',
    label: 'Start the hackathon',
    explain: 'Teams can now open pull requests, merge and hand in their work.',
  },
  RUNNING: {
    status: 'JUDGING',
    label: 'Start judging',
    explain: 'Hand-ins close. Judges see every team’s work and give scores.',
  },
  JUDGING: {
    status: 'FINISHED',
    label: 'Publish the results',
    explain:
      'Teams are ranked by the average of their judges’ totals. Rooms close (still readable) and every member hears their rank.',
  },
  FINISHED: null,
};

/** The API's default (DEFAULT_RUBRIC in apps/api/src/events/events.shared.ts). */
const DEFAULT_RUBRIC: Rubric[] = [
  { key: 'idea', label: 'Idea', max: 5 },
  { key: 'code', label: 'Code', max: 5 },
  { key: 'design', label: 'Design', max: 5 },
  { key: 'teamwork', label: 'Teamwork', max: 5 },
];
const STARTER_FILES = ['index.html', 'style.css', 'script.js'] as const;

/** "2026-10-20T09:00" in the browser's time zone, for datetime-local fields. */
const pad = (n: number) => String(n).padStart(2, '0');

function localInput(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function useCanManage() {
  const { state } = useAuth();
  return state.status === 'authenticated' && state.ability.can('update', 'Event');
}

/** Admin → Hackathons: every event, newest first, and a button to plan a new one. */
export function EventsList() {
  const canManage = useCanManage();
  const router = useRouter();
  const data = useLoad(() => api.GET('/v1/admin/events'), 'events');
  const [creating, setCreating] = useState(false);

  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  return (
    <>
      <PageHeader
        title="Hackathons"
        description="Team events for the Pro track: plan them, choose judges and mentors, move them step by step, and publish the results."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              Plan a hackathon
            </Button>
          ) : null
        }
      />
      <Table
        caption="Hackathons"
        columns={['Hackathon', 'Status', 'Dates', 'Teams']}
        empty={data.data.length === 0}
        emptyText="No hackathons yet."
      >
        {data.data.map((event) => (
          <tr key={event.id}>
            <Cell>
              <Link href={`/events/${event.id}`} className={linkClass}>
                {event.title}
              </Link>
              <span className="block text-sm text-muted">{event.slug}</span>
            </Cell>
            <Cell>
              <Badge tone={EVENT_STATUS[event.status].tone}>
                {EVENT_STATUS[event.status].label}
              </Badge>
            </Cell>
            <Cell>
              {formatDate(event.startsAt)} – {formatDate(event.endsAt)}
            </Cell>
            <Cell>{event.teams}</Cell>
          </tr>
        ))}
      </Table>
      {creating ? (
        <EventForm
          onClose={() => setCreating(false)}
          onDone={(saved) => {
            setCreating(false);
            router.push(`/events/${saved.id}`);
          }}
        />
      ) : null}
    </>
  );
}

/** One hackathon: its details, the next step, judges, and every team. */
export function EventDetailPage({ id }: { id: string }) {
  const canManage = useCanManage();
  const data = useLoad(() => api.GET('/v1/admin/events/{id}', { params: { path: { id } } }), id);
  const [editing, setEditing] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const event = data.data;
  const next = NEXT_STEP[event.status];
  const done = (text: string) => {
    setNotice(text);
    data.reload();
  };
  return (
    <>
      <PageHeader
        title={event.title}
        description={
          <>
            <Badge tone={EVENT_STATUS[event.status].tone}>{EVENT_STATUS[event.status].label}</Badge>{' '}
            {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)} · teams of up to{' '}
            {event.teamSize} · ages {event.minAge}+
          </>
        }
        actions={
          canManage ? (
            <span className="flex flex-wrap gap-2">
              {event.status !== 'FINISHED' ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Edit details
                </Button>
              ) : null}
              {next ? (
                <Button size="sm" onClick={() => setStepping(true)}>
                  {next.label}
                </Button>
              ) : null}
            </span>
          ) : null
        }
      />
      <div className="flex flex-col gap-6">
        <p>
          <Link href="/events" className={linkClass}>
            All hackathons
          </Link>
        </p>
        <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
        <Card title="About">
          <p className="whitespace-pre-line">{event.description}</p>
          <p className="mt-3 text-sm text-muted">
            Judged on: {event.rubric.map((item) => `${item.label} (up to ${item.max})`).join(', ')}
          </p>
        </Card>
        <JudgesCard event={event} canManage={canManage} onDone={done} />
        <TeamsCard event={event} canManage={canManage} onDone={done} />
      </div>
      {editing ? (
        <EventForm
          event={event}
          onClose={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            done('The hackathon was updated.');
          }}
        />
      ) : null}
      {stepping && next ? (
        <StepDialog
          event={event}
          onClose={() => setStepping(false)}
          onDone={() => {
            setStepping(false);
            done(`${event.title} is now: ${EVENT_STATUS[next.status].label.toLowerCase()}.`);
          }}
        />
      ) : null}
    </>
  );
}

function StepDialog({
  event,
  onClose,
  onDone,
}: {
  event: Detail;
  onClose: () => void;
  onDone: () => void;
}) {
  const next = NEXT_STEP[event.status]!;
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title={`${next.label}?`}>
      <div className="flex flex-col gap-4">
        <p>{next.explain}</p>
        <p className="text-sm text-muted">This can’t be undone.</p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={action.busy}
            onClick={async () => {
              if (
                await action.run(() =>
                  api.POST('/v1/admin/events/{id}/status', {
                    params: { path: { id: event.id } },
                    body: { status: next.status },
                  }),
                )
              ) {
                onDone();
              }
            }}
          >
            {next.label}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function JudgesCard({
  event,
  canManage,
  onDone,
}: {
  event: Detail;
  canManage: boolean;
  onDone: (text: string) => void;
}) {
  const [chosen, setChosen] = useState<string[]>(event.judges.map((j) => j.id));
  const action = useAction();
  const editable = canManage && event.status !== 'FINISHED';
  const changed =
    chosen.length !== event.judges.length ||
    chosen.some((id) => !event.judges.some((j) => j.id === id));
  return (
    <Card title="Judges">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Mentors whose background check passed and who signed the code of conduct. Judges see every
          team’s work once judging starts.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        {editable ? (
          event.mentors.length ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Judges</legend>
              <div className="flex flex-wrap gap-4">
                {event.mentors.map((mentor) => (
                  <Checkbox
                    key={mentor.id}
                    label={mentor.name}
                    checked={chosen.includes(mentor.id)}
                    onChange={(e) =>
                      setChosen(
                        e.target.checked
                          ? [...chosen, mentor.id]
                          : chosen.filter((id) => id !== mentor.id),
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>
          ) : (
            <p>No mentor is ready yet: pass a background check in Mentors and tutors first.</p>
          )
        ) : (
          <p>{event.judges.map((j) => j.name).join(', ') || 'No judges yet.'}</p>
        )}
        {editable && event.mentors.length ? (
          <div>
            <Button
              size="sm"
              disabled={!changed}
              loading={action.busy}
              onClick={async () => {
                if (
                  await action.run(() =>
                    api.PUT('/v1/admin/events/{id}/judges', {
                      params: { path: { id: event.id } },
                      body: { judgeIds: chosen },
                    }),
                  )
                ) {
                  onDone('Judges saved.');
                }
              }}
            >
              Save judges
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function TeamsCard({
  event,
  canManage,
  onDone,
}: {
  event: Detail;
  canManage: boolean;
  onDone: (text: string) => void;
}) {
  const [mentorFor, setMentorFor] = useState<Team | null>(null);
  const [removing, setRemoving] = useState<{ team: Team; member: Member } | null>(null);
  const finished = event.status === 'FINISHED';
  const columns = finished
    ? ['Rank', 'Team', 'Members', 'Handed in', 'Score']
    : ['Team', 'Members', 'Mentor', 'Handed in', 'Judges’ totals'];
  return (
    <Card title={finished ? 'Results' : 'Teams'}>
      <Table
        bare
        caption={finished ? 'Results' : 'Teams'}
        columns={columns}
        empty={event.teamList.length === 0}
        emptyText="No teams yet."
      >
        {event.teamList.map((team) => (
          <tr key={team.id}>
            {finished ? <Cell>{team.rank ?? '—'}</Cell> : null}
            <Cell>
              <span className="font-semibold">{team.name}</span>
              <span className="block text-sm text-muted">Code {team.joinCode}</span>
            </Cell>
            <Cell>
              <ul className="flex flex-col gap-1">
                {team.members.map((member) => (
                  <li key={member.userId} className="flex flex-wrap items-center gap-1.5">
                    <span>{member.nickname}</span>
                    {member.isCaptain ? <Badge tone="brand">Captain</Badge> : null}
                    {member.status === 'PENDING' ? (
                      <Badge tone="warning">Waiting for a parent</Badge>
                    ) : null}
                    {canManage && !finished ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${member.nickname} from ${team.name}`}
                        onClick={() => setRemoving({ team, member })}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Cell>
            {finished ? null : (
              <Cell>
                <span className="flex flex-col items-start gap-1.5">
                  {team.mentor?.name ?? <span className="text-muted">None</span>}
                  {canManage ? (
                    <Button size="sm" variant="secondary" onClick={() => setMentorFor(team)}>
                      {team.mentor ? 'Change' : 'Choose a mentor'}
                    </Button>
                  ) : null}
                </span>
              </Cell>
            )}
            <Cell>
              {team.submission ? (
                <>
                  <span className="font-semibold">{team.submission.title}</span>
                  <span className="block text-sm text-muted">
                    {formatDateTime(team.submission.submittedAt)}
                  </span>
                </>
              ) : (
                <span className="text-muted">Not yet</span>
              )}
            </Cell>
            <Cell>
              {finished
                ? team.score === null
                  ? '—'
                  : team.score.toFixed(1)
                : team.scores.map((s) => `${s.judge}: ${s.total}`).join(', ') || '—'}
            </Cell>
          </tr>
        ))}
      </Table>
      {mentorFor ? (
        <MentorDialog
          event={event}
          team={mentorFor}
          onClose={() => setMentorFor(null)}
          onDone={(text) => {
            setMentorFor(null);
            onDone(text);
          }}
        />
      ) : null}
      {removing ? (
        <RemoveDialog
          team={removing.team}
          member={removing.member}
          onClose={() => setRemoving(null)}
          onDone={(text) => {
            setRemoving(null);
            onDone(text);
          }}
        />
      ) : null}
    </Card>
  );
}

function MentorDialog({
  event,
  team,
  onClose,
  onDone,
}: {
  event: Detail;
  team: Team;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [mentorId, setMentorId] = useState(team.mentor?.id ?? '');
  const action = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await action.run(() =>
        api.PUT('/v1/admin/events/teams/{teamId}/mentor', {
          params: { path: { teamId: team.id } },
          body: { mentorId: mentorId || null },
        }),
      )
    ) {
      const name = event.mentors.find((m) => m.id === mentorId)?.name;
      onDone(name ? `${name} now mentors ${team.name}.` : `${team.name} has no mentor now.`);
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Mentor for ${team.name}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          The mentor joins the team’s room and repository, reviews pull requests and helps. Only
          mentors whose background check passed are listed.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <SelectField label="Mentor" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
          <option value="">No mentor</option>
          {event.mentors.map((mentor) => (
            <option key={mentor.id} value={mentor.id}>
              {mentor.name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RemoveDialog({
  team,
  member,
  onClose,
  onDone,
}: {
  team: Team;
  member: Member;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const action = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setReasonError('Give a reason (at least 5 characters).');
      return;
    }
    if (
      await action.run(() =>
        api.POST('/v1/admin/events/teams/{teamId}/members/{userId}/remove', {
          params: { path: { teamId: team.id, userId: member.userId } },
          body: { reason: reason.trim() },
        }),
      )
    ) {
      onDone(`${member.nickname} was taken out of ${team.name}.`);
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Remove ${member.nickname} from ${team.name}?`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          They leave the team’s room and repository. Their commits stay in the team’s history.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Reason"
          hint="Kept in the audit log."
          maxLength={500}
          value={reason}
          error={reasonError}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={action.busy}>
            Remove
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CodeArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        rows={5}
        dir="ltr"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(textareaClass(), 'font-mono text-sm')}
      />
    </div>
  );
}

/** Plan a new hackathon, or change one that hasn't finished. */
function EventForm({
  event,
  onClose,
  onDone,
}: {
  event?: Detail;
  onClose: () => void;
  onDone: (saved: Detail) => void;
}) {
  const inAWeek = new Date(Date.now() + 7 * 86_400_000);
  inAWeek.setHours(9, 0, 0, 0);
  const [title, setTitle] = useState(event?.title ?? '');
  const [slug, setSlug] = useState(event?.slug ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startsAt, setStartsAt] = useState(localInput(event?.startsAt ?? inAWeek));
  const [endsAt, setEndsAt] = useState(
    localInput(event?.endsAt ?? new Date(inAWeek.getTime() + 2 * 86_400_000)),
  );
  const [teamSize, setTeamSize] = useState(String(event?.teamSize ?? 4));
  const [minAge, setMinAge] = useState(String(event?.minAge ?? 13));
  const [rubric, setRubric] = useState<Rubric[]>(event?.rubric ?? DEFAULT_RUBRIC);
  const [starter, setStarter] = useState<Record<string, string>>(event?.starter ?? {});
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const action = useAction();
  const slugFixed = event ? event.status !== 'DRAFT' : false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      title: title.trim(),
      slug,
      description: description.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      teamSize: Number(teamSize),
      minAge: Number(minAge),
      rubric: rubric.map((item) => ({ ...item, label: item.label.trim(), max: Number(item.max) })),
      ...(Object.keys(starter).length ? { starter } : {}),
    };
    let saved: Detail | undefined;
    const ok = await action.run(async () => {
      const result = event
        ? await api.PUT('/v1/admin/events/{id}', { params: { path: { id: event.id } }, body })
        : await api.POST('/v1/admin/events', { body });
      saved = result.data;
      return result;
    });
    if (ok && saved) onDone(saved);
  };

  const setItem = (index: number, change: Partial<Rubric>) =>
    setRubric(rubric.map((item, i) => (i === index ? { ...item, ...change } : item)));

  return (
    <Dialog open onClose={onClose} title={event ? `Edit ${event.title}` : 'Plan a hackathon'}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Title"
          required
          minLength={3}
          maxLength={80}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) {
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replaceAll(/[^a-z0-9]+/g, '-')
                  .replaceAll(/^-+|-+$/g, '')
                  .slice(0, 40),
              );
            }
          }}
        />
        <TextField
          label="Address"
          hint={
            slugFixed
              ? 'Fixed once the hackathon is open.'
              : 'Lowercase letters, digits and dashes. Used in links and the git server.'
          }
          required
          pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
          disabled={slugFixed}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-description" className="text-sm font-semibold">
            What teams make
          </label>
          <textarea
            id="event-description"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass()}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Starts"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <TextField
            label="Ends"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <TextField
            label="Largest team"
            type="number"
            min={1}
            max={5}
            required
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
          />
          <TextField
            label="Youngest age"
            type="number"
            min={9}
            max={16}
            required
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Judged on</legend>
          {rubric.map((item, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <TextField
                label={`Criterion ${index + 1}`}
                required
                minLength={2}
                maxLength={60}
                value={item.label}
                onChange={(e) =>
                  setItem(index, {
                    label: e.target.value,
                    key:
                      e.target.value
                        .toLowerCase()
                        .replaceAll(/[^a-z0-9]+/g, '-')
                        .replaceAll(/^[^a-z]+|-+$/g, '')
                        .slice(0, 20) || `criterion-${index + 1}`,
                  })
                }
              />
              <TextField
                label="Up to"
                type="number"
                min={1}
                max={10}
                required
                className="w-24"
                value={String(item.max)}
                onChange={(e) => setItem(index, { max: Number(e.target.value) })}
              />
              {rubric.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove criterion ${index + 1}`}
                  onClick={() => setRubric(rubric.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          {rubric.length < 8 ? (
            <div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setRubric([
                    ...rubric,
                    { key: `criterion-${rubric.length + 1}`, label: '', max: 5 },
                  ])
                }
              >
                Add a criterion
              </Button>
            </div>
          ) : null}
        </fieldset>
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Starter files (each team’s repository begins with these)
          </summary>
          <p className="text-sm text-muted">Leave empty for the standard starter page.</p>
          {STARTER_FILES.map((file) => (
            <CodeArea
              key={file}
              label={file}
              value={starter[file] ?? ''}
              onChange={(value) => {
                const nextStarter = { ...starter };
                if (value) nextStarter[file] = value;
                else delete nextStarter[file];
                setStarter(nextStarter);
              }}
            />
          ))}
        </details>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            {event ? 'Save' : 'Plan it'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
