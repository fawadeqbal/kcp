'use client';

import type { components } from '@kcp/api-client-ts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  Card,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatMoney, parseMoney } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { Cell, Table } from './data';
import { PageHeader } from './shell';

type School = components['schemas']['AdminSchoolDto'];
type License = components['schemas']['AdminLicenseDto'];
type Teacher = components['schemas']['AdminTeacherDto'];

const linkClass = 'font-semibold text-brand-text underline-offset-4 hover:underline';

const LICENSE_STATE: Record<License['state'], { label: string; tone: BadgeTone }> = {
  INVOICED: { label: 'Invoiced, not paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  ENDED: { label: 'Ended', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ur', name: 'Urdu' },
] as const;

const seatsText = (seats: School['seats']) =>
  seats ? `${seats.used} of ${seats.total} until ${formatDate(seats.endsAt)}` : 'No paid licence';

function useCanManage() {
  const { state } = useAuth();
  return state.status === 'authenticated' && state.ability.can('update', 'School');
}

/** Admin → Schools: schools with their licence seats, and adding one. */
export function SchoolsList() {
  const canManage = useCanManage();
  const router = useRouter();
  const data = useLoad(() => api.GET('/v1/admin/schools'), 'schools');
  const [adding, setAdding] = useState(false);

  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  return (
    <>
      <PageHeader
        title="Schools"
        description="Schools pay for a licence by bank transfer. Once it is marked paid, students in the school’s classes get premium, up to its seats. Teachers are invited here."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add a school
            </Button>
          ) : null
        }
      />
      <Table
        caption="Schools"
        columns={['School', 'Teachers', 'Classes', 'Students', 'Licence seats']}
        empty={data.data.length === 0}
        emptyText="No schools yet."
      >
        {data.data.map((school) => (
          <tr key={school.id}>
            <Cell>
              <Link href={`/schools/${school.id}`} className={linkClass}>
                {school.name}
              </Link>
              <span className="block text-sm text-muted">
                {[school.city, school.countryCode].filter(Boolean).join(', ')}
              </span>
            </Cell>
            <Cell>{school.teachers}</Cell>
            <Cell>{school.classes}</Cell>
            <Cell>{school.students}</Cell>
            <Cell>{seatsText(school.seats)}</Cell>
          </tr>
        ))}
      </Table>
      {adding ? (
        <SchoolForm
          onClose={() => setAdding(false)}
          onDone={(saved) => {
            setAdding(false);
            router.push(`/schools/${saved.id}`);
          }}
        />
      ) : null}
    </>
  );
}

