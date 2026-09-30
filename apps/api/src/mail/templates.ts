/**
 * Transactional email copy in every launch language. Keep the three languages in
 * step — a test fails if a key is missing. Native speakers should review new copy.
 */

export const BRAND_NAME = 'Kids Coding Platform';

export type MailLanguage = 'en' | 'ar' | 'ur';
export type MailTemplate =
  | 'verifyEmail'
  | 'resetPassword'
  | 'accountExists'
  | 'welcome'
  | 'waitlistConfirm'
  | 'trialEnding'
  | 'receipt'
  | 'paymentFailed'
  | 'subscriptionEnded'
  | 'monthlySummary'
  | 'passwordChanged'
  | 'twoFactorEnabled'
  | 'accountDeleted';

/** Values a template fills in, e.g. { nickname: "Rocket", date: "14 October 2026" }. */
export type MailVars = Record<string, string>;
type Text = string | ((vars: MailVars) => string);

interface TemplateCopy {
  subject: Text;
  intro: Text;
  button: string;
  outro: Text;
}

/** One child's month in the monthly summary. */
export interface ChildMonth {
  nickname: string;
  lessons: number;
  xp: number;
  projects: number;
  streak: number;
}

interface LanguageCopy {
  dir: 'ltr' | 'rtl';
  greeting: (name: string) => string;
  /** When there's no name to greet (the waitlist). */
  hello: string;
  signOff: string;
  /** One line of the monthly summary per child. */
  childMonth: (child: ChildMonth) => string;
  templates: Record<MailTemplate, TemplateCopy>;
}

