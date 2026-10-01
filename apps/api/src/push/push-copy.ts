/**
 * What push notifications say, in each app language. Short: a phone shows about
 * 40 characters of the title and two lines of the body.
 */

export const PUSH_LANGUAGES = ['en', 'ar', 'ur'] as const;
export type PushLanguage = (typeof PUSH_LANGUAGES)[number];

export type PushKind =
  'streakReminder' | 'monthlySummary' | 'trialEnding' | 'friendRequest' | 'eventJoin' | 'classJoin';

/** Where a tap opens the app (the app's own route). */
export const PUSH_ROUTES: Record<PushKind, string> = {
  streakReminder: '/practice',
  monthlySummary: '/parent',
  trialEnding: '/parent',
  friendRequest: '/parent',
  eventJoin: '/parent',
  classJoin: '/parent',
};

type Copy = Record<PushKind, { title: string; body: string }>;

const COPY: Record<PushLanguage, Copy> = {
  en: {
    streakReminder: {
      title: 'Your streak: {days} days',
      body: "A few minutes keeps it going. Today's practice is ready.",
    },
    monthlySummary: {
      title: 'Your summary for {month}',
      body: 'See what your children learned last month.',
    },
    trialEnding: {
      title: "{nickname}'s trial ends soon",
      body: 'The free premium trial ends on {date}.',
    },
    friendRequest: {
      title: '{nickname} and {friend} want to be friends',
      body: 'Approve or decline it in the app.',
    },
    eventJoin: {
      title: '{nickname} wants to join a hackathon team',
      body: 'Approve or decline it in the app.',
    },
    classJoin: {
      title: '{nickname} wants to join a class',
      body: 'Approve or decline it in the app.',
    },
  },
  ar: {
    streakReminder: {
      title: 'سلسلة أيامك: {days}',
      body: 'دقائق قليلة تحافظ عليها. تمرين اليوم جاهز.',
    },
    monthlySummary: {
      title: 'ملخّص شهر {month}',
      body: 'اطّلع على ما تعلّمه أطفالك في الشهر الماضي.',
    },
    trialEnding: {
      title: 'تجربة {nickname} تنتهي قريبًا',
      body: 'تنتهي التجربة المجانية للمحتوى المميز في {date}.',
    },
    friendRequest: {
      title: '{nickname} و{friend} يريدان أن يصبحا صديقين',
      body: 'وافق أو ارفض من التطبيق.',
    },
    eventJoin: {
      title: '{nickname} يريد الانضمام إلى فريق في هاكاثون',
      body: 'وافق أو ارفض من التطبيق.',
    },
    classJoin: {
      title: '{nickname} يريد الانضمام إلى صف',
      body: 'وافق أو ارفض من التطبيق.',
    },
  },
  ur: {
    streakReminder: {
      title: 'آپ کا سلسلہ: {days} دن',
      body: 'چند منٹ اسے جاری رکھیں گے۔ آج کی مشق تیار ہے۔',
    },
    monthlySummary: {
      title: '{month} کا خلاصہ',
      body: 'دیکھیں آپ کے بچوں نے پچھلے مہینے کیا سیکھا۔',
    },
    trialEnding: {
      title: '{nickname} کا ٹرائل جلد ختم ہو رہا ہے',
      body: 'پریمیم کا مفت ٹرائل {date} کو ختم ہو رہا ہے۔',
    },
    friendRequest: {
      title: '{nickname} اور {friend} دوست بننا چاہتے ہیں',
      body: 'ایپ میں منظور کریں یا انکار کریں۔',
    },
    eventJoin: {
      title: '{nickname} ہیکاتھون کی ایک ٹیم میں شامل ہونا چاہتا ہے',
      body: 'ایپ میں منظور کریں یا انکار کریں۔',
    },
    classJoin: {
      title: '{nickname} ایک کلاس میں شامل ہونا چاہتا ہے',
      body: 'ایپ میں منظور کریں یا انکار کریں۔',
    },
  },
};

export const toPushLanguage = (code: string | null | undefined): PushLanguage =>
  (PUSH_LANGUAGES as readonly string[]).includes(code ?? '') ? (code as PushLanguage) : 'en';

const fill = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) =>
    params[key] === undefined ? match : String(params[key]),
  );

export function renderPush(
  kind: PushKind,
  language: PushLanguage,
  params: Record<string, string | number>,
): { title: string; body: string } {
  const copy = COPY[language][kind];
  return { title: fill(copy.title, params), body: fill(copy.body, params) };
}

export const pushCopyForTests = COPY;
