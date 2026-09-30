'use client';

import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH, type FeedbackKind } from '@kcp/shared';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { Alert, Button, Dialog, Icon, textareaClass } from './ui';

/**
 * The in-app feedback button, for signed-in students and parents (pilot tool): a
 * floating pill on ordinary pages, a small button in a workspace's own header.
 */
export function FeedbackButton({ inline = false }: { inline?: boolean }) {
  const t = useTranslations('feedback');
  const locale = useLocale();
  const { state } = useAuth();
  const messageId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('IDEA');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);

  if (state.status !== 'authenticated') return null;

  function close() {
    setOpen(false);
    if (result === 'sent') {
      setMessage('');
      setKind('IDEA');
    }
    setResult(null);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 2 || sending) return;
    setSending(true);
    setResult(null);
    try {
      const { response } = await api.POST('/v1/feedback', {
        body: {
          kind,
          message: message.trim(),
          // A share page's address is a secret link: it isn't sent.
          pagePath: window.location.pathname.replace(/^((?:\/[a-z]{2})?\/p\/)[^/]+/, '$1[link]'),
          languageCode: locale,
        },
      });
      setResult(response.ok ? 'sent' : 'failed');
    } catch {
      setResult('failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'print-hidden flex items-center gap-2 rounded-full font-semibold',
          inline
            ? 'min-h-10 px-3 text-sm text-muted hover:bg-ink/7 hover:text-ink'
            : 'elev-md fixed end-4 bottom-4 z-20 min-h-11 bg-surface px-4.5 hover:bg-sand-300',
        )}
      >
        <Icon name="msg" className={inline ? 'text-base' : 'text-brand'} />
        <span className={clsx(inline && 'max-xl:sr-only')}>{t('button')}</span>
      </button>
      <Dialog open={open} onClose={close} title={t('title')}>
        {result === 'sent' ? (
          <>
            <Alert tone="success">{t('thanks')}</Alert>
            <Button className="self-end" onClick={close}>
              {t('close')}
            </Button>
          </>
        ) : (
          <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t('kind')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_KINDS.map((option) => (
                  <label
                    key={option}
                    className={clsx(
                      'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border-2 px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand has-[:focus-visible]:outline-solid',
                      kind === option
                        ? 'border-primary bg-brand-100 text-brand-800'
                        : 'border-line hover:bg-ink/7',
                      // "Something isn't safe" gets a row of its own, first.
                      option === 'SAFETY' && 'col-span-2',
                    )}
                  >
                    <input
                      type="radio"
                      name="feedback-kind"
                      value={option}
                      checked={kind === option}
                      onChange={() => setKind(option)}
                      className="size-4 accent-primary"
                    />
                    {t(`kind${option}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor={messageId} className="text-sm font-semibold">
                {t('message')}
              </label>
              <textarea
                id={messageId}
                required
                minLength={2}
                maxLength={FEEDBACK_MAX_LENGTH}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-describedby={hintId}
                className={textareaClass()}
              />
              <p id={hintId} className="text-sm text-muted">
                {t('messageHint')}
              </p>
            </div>
            {result === 'failed' ? <Alert tone="error">{t('failed')}</Alert> : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={close}>
                {t('close')}
              </Button>
              <Button type="submit" loading={sending}>
                {t('send')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