export const MAIL_COPY: Record<MailLanguage, LanguageCopy> = {
  en: {
    dir: 'ltr',
    greeting: (name) => `Hi ${name},`,
    hello: 'Hello,',
    signOff: `The ${BRAND_NAME} team`,
    childMonth: (c) =>
      `${c.nickname} — lessons finished: ${c.lessons}, XP earned: ${c.xp}, projects shipped: ${c.projects}, longest streak (days): ${c.streak}`,
    templates: {
      verifyEmail: {
        subject: 'Confirm your email address',
        intro:
          "Thanks for signing up. Please confirm your email address so you can set up your child's account.",
        button: 'Confirm email',
        outro: "This link expires in 48 hours. If you didn't sign up, you can ignore this email.",
      },
      resetPassword: {
        subject: 'Reset your password',
        intro:
          'We received a request to reset your password. Use the button below to choose a new one.',
        button: 'Choose a new password',
        outro:
          "This link expires in 1 hour. If you didn't ask for this, you can ignore this email — your password won't change.",
      },
      accountExists: {
        subject: 'You already have an account',
        intro:
          'Someone tried to sign up with this email address, but you already have an account. You can log in, or reset your password if you have forgotten it.',
        button: 'Log in',
        outro: "If this wasn't you, you don't need to do anything.",
      },
      welcome: {
        subject: 'Welcome! Your account is ready',
        intro:
          "Your email is confirmed and your account is ready. Next, create your child's account: you choose their nickname, avatar and password, and decide what they share. Every new child can try premium for free for 14 days.",
        button: "Add your child's account",
        outro: 'Questions? Just reply to this email.',
      },
      waitlistConfirm: {
        subject: 'Please confirm your email',
        intro:
          "Thanks for joining the waitlist. Please confirm your email address, and we'll write once when the platform opens in your country.",
        button: 'Confirm my email',
        outro:
          "This link expires in 7 days. If you didn't ask for this, ignore this email and we won't write again.",
      },
      trialEnding: {
        subject: (v) => `${v['nickname']}'s free premium trial ends soon`,
        intro: (v) =>
          `${v['nickname']}'s free premium trial ends on ${v['date']}. After that, premium lessons (like Python) and projects lock until you choose a plan. Free lessons stay open, and everything ${v['nickname']} made stays theirs.`,
        button: 'See plans',
        outro: 'One plan covers all your children, with a family discount from the second child.',
      },
      receipt: {
        subject: (v) => `Your receipt ${v['number']}`,
        intro: (v) =>
          `Thank you for your payment of ${v['amount']}. Premium is on for all your children until ${v['until']}.`,
        button: 'See your invoice',
        outro: 'Keep this email for your records.',
      },
      paymentFailed: {
        subject: 'Your payment didn’t go through',
        intro:
          "We couldn't take the payment to renew your plan. Please check your card: we'll try again over the next few days. Premium stays on meanwhile.",
        button: 'Check your plan',
        outro: 'If you want to stop your plan, you can cancel it on the same page.',
      },
      subscriptionEnded: {
        subject: 'Your plan has ended',
        intro:
          'Your plan has ended, so premium lessons and projects are locked again. Your children keep everything they made, and free lessons stay open.',
        button: 'See plans',
        outro: "We'd love to have you back whenever you're ready.",
      },
      passwordChanged: {
        subject: 'Your password was changed',
        intro:
          'The password of your account was just changed, and every other device was signed out.',
        button: 'Not you? Reset your password',
        outro:
          "If you changed it yourself, there's nothing to do. If you didn't, reset your password now and write to us.",
      },
      twoFactorEnabled: {
        subject: 'Two-factor login is on',
        intro: 'An authenticator app was just set up for your staff account.',
        button: 'Not you? Reset your password',
        outro:
          "If you set it up yourself, there's nothing to do. If you didn't, reset your password and tell the team straight away.",
      },
      accountDeleted: {
        subject: 'Your account was deleted',
        intro:
          "Your account and your children's accounts are deleted, with their progress, code and projects. Any plan has stopped: nothing more will be charged.",
        button: `Visit ${BRAND_NAME}`,
        outro:
          "We keep invoices and consent records for as long as the law asks us to. If you didn't ask for this, write to us straight away.",
      },
      monthlySummary: {
        subject: (v) => `Your children's month: ${v['month']}`,
        intro: (v) => `Here's what your children did in ${v['month']}:`,
        button: 'Open your dashboard',
        outro: 'You get this summary once a month. You can switch it off on your dashboard.',
      },
    },
  },
  ar: {
    dir: 'rtl',
    greeting: (name) => `مرحبًا ${name}،`,
    hello: 'مرحبًا،',
    signOff: `فريق ${BRAND_NAME}`,
    childMonth: (c) =>
      `${c.nickname} — الدروس المكتملة: ${c.lessons}، نقاط الخبرة: ${c.xp}، المشاريع المنشورة: ${c.projects}، أطول سلسلة (بالأيام): ${c.streak}`,
    templates: {
      verifyEmail: {
        subject: 'أكّد بريدك الإلكتروني',
        intro: 'شكرًا لتسجيلك. يُرجى تأكيد بريدك الإلكتروني لتتمكّن من إنشاء حساب طفلك.',
        button: 'تأكيد البريد الإلكتروني',
        outro:
          'تنتهي صلاحية هذا الرابط خلال 48 ساعة. إذا لم تقم بالتسجيل، يمكنك تجاهل هذه الرسالة.',
      },
      resetPassword: {
        subject: 'إعادة تعيين كلمة المرور',
        intro:
          'تلقّينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. استخدم الزر أدناه لاختيار كلمة مرور جديدة.',
        button: 'اختيار كلمة مرور جديدة',
        outro:
          'تنتهي صلاحية هذا الرابط خلال ساعة واحدة. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة ولن تتغيّر كلمة المرور.',
      },
      accountExists: {
        subject: 'لديك حساب بالفعل',
        intro:
          'حاول شخص ما التسجيل باستخدام هذا البريد الإلكتروني، لكن لديك حساب بالفعل. يمكنك تسجيل الدخول، أو إعادة تعيين كلمة المرور إذا نسيتها.',
        button: 'تسجيل الدخول',
        outro: 'إذا لم تكن أنت، فلا داعي لفعل أي شيء.',
      },
      welcome: {
        subject: 'أهلًا بك! حسابك جاهز',
        intro:
          'تمّ تأكيد بريدك الإلكتروني وأصبح حسابك جاهزًا. الخطوة التالية: أنشئ حساب طفلك، فأنت تختار اسمه المستعار وصورته الرمزية وكلمة مروره وتقرّر ما يشاركه. يمكن لكل طفل جديد تجربة بريميوم مجانًا لمدة 14 يومًا.',
        button: 'أنشئ حساب طفلك',
        outro: 'لديك أسئلة؟ ما عليك إلا الرد على هذه الرسالة.',
      },
      waitlistConfirm: {
        subject: 'يُرجى تأكيد بريدك الإلكتروني',
        intro:
          'شكرًا لانضمامك إلى قائمة الانتظار. يُرجى تأكيد بريدك الإلكتروني، وسنراسلك مرة واحدة عندما تُفتح المنصة في بلدك.',
        button: 'تأكيد بريدي الإلكتروني',
        outro:
          'تنتهي صلاحية هذا الرابط خلال 7 أيام. إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن نراسلك مرة أخرى.',
      },
      trialEnding: {
        subject: (v) => `تنتهي تجربة بريميوم المجانية لـ ${v['nickname']} قريبًا`,
        intro: (v) =>
          `تنتهي تجربة بريميوم المجانية لـ ${v['nickname']} في ${v['date']}. بعد ذلك تُقفل دروس بريميوم (مثل بايثون) والمشاريع حتى تختار خطة. تبقى الدروس المجانية مفتوحة، ويبقى كل ما صنعه ${v['nickname']} ملكًا له.`,
        button: 'اطّلع على الخطط',
        outro: 'خطة واحدة تشمل كل أطفالك، مع خصم عائلي بدءًا من الطفل الثاني.',
      },
      receipt: {
        subject: (v) => `إيصالك ${v['number']}`,
        intro: (v) =>
          `شكرًا لك على دفع ${v['amount']}. بريميوم مفعّل لكل أطفالك حتى ${v['until']}.`,
        button: 'اطّلع على فاتورتك',
        outro: 'احتفظ بهذه الرسالة في سجلاتك.',
      },
      paymentFailed: {
        subject: 'لم تنجح عملية الدفع',
        intro:
          'لم نتمكّن من تحصيل الدفعة لتجديد خطتك. يُرجى التحقق من بطاقتك: سنحاول مرة أخرى خلال الأيام القادمة. يبقى بريميوم مفعّلًا في هذه الأثناء.',
        button: 'تحقّق من خطتك',
        outro: 'إذا أردت إيقاف خطتك، يمكنك إلغاؤها من الصفحة نفسها.',
      },
      subscriptionEnded: {
        subject: 'انتهت خطتك',
        intro:
          'انتهت خطتك، لذلك أصبحت دروس بريميوم ومشاريعه مقفلة مرة أخرى. يحتفظ أطفالك بكل ما صنعوه، وتبقى الدروس المجانية مفتوحة.',
        button: 'اطّلع على الخطط',
        outro: 'يسعدنا أن تعود متى شئت.',
      },
      passwordChanged: {
        subject: 'تم تغيير كلمة المرور',
        intro: 'تم تغيير كلمة مرور حسابك للتو، وتم تسجيل الخروج من جميع الأجهزة الأخرى.',
        button: 'لست أنت؟ أعد تعيين كلمة المرور',
        outro:
          'إذا غيّرتها بنفسك، فلا حاجة لفعل أي شيء. وإن لم تفعل، فأعد تعيين كلمة المرور الآن وراسلنا.',
      },
      twoFactorEnabled: {
        subject: 'تم تفعيل تسجيل الدخول بخطوتين',
        intro: 'تم للتو إعداد تطبيق المصادقة لحساب الموظف الخاص بك.',
        button: 'لست أنت؟ أعد تعيين كلمة المرور',
        outro:
          'إذا أعددته بنفسك، فلا حاجة لفعل أي شيء. وإن لم تفعل، فأعد تعيين كلمة المرور وأخبر الفريق فورًا.',
      },
      accountDeleted: {
        subject: 'تم حذف حسابك',
        intro:
          'تم حذف حسابك وحسابات أطفالك مع تقدّمهم وأكوادهم ومشاريعهم. وتوقّفت أي خطة: لن يُخصم أي مبلغ بعد الآن.',
        button: `زيارة ${BRAND_NAME}`,
        outro:
          'نحتفظ بالفواتير وسجلات الموافقة للمدة التي يطلبها القانون. إذا لم تطلب ذلك، فراسلنا فورًا.',
      },
      monthlySummary: {
        subject: (v) => `شهر أطفالك: ${v['month']}`,
        intro: (v) => `هذا ما أنجزه أطفالك في ${v['month']}:`,
        button: 'افتح لوحة التحكم',
        outro: 'يصلك هذا الملخّص مرة في الشهر. يمكنك إيقافه من لوحة التحكم.',
      },
    },
  },
  ur: {
    dir: 'rtl',
    greeting: (name) => `السلام علیکم ${name}،`,
    hello: 'السلام علیکم،',
    signOff: `${BRAND_NAME} ٹیم`,
    childMonth: (c) =>
      `${c.nickname} — مکمل اسباق: ${c.lessons}، XP: ${c.xp}، شائع پروجیکٹس: ${c.projects}، سب سے لمبی اسٹریک (دن): ${c.streak}`,
    templates: {
      verifyEmail: {
        subject: 'اپنا ای میل ایڈریس تصدیق کریں',
        intro:
          'سائن اپ کرنے کا شکریہ۔ براہِ کرم اپنا ای میل ایڈریس تصدیق کریں تاکہ آپ اپنے بچے کا اکاؤنٹ بنا سکیں۔',
        button: 'ای میل کی تصدیق کریں',
        outro:
          'یہ لنک 48 گھنٹوں میں ختم ہو جائے گا۔ اگر آپ نے سائن اپ نہیں کیا تو اس ای میل کو نظر انداز کر دیں۔',
      },
      resetPassword: {
        subject: 'اپنا پاس ورڈ دوبارہ سیٹ کریں',
        intro:
          'ہمیں آپ کا پاس ورڈ دوبارہ سیٹ کرنے کی درخواست موصول ہوئی ہے۔ نیا پاس ورڈ منتخب کرنے کے لیے نیچے دیا گیا بٹن استعمال کریں۔',
        button: 'نیا پاس ورڈ منتخب کریں',
        outro:
          'یہ لنک ایک گھنٹے میں ختم ہو جائے گا۔ اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظر انداز کر دیں، آپ کا پاس ورڈ تبدیل نہیں ہوگا۔',
      },
      accountExists: {
        subject: 'آپ کا اکاؤنٹ پہلے سے موجود ہے',
        intro:
          'کسی نے اس ای میل ایڈریس سے سائن اپ کرنے کی کوشش کی، لیکن آپ کا اکاؤنٹ پہلے سے موجود ہے۔ آپ لاگ اِن کر سکتے ہیں، یا پاس ورڈ بھول گئے ہوں تو اسے دوبارہ سیٹ کر سکتے ہیں۔',
        button: 'لاگ اِن کریں',
        outro: 'اگر یہ آپ نہیں تھے تو آپ کو کچھ کرنے کی ضرورت نہیں۔',
      },
      welcome: {
        subject: 'خوش آمدید! آپ کا اکاؤنٹ تیار ہے',
        intro:
          'آپ کی ای میل کی تصدیق ہو گئی اور آپ کا اکاؤنٹ تیار ہے۔ اب اپنے بچے کا اکاؤنٹ بنائیں: آپ اس کا نک نیم، اوتار اور پاس ورڈ چنتے ہیں، اور طے کرتے ہیں کہ وہ کیا شیئر کرے۔ ہر نیا بچہ 14 دن تک پریمیم مفت آزما سکتا ہے۔',
        button: 'اپنے بچے کا اکاؤنٹ بنائیں',
        outro: 'کوئی سوال ہو تو بس اس ای میل کا جواب دیں۔',
      },
      waitlistConfirm: {
        subject: 'براہ کرم اپنی ای میل کی تصدیق کریں',
        intro:
          'انتظار کی فہرست میں شامل ہونے کا شکریہ۔ براہ کرم اپنی ای میل کی تصدیق کریں، جب آپ کے ملک میں پلیٹ فارم کھلے گا تو ہم ایک بار آپ کو لکھیں گے۔',
        button: 'میری ای میل کی تصدیق کریں',
        outro:
          'یہ لنک 7 دن میں ختم ہو جائے گا۔ اگر آپ نے یہ نہیں مانگا تو اس ای میل کو نظر انداز کریں، ہم دوبارہ نہیں لکھیں گے۔',
      },
      trialEnding: {
        subject: (v) => `${v['nickname']} کا مفت پریمیم ٹرائل جلد ختم ہو رہا ہے`,
        intro: (v) =>
          `${v['nickname']} کا مفت پریمیم ٹرائل ${v['date']} کو ختم ہو گا۔ اس کے بعد پریمیم اسباق (جیسے پائتھن) اور پروجیکٹ اس وقت تک بند رہیں گے جب تک آپ کوئی پلان نہ چنیں۔ مفت اسباق کھلے رہیں گے، اور ${v['nickname']} نے جو کچھ بنایا وہ اسی کا رہے گا۔`,
        button: 'پلان دیکھیں',
        outro: 'ایک پلان میں آپ کے سب بچے شامل ہیں، اور دوسرے بچے سے فیملی رعایت ملتی ہے۔',
      },
      receipt: {
        subject: (v) => `آپ کی رسید ${v['number']}`,
        intro: (v) =>
          `${v['amount']} کی ادائیگی کا شکریہ۔ آپ کے سب بچوں کے لیے ${v['until']} تک پریمیم چالو ہے۔`,
        button: 'اپنی انوائس دیکھیں',
        outro: 'یہ ای میل اپنے ریکارڈ کے لیے سنبھال کر رکھیں۔',
      },
      paymentFailed: {
        subject: 'آپ کی ادائیگی نہیں ہو سکی',
        intro:
          'ہم آپ کے پلان کی تجدید کی ادائیگی وصول نہیں کر سکے۔ براہ کرم اپنا کارڈ چیک کریں: ہم اگلے چند دنوں میں دوبارہ کوشش کریں گے۔ اس دوران پریمیم چالو رہے گا۔',
        button: 'اپنا پلان دیکھیں',
        outro: 'اگر آپ پلان بند کرنا چاہتے ہیں تو اسی صفحے پر منسوخ کر سکتے ہیں۔',
      },
      subscriptionEnded: {
        subject: 'آپ کا پلان ختم ہو گیا',
        intro:
          'آپ کا پلان ختم ہو گیا ہے، اس لیے پریمیم اسباق اور پروجیکٹ پھر بند ہو گئے ہیں۔ آپ کے بچوں نے جو کچھ بنایا وہ ان کے پاس رہے گا، اور مفت اسباق کھلے رہیں گے۔',
        button: 'پلان دیکھیں',
        outro: 'جب بھی آپ تیار ہوں، ہمیں آپ کی واپسی کا انتظار رہے گا۔',
      },
      passwordChanged: {
        subject: 'آپ کا پاس ورڈ تبدیل ہو گیا',
        intro:
          'آپ کے اکاؤنٹ کا پاس ورڈ ابھی تبدیل کیا گیا ہے، اور باقی تمام آلات سے لاگ آؤٹ کر دیا گیا ہے۔',
        button: 'آپ نے نہیں کیا؟ پاس ورڈ دوبارہ سیٹ کریں',
        outro:
          'اگر آپ نے خود تبدیل کیا ہے تو کچھ کرنے کی ضرورت نہیں۔ اگر نہیں کیا تو ابھی پاس ورڈ دوبارہ سیٹ کریں اور ہمیں لکھیں۔',
      },
      twoFactorEnabled: {
        subject: 'دو مرحلوں والا لاگ اِن چالو ہو گیا',
        intro: 'آپ کے اسٹاف اکاؤنٹ کے لیے ابھی ایک تصدیقی ایپ سیٹ کی گئی ہے۔',
        button: 'آپ نے نہیں کیا؟ پاس ورڈ دوبارہ سیٹ کریں',
        outro:
          'اگر آپ نے خود سیٹ کیا ہے تو کچھ کرنے کی ضرورت نہیں۔ اگر نہیں کیا تو پاس ورڈ دوبارہ سیٹ کریں اور فوراً ٹیم کو بتائیں۔',
      },
      accountDeleted: {
        subject: 'آپ کا اکاؤنٹ حذف کر دیا گیا',
        intro:
          'آپ کا اکاؤنٹ اور آپ کے بچوں کے اکاؤنٹس ان کی پیش رفت، کوڈ اور پروجیکٹس سمیت حذف کر دیے گئے ہیں۔ کوئی بھی پلان بند ہو گیا ہے: اب کوئی رقم نہیں کٹے گی۔',
        button: `${BRAND_NAME} دیکھیں`,
        outro:
          'ہم انوائسز اور رضامندی کے ریکارڈ اتنی دیر رکھتے ہیں جتنی قانون تقاضا کرتا ہے۔ اگر آپ نے یہ درخواست نہیں کی تو فوراً ہمیں لکھیں۔',
      },
      monthlySummary: {
        subject: (v) => `آپ کے بچوں کا مہینہ: ${v['month']}`,
        intro: (v) => `آپ کے بچوں نے ${v['month']} میں یہ کیا:`,
        button: 'اپنا ڈیش بورڈ کھولیں',
        outro: 'یہ خلاصہ مہینے میں ایک بار آتا ہے۔ آپ اسے اپنے ڈیش بورڈ سے بند کر سکتے ہیں۔',
      },
    },
  },
};

