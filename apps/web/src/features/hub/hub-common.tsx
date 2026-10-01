'use client';

import type { components } from '@kcp/api-client-ts';
import { useLocale, useTranslations } from 'next-intl';
import { type DependencyList, useCallback, useEffect, useState } from 'react';
import { Alert, Badge, type BadgeTone } from '@/components/ui';
import { errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { SANDBOX_URL } from '../learn/use-sandbox';

export type ProjectStatus = components['schemas']['ProjectSummaryDto']['status'];
export type TaskStatus = components['schemas']['HubTaskDto']['status'];
export type InvoiceStatus = components['schemas']['HubInvoiceDto']['status'];
export type DeliveryStatus = components['schemas']['HubDeliveryDto']['status'];
export type PayoutStatus = components['schemas']['PayoutDto']['status'];
export type MemberStatus = components['schemas']['HubMemberDto']['status'];

/** API error codes of the hub with a message of their own under "hub.errors.*". */
export const HUB_ERROR_CODES = [
  'AGREEMENT_CHANGED',
  'AGREEMENT_NEEDED',
  'BAD_IBAN',
  'DETAILS_NEEDED',
  'DELIVERY_DECIDED',
  'DELIVERY_WAITING',
  'FILE_TOO_LARGE',
  'FILE_TYPE',
  'GIT_NOT_SET_UP',
  'HUB_NOT_READY',
  'HUB_PAUSED',
  'INVITE_ANSWERED',
  'LINK_EXPIRED',
  'NOTHING_TO_PREVIEW',
  'NOT_ELIGIBLE',
  'NO_INDEX',
  'OUTSIDE_HOURS',
  'OWNER_ONLY',
  'PAYOUT_NOT_WAITING',
  'PAYOUT_SENT',
  'PROJECT_NOT_ACTIVE',
  'QUOTE_LOCKED',
  'QUOTE_NOT_SENT',
  'STUDENT_BUSY',
  'TASKS_OPEN',
  'TASK_NOT_OPEN',
  'TEAM_FULL',
  'TIMER_NOT_RUNNING',
  'TIMER_RUNNING',
  'TOO_MANY_FILES',
  'WEEKLY_CAP',
  'WRONG_PASSWORD',
] as const;

/** A message for an API error: the hub's own, the app's, or (in English) the API's words. */
export function useErrorText() {
  const t = useTranslations();
  const locale = useLocale();
  return useCallback(
    (error: unknown, network = false): string => {
      if (network) return t('errors.network');
      const code = errorCode(error);
      if ((HUB_ERROR_CODES as readonly string[]).includes(code ?? '')) {
        return t(`hub.errors.${code}` as 'hub.errors.WEEKLY_CAP');
      }
      const known = errorMessageKey(code);
      if (known !== 'generic') return t(`errors.${known}`);
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: unknown }).message
          : undefined;
      return locale === 'en' && typeof message === 'string' ? message : t('errors.generic');
    },
    [t, locale],
  );
}

/** Loads something once (and again on `reload`), with a "failed" state for the page. */
export function useLoad<T>(load: () => Promise<T | undefined>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- the caller lists the inputs
  const run = useCallback(load, deps);
  const reload = useCallback(async () => {
    try {
      const value = await run();
      if (value === undefined) setFailed(true);
      else {
        setData(value);
        setFailed(false);
      }
    } catch {
      setFailed(true);
    }
  }, [run]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, failed, reload, setData };
}

type Notice = { tone: 'success' | 'error'; text: string } | null;

/**
 * Runs one action at a time with a busy key and a notice: the success text, or the
 * error's message. Returns whether it worked.
 */
export function useAction() {
  const errorText = useErrorText();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const run = useCallback(
    async (
      key: string,
      call: () => Promise<{ error?: unknown; response: Response }>,
      success?: string,
    ): Promise<boolean> => {
      setBusy(key);
      setNotice(null);
      try {
        const { error, response } = await call();
        if (response.ok) {
          if (success) setNotice({ tone: 'success', text: success });
          return true;
        }
        setNotice({ tone: 'error', text: errorText(error) });
      } catch {
        setNotice({ tone: 'error', text: errorText(null, true) });
      } finally {
        setBusy(null);
      }
      return false;
    },
    [errorText],
  );
  return { busy, notice, setNotice, run };
}

/** The action's notice, in a polite live region (kept even when empty). */
export function NoticeArea({ notice }: { notice: Notice }) {
  return (
    <div aria-live="polite">
      {notice ? (
        <Alert tone={notice.tone} live={false}>
          {notice.text}
        </Alert>
      ) : null}
    </div>
  );
}

export function Money({ minor, currency }: { minor: number; currency: string }) {
  const locale = useLocale();
  return <span className="tabular-nums">{formatMoney(locale, minor, currency)}</span>;
}

export function useMoney() {
  const locale = useLocale();
  return useCallback(
    (minor: number, currency: string) => formatMoney(locale, minor, currency),
    [locale],
  );
}

/** "3 h 20 min", "45 min". */
export function useDuration() {
  const t = useTranslations('hub');
  return useCallback(
    (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h && m) return t('hoursMinutes', { h, m });
      if (h) return t('hours', { h });
      return t('minutes', { m });
    },
    [t],
  );
}

const PROJECT_TONES: Record<ProjectStatus, BadgeTone> = {
  SCOPING: 'neutral',
  QUOTED: 'brand',
  AWAITING_DEPOSIT: 'warning',
  ACTIVE: 'brand',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations('hub.projectStatus');
  return <Badge tone={PROJECT_TONES[status]}>{t(status)}</Badge>;
}

const TASK_TONES: Record<TaskStatus, BadgeTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'brand',
  IN_REVIEW: 'warning',
  DONE: 'success',
  CANCELLED: 'neutral',
};
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslations('hub.taskStatus');
  return <Badge tone={TASK_TONES[status]}>{t(status)}</Badge>;
}

const INVOICE_TONES: Record<InvoiceStatus, BadgeTone> = {
  OPEN: 'warning',
  PAID: 'success',
  VOID: 'neutral',
};
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations('hub.invoiceStatus');
  return <Badge tone={INVOICE_TONES[status]}>{t(status)}</Badge>;
}

const DELIVERY_TONES: Record<DeliveryStatus, BadgeTone> = {
  SUBMITTED: 'warning',
  ACCEPTED: 'success',
  CHANGES_REQUESTED: 'brand',
  WITHDRAWN: 'neutral',
};
export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const t = useTranslations('hub.deliveryStatus');
  return <Badge tone={DELIVERY_TONES[status]}>{t(status)}</Badge>;
}

const PAYOUT_TONES: Record<PayoutStatus, BadgeTone> = {
  AWAITING_PARENT: 'warning',
  CONFIRMED: 'brand',
  SENDING: 'brand',
  SENT: 'brand',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};
export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const t = useTranslations('hub.payoutStatus');
  return <Badge tone={PAYOUT_TONES[status]}>{t(status)}</Badge>;
}

const MEMBER_TONES: Record<MemberStatus, BadgeTone> = {
  INVITED: 'warning',
  ACCEPTED: 'warning',
  APPROVED: 'success',
  DECLINED: 'neutral',
  REMOVED: 'neutral',
};
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const t = useTranslations('hub.memberStatus');
  return <Badge tone={MEMBER_TONES[status]}>{t(status)}</Badge>;
}

/** The sandbox page that shows a milestone's preview (the secret is after "#"). */
export function previewUrl(token: string, locale: string): string {
  return `${SANDBOX_URL}/preview/?lang=${locale}#${token}`;
}
