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
  | 'accountDeleted'
  | 'adultInvite'
  | 'parentalConsent'
  | 'parentalConsentFollowUp'
  | 'parentalConsentDone'
  | 'parentalConsentRejected'
  | 'friendRequest'
  | 'referralRewarded'
  | 'weeklyReport'
  | 'eventJoin'
  | 'classJoin'
  | 'hubConsent'
  | 'clientInvite'
  | 'hubIntakeConfirm'
  | 'hubIntakeAccepted'
  | 'hubIntakeDeclined'
  | 'hubQuoteSent'
  | 'hubInvoiceIssued'
  | 'hubInvoicePaid'
  | 'hubProjectApproval'
  | 'hubDeliveryReady'
  | 'hubMessage'
  | 'hubPayoutConfirm'
  | 'hubPayoutPaid'
  | 'hubPayoutFailed'
  | 'hubPayoutAccountChanged'
  | 'hubStoryConsent';

/** Values a template fills in, e.g. { nickname: "Rocket", date: "14 October 2026" }. */
export type MailVars = Record<string, string>;
type Text = string | ((vars: MailVars) => string);

interface TemplateCopy {
  subject: Text;
  intro: Text;
  button: string;
  outro: Text;
}

/** One child's week in the weekly report. */
export interface ChildWeek {
  nickname: string;
  minutes: number;
  xp: number;
  lessons: number;
  streak: number;
  /** Skills learned this week, in the parent's language. */
  skills: string[];
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
  /** One line of the weekly report per child. */
  childWeek: (child: ChildWeek) => string;
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
    childWeek: (c) =>
      `${c.nickname} — time learning: ${c.minutes} min, XP: ${c.xp}, lessons finished: ${c.lessons}, streak (days): ${c.streak}${c.skills.length ? `, new skills: ${c.skills.join(', ')}` : ''}`,
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
      adultInvite: {
        subject: (v) =>
          v['role'] === 'teacher'
            ? `You're invited to teach on ${BRAND_NAME}`
            : `You're invited to mentor on ${BRAND_NAME}`,
        intro: (v) =>
          v['role'] === 'teacher'
            ? 'Our team made you a teacher account: you can set up classes and follow your students. Choose a password to start; you will also set up two-factor login.'
            : "Our team made you a mentor account: you'll review students' projects. Choose a password to start; you will also set up two-factor login and read the code of conduct.",
        button: 'Choose your password',
        outro:
          "This link expires in 3 days. If you weren't expecting this, you can ignore this email.",
      },
      parentalConsent: {
        subject: (v) => `Your consent for ${v['nickname']}'s account`,
        intro: (v) =>
          `You added ${v['nickname']}, who is under 13. Before they can start, we need your consent as their parent. Their account keeps only a nickname, an avatar, their birth year and their learning; nothing about them is public unless you switch it on. Press the button to give your consent.`,
        button: 'I give my consent',
        outro:
          "This link expires in 7 days. If you didn't add a child, ignore this email and the account will be deleted.",
      },
      parentalConsentFollowUp: {
        subject: (v) => `You gave consent for ${v['nickname']}`,
        intro: (v) =>
          `Yesterday you gave your consent for ${v['nickname']}'s account. If that wasn't you, or you've changed your mind, delete the account from your dashboard and everything about them is removed.`,
        button: 'Open your dashboard',
        outro: 'You can change what is shared, or delete the account, at any time.',
      },
      parentalConsentDone: {
        subject: (v) => `${v['nickname']} is ready to start`,
        intro: (v) =>
          `Thank you: your consent is confirmed and ${v['nickname']}'s account is ready. They can log in now.`,
        button: 'Open your dashboard',
        outro: 'You can change what is shared, or delete the account, at any time.',
      },
      parentalConsentRejected: {
        subject: (v) => `We couldn't confirm your consent for ${v['nickname']}`,
        intro: (v) =>
          `We checked the form you sent for ${v['nickname']} and couldn't accept it: ${v['reason']}. You can send it again, or choose another way to confirm.`,
        button: 'Try again',
        outro: 'Until your consent is confirmed, the account stays closed.',
      },
      friendRequest: {
        subject: (v) => `${v['nickname']} and ${v['friend']} want to be friends`,
        intro: (v) =>
          `${v['nickname']} and ${v['friend']} want to be friends on the platform. Friends see each other's nickname, avatar and weekly XP, nothing else. They become friends only once a parent of each child has approved.`,
        button: 'Approve or decline',
        outro:
          'If you do nothing, the request expires in 14 days. You can end a friendship at any time.',
      },
      hubConsent: {
        subject: (v) => `${v['nickname']} can join paid projects — with your consent`,
        intro: (v) =>
          `A lead developer signed ${v['nickname']} off for the hub: small, supervised projects for real clients, paid to you. Before your child can be invited to a project, read the parent agreement and give your consent. You approve each project separately, and you can take your consent back at any time.`,
        button: 'Read and decide',
        outro:
          'Clients never see who your child is, and never talk to them. Hours are limited by the platform.',
      },
      clientInvite: {
        subject: 'Your client account on the hub',
        intro: (v) =>
          `We made a client account for you at ${v['org']}: you can follow your projects, approve quotes, see previews and pay invoices. Choose a password to start; you will also set up two-factor login.`,
        button: 'Choose your password',
        outro:
          "This link expires in 3 days. If you weren't expecting this email, you can ignore it.",
      },
      hubIntakeConfirm: {
        subject: 'Confirm your project request',
        intro: (v) =>
          `Thank you for your request "${v['title']}". Confirm your email address and it goes to our team, who will reply within two working days.`,
        button: 'Confirm my request',
        outro: "If you didn't send this request, ignore this email and nothing happens.",
      },
      hubIntakeAccepted: {
        subject: (v) => `Your project "${v['title']}" is accepted`,
        intro: (v) =>
          `Good news: we can take on "${v['title']}". Our lead developer ${v['lead']} is planning the work now; you will get a quote to approve in the client portal.`,
        button: 'Open the client portal',
        outro:
          'Your team will be students supervised by our lead developer, who reviews every change before it reaches you.',
      },
      hubIntakeDeclined: {
        subject: (v) => `About your project request "${v['title']}"`,
        intro: (v) =>
          `Thank you for thinking of us for "${v['title']}". We can't take it on this time: ${v['reason']}`,
        button: 'Visit our website',
        outro: "You're welcome to send another request whenever it suits you.",
      },
      hubQuoteSent: {
        subject: (v) => `A quote for "${v['project']}" is ready`,
        intro: (v) =>
          `Our lead developer has planned "${v['project']}": the deliverables, the price and the deposit are in the quote, with its statement of work. Read it in the client portal and approve it, or tell us what to change.`,
        button: 'See the quote',
        outro: 'Work starts once the quote is approved and the deposit is paid.',
      },
      hubInvoiceIssued: {
        subject: (v) => `Invoice ${v['invoice']} for "${v['project']}"`,
        intro: (v) =>
          `Invoice ${v['invoice']} for "${v['project']}" is ready: ${v['amount']}, due in 14 days. Pay by card in the client portal, or by bank transfer quoting the invoice number.`,
        button: 'See the invoice',
        outro: 'Questions about an invoice? Reply to this email.',
      },
      hubInvoicePaid: {
        subject: (v) => `Thank you: invoice ${v['invoice']} is paid`,
        intro: (v) =>
          `We received ${v['amount']} for invoice ${v['invoice']} ("${v['project']}"). Thank you.`,
        button: 'See the invoice',
        outro:
          'Keep this email as your receipt; the invoice in the client portal shows the payment too.',
      },
      hubProjectApproval: {
        subject: (v) => `${v['nickname']} wants to join a paid project: "${v['project']}"`,
        intro: (v) =>
          `${v['nickname']} was invited to the hub project "${v['project']}" and said yes. Before they join, see what it is: the work, about how many hours it takes, and their share. The client never sees who your child is; the lead developer reviews all their work.`,
        button: 'Approve or decline',
        outro:
          'Your child joins only once you approve. Hours are limited by the platform, and earnings are paid only to you.',
      },
      hubDeliveryReady: {
        subject: (v) => `New work to review on ${v['project']} (${v['reference']})`,
        intro: (v) =>
          `Your team shared a milestone on ${v['project']}: "${v['title']}". Open the preview, try it, and accept it or tell the lead what to change.`,
        button: 'Review the milestone',
        outro: 'The preview link is private to your organisation. Please don’t share it.',
      },
      hubMessage: {
        subject: (v) => `New message on ${v['project']} (${v['reference']})`,
        intro: (v) => `There’s a new message for you on ${v['project']}.`,
        button: 'Read it',
        outro: 'You’re getting this because you’re on this project’s client team.',
      },
      hubPayoutConfirm: {
        subject: (v) => `Please confirm a payout of ${v['amount']} for ${v['child']}`,
        intro: (v) =>
          `${v['child']}’s hub earnings are ready to be paid: ${v['amount']} to your account ending ${v['last4']}. Please check the account is still right and confirm, so we can send it.`,
        button: 'Confirm the payout',
        outro:
          'Nothing is sent until you confirm. If the account isn’t right, change it first: the payout then waits for the next round.',
      },
      hubPayoutPaid: {
        subject: (v) => `${v['amount']} for ${v['child']} is on its way`,
        intro: (v) =>
          `We sent ${v['amount']} of ${v['child']}’s hub earnings to your account ending ${v['last4']}. Banks can take a few working days to show it.`,
        button: 'See the payout',
        outro: 'Keep this email for your records. Your statement shows every payout.',
      },
      hubPayoutFailed: {
        subject: (v) => `We couldn’t pay ${v['child']}’s earnings to your account`,
        intro: (v) =>
          `The bank sent back the payout of ${v['child']}’s hub earnings to your account ending ${v['last4']}. The money is safe and waits for the next round. Please check your payout account details.`,
        button: 'Check your payout account',
        outro: 'If the details are right, reply to this email and we’ll look into it.',
      },
      hubPayoutAccountChanged: {
        subject: 'Your payout account was changed',
        intro: (v) =>
          `The account that receives your children’s hub earnings was just changed (now ending ${v['last4']}). For your safety, it can be paid only after 48 hours and once our team has checked it, and payouts waiting for the old account were stopped.`,
        button: 'See your payout account',
        outro:
          'If you didn’t make this change, change your password now and contact us straight away.',
      },
      hubStoryConsent: {
        subject: (v) => `May we share ${v['child']}’s hub story?`,
        intro: (v) =>
          `We’d like to tell ${v['child']}’s story on our website, to encourage other families: what they built for a real client. It would show their first name only — no photo, surname, school or city. Please read it and say yes or no.`,
        button: 'Read the story',
        outro:
          'Nothing is shown without your yes, and you can take it back at any time: it comes off the site straight away.',
      },
      classJoin: {
        subject: (v) => `${v['nickname']} wants to join a class at ${v['school']}`,
        intro: (v) =>
          `${v['nickname']} wants to join the class "${v['className']}" at ${v['school']}, taught by ${v['teacher']}. The teacher sees your child's nickname, avatar and progress on the lessons they set, and the class sees a weekly board of nicknames and XP. Classmates talk only in a moderated class room.`,
        button: 'Approve or decline',
        outro:
          'Your child joins the class only once you approve. If the school has a licence, your child gets premium while they are in the class.',
      },
      eventJoin: {
        subject: (v) => `${v['nickname']} wants to join a team in ${v['event']}`,
        intro: (v) =>
          `${v['nickname']} wants to join the team "${v['team']}" in ${v['event']}, a hackathon on the platform. Teams of up to three build a website together in a private repository, with a mentor. Teammates see each other's nickname and avatar, work in a moderated team room, and never share contact details.`,
        button: 'Approve or decline',
        outro:
          'Your child joins the team only once you approve. You can take them out of the team at any time.',
      },
      referralRewarded: {
        subject: (v) => `Your children got ${v['days']} days of premium`,
        intro: (v) =>
          `A family you invited is learning with us: their child just shipped their first project. As a thank-you, each of your children gets ${v['days']} days of premium.`,
        button: 'Open your dashboard',
        outro: 'Thank you for telling other families about us.',
      },
      weeklyReport: {
        subject: (v) => `Your children's week: ${v['week']}`,
        intro: (v) => `Here's how your children's week went (${v['week']}):`,
        button: 'See the full report',
        outro: 'You get this report every Sunday evening. You can switch it off on your dashboard.',
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
    childWeek: (c) =>
      `${c.nickname} — وقت التعلّم: ${c.minutes} دقيقة، نقاط الخبرة: ${c.xp}، الدروس المكتملة: ${c.lessons}، السلسلة (بالأيام): ${c.streak}${c.skills.length ? `، مهارات جديدة: ${c.skills.join('، ')}` : ''}`,
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
      adultInvite: {
        subject: (v) =>
          v['role'] === 'teacher'
            ? `ندعوك للتدريس على ${BRAND_NAME}`
            : `ندعوك لتكون مرشدًا على ${BRAND_NAME}`,
        intro: (v) =>
          v['role'] === 'teacher'
            ? 'أنشأ فريقنا لك حساب معلّم: يمكنك إنشاء الفصول ومتابعة طلابك. اختر كلمة مرور للبدء، وستفعّل أيضًا التحقق بخطوتين.'
            : 'أنشأ فريقنا لك حساب مرشد: ستراجع مشاريع الطلاب. اختر كلمة مرور للبدء، وستفعّل أيضًا التحقق بخطوتين وتقرأ قواعد السلوك.',
        button: 'اختر كلمة المرور',
        outro: 'تنتهي صلاحية هذا الرابط بعد 3 أيام. إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.',
      },
      parentalConsent: {
        subject: (v) => `موافقتك على حساب ${v['nickname']}`,
        intro: (v) =>
          `أضفت ${v['nickname']}، وعمره أقل من 13 سنة. قبل أن يبدأ، نحتاج إلى موافقتك بصفتك وليّ أمره. لا يحفظ حسابه إلا اسمًا مستعارًا وصورة رمزية وسنة الميلاد وتعلّمه؛ ولا يظهر شيء عنه للعموم إلا إذا فعّلتَه أنت. اضغط الزر لتعطي موافقتك.`,
        button: 'أوافق',
        outro:
          'تنتهي صلاحية هذا الرابط بعد 7 أيام. إذا لم تضف طفلًا، تجاهل هذه الرسالة وسيُحذف الحساب.',
      },
      parentalConsentFollowUp: {
        subject: (v) => `أعطيت موافقتك على حساب ${v['nickname']}`,
        intro: (v) =>
          `أعطيت أمس موافقتك على حساب ${v['nickname']}. إذا لم تكن أنت، أو غيّرت رأيك، احذف الحساب من لوحة التحكم وسيُحذف كل ما يخصّه.`,
        button: 'افتح لوحة التحكم',
        outro: 'يمكنك تغيير ما يُشارك، أو حذف الحساب، في أي وقت.',
      },
      parentalConsentDone: {
        subject: (v) => `${v['nickname']} جاهز للبدء`,
        intro: (v) =>
          `شكرًا لك: تأكدت موافقتك وأصبح حساب ${v['nickname']} جاهزًا. يمكنه تسجيل الدخول الآن.`,
        button: 'افتح لوحة التحكم',
        outro: 'يمكنك تغيير ما يُشارك، أو حذف الحساب، في أي وقت.',
      },
      parentalConsentRejected: {
        subject: (v) => `لم نتمكن من تأكيد موافقتك على حساب ${v['nickname']}`,
        intro: (v) =>
          `راجعنا النموذج الذي أرسلته لـ${v['nickname']} ولم نتمكن من قبوله: ${v['reason']}. يمكنك إرساله مرة أخرى، أو اختيار طريقة أخرى للتأكيد.`,
        button: 'حاول مرة أخرى',
        outro: 'يبقى الحساب مغلقًا حتى تتأكد موافقتك.',
      },
      friendRequest: {
        subject: (v) => `${v['nickname']} و${v['friend']} يريدان أن يصبحا صديقين`,
        intro: (v) =>
          `يريد ${v['nickname']} و${v['friend']} أن يصبحا صديقين على المنصة. يرى الأصدقاء الاسم المستعار والصورة الرمزية ونقاط الخبرة الأسبوعية لبعضهم فقط، ولا شيء غير ذلك. لا يصبحان صديقين إلا بعد موافقة وليّ أمر كل منهما.`,
        button: 'وافق أو ارفض',
        outro: 'إن لم تفعل شيئًا، ينتهي الطلب بعد 14 يومًا. يمكنك إنهاء الصداقة في أي وقت.',
      },
      hubConsent: {
        subject: (v) => `يمكن لـ ${v['nickname']} الانضمام إلى مشاريع مدفوعة — بموافقتك`,
        intro: (v) =>
          `اعتمد أحد المطورين الرئيسيين ${v['nickname']} للعمل في المركز: مشاريع صغيرة تحت إشراف لعملاء حقيقيين، تُدفع أرباحها لك. قبل أن يُدعى طفلك إلى أي مشروع، اقرأ اتفاقية ولي الأمر وأعطِ موافقتك. توافق على كل مشروع على حدة، ويمكنك سحب موافقتك في أي وقت.`,
        button: 'اقرأ وقرّر',
        outro: 'لا يعرف العملاء من هو طفلك، ولا يتحدثون معه أبدًا. والساعات محدودة من المنصة.',
      },
      clientInvite: {
        subject: 'حساب العميل الخاص بك في المركز',
        intro: (v) =>
          `أنشأنا لك حساب عميل لدى ${v['org']}: يمكنك متابعة مشاريعك والموافقة على عروض الأسعار ومشاهدة المعاينات ودفع الفواتير. اختر كلمة مرور للبدء، وستفعّل أيضًا التحقق بخطوتين.`,
        button: 'اختر كلمة المرور',
        outro: 'تنتهي صلاحية هذا الرابط بعد 3 أيام. إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.',
      },
      hubIntakeConfirm: {
        subject: 'أكّد طلب مشروعك',
        intro: (v) =>
          `شكرًا على طلبك "${v['title']}". أكّد عنوان بريدك الإلكتروني ليصل الطلب إلى فريقنا، الذي سيرد خلال يومَي عمل.`,
        button: 'أكّد طلبي',
        outro: 'إذا لم ترسل هذا الطلب، تجاهل هذه الرسالة ولن يحدث شيء.',
      },
      hubIntakeAccepted: {
        subject: (v) => `تم قبول مشروعك "${v['title']}"`,
        intro: (v) =>
          `أخبار سارة: يمكننا تنفيذ "${v['title']}". يخطط مطوّرنا الرئيسي ${v['lead']} للعمل الآن، وستصلك عرض سعر للموافقة عليه في بوابة العملاء.`,
        button: 'افتح بوابة العملاء',
        outro: 'فريقك من الطلاب تحت إشراف مطوّرنا الرئيسي، الذي يراجع كل تغيير قبل وصوله إليك.',
      },
      hubIntakeDeclined: {
        subject: (v) => `بخصوص طلب مشروعك "${v['title']}"`,
        intro: (v) =>
          `شكرًا لتفكيرك بنا لـ "${v['title']}". لا يمكننا تنفيذه هذه المرة: ${v['reason']}`,
        button: 'زر موقعنا',
        outro: 'يسعدنا استقبال طلب آخر منك متى شئت.',
      },
      hubQuoteSent: {
        subject: (v) => `عرض سعر لـ "${v['project']}" جاهز`,
        intro: (v) =>
          `خطط مطوّرنا الرئيسي لـ "${v['project']}": المخرجات والسعر والدفعة المقدمة في عرض السعر، مع بيان العمل. اقرأه في بوابة العملاء ووافق عليه، أو أخبرنا بما تريد تغييره.`,
        button: 'شاهد عرض السعر',
        outro: 'يبدأ العمل بعد الموافقة على عرض السعر ودفع الدفعة المقدمة.',
      },
      hubInvoiceIssued: {
        subject: (v) => `الفاتورة ${v['invoice']} لـ "${v['project']}"`,
        intro: (v) =>
          `الفاتورة ${v['invoice']} لـ "${v['project']}" جاهزة: ${v['amount']}، مستحقة خلال 14 يومًا. ادفع بالبطاقة في بوابة العملاء، أو بتحويل بنكي مع ذكر رقم الفاتورة.`,
        button: 'شاهد الفاتورة',
        outro: 'لديك سؤال عن فاتورة؟ رد على هذه الرسالة.',
      },
      hubInvoicePaid: {
        subject: (v) => `شكرًا لك: تم دفع الفاتورة ${v['invoice']}`,
        intro: (v) =>
          `استلمنا ${v['amount']} للفاتورة ${v['invoice']} ("${v['project']}"). شكرًا لك.`,
        button: 'شاهد الفاتورة',
        outro: 'احتفظ بهذه الرسالة كإيصال؛ تظهر الدفعة أيضًا في الفاتورة في بوابة العملاء.',
      },
      hubProjectApproval: {
        subject: (v) => `يريد ${v['nickname']} الانضمام إلى مشروع مدفوع: "${v['project']}"`,
        intro: (v) =>
          `دُعي ${v['nickname']} إلى مشروع المركز "${v['project']}" ووافق. قبل أن ينضم، اطّلع عليه: العمل، وعدد الساعات التقريبي، وحصته. لا يعرف العميل من هو طفلك أبدًا؛ ويراجع المطوّر الرئيسي كل عمله.`,
        button: 'وافق أو ارفض',
        outro: 'لا ينضم طفلك إلا بعد موافقتك. الساعات محدودة من المنصة، والأرباح تُدفع لك فقط.',
      },
      hubDeliveryReady: {
        subject: (v) => `عمل جديد للمراجعة في ${v['project']} (${v['reference']})`,
        intro: (v) =>
          `شارك فريقك مرحلة في ${v['project']}: "${v['title']}". افتح المعاينة وجرّبها، ثم اقبلها أو أخبر المطوّر الرئيسي بما يجب تغييره.`,
        button: 'راجع المرحلة',
        outro: 'رابط المعاينة خاص بمؤسستك. يُرجى عدم مشاركته.',
      },
      hubMessage: {
        subject: (v) => `رسالة جديدة في ${v['project']} (${v['reference']})`,
        intro: (v) => `هناك رسالة جديدة لك في ${v['project']}.`,
        button: 'اقرأها',
        outro: 'تصلك هذه الرسالة لأنك ضمن فريق العميل في هذا المشروع.',
      },
      hubPayoutConfirm: {
        subject: (v) => `يُرجى تأكيد دفعة بقيمة ${v['amount']} لـ ${v['child']}`,
        intro: (v) =>
          `أرباح ${v['child']} من المركز جاهزة للدفع: ${v['amount']} إلى حسابك المنتهي بـ ${v['last4']}. يُرجى التأكد من أن الحساب ما زال صحيحًا ثم التأكيد لنرسلها.`,
        button: 'أكّد الدفعة',
        outro:
          'لا يُرسل شيء قبل تأكيدك. إذا لم يكن الحساب صحيحًا فغيّره أولًا، وستنتظر الدفعة الجولة التالية.',
      },
      hubPayoutPaid: {
        subject: (v) => `${v['amount']} لـ ${v['child']} في طريقها إليك`,
        intro: (v) =>
          `أرسلنا ${v['amount']} من أرباح ${v['child']} في المركز إلى حسابك المنتهي بـ ${v['last4']}. قد يستغرق ظهورها في البنك بضعة أيام عمل.`,
        button: 'اعرض الدفعة',
        outro: 'احتفظ بهذه الرسالة لسجلاتك. يعرض كشف حسابك كل الدفعات.',
      },
      hubPayoutFailed: {
        subject: (v) => `تعذّر دفع أرباح ${v['child']} إلى حسابك`,
        intro: (v) =>
          `أعاد البنك دفعة أرباح ${v['child']} في المركز إلى حسابك المنتهي بـ ${v['last4']}. المال في أمان وينتظر الجولة التالية. يُرجى التحقق من بيانات حساب الدفع.`,
        button: 'تحقّق من حساب الدفع',
        outro: 'إذا كانت البيانات صحيحة فردّ على هذه الرسالة وسنتابع الأمر.',
      },
      hubPayoutAccountChanged: {
        subject: 'تم تغيير حساب الدفع الخاص بك',
        intro: (v) =>
          `تم للتو تغيير الحساب الذي يستلم أرباح أطفالك من المركز (ينتهي الآن بـ ${v['last4']}). حفاظًا على أمانك، لا يُدفع إليه إلا بعد 48 ساعة وبعد أن يتحقق منه فريقنا، وأُوقفت الدفعات التي كانت تنتظر الحساب القديم.`,
        button: 'اعرض حساب الدفع',
        outro: 'إذا لم تُجرِ هذا التغيير، فغيّر كلمة المرور الآن وتواصل معنا فورًا.',
      },
      hubStoryConsent: {
        subject: (v) => `هل يمكننا مشاركة قصة ${v['child']} في المركز؟`,
        intro: (v) =>
          `نودّ أن نروي قصة ${v['child']} على موقعنا لتشجيع العائلات الأخرى: ما بناه لعميل حقيقي. ستظهر باسمه الأول فقط، دون صورة أو اسم عائلة أو مدرسة أو مدينة. يُرجى قراءتها والموافقة أو الرفض.`,
        button: 'اقرأ القصة',
        outro: 'لا يُعرض شيء دون موافقتك، ويمكنك سحبها في أي وقت فتُزال من الموقع فورًا.',
      },
      classJoin: {
        subject: (v) => `${v['nickname']} يريد الانضمام إلى صف في ${v['school']}`,
        intro: (v) =>
          `يريد ${v['nickname']} الانضمام إلى الصف "${v['className']}" في ${v['school']}، مع المعلّم ${v['teacher']}. يرى المعلّم الاسم المستعار لطفلك وصورته الرمزية وتقدّمه في الدروس التي يحددها، ويرى الصف لوحة أسبوعية بالأسماء المستعارة ونقاط الخبرة. يتحدث زملاء الصف فقط في غرفة صف خاضعة للإشراف.`,
        button: 'وافق أو ارفض',
        outro:
          'لا ينضم طفلك إلى الصف إلا بعد موافقتك. إذا كان لدى المدرسة ترخيص، يحصل طفلك على المحتوى المميز ما دام في الصف.',
      },
      eventJoin: {
        subject: (v) => `${v['nickname']} يريد الانضمام إلى فريق في ${v['event']}`,
        intro: (v) =>
          `يريد ${v['nickname']} الانضمام إلى الفريق "${v['team']}" في ${v['event']}، وهو هاكاثون على المنصة. تبني فرق من ثلاثة أعضاء على الأكثر موقعًا معًا في مستودع خاص، مع مرشد. يرى أعضاء الفريق الاسم المستعار والصورة الرمزية لبعضهم، ويعملون في غرفة فريق خاضعة للإشراف، ولا يتبادلون معلومات التواصل أبدًا.`,
        button: 'وافق أو ارفض',
        outro: 'لا ينضم طفلك إلى الفريق إلا بعد موافقتك. يمكنك إخراجه من الفريق في أي وقت.',
      },
      referralRewarded: {
        subject: (v) => `حصل أطفالك على ${v['days']} يومًا من المحتوى المميز`,
        intro: (v) =>
          `عائلة دعوتَها تتعلّم معنا الآن: نشر طفلها أول مشروع له للتو. شكرًا لك، يحصل كل طفل من أطفالك على ${v['days']} يومًا من المحتوى المميز.`,
        button: 'افتح لوحة التحكم',
        outro: 'شكرًا لإخبارك العائلات الأخرى عنّا.',
      },
      weeklyReport: {
        subject: (v) => `أسبوع أطفالك: ${v['week']}`,
        intro: (v) => `إليك كيف مرّ أسبوع أطفالك (${v['week']}):`,
        button: 'اطّلع على التقرير كاملًا',
        outro: 'يصلك هذا التقرير كل مساء أحد. يمكنك إيقافه من لوحة التحكم.',
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
    childWeek: (c) =>
      `${c.nickname} — سیکھنے کا وقت: ${c.minutes} منٹ، XP: ${c.xp}، مکمل اسباق: ${c.lessons}، اسٹریک (دن): ${c.streak}${c.skills.length ? `، نئی مہارتیں: ${c.skills.join('، ')}` : ''}`,
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
      adultInvite: {
        subject: (v) =>
          v['role'] === 'teacher'
            ? `${BRAND_NAME} پر پڑھانے کی دعوت`
            : `${BRAND_NAME} پر مینٹور بننے کی دعوت`,
        intro: (v) =>
          v['role'] === 'teacher'
            ? 'ہماری ٹیم نے آپ کا استاد اکاؤنٹ بنایا ہے: آپ کلاسیں بنا سکتے ہیں اور اپنے طلبہ کی پیش رفت دیکھ سکتے ہیں۔ شروع کرنے کے لیے پاس ورڈ چنیں؛ آپ دو مرحلوں والا لاگ اِن بھی سیٹ کریں گے۔'
            : 'ہماری ٹیم نے آپ کا مینٹور اکاؤنٹ بنایا ہے: آپ طلبہ کے پروجیکٹس کا جائزہ لیں گے۔ شروع کرنے کے لیے پاس ورڈ چنیں؛ آپ دو مرحلوں والا لاگ اِن بھی سیٹ کریں گے اور ضابطۂ اخلاق پڑھیں گے۔',
        button: 'اپنا پاس ورڈ چنیں',
        outro:
          'یہ لنک 3 دن میں ختم ہو جائے گا۔ اگر آپ کو اس کی توقع نہیں تھی تو اس ای میل کو نظر انداز کر دیں۔',
      },
      parentalConsent: {
        subject: (v) => `${v['nickname']} کے اکاؤنٹ کے لیے آپ کی رضامندی`,
        intro: (v) =>
          `آپ نے ${v['nickname']} کو شامل کیا ہے، جس کی عمر 13 سال سے کم ہے۔ شروع کرنے سے پہلے ہمیں بطور والدین آپ کی رضامندی چاہیے۔ اکاؤنٹ میں صرف ایک فرضی نام، اوتار، پیدائش کا سال اور سیکھنے کا ریکارڈ رہتا ہے؛ جب تک آپ خود آن نہ کریں، ان کے بارے میں کچھ بھی عوامی نہیں ہوتا۔ رضامندی دینے کے لیے بٹن دبائیں۔`,
        button: 'میں رضامندی دیتا/دیتی ہوں',
        outro:
          'یہ لنک 7 دن میں ختم ہو جائے گا۔ اگر آپ نے کوئی بچہ شامل نہیں کیا تو یہ ای میل نظرانداز کریں، اکاؤنٹ حذف ہو جائے گا۔',
      },
      parentalConsentFollowUp: {
        subject: (v) => `آپ نے ${v['nickname']} کے لیے رضامندی دی`,
        intro: (v) =>
          `کل آپ نے ${v['nickname']} کے اکاؤنٹ کے لیے رضامندی دی۔ اگر یہ آپ نہیں تھے، یا آپ نے ارادہ بدل لیا ہے، تو ڈیش بورڈ سے اکاؤنٹ حذف کر دیں اور ان کا سب کچھ ہٹ جائے گا۔`,
        button: 'اپنا ڈیش بورڈ کھولیں',
        outro: 'آپ کسی بھی وقت شیئرنگ بدل سکتے ہیں یا اکاؤنٹ حذف کر سکتے ہیں۔',
      },
      parentalConsentDone: {
        subject: (v) => `${v['nickname']} شروع کرنے کے لیے تیار ہے`,
        intro: (v) =>
          `شکریہ: آپ کی رضامندی کی تصدیق ہو گئی ہے اور ${v['nickname']} کا اکاؤنٹ تیار ہے۔ وہ اب لاگ اِن کر سکتے ہیں۔`,
        button: 'اپنا ڈیش بورڈ کھولیں',
        outro: 'آپ کسی بھی وقت شیئرنگ بدل سکتے ہیں یا اکاؤنٹ حذف کر سکتے ہیں۔',
      },
      parentalConsentRejected: {
        subject: (v) => `ہم ${v['nickname']} کے لیے آپ کی رضامندی کی تصدیق نہیں کر سکے`,
        intro: (v) =>
          `ہم نے ${v['nickname']} کے لیے آپ کا بھیجا ہوا فارم دیکھا لیکن اسے قبول نہیں کر سکے: ${v['reason']}۔ آپ اسے دوبارہ بھیج سکتے ہیں، یا تصدیق کا کوئی اور طریقہ چن سکتے ہیں۔`,
        button: 'دوبارہ کوشش کریں',
        outro: 'جب تک آپ کی رضامندی کی تصدیق نہ ہو، اکاؤنٹ بند رہے گا۔',
      },
      friendRequest: {
        subject: (v) => `${v['nickname']} اور ${v['friend']} دوست بننا چاہتے ہیں`,
        intro: (v) =>
          `${v['nickname']} اور ${v['friend']} پلیٹ فارم پر دوست بننا چاہتے ہیں۔ دوست ایک دوسرے کا عرفی نام، اوتار اور ہفتہ وار XP دیکھتے ہیں، اس کے سوا کچھ نہیں۔ دونوں بچوں کے والدین میں سے ایک ایک کی منظوری کے بعد ہی وہ دوست بنتے ہیں۔`,
        button: 'منظور کریں یا انکار کریں',
        outro:
          'اگر آپ کچھ نہ کریں تو درخواست 14 دن بعد ختم ہو جائے گی۔ آپ کسی بھی وقت دوستی ختم کر سکتے ہیں۔',
      },
      hubConsent: {
        subject: (v) =>
          `${v['nickname']} معاوضے والے پروجیکٹس میں شامل ہو سکتا ہے — آپ کی رضامندی سے`,
        intro: (v) =>
          `ایک لیڈ ڈیولپر نے ${v['nickname']} کو ہب کے لیے منظور کیا ہے: حقیقی کلائنٹس کے لیے نگرانی میں چھوٹے پروجیکٹس، جن کا معاوضہ آپ کو ملتا ہے۔ کسی پروجیکٹ میں دعوت سے پہلے والدین کا معاہدہ پڑھیں اور اپنی رضامندی دیں۔ آپ ہر پروجیکٹ کی الگ منظوری دیتے ہیں، اور کسی بھی وقت اپنی رضامندی واپس لے سکتے ہیں۔`,
        button: 'پڑھیں اور فیصلہ کریں',
        outro:
          'کلائنٹ کبھی نہیں جانتے کہ آپ کا بچہ کون ہے، اور اس سے بات نہیں کرتے۔ اوقات پلیٹ فارم محدود کرتا ہے۔',
      },
      clientInvite: {
        subject: 'ہب پر آپ کا کلائنٹ اکاؤنٹ',
        intro: (v) =>
          `ہم نے ${v['org']} کے لیے آپ کا کلائنٹ اکاؤنٹ بنایا ہے: آپ اپنے پروجیکٹس دیکھ سکتے ہیں، کوٹیشن منظور کر سکتے ہیں، پیش نظارے دیکھ سکتے ہیں اور انوائس ادا کر سکتے ہیں۔ شروع کرنے کے لیے پاس ورڈ چنیں؛ آپ دو مرحلوں والا لاگ اِن بھی سیٹ کریں گے۔`,
        button: 'اپنا پاس ورڈ چنیں',
        outro:
          'یہ لنک 3 دن میں ختم ہو جاتا ہے۔ اگر آپ کو اس ای میل کی توقع نہیں تھی تو اسے نظر انداز کر دیں۔',
      },
      hubIntakeConfirm: {
        subject: 'اپنی پروجیکٹ درخواست کی تصدیق کریں',
        intro: (v) =>
          `آپ کی درخواست "${v['title']}" کا شکریہ۔ اپنا ای میل ایڈریس تصدیق کریں تو یہ ہماری ٹیم تک پہنچ جائے گی، جو دو کاروباری دنوں میں جواب دے گی۔`,
        button: 'میری درخواست کی تصدیق کریں',
        outro: 'اگر آپ نے یہ درخواست نہیں بھیجی تو اس ای میل کو نظر انداز کریں، کچھ نہیں ہوگا۔',
      },
      hubIntakeAccepted: {
        subject: (v) => `آپ کا پروجیکٹ "${v['title']}" منظور ہو گیا`,
        intro: (v) =>
          `خوشخبری: ہم "${v['title']}" پر کام کر سکتے ہیں۔ ہمارا لیڈ ڈیولپر ${v['lead']} اب کام کی منصوبہ بندی کر رہا ہے؛ آپ کو کلائنٹ پورٹل میں منظوری کے لیے کوٹیشن ملے گی۔`,
        button: 'کلائنٹ پورٹل کھولیں',
        outro:
          'آپ کی ٹیم ہمارے لیڈ ڈیولپر کی نگرانی میں طلبہ پر مشتمل ہوگی، جو ہر تبدیلی کو آپ تک پہنچنے سے پہلے جانچتا ہے۔',
      },
      hubIntakeDeclined: {
        subject: (v) => `آپ کی پروجیکٹ درخواست "${v['title']}" کے بارے میں`,
        intro: (v) =>
          `"${v['title']}" کے لیے ہمیں یاد رکھنے کا شکریہ۔ اس بار ہم یہ کام نہیں لے سکتے: ${v['reason']}`,
        button: 'ہماری ویب سائٹ دیکھیں',
        outro: 'جب چاہیں دوسری درخواست بھیج سکتے ہیں۔',
      },
      hubQuoteSent: {
        subject: (v) => `"${v['project']}" کی کوٹیشن تیار ہے`,
        intro: (v) =>
          `ہمارے لیڈ ڈیولپر نے "${v['project']}" کی منصوبہ بندی کر لی ہے: ڈیلیوریبلز، قیمت اور پیشگی رقم کوٹیشن میں ہیں، کام کے بیان کے ساتھ۔ اسے کلائنٹ پورٹل میں پڑھیں اور منظور کریں، یا بتائیں کہ کیا بدلنا ہے۔`,
        button: 'کوٹیشن دیکھیں',
        outro: 'کوٹیشن منظور ہونے اور پیشگی رقم ادا ہونے کے بعد کام شروع ہوتا ہے۔',
      },
      hubInvoiceIssued: {
        subject: (v) => `"${v['project']}" کے لیے انوائس ${v['invoice']}`,
        intro: (v) =>
          `"${v['project']}" کے لیے انوائس ${v['invoice']} تیار ہے: ${v['amount']}، 14 دن میں واجب الادا۔ کلائنٹ پورٹل میں کارڈ سے ادا کریں، یا انوائس نمبر کے حوالے سے بینک ٹرانسفر کریں۔`,
        button: 'انوائس دیکھیں',
        outro: 'انوائس کے بارے میں سوال؟ اس ای میل کا جواب دیں۔',
      },
      hubInvoicePaid: {
        subject: (v) => `شکریہ: انوائس ${v['invoice']} ادا ہو گئی`,
        intro: (v) =>
          `ہمیں انوائس ${v['invoice']} ("${v['project']}") کے لیے ${v['amount']} موصول ہو گئے۔ شکریہ۔`,
        button: 'انوائس دیکھیں',
        outro:
          'اس ای میل کو رسید کے طور پر رکھیں؛ کلائنٹ پورٹل میں انوائس پر بھی ادائیگی نظر آتی ہے۔',
      },
      hubProjectApproval: {
        subject: (v) =>
          `${v['nickname']} ایک معاوضے والے پروجیکٹ میں شامل ہونا چاہتا ہے: "${v['project']}"`,
        intro: (v) =>
          `${v['nickname']} کو ہب پروجیکٹ "${v['project']}" میں دعوت ملی اور اس نے ہاں کی۔ شامل ہونے سے پہلے دیکھیں کہ یہ کیا ہے: کام، اندازاً کتنے گھنٹے، اور اس کا حصہ۔ کلائنٹ کبھی نہیں جانتا کہ آپ کا بچہ کون ہے؛ لیڈ ڈیولپر اس کا سارا کام جانچتا ہے۔`,
        button: 'منظور یا مسترد کریں',
        outro:
          'آپ کا بچہ صرف آپ کی منظوری کے بعد شامل ہوتا ہے۔ اوقات پلیٹ فارم محدود کرتا ہے، اور آمدنی صرف آپ کو ادا ہوتی ہے۔',
      },
      hubDeliveryReady: {
        subject: (v) => `${v['project']} (${v['reference']}) میں جائزے کے لیے نیا کام`,
        intro: (v) =>
          `آپ کی ٹیم نے ${v['project']} پر ایک مرحلہ شیئر کیا: "${v['title']}"۔ پیش نظارہ کھولیں، آزمائیں، اور اسے قبول کریں یا لیڈ کو بتائیں کہ کیا بدلنا ہے۔`,
        button: 'مرحلے کا جائزہ لیں',
        outro: 'پیش نظارے کا لنک صرف آپ کی تنظیم کے لیے ہے۔ براہ کرم اسے شیئر نہ کریں۔',
      },
      hubMessage: {
        subject: (v) => `${v['project']} (${v['reference']}) پر نیا پیغام`,
        intro: (v) => `${v['project']} پر آپ کے لیے ایک نیا پیغام ہے۔`,
        button: 'پڑھیں',
        outro: 'آپ کو یہ اس لیے مل رہا ہے کہ آپ اس پروجیکٹ کی کلائنٹ ٹیم میں ہیں۔',
      },
      hubPayoutConfirm: {
        subject: (v) => `براہ کرم ${v['child']} کے لیے ${v['amount']} کی ادائیگی کی تصدیق کریں`,
        intro: (v) =>
          `${v['child']} کی ہب آمدنی ادائیگی کے لیے تیار ہے: ${v['amount']} آپ کے اس اکاؤنٹ میں جس کے آخر میں ${v['last4']} ہے۔ براہ کرم دیکھ لیں کہ اکاؤنٹ اب بھی درست ہے اور تصدیق کریں تاکہ ہم اسے بھیج سکیں۔`,
        button: 'ادائیگی کی تصدیق کریں',
        outro:
          'آپ کی تصدیق کے بغیر کچھ نہیں بھیجا جاتا۔ اگر اکاؤنٹ درست نہیں تو پہلے اسے بدلیں؛ پھر ادائیگی اگلے دور کا انتظار کرے گی۔',
      },
      hubPayoutPaid: {
        subject: (v) => `${v['child']} کے ${v['amount']} آپ کی طرف روانہ ہیں`,
        intro: (v) =>
          `ہم نے ${v['child']} کی ہب آمدنی میں سے ${v['amount']} آپ کے اس اکاؤنٹ میں بھیج دیے جس کے آخر میں ${v['last4']} ہے۔ بینک میں ظاہر ہونے میں چند کاروباری دن لگ سکتے ہیں۔`,
        button: 'ادائیگی دیکھیں',
        outro: 'یہ ای میل اپنے ریکارڈ کے لیے رکھیں۔ آپ کے گوشوارے میں ہر ادائیگی درج ہے۔',
      },
      hubPayoutFailed: {
        subject: (v) => `ہم ${v['child']} کی آمدنی آپ کے اکاؤنٹ میں ادا نہیں کر سکے`,
        intro: (v) =>
          `بینک نے ${v['child']} کی ہب آمدنی کی ادائیگی واپس کر دی جو آپ کے اس اکاؤنٹ میں تھی جس کے آخر میں ${v['last4']} ہے۔ رقم محفوظ ہے اور اگلے دور کا انتظار کر رہی ہے۔ براہ کرم اپنے ادائیگی اکاؤنٹ کی تفصیلات دیکھیں۔`,
        button: 'ادائیگی اکاؤنٹ دیکھیں',
        outro: 'اگر تفصیلات درست ہیں تو اس ای میل کا جواب دیں، ہم دیکھ لیں گے۔',
      },
      hubPayoutAccountChanged: {
        subject: 'آپ کا ادائیگی اکاؤنٹ بدل دیا گیا',
        intro: (v) =>
          `وہ اکاؤنٹ جس میں آپ کے بچوں کی ہب آمدنی آتی ہے ابھی بدلا گیا ہے (اب اس کے آخر میں ${v['last4']} ہے)۔ آپ کی حفاظت کے لیے اس میں ادائیگی 48 گھنٹے بعد اور ہماری ٹیم کی جانچ کے بعد ہی ہو سکتی ہے، اور پرانے اکاؤنٹ کی منتظر ادائیگیاں روک دی گئی ہیں۔`,
        button: 'ادائیگی اکاؤنٹ دیکھیں',
        outro: 'اگر یہ تبدیلی آپ نے نہیں کی تو ابھی اپنا پاس ورڈ بدلیں اور فوراً ہم سے رابطہ کریں۔',
      },
      hubStoryConsent: {
        subject: (v) => `کیا ہم ${v['child']} کی ہب کہانی شیئر کر سکتے ہیں؟`,
        intro: (v) =>
          `ہم دوسرے خاندانوں کی حوصلہ افزائی کے لیے اپنی ویب سائٹ پر ${v['child']} کی کہانی سنانا چاہتے ہیں: اس نے ایک حقیقی کلائنٹ کے لیے کیا بنایا۔ اس میں صرف پہلا نام ہوگا — کوئی تصویر، خاندانی نام، اسکول یا شہر نہیں۔ براہ کرم اسے پڑھیں اور ہاں یا نہ کہیں۔`,
        button: 'کہانی پڑھیں',
        outro:
          'آپ کی ہاں کے بغیر کچھ نہیں دکھایا جاتا، اور آپ کسی بھی وقت اسے واپس لے سکتے ہیں: یہ فوراً سائٹ سے ہٹ جاتی ہے۔',
      },
      classJoin: {
        subject: (v) => `${v['nickname']} ${v['school']} کی ایک کلاس میں شامل ہونا چاہتا ہے`,
        intro: (v) =>
          `${v['nickname']} ${v['school']} کی کلاس "${v['className']}" میں شامل ہونا چاہتا ہے، جسے ${v['teacher']} پڑھاتے ہیں۔ استاد آپ کے بچے کا فرضی نام، اوتار اور ان کے دیے گئے اسباق میں پیش رفت دیکھتے ہیں، اور کلاس فرضی ناموں اور XP کا ہفتہ وار بورڈ دیکھتی ہے۔ ہم جماعت صرف نگرانی والے کلاس روم میں بات کرتے ہیں۔`,
        button: 'منظور یا انکار کریں',
        outro:
          'آپ کا بچہ آپ کی منظوری کے بعد ہی کلاس میں شامل ہوتا ہے۔ اگر اسکول کے پاس لائسنس ہے تو کلاس میں رہنے تک آپ کے بچے کو پریمیم ملتا ہے۔',
      },
      eventJoin: {
        subject: (v) => `${v['nickname']} ${v['event']} میں ایک ٹیم میں شامل ہونا چاہتا ہے`,
        intro: (v) =>
          `${v['nickname']} پلیٹ فارم کے ہیکاتھون ${v['event']} میں ٹیم "${v['team']}" میں شامل ہونا چاہتا ہے۔ زیادہ سے زیادہ تین ممبرز کی ٹیمیں ایک مینٹور کے ساتھ ایک نجی ریپوزٹری میں مل کر ویب سائٹ بناتی ہیں۔ ٹیم کے ممبرز ایک دوسرے کا عرفی نام اور اوتار دیکھتے ہیں، نگرانی والے ٹیم روم میں کام کرتے ہیں، اور کبھی رابطے کی معلومات شیئر نہیں کرتے۔`,
        button: 'منظور کریں یا انکار کریں',
        outro:
          'آپ کی منظوری کے بعد ہی آپ کا بچہ ٹیم میں شامل ہوتا ہے۔ آپ کسی بھی وقت اسے ٹیم سے نکال سکتے ہیں۔',
      },
      referralRewarded: {
        subject: (v) => `آپ کے بچوں کو ${v['days']} دن کا پریمیم ملا`,
        intro: (v) =>
          `جس خاندان کو آپ نے دعوت دی تھی وہ ہمارے ساتھ سیکھ رہا ہے: ان کے بچے نے ابھی اپنا پہلا پروجیکٹ شائع کیا۔ شکریے کے طور پر آپ کے ہر بچے کو ${v['days']} دن کا پریمیم ملا ہے۔`,
        button: 'اپنا ڈیش بورڈ کھولیں',
        outro: 'دوسرے خاندانوں کو ہمارے بارے میں بتانے کا شکریہ۔',
      },
      weeklyReport: {
        subject: (v) => `آپ کے بچوں کا ہفتہ: ${v['week']}`,
        intro: (v) => `آپ کے بچوں کا ہفتہ (${v['week']}) ایسا رہا:`,
        button: 'پوری رپورٹ دیکھیں',
        outro: 'یہ رپورٹ آپ کو ہر اتوار کی شام ملتی ہے۔ آپ اسے ڈیش بورڈ سے بند کر سکتے ہیں۔',
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