export function toMailLanguage(code: string | null | undefined): MailLanguage {
  return code === 'ar' || code === 'ur' ? code : 'en';
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

const fillText = (text: Text, vars: MailVars) => (typeof text === 'function' ? text(vars) : text);

export interface MailParams {
  /** Greeted by name; empty for people we don't know by name (the waitlist). */
  name: string;
  actionUrl: string;
  vars?: MailVars;
  /** A short list shown under the intro (the monthly summary). */
  lines?: string[];
}

/** Plain, accessible HTML that renders well in every mail client, left-to-right or right-to-left. */
export function renderMail(
  template: MailTemplate,
  language: MailLanguage,
  params: MailParams,
): RenderedMail {
  const copy = MAIL_COPY[language];
  const t = copy.templates[template];
  const vars = params.vars ?? {};
  const greeting = params.name ? copy.greeting(params.name) : copy.hello;
  const align = copy.dir === 'rtl' ? 'right' : 'left';
  const intro = fillText(t.intro, vars);
  const outro = fillText(t.outro, vars);
  const lines = params.lines ?? [];

  const text = [
    greeting,
    '',
    intro,
    ...(lines.length ? ['', ...lines.map((line) => `- ${line}`)] : []),
    '',
    `${t.button}: ${params.actionUrl}`,
    '',
    outro,
    '',
    copy.signOff,
  ].join('\n');

  const list = lines.length
    ? `<ul style="font-size:16px;margin:0 0 24px;padding-${align}:20px;">${lines
        .map((line) => `<li style="margin:0 0 6px;">${escapeHtml(line)}</li>`)
        .join('')}</ul>`
    : '';
  // The Organic design system in an email: a cream page, a soft card, a terracotta pill
  // button. Only the fonts every phone has (no web fonts: they would let the font's
  // server see who opened the email), and a dark version where the mail app allows.
  const display = `Georgia,'Times New Roman',serif`;
  const html = `<!doctype html>
<html lang="${language}" dir="${copy.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    .kcp-page { background:#1a1815 !important; }
    .kcp-card { background:#25221e !important; color:#f2e8d8 !important; }
    .kcp-muted { color:#b9ae9c !important; }
    .kcp-title { color:#f2e8d8 !important; }
    .kcp-button { background:#e08d55 !important; color:#1a1815 !important; }
  }
</style>
</head>
<body class="kcp-page" style="margin:0;padding:24px 12px;background:#f5ead8;font-family:'Helvetica Neue',Arial,Tahoma,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <p style="margin:0 0 16px;padding:0 8px;font-family:${display};font-size:20px;font-weight:bold;color:#201e1d;text-align:${align};" class="kcp-title">
      <span style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:16px;background:#c67139;color:#fffaf3;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;vertical-align:middle;">&lt;&gt;</span>
      <span style="vertical-align:middle;">&nbsp;${escapeHtml(BRAND_NAME)}</span>
    </p>
    <div class="kcp-card" style="background:#f9f4ed;border-radius:28px;padding:32px;text-align:${align};color:#201e1d;line-height:1.6;">
      <p style="font-family:${display};font-size:22px;font-weight:bold;margin:0 0 16px;">${escapeHtml(greeting)}</p>
      <p style="font-size:16px;margin:0 0 24px;">${escapeHtml(intro)}</p>
      ${list}
      <p style="margin:0 0 24px;"><a class="kcp-button" href="${escapeHtml(params.actionUrl)}" style="display:inline-block;background:#a05626;color:#fffaf3;text-decoration:none;padding:14px 26px;border-radius:999px;font-family:${display};font-size:16px;font-weight:bold;">${escapeHtml(t.button)}</a></p>
      <p class="kcp-muted" style="font-size:14px;color:#645c50;margin:0 0 24px;">${escapeHtml(outro)}</p>
      <p style="font-size:14px;margin:0;">${escapeHtml(copy.signOff)}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject: `${fillText(t.subject, vars)} · ${BRAND_NAME}`, text, html };
}
