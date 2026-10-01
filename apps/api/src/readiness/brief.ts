/**
 * The hub readiness check's brief, in each language. Students build it in a set time;
 * a mentor grades it with the READINESS rubric (packages/shared REVIEW_CRITERIA).
 * Draft texts: native speakers review them with the rest of the content.
 */
export const READINESS_MINUTES = 180;
/** A student who ran out of time can hand in during this many extra minutes. */
export const READINESS_GRACE_MINUTES = 5;
/** Waiting time before another try, after "not yet" or an empty attempt. */
export const READINESS_RETRY_DAYS = { NOT_PASSED: 30, EXPIRED: 7 } as const;
/** Students this age and older can take it (the hub is for teenagers). */
export const READINESS_MIN_AGE = 13;
/** The track to finish first. */
export const READINESS_TRACK = 'pro';

export interface ReadinessBrief {
  title: string;
  summary: string;
  /** Markdown. */
  body: string;
  /** What the mentor looks for, one line each. */
  requirements: Record<string, string>;
}

export const READINESS_STARTER = {
  html: '<!-- Your page for the business. -->\n<header>\n  <h1>Business name</h1>\n</header>\n',
  css: '/* Make it look good on a phone and a laptop. */\nbody {\n  font-family: system-ui, sans-serif;\n  margin: 0;\n}\n',
  js: '// One thing the page does with JavaScript.\n',
};

