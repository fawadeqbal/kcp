'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type Mentor = components['schemas']['AdminMentorDto'];
type Check = Mentor['backgroundCheck'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ur', name: 'Urdu' },
] as const;

const CHECK_LABEL: Record<Check, string> = {
  NOT_STARTED: 'Not started',
  PENDING: 'In progress',
  PASSED: 'Passed',
  FAILED: 'Not passed',
};

const hours = (value: number | null) => (value === null ? '—' : `${value} h`);

/**
 * Admin → Mentors and tutors: invite mentors, record background checks, set their
 * languages and how many reviews they take; and see tutors' translation work.
 */
export function MentorsPage() {
  const { state } = useAuth();
  const canManage =
    state.status === 'authenticated' && state.ability.can('update', 'MentorProfile');
  const data = useLoad(() => api.GET('/v1/admin/mentors'), 'mentors');
  const [editing, setEditing] = useState<Mentor | null>(null);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const resend = useAction();

  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const { mentors, tutors, queue } = data.data;
  return (
    <>
      <PageHeader
        title="Mentors and tutors"
        description="Mentors review premium students’ projects once their background check has passed and they signed the code of conduct. Tutors translate in Content."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setInviting(true)}>
              Invite a mentor
            </Button>
          ) : null
        }
      />
      <div className="flex flex-col gap-6">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {resend.error ? <Alert tone="error">{resend.error}</Alert> : null}
        <section aria-label="Review queue" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Waiting" value={String(queue.waiting)} />
          <Stat label="Waiting over 48 h" value={String(queue.overdue)} warn={queue.overdue > 0} />
          <Stat label="Being reviewed" value={String(queue.inReview)} />
          <Stat label="Oldest waiting" value={hours(queue.oldestHours)} />
          <Stat label="Average turnaround (30 days)" value={hours(queue.averageTurnaroundHours)} />
        </section>

        <Card title="Mentors">
          <Table
            bare
            caption="Mentors"
            columns={[
              'Mentor',
              'Status',
              'Background check',
              'Languages',
              'Reviews open',
              'Decided (30 days)',
              'Average time',
              '',
            ]}
            empty={mentors.length === 0}
            emptyText="No mentors yet: invite the first one."
          >
            {mentors.map((mentor) => (
              <tr key={mentor.id}>
                <Cell>
                  <span className="font-semibold">{mentor.name}</span>
                  <span className="block text-sm text-muted">{mentor.email}</span>
                </Cell>
                <Cell>
                  <span className="flex flex-wrap gap-1.5">
                    {mentor.invited ? <Badge tone="neutral">Invited</Badge> : null}
                    {!mentor.isActive ? (
                      <Badge tone="neutral">Paused</Badge>
                    ) : mentor.ready ? (
                      <Badge tone="success">Reviewing</Badge>
                    ) : (
                      <Badge tone="warning">Not ready</Badge>
                    )}
                    {mentor.codeOfConductSignedAt ? null : (
                      <Badge tone="warning">Code of conduct not signed</Badge>
                    )}
                    {mentor.isLead ? <Badge tone="brand">Hub lead</Badge> : null}
                  </span>
                </Cell>
                <Cell>
                  {CHECK_LABEL[mentor.backgroundCheck]}
                  {mentor.backgroundCheckedAt ? (
                    <span className="block text-sm text-muted">
                      {formatDate(mentor.backgroundCheckedAt)}
                    </span>
                  ) : null}
                </Cell>
                <Cell>{mentor.languages.join(', ') || '—'}</Cell>
                <Cell>
                  {mentor.open} of {mentor.capacity}
                </Cell>
                <Cell>{mentor.decidedLast30Days}</Cell>
                <Cell>{hours(mentor.averageTurnaroundHours)}</Cell>
                <Cell>
                  {canManage ? (
                    <span className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(mentor)}>
                        Edit
                      </Button>
                      {mentor.invited ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (
                              await resend.run(() =>
                                api.POST('/v1/admin/mentors/{id}/invite', {
                                  params: { path: { id: mentor.id } },
                                }),
                              )
                            ) {
                              setNotice(`A new invitation went to ${mentor.email}.`);
                            }
                          }}
                        >
                          Send the invitation again
                        </Button>
                      ) : null}
                    </span>
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Tutors">
          <Table
            bare
            caption="Tutors (content creators)"
            columns={['Tutor', 'Drafts now', 'Published (30 days)']}
            empty={tutors.length === 0}
            emptyText="No tutors yet (content creator accounts)."
          >
            {tutors.map((tutor) => (
              <tr key={tutor.id}>
                <Cell>
                  <span className="font-semibold">{tutor.name}</span>
                  <span className="block text-sm text-muted">{tutor.email}</span>
                </Cell>
                <Cell>{tutor.drafts}</Cell>
                <Cell>{tutor.publishedLast30Days}</Cell>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      {editing ? (
        <EditDialog
          mentor={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setNotice(`${editing.name} was updated.`);
            data.reload();
          }}
        />
      ) : null}
      {inviting ? (
        <InviteDialog
          onClose={() => setInviting(false)}
          onDone={(email) => {
            setInviting(false);
            setNotice(`Invitation sent to ${email}.`);
            data.reload();
          }}
        />
      ) : null}
    </>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={warn ? 'rounded-row bg-danger-soft p-4' : 'rounded-row bg-surface p-4'}>
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}

function LanguageBoxes({
  value,
  onChange,
}: {
  value: string[];
  onChange: (languages: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">Reviews in</legend>
      <div className="flex flex-wrap gap-4">
        {LANGUAGES.map((l) => (
          <Checkbox
            key={l.code}
            label={l.name}
            checked={value.includes(l.code)}
            onChange={(e) =>
              onChange(
                e.target.checked ? [...value, l.code] : value.filter((code) => code !== l.code),
              )
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

function EditDialog({
  mentor,
  onClose,
  onDone,
}: {
  mentor: Mentor;
  onClose: () => void;
  onDone: () => void;
}) {
  const [check, setCheck] = useState<Check>(mentor.backgroundCheck);
  const [note, setNote] = useState(mentor.backgroundCheckNote ?? '');
  const [languages, setLanguages] = useState<string[]>(mentor.languages);
  const [capacity, setCapacity] = useState(String(mentor.capacity));
  const [active, setActive] = useState(mentor.isActive);
  const [lead, setLead] = useState(mentor.isLead);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const action = useAction();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError('Give a reason (at least 3 characters).');
      return;
    }
    if (
      await action.run(() =>
        api.PATCH('/v1/admin/mentors/{id}', {
          params: { path: { id: mentor.id } },
          body: {
            backgroundCheck: check,
            backgroundCheckNote: note,
            languages,
            capacity: Number(capacity),
            isActive: active,
            isLead: lead,
            reason: reason.trim(),
          },
        }),
      )
    ) {
      onDone();
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Edit ${mentor.name}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <SelectField
          label="Background check"
          value={check}
          onChange={(e) => setCheck(e.target.value as Check)}
        >
          {(Object.keys(CHECK_LABEL) as Check[]).map((key) => (
            <option key={key} value={key}>
              {CHECK_LABEL[key]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Check note (provider, reference)"
          hint="Staff only. Never shown to the mentor or families."
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <LanguageBoxes value={languages} onChange={setLanguages} />
        <TextField
          label="Reviews open at once"
          type="number"
          min={1}
          max={50}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <Checkbox
          label="Active (a paused mentor’s open reviews go back to the queue)"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <Checkbox
          label="Lead developer for the hub (signs students off, leads client projects)"
          checked={lead}
          onChange={(e) => setLead(e.target.checked)}
        />
        <TextField
          label="Reason"
          hint="Kept in the audit log."
          maxLength={300}
          value={reason}
          error={reasonError}
          onChange={(e) => setReason(e.target.value)}
        />
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

function InviteDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [capacity, setCapacity] = useState('5');
  const action = useAction();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      await action.run(() =>
        api.POST('/v1/admin/mentors', {
          body: {
            email: email.trim(),
            displayName: name.trim(),
            languageCode: language,
            languages,
            capacity: Number(capacity),
          },
        }),
      )
    ) {
      onDone(email.trim());
    }
  };
  return (
    <Dialog open onClose={onClose} title="Invite a mentor">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          They get an email to choose a password, then set up two-factor login and sign the code of
          conduct. They review once you mark their background check as passed.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <SelectField
          label="Email and account language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </SelectField>
        <LanguageBoxes value={languages} onChange={setLanguages} />
        <TextField
          label="Reviews open at once"
          type="number"
          min={1}
          max={50}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Send the invitation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