/** One school: details, teachers, licences and classes. */
export function SchoolDetailPage({ id }: { id: string }) {
  const canManage = useCanManage();
  const data = useLoad(() => api.GET('/v1/admin/schools/{id}', { params: { path: { id } } }), id);
  const [dialog, setDialog] = useState<
    | { kind: 'edit' }
    | { kind: 'teacher' }
    | { kind: 'license' }
    | { kind: 'paid'; license: License }
    | { kind: 'cancel'; license: License }
    | { kind: 'removeTeacher'; teacher: Teacher }
    | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (data.error) return <Alert tone="error">{data.error}</Alert>;
  if (!data.data) return <PageSpinner label="Loading" />;
  const school = data.data;
  const done = (text: string) => {
    setDialog(null);
    setNotice(text);
    data.reload();
  };
  return (
    <>
      <PageHeader
        title={school.name}
        description={`${[school.city, school.countryCode].filter(Boolean).join(', ')} · Contact: ${school.contactName} (${school.contactEmail})`}
        actions={
          canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'edit' })}>
              Edit details
            </Button>
          ) : null
        }
      />
      <div className="flex flex-col gap-6">
        <p>
          <Link href="/schools" className={linkClass}>
            All schools
          </Link>
        </p>
        <div aria-live="polite">{notice ? <Alert tone="success">{notice}</Alert> : null}</div>

        <Card
          title="Licences"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setDialog({ kind: 'license' })}>
                Add a licence
              </Button>
            ) : null
          }
        >
          <p className="mb-3 text-sm text-muted">Seats now: {seatsText(school.seats)}.</p>
          <Table
            bare
            caption="Licences"
            columns={['Invoice', 'Seats used', 'Dates', 'Amount', 'State', '']}
            empty={school.licenses.length === 0}
            emptyText="No licences yet."
          >
            {school.licenses.map((license) => (
              <tr key={license.id}>
                <Cell>
                  <span className="font-semibold">{license.invoiceNumber}</span>
                  {license.paymentReference ? (
                    <span className="block text-sm text-muted">
                      Paid {formatDate(license.paidAt)} · {license.paymentReference}
                    </span>
                  ) : null}
                </Cell>
                <Cell>
                  {license.used} of {license.seats}
                </Cell>
                <Cell>
                  {formatDate(license.startsAt)} – {formatDate(license.endsAt)}
                </Cell>
                <Cell>{formatMoney(license.amountMinor, license.currency)}</Cell>
                <Cell>
                  <Badge tone={LICENSE_STATE[license.state].tone}>
                    {LICENSE_STATE[license.state].label}
                  </Badge>
                </Cell>
                <Cell>
                  {canManage && (license.state === 'INVOICED' || license.state === 'PAID') ? (
                    <span className="flex flex-wrap gap-2">
                      {license.state === 'INVOICED' ? (
                        <Button
                          size="sm"
                          aria-label={`Mark ${license.invoiceNumber} paid`}
                          onClick={() => setDialog({ kind: 'paid', license })}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Cancel ${license.invoiceNumber}`}
                        onClick={() => setDialog({ kind: 'cancel', license })}
                      >
                        Cancel
                      </Button>
                    </span>
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>

        <Card
          title="Teachers"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setDialog({ kind: 'teacher' })}>
                Add a teacher
              </Button>
            ) : null
          }
        >
          <Table
            bare
            caption="Teachers"
            columns={['Teacher', 'Classes', '']}
            empty={school.teacherList.length === 0}
            emptyText="No teachers yet: add the first one."
          >
            {school.teacherList.map((teacher) => (
              <tr key={teacher.id}>
                <Cell>
                  <span className="font-semibold">{teacher.name}</span>{' '}
                  {teacher.invited ? <Badge tone="neutral">Invited</Badge> : null}
                  <span className="block text-sm text-muted">{teacher.email}</span>
                </Cell>
                <Cell>{teacher.classes}</Cell>
                <Cell>
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${teacher.name} from ${school.name}`}
                      onClick={() => setDialog({ kind: 'removeTeacher', teacher })}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Classes">
          <Table
            bare
            caption="Classes"
            columns={['Class', 'Teacher', 'Students', 'Waiting for a parent', 'Lessons set']}
            empty={school.classList.length === 0}
            emptyText="No classes yet. Teachers make them in the web app."
          >
            {school.classList.map((c) => (
              <tr key={c.id}>
                <Cell>
                  <span className="font-semibold">{c.name}</span>{' '}
                  {c.archived ? <Badge tone="neutral">Archived</Badge> : null}
                </Cell>
                <Cell>{c.teacher}</Cell>
                <Cell>{c.approved}</Cell>
                <Cell>{c.pending}</Cell>
                <Cell>{c.assignments}</Cell>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {dialog?.kind === 'edit' ? (
        <SchoolForm
          school={school}
          onClose={() => setDialog(null)}
          onDone={() => done('The school was updated.')}
        />
      ) : null}
      {dialog?.kind === 'teacher' ? (
        <TeacherDialog
          school={school}
          onClose={() => setDialog(null)}
          onDone={(email, invited) =>
            done(
              invited
                ? `An invitation went to ${email}.`
                : `${email} now teaches at ${school.name}.`,
            )
          }
        />
      ) : null}
      {dialog?.kind === 'license' ? (
        <LicenseDialog
          school={school}
          onClose={() => setDialog(null)}
          onDone={(invoice) =>
            done(`Licence ${invoice} added. Mark it paid when the transfer arrives.`)
          }
        />
      ) : null}
      {dialog?.kind === 'paid' ? (
        <ReasonDialog
          title={`Mark ${dialog.license.invoiceNumber} paid`}
          intro="Premium starts now for the school’s students, up to the licence’s seats."
          label="Bank transfer reference"
          minLength={3}
          submit="Mark paid"
          onClose={() => setDialog(null)}
          call={(text) =>
            api.POST('/v1/admin/schools/licenses/{licenseId}/paid', {
              params: { path: { licenseId: dialog.license.id } },
              body: { paymentReference: text },
            })
          }
          onDone={() => done(`${dialog.license.invoiceNumber} is paid: premium started.`)}
        />
      ) : null}
      {dialog?.kind === 'cancel' ? (
        <ReasonDialog
          title={`Cancel ${dialog.license.invoiceNumber}?`}
          intro="Premium from this licence ends now for every student. This can’t be undone."
          label="Reason"
          hint="Kept in the audit log."
          minLength={5}
          submit="Cancel the licence"
          danger
          onClose={() => setDialog(null)}
          call={(text) =>
            api.POST('/v1/admin/schools/licenses/{licenseId}/cancel', {
              params: { path: { licenseId: dialog.license.id } },
              body: { reason: text },
            })
          }
          onDone={() => done(`${dialog.license.invoiceNumber} was cancelled.`)}
        />
      ) : null}
      {dialog?.kind === 'removeTeacher' ? (
        <ConfirmRemoveTeacher
          school={school}
          teacher={dialog.teacher}
          onClose={() => setDialog(null)}
          onDone={() => done(`${dialog.teacher.name} no longer teaches at ${school.name}.`)}
        />
      ) : null}
    </>
  );
}

function SchoolForm({
  school,
  onClose,
  onDone,
}: {
  school?: School;
  onClose: () => void;
  onDone: (saved: School) => void;
}) {
  const [name, setName] = useState(school?.name ?? '');
  const [countryCode, setCountryCode] = useState(school?.countryCode ?? 'PK');
  const [city, setCity] = useState(school?.city ?? '');
  const [contactName, setContactName] = useState(school?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(school?.contactEmail ?? '');
  const action = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      city: city.trim() || null,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
    };
    let saved: School | undefined;
    const ok = await action.run(async () => {
      const result = school
        ? await api.PUT('/v1/admin/schools/{id}', { params: { path: { id: school.id } }, body })
        : await api.POST('/v1/admin/schools', { body });
      saved = result.data;
      return result;
    });
    if (ok && saved) onDone(saved);
  };
  return (
    <Dialog open onClose={onClose} title={school ? `Edit ${school.name}` : 'Add a school'}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="School name"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Country code"
            hint="Two letters, e.g. PK"
            required
            pattern="[A-Za-z]{2}"
            maxLength={2}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          />
          <TextField
            label="City"
            maxLength={80}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <TextField
          label="Contact name"
          hint="Who we deal with about invoices. Staff only."
          required
          minLength={2}
          maxLength={120}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <TextField
          label="Contact email"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            {school ? 'Save' : 'Add the school'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function TeacherDialog({
  school,
  onClose,
  onDone,
}: {
  school: School;
  onClose: () => void;
  onDone: (email: string, invited: boolean) => void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]['code']>('en');
  const action = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let invited = false;
    const ok = await action.run(async () => {
      const result = await api.POST('/v1/admin/schools/{id}/teachers', {
        params: { path: { id: school.id } },
        body: {
          email: email.trim(),
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          languageCode: language,
        },
      });
      invited = result.data?.invited ?? false;
      return result;
    });
    if (ok) onDone(email.trim(), invited);
  };
  return (
    <Dialog open onClose={onClose} title={`Add a teacher to ${school.name}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          An existing teacher account is added as it is. A new address gets an invitation email:
          they choose a password, then set up two-factor login.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Name (for a new account)"
          hint="Students and parents see it, e.g. “Ms Aslam”."
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <SelectField
          label="Email and account language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as (typeof LANGUAGES)[number]['code'])}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Add the teacher
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const dayInput = (date: Date) => date.toISOString().slice(0, 10);

function LicenseDialog({
  school,
  onClose,
  onDone,
}: {
  school: School;
  onClose: () => void;
  onDone: (invoice: string) => void;
}) {
  const today = new Date();
  const [seats, setSeats] = useState('30');
  const [startsAt, setStartsAt] = useState(dayInput(today));
  const [endsAt, setEndsAt] = useState(dayInput(new Date(today.getTime() + 365 * 86_400_000)));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [amountError, setAmountError] = useState<string>();
  const action = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amountMinor = parseMoney(amount, currency.toUpperCase());
    if (amountMinor === null) {
      setAmountError('Type an amount, e.g. 150000 or 1,500.50.');
      return;
    }
    setAmountError(undefined);
    const invoice = invoiceNumber.trim();
    if (
      await action.run(() =>
        api.POST('/v1/admin/schools/{id}/licenses', {
          params: { path: { id: school.id } },
          body: {
            seats: Number(seats),
            startsAt: new Date(`${startsAt}T00:00:00Z`).toISOString(),
            endsAt: new Date(`${endsAt}T23:59:59Z`).toISOString(),
            invoiceNumber: invoice,
            amountMinor,
            currency: currency.toUpperCase(),
          },
        }),
      )
    ) {
      onDone(invoice);
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Add a licence for ${school.name}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          Add it when the invoice goes out. Premium starts once you mark it paid.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label="Invoice number"
          required
          minLength={3}
          maxLength={40}
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Seats (students)"
            type="number"
            min={1}
            max={5000}
            required
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
          <TextField
            label="Starts"
            type="date"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <TextField
            label="Ends"
            type="date"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <TextField
            label="Amount on the invoice"
            required
            inputMode="decimal"
            value={amount}
            error={amountError}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            label="Currency"
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.busy}>
            Add the licence
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReasonDialog({
  title,
  intro,
  label,
  hint,
  minLength,
  submit,
  danger = false,
  onClose,
  call,
  onDone,
}: {
  title: string;
  intro: string;
  label: string;
  hint?: string;
  minLength: number;
  submit: string;
  danger?: boolean;
  onClose: () => void;
  call: (text: string) => Promise<{ error?: unknown; response: Response }>;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const action = useAction();
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < minLength) {
      setError(`At least ${minLength} characters.`);
      return;
    }
    setError(undefined);
    if (await action.run(() => call(text.trim()))) onDone();
  };
  return (
    <Dialog open onClose={onClose} title={title}>
      <form className="flex flex-col gap-4" onSubmit={send}>
        <p className="text-sm text-muted">{intro}</p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <TextField
          label={label}
          hint={hint}
          maxLength={300}
          value={text}
          error={error}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={action.busy}>
            {submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmRemoveTeacher({
  school,
  teacher,
  onClose,
  onDone,
}: {
  school: School;
  teacher: Teacher;
  onClose: () => void;
  onDone: () => void;
}) {
  const action = useAction();
  return (
    <Dialog open onClose={onClose} title={`Remove ${teacher.name} from ${school.name}?`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Their account stays. A teacher with classes here archives them first.
        </p>
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="danger"
            loading={action.busy}
            onClick={async () => {
              if (
                await action.run(() =>
                  api.DELETE('/v1/admin/schools/{id}/teachers/{userId}', {
                    params: { path: { id: school.id, userId: teacher.id } },
                  }),
                )
              ) {
                onDone();
              }
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