export const READINESS_BRIEF: Record<'en' | 'ar' | 'ur', ReadinessBrief> = {
  en: {
    title: 'Hub readiness check',
    summary:
      'In 3 hours, build a one-page website for a small made-up business: a bakery, a bike repair shop or a tailor.',
    body: [
      'Show that you can build a real page on your own, from a short brief, in a set time — like the work in the hub.',
      '',
      'Make the business up: never use a real business, a real address or real phone numbers.',
      '',
      '**How it works**',
      '',
      '- The timer starts when you press Start and runs for 3 hours, even if you close the page. Your work is saved as you type.',
      '- Hand it in when you are done. If the time runs out, what you saved is handed in.',
      '- A mentor scores four parts from 1 to 4: it works, the code, the design, and working on your own. You see their comments on your code.',
      '- Passing records that you are ready for the hub. It doesn’t give you hub work yet: that comes later, with your parent’s approval.',
      '- Not this time? You can try again after 30 days.',
    ].join('\n'),
    requirements: {
      header: 'A header with the business’s name and one line about it',
      services: 'At least three services or products, with prices',
      hours: 'Opening hours, in a table or a list',
      form: 'A contact form with name and message fields and a send button (it doesn’t need to send)',
      responsive: 'Looks right on a phone and on a laptop',
      script:
        'One thing done with JavaScript, for example a button that shows or hides the opening hours',
      own: 'Your own work, with comments that explain your choices',
    },
  },
  ar: {
    title: 'اختبار الجاهزية للمركز',
    summary:
      'خلال 3 ساعات، ابنِ موقعًا من صفحة واحدة لمتجر صغير من خيالك: مخبز أو ورشة لتصليح الدراجات أو خيّاط.',
    body: [
      'أظهر أنك تستطيع بناء صفحة حقيقية بنفسك، من وصف قصير، في وقت محدد — مثل العمل في المركز.',
      '',
      'اخترع المتجر: لا تستخدم أبدًا متجرًا حقيقيًا أو عنوانًا حقيقيًا أو أرقام هواتف حقيقية.',
      '',
      '**كيف يعمل**',
      '',
      '- يبدأ المؤقت عندما تضغط "ابدأ" ويستمر 3 ساعات، حتى لو أغلقت الصفحة. يُحفظ عملك أثناء الكتابة.',
      '- سلّمه عندما تنتهي. إذا انتهى الوقت، يُسلَّم ما حفظته.',
      '- يعطي مرشد درجة من 1 إلى 4 لأربعة أجزاء: يعمل، والكود، والتصميم، والعمل وحدك. ترى تعليقاته على الكود.',
      '- النجاح يسجّل أنك جاهز للمركز. لا يعطيك عملًا في المركز بعد: يأتي ذلك لاحقًا، بموافقة أحد والديك.',
      '- لم تنجح هذه المرة؟ يمكنك المحاولة مجددًا بعد 30 يومًا.',
    ].join('\n'),
    requirements: {
      header: 'ترويسة فيها اسم المتجر وسطر واحد عنه',
      services: 'ثلاث خدمات أو منتجات على الأقل، مع الأسعار',
      hours: 'مواعيد العمل، في جدول أو قائمة',
      form: 'نموذج تواصل فيه حقلا الاسم والرسالة وزر إرسال (لا يلزم أن يرسل)',
      responsive: 'يبدو جيدًا على الهاتف وعلى الحاسوب',
      script: 'شيء واحد يُنفَّذ بجافاسكربت، مثل زر يُظهر مواعيد العمل أو يخفيها',
      own: 'عملك أنت، مع تعليقات تشرح اختياراتك',
    },
  },
  ur: {
    title: 'ہب کے لیے تیاری کا امتحان',
    summary:
      '3 گھنٹوں میں ایک چھوٹے فرضی کاروبار کے لیے ایک صفحے کی ویب سائٹ بنائیں: بیکری، سائیکل مرمت کی دکان یا درزی۔',
    body: [
      'دکھائیں کہ آپ ایک مختصر ہدایت سے، مقررہ وقت میں، خود ایک حقیقی صفحہ بنا سکتے ہیں — ہب کے کام کی طرح۔',
      '',
      'کاروبار فرضی رکھیں: کبھی کوئی حقیقی کاروبار، حقیقی پتا یا حقیقی فون نمبر استعمال نہ کریں۔',
      '',
      '**یہ کیسے کام کرتا ہے**',
      '',
      '- جب آپ "شروع کریں" دبائیں تو ٹائمر شروع ہوتا ہے اور 3 گھنٹے چلتا ہے، چاہے آپ صفحہ بند کر دیں۔ آپ کا کام لکھتے ہوئے محفوظ ہوتا ہے۔',
      '- مکمل ہونے پر جمع کرائیں۔ اگر وقت ختم ہو جائے تو جو محفوظ ہے وہ جمع ہو جاتا ہے۔',
      '- ایک مینٹور چار حصوں کو 1 سے 4 تک نمبر دیتا ہے: چلتا ہے، کوڈ، ڈیزائن، اور خود کام کرنا۔ آپ اپنے کوڈ پر ان کے تبصرے دیکھتے ہیں۔',
      '- کامیابی درج کرتی ہے کہ آپ ہب کے لیے تیار ہیں۔ اس سے ابھی ہب کا کام نہیں ملتا: وہ بعد میں، والدین کی منظوری سے آتا ہے۔',
      '- اس بار نہیں؟ آپ 30 دن بعد دوبارہ کوشش کر سکتے ہیں۔',
    ].join('\n'),
    requirements: {
      header: 'کاروبار کے نام اور اس کے بارے میں ایک سطر والا ہیڈر',
      services: 'کم از کم تین خدمات یا چیزیں، قیمتوں کے ساتھ',
      hours: 'کھلنے کے اوقات، جدول یا فہرست میں',
      form: 'نام اور پیغام کے خانوں اور بھیجنے کے بٹن والا رابطہ فارم (اسے بھیجنا ضروری نہیں)',
      responsive: 'فون اور لیپ ٹاپ دونوں پر ٹھیک نظر آتا ہے',
      script: 'جاوا اسکرپٹ سے ایک کام، مثلاً ایک بٹن جو کھلنے کے اوقات دکھائے یا چھپائے',
      own: 'آپ کا اپنا کام، ایسے تبصروں کے ساتھ جو آپ کے فیصلے سمجھائیں',
    },
  },
};

export function readinessBrief(language: string): ReadinessBrief {
  return READINESS_BRIEF[language as 'en' | 'ar' | 'ur'] ?? READINESS_BRIEF.en;
}
