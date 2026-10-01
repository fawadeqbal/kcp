'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Button,
  Card,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
  textareaClass,
} from '@kcp/ui';
import { useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from '../data';
import { HubBadge, HubPage } from './hub-shell';

type Story = components['schemas']['HubStoryDto'];
type Rules = components['schemas']['HubRulesDto'];

function StoryForm({
  story,
  onClose,
  onDone,
}: {
  story?: Story;
  onClose: () => void;
  onDone: () => void;
}) {
  const [studentId, setStudentId] = useState(story?.studentId ?? '');
  const [projectId, setProjectId] = useState(story?.projectId ?? '');
  const [languageCode, setLanguageCode] = useState<'en' | 'ar' | 'ur'>(
    (story?.languageCode as 'en') ?? 'en',
  );
  const [firstName, setFirstName] = useState(story?.firstName ?? '');
  const [headline, setHeadline] = useState(story?.headline ?? '');
  const [body, setBody] = useState(story?.body ?? '');
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title={story ? 'Edit the story' : 'A new story'}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const ok = await action.run(() =>
            story
              ? api.PATCH('/v1/admin/hub/stories/{id}', {
                  params: { path: { id: story.id } },
                  body: {
                    firstName: firstName.trim(),
                    headline: headline.trim(),
                    body: body.trim(),
                  },
                })
              : api.POST('/v1/admin/hub/stories', {
                  body: {
                    studentId: studentId.trim(),
                    ...(projectId.trim() ? { projectId: projectId.trim() } : {}),
                    languageCode,
                    firstName: firstName.trim(),
                    headline: headline.trim(),
                    body: body.trim(),
                  },
                }),
          );
          if (ok) onDone();
        }}
      >
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        {!story ? (
          <>
            <TextField
              label="Student ID"
              hint="From Hub → Students or the user’s page. Only students with paid hub work."
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            <TextField
              label="Project ID (optional)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <SelectField
              label="Language"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value as 'en')}
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="ur">Urdu</option>
            </SelectField>
          </>
        ) : null}
        <TextField
          label="First name only"
          hint="Never a surname, school or city."
          value={firstName}
          maxLength={40}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <TextField
          label="Headline"
          value={headline}
          maxLength={120}
          onChange={(e) => setHeadline(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Story (a few sentences)</span>
          <textarea
            className={textareaClass()}
            value={body}
            maxLength={1200}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted">
          The parent is emailed and must say yes before it can be published
          {story ? ' (an edit asks them again)' : ''}.
        </p>
        <div className="flex gap-2">
          <Button type="submit" loading={action.busy}>
            {story ? 'Save and ask the parent' : 'Ask the parent'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Admin → Hub → Stories: short stories for the site, with the parent's yes. */
export function HubStoriesPage() {
  const data = useLoad(() => api.GET('/v1/admin/hub/stories'), 'stories');
  const [editing, setEditing] = useState<Story | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();
  return (
    <HubPage
      title="Stories"
      description="Stories about students’ hub work for the marketing site: first name only, and only after a parent says yes. A parent can take one back at any time; it leaves the site within a minute."
      actions={
        <Button size="sm" onClick={() => setEditing('new')}>
          New story
        </Button>
      }
    >
      <div aria-live="polite">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
      </div>
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Table
          caption="Stories"
          columns={['Story', 'Student', 'Language', 'State', '']}
          empty={data.data.length === 0}
          emptyText="No stories yet."
        >
          {data.data.map((s) => (
            <tr key={s.id}>
              <Cell>
                <span className="font-semibold">{s.headline}</span>
                <span className="block text-sm text-muted">
                  {s.firstName} · {formatDate(s.createdAt)}
                </span>
              </Cell>
              <Cell>{s.childNickname}</Cell>
              <Cell>{s.languageCode}</Cell>
              <Cell>
                <HubBadge status={s.status} />
              </Cell>
              <Cell>
                <span className="flex flex-wrap gap-2">
                  {s.status === 'APPROVED' ? (
                    <Button
                      size="sm"
                      loading={action.busy}
                      onClick={async () => {
                        if (
                          await action.run(() =>
                            api.POST('/v1/admin/hub/stories/{id}/publish', {
                              params: { path: { id: s.id } },
                            }),
                          )
                        ) {
                          setNotice('Published.');
                          data.reload();
                        }
                      }}
                    >
                      Publish
                    </Button>
                  ) : null}
                  {s.status === 'PUBLISHED' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={action.busy}
                      onClick={async () => {
                        if (
                          await action.run(() =>
                            api.POST('/v1/admin/hub/stories/{id}/unpublish', {
                              params: { path: { id: s.id } },
                            }),
                          )
                        ) {
                          setNotice('Taken off the site.');
                          data.reload();
                        }
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : null}
                  {s.status !== 'WITHDRAWN' ? (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                  ) : null}
                </span>
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      {editing ? (
        <StoryForm
          story={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setNotice('Saved: the parent is asked.');
            data.reload();
          }}
        />
      ) : null}
    </HubPage>
  );
}

const minuteToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const timeToMinute = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RulesForm({
  rules,
  onClose,
  onDone,
}: {
  rules: Rules;
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    enabled: rules.enabled,
    minAge: String(rules.minAge),
    weeklyHours: String(rules.weeklyMinutes / 60),
    dayStart: minuteToTime(rules.dayStartMinute),
    dayEnd: minuteToTime(rules.dayEndMinute),
    schoolDays: rules.schoolDays,
    schoolStart: minuteToTime(rules.schoolStartMinute),
    schoolEnd: minuteToTime(rules.schoolEndMinute),
    student: String(rules.studentPercent),
    lead: String(rules.leadPercent),
    platform: String(rules.platformPercent),
    holdDays: String(rules.holdDays),
    withholding: String(rules.withholdingBp / 100),
  });
  const action = useAction();
  const set = (patch: Partial<typeof f>) => setF((now) => ({ ...now, ...patch }));
  return (
    <Dialog open onClose={onClose} title={`Hub rules: ${rules.countryCode}`}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await action.run(() =>
              api.PUT('/v1/admin/hub/countries/{code}', {
                params: { path: { code: rules.countryCode } },
                body: {
                  enabled: f.enabled,
                  minAge: Number(f.minAge),
                  weeklyMinutes: Math.round(Number(f.weeklyHours) * 60),
                  dayStartMinute: timeToMinute(f.dayStart),
                  dayEndMinute: timeToMinute(f.dayEnd),
                  schoolDays: f.schoolDays,
                  schoolStartMinute: timeToMinute(f.schoolStart),
                  schoolEndMinute: timeToMinute(f.schoolEnd),
                  studentPercent: Number(f.student),
                  leadPercent: Number(f.lead),
                  platformPercent: Number(f.platform),
                  holdDays: Number(f.holdDays),
                  withholdingBp: Math.round(Number(f.withholding) * 100),
                },
              }),
            )
          ) {
            onDone();
          }
        }}
      >
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={f.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="size-5 accent-primary"
          />
          Hub open in this country (only with the lawyer’s sign-off)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Youngest age"
            type="number"
            min={13}
            max={18}
            value={f.minAge}
            onChange={(e) => set({ minAge: e.target.value })}
          />
          <TextField
            label="Hours a week"
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={f.weeklyHours}
            onChange={(e) => set({ weeklyHours: e.target.value })}
          />
          <TextField
            label="Day starts"
            type="time"
            value={f.dayStart}
            onChange={(e) => set({ dayStart: e.target.value })}
          />
          <TextField
            label="Day ends"
            type="time"
            value={f.dayEnd}
            onChange={(e) => set({ dayEnd: e.target.value })}
          />
          <TextField
            label="School starts"
            type="time"
            value={f.schoolStart}
            onChange={(e) => set({ schoolStart: e.target.value })}
          />
          <TextField
            label="School ends"
            type="time"
            value={f.schoolEnd}
            onChange={(e) => set({ schoolEnd: e.target.value })}
          />
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm font-semibold">School days</legend>
          {DAYS.map((name, day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={f.schoolDays.includes(day)}
                onChange={(e) =>
                  set({
                    schoolDays: e.target.checked
                      ? [...f.schoolDays, day].toSorted((a, b) => a - b)
                      : f.schoolDays.filter((d) => d !== day),
                  })
                }
              />
              {name}
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="Students %"
            type="number"
            value={f.student}
            onChange={(e) => set({ student: e.target.value })}
          />
          <TextField
            label="Lead %"
            type="number"
            value={f.lead}
            onChange={(e) => set({ lead: e.target.value })}
          />
          <TextField
            label="Platform %"
            type="number"
            value={f.platform}
            onChange={(e) => set({ platform: e.target.value })}
          />
          <TextField
            label="Hold (days)"
            type="number"
            min={0}
            max={90}
            value={f.holdDays}
            onChange={(e) => set({ holdDays: e.target.value })}
          />
          <TextField
            label="Tax withheld %"
            type="number"
            min={0}
            max={50}
            step={0.01}
            value={f.withholding}
            onChange={(e) => set({ withholding: e.target.value })}
          />
        </div>
        <p className="text-sm text-muted">
          The split applies to new projects. Changes are in the audit log.
        </p>
        <div className="flex gap-2">
          <Button type="submit" loading={action.busy}>
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Admin → Hub → Country rules. */
export function HubCountriesPage() {
  const data = useLoad(() => api.GET('/v1/admin/hub/countries'), 'countries');
  const [editing, setEditing] = useState<Rules | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <HubPage
      title="Country rules"
      description="Per country: open or closed, the youngest age, the weekly hours, when hub work is allowed, the split, the hold before payouts and tax withheld."
    >
      <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>
      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {!data.data ? (
        <PageSpinner label="Loading" />
      ) : (
        <Card>
          <Table
            bare
            caption="Hub rules per country"
            columns={['Country', 'Open', 'Age, hours', 'Allowed', 'Split', 'Hold, tax', '']}
          >
            {data.data.map((r) => (
              <tr key={r.countryCode}>
                <Cell>
                  {r.countryCode}
                  <span className="block text-sm text-muted">{r.timeZone}</span>
                </Cell>
                <Cell>{r.enabled ? 'Open' : 'Closed'}</Cell>
                <Cell>
                  {r.minAge}+ · {r.weeklyMinutes / 60} h a week
                </Cell>
                <Cell>
                  {minuteToTime(r.dayStartMinute)}–{minuteToTime(r.dayEndMinute)}, not{' '}
                  {minuteToTime(r.schoolStartMinute)}–{minuteToTime(r.schoolEndMinute)} on{' '}
                  {r.schoolDays.map((d) => DAYS[d]).join(', ') || 'no days'}
                </Cell>
                <Cell>
                  {r.studentPercent}/{r.leadPercent}/{r.platformPercent}
                </Cell>
                <Cell>
                  {r.holdDays} days · {r.withholdingBp / 100}%
                </Cell>
                <Cell>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {editing ? (
        <RulesForm
          rules={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setNotice(`${editing.countryCode} saved.`);
            setEditing(null);
            data.reload();
          }}
        />
      ) : null}
    </HubPage>
  );
}
