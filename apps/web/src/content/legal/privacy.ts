/**
 * The privacy policy. Draft texts for the pilot: the lawyer and native speakers review
 * them before launch (see implementation plan, "Safety and legal"). Keep it in line
 * with what the code really stores (packages/database/prisma/schema.prisma).
 */
export const privacy: Record<'en' | 'ar' | 'ur', string> = {
  en: `
This policy explains what we collect about families on Kids Coding Platform, why, and what you can do about it. We collect as little as we can, and we never sell it.

## What we collect

**About parents:** your email address, a name we use only in emails to you, your password (stored scrambled so nobody can read it), your country and language, and when you accepted these policies.

**About children:** the nickname, preset avatar and username the parent chooses, the password (stored scrambled), the **year** of birth (not the full date), the country, and, if the parent adds them, a region and city. We never ask children for their real name, photo, school or email.

**What children do while learning:** lessons finished, code written in challenges and projects, shipped projects, XP, levels and streaks.

**Settings and choices:** the parent's choices about public leaderboards and public projects, with the date each was made.

**Payments:** the plan you chose, and invoices and payments (amount, date, status). Card details go straight to our payment provider, Stripe: we never see or store them.

**Certificates:** the nickname, module and date on each certificate a child gets.

**Messages:** anything sent to us with the Feedback button, with the page it was sent from.

**Waitlist:** if you join the waitlist on our website, your email address, country, language and your child's age range.

**Security records:** when someone signs in, and the internet address and browser used, so we can protect accounts and investigate problems.

## Why we use it

- to run accounts, lessons, projects, XP and leaderboards;
- to send parents the emails the service needs (for example, confirming the email address, resetting a password or a payment receipt), and a monthly progress email that parents can switch off;
- to take payments for plans;
- to keep children safe and the service secure;
- to understand, with numbers that don't identify anyone, how the pilot is going and what to improve.

We don't show advertising, we don't use trackers or third-party analytics, and we don't build profiles of children for any other purpose.

## Who can see it

- **Other users** only ever see a child's nickname, avatar and XP on public leaderboards, and their projects through a share link — each only if the parent switches it on. Shared projects open on a separate website address used only for children's code.
- **Anyone with a certificate's code** can check it: they see the nickname, the module and the date, nothing else.
- **Our team**: only the people who need it to run the service and keep it safe, and what they do is recorded.
- **Service providers** that host the site, store files, send emails and take card payments (Stripe) for us, only to do that job for us and under contract.
- **Authorities**, only when the law requires it.

## Cookies

We use only the cookies the site needs to work: one to keep you signed in and one to remember your language. No advertising or tracking cookies.

## How long we keep it

We keep account information while the account is open. When a parent deletes a child's account, we remove the child's nickname, avatar, sign-in details, location, code, projects, certificates and messages straight away. We keep lesson progress and XP only as anonymous numbers. When a parent deletes their own account, the same happens for every child in it, and the parent's email, name and password are removed too. We keep invoices, payment records and records of parents' consent for as long as the law requires, tied to an anonymous account. Waitlist addresses that are never confirmed are deleted after 30 days. Security records are kept for a limited time and then deleted.

## Your choices and rights

As a parent, you can at any time on your dashboard see and change your child's details and sharing choices, switch off the monthly email, **download a copy** of your family's information, and **delete** a child's account or your whole account. To correct something you can't change yourself, contact us and we will answer within 30 days. Depending on where you live, you may also have the right to complain to your data protection authority.

## Keeping it safe

Passwords are stored scrambled, connections are encrypted, children's code runs in a separate sandbox, and staff accounts use two-step sign-in.

## Changes and contact

If we change this policy in an important way, we will email parents before the change takes effect. Questions? Use the **Feedback** button once you're signed in, or reply to any email from us.
`,
  ar: `
توضّح هذه السياسة ما نجمعه عن العائلات على منصة Kids Coding Platform، ولماذا، وما يمكنك فعله بشأنه. نجمع أقل قدر ممكن، ولا نبيعه أبدًا.

## ما نجمعه

**عن الأهل:** بريدك الإلكتروني، واسم نستخدمه فقط في رسائلنا إليك، وكلمة مرورك (محفوظة بشكل مشفّر لا يستطيع أحد قراءته)، وبلدك ولغتك، ووقت موافقتك على هذه السياسات.

**عن الأطفال:** الاسم المستعار والصورة الرمزية الجاهزة واسم المستخدم التي يختارها وليّ الأمر، وكلمة المرور (محفوظة بشكل مشفّر)، و**سنة** الميلاد (وليس التاريخ الكامل)، والبلد، والمنطقة والمدينة إن أضافهما وليّ الأمر. لا نطلب أبدًا من الأطفال اسمهم الحقيقي أو صورتهم أو مدرستهم أو بريدهم الإلكتروني.

**ما يفعله الأطفال أثناء التعلّم:** الدروس المكتملة، والكود المكتوب في التحديات والمشاريع، والمشاريع المنشورة، ونقاط الخبرة والمستويات وأيام الإنجاز المتتالية.

**الإعدادات والاختيارات:** اختيارات وليّ الأمر بشأن لوحات الصدارة العامة والمشاريع العامة، مع تاريخ كل اختيار.

**المدفوعات:** الخطة التي اخترتها، والفواتير والمدفوعات (المبلغ والتاريخ والحالة). تذهب بيانات البطاقة مباشرةً إلى مزوّد الدفع Stripe: نحن لا نراها ولا نحفظها.

**الشهادات:** الاسم المستعار والوحدة والتاريخ على كل شهادة يحصل عليها الطفل.

**الرسائل:** كل ما يُرسل إلينا بزر الملاحظات، مع الصفحة التي أُرسل منها.

**قائمة الانتظار:** إذا انضممت إلى قائمة الانتظار على موقعنا، فبريدك الإلكتروني وبلدك ولغتك والفئة العمرية لطفلك.

**سجلات الأمان:** وقت تسجيل الدخول، وعنوان الإنترنت والمتصفح المستخدم، لنحمي الحسابات ونتحقق من المشكلات.

## لماذا نستخدمها

- لتشغيل الحسابات والدروس والمشاريع ونقاط الخبرة ولوحات الصدارة؛
- لإرسال الرسائل التي تحتاجها الخدمة إلى الأهل (مثل تأكيد البريد الإلكتروني أو إعادة تعيين كلمة المرور أو إيصال الدفع)، ورسالة شهرية عن التقدّم يمكن للأهل إيقافها؛
- لتحصيل مدفوعات الخطط؛
- لحماية الأطفال وتأمين الخدمة؛
- لنفهم سير المرحلة التجريبية وما يجب تحسينه، بأرقام لا تكشف هوية أحد.

لا نعرض إعلانات، ولا نستخدم أدوات تتبّع أو تحليلات من جهات خارجية، ولا نبني ملفات عن الأطفال لأي غرض آخر.

## من يستطيع رؤيتها

- **المستخدمون الآخرون** لا يرون إلا الاسم المستعار للطفل وصورته الرمزية ونقاط خبرته في لوحات الصدارة العامة، ومشاريعه عبر رابط مشاركة، وكلٌّ منها فقط إذا فعّله وليّ الأمر. تُفتح المشاريع المشتركة على عنوان موقع منفصل مخصّص لكود الأطفال فقط.
- **أي شخص لديه رمز شهادة** يمكنه التحقق منها: يرى الاسم المستعار والوحدة والتاريخ، ولا شيء غير ذلك.
- **فريقنا**: فقط الأشخاص الذين يحتاجونها لتشغيل الخدمة وحمايتها، وكل ما يفعلونه مسجّل.
- **مزوّدو الخدمات** الذين يستضيفون الموقع ويحفظون الملفات ويرسلون الرسائل ويحصّلون المدفوعات بالبطاقة (Stripe) نيابةً عنا، فقط لأداء هذا العمل لنا وبموجب عقد.
- **الجهات الرسمية**، فقط عندما يفرض القانون ذلك.

## ملفات تعريف الارتباط

نستخدم فقط ملفات تعريف الارتباط التي يحتاجها الموقع ليعمل: واحد يبقيك مسجّل الدخول وآخر يتذكّر لغتك. لا ملفات للإعلانات أو التتبّع.

## مدة الاحتفاظ بها

نحتفظ بمعلومات الحساب ما دام الحساب مفتوحًا. عندما يحذف وليّ الأمر حساب الطفل، نزيل فورًا الاسم المستعار والصورة الرمزية وبيانات الدخول والموقع والكود والمشاريع والشهادات والرسائل. ونحتفظ بتقدّم الدروس ونقاط الخبرة كأرقام مجهولة الهوية فقط. وعندما يحذف وليّ الأمر حسابه، يحدث الأمر نفسه لكل طفل فيه، ونزيل أيضًا بريده الإلكتروني واسمه وكلمة مروره. نحتفظ بالفواتير وسجلات الدفع وسجلات موافقة الأهل للمدة التي يفرضها القانون، مرتبطةً بحساب مجهول الهوية. تُحذف عناوين قائمة الانتظار التي لم تُؤكَّد بعد 30 يومًا. تُحفظ سجلات الأمان لمدة محدودة ثم تُحذف.

## اختياراتك وحقوقك

بصفتك وليّ الأمر، يمكنك في أي وقت من لوحة التحكم رؤية بيانات طفلك واختيارات المشاركة وتغييرها، وإيقاف الرسالة الشهرية، و**تنزيل نسخة** من معلومات عائلتك، و**حذف** حساب طفلك أو حسابك بالكامل. لتصحيح شيء لا تستطيع تغييره بنفسك، تواصل معنا وسنردّ خلال 30 يومًا. وحسب مكان إقامتك، قد يحق لك أيضًا تقديم شكوى إلى هيئة حماية البيانات.

## كيف نحميها

كلمات المرور محفوظة بشكل مشفّر، والاتصالات مشفّرة، وكود الأطفال يعمل في صندوق حماية منفصل، وحسابات الفريق تستخدم التحقق بخطوتين.

## التغييرات والتواصل

إذا غيّرنا هذه السياسة تغييرًا مهمًا، سنراسل الأهل بالبريد الإلكتروني قبل أن يسري التغيير. لديك سؤال؟ استخدم زر **ملاحظات** بعد تسجيل الدخول، أو ردّ على أي بريد إلكتروني منا.
`,
  ur: `
یہ پالیسی بتاتی ہے کہ ہم Kids Coding Platform پر خاندانوں کے بارے میں کیا معلومات جمع کرتے ہیں، کیوں، اور آپ اس بارے میں کیا کر سکتے ہیں۔ ہم کم سے کم معلومات جمع کرتے ہیں، اور انہیں کبھی فروخت نہیں کرتے۔

## ہم کیا جمع کرتے ہیں

**والدین کے بارے میں:** آپ کا ای میل پتہ، ایک نام جو ہم صرف آپ کو ای میل میں استعمال کرتے ہیں، آپ کا پاس ورڈ (ایسی خفیہ شکل میں محفوظ کہ کوئی اسے پڑھ نہ سکے)، آپ کا ملک اور زبان، اور یہ کہ آپ نے یہ پالیسیاں کب قبول کیں۔

**بچوں کے بارے میں:** والدین کا چنا ہوا فرضی نام، تیار اوتار اور یوزر نیم، پاس ورڈ (خفیہ شکل میں محفوظ)، پیدائش کا **سال** (پوری تاریخ نہیں)، ملک، اور اگر والدین شامل کریں تو علاقہ اور شہر۔ ہم بچوں سے کبھی ان کا اصلی نام، تصویر، اسکول یا ای میل نہیں مانگتے۔

**سیکھتے وقت بچے کیا کرتے ہیں:** مکمل کیے گئے اسباق، چیلنجز اور پروجیکٹس میں لکھا گیا کوڈ، شائع شدہ پروجیکٹس، XP، لیولز اور لگاتار دنوں کا ریکارڈ۔

**ترتیبات اور انتخاب:** عوامی لیڈر بورڈز اور عوامی پروجیکٹس کے بارے میں والدین کے انتخاب، ہر انتخاب کی تاریخ کے ساتھ۔

**ادائیگیاں:** آپ کا چنا ہوا پلان، اور انوائسز اور ادائیگیاں (رقم، تاریخ، حالت)۔ کارڈ کی تفصیلات سیدھی ہمارے ادائیگی فراہم کنندہ Stripe کے پاس جاتی ہیں: ہم انہیں نہ دیکھتے ہیں نہ محفوظ کرتے ہیں۔

**سرٹیفکیٹس:** بچے کو ملنے والے ہر سرٹیفکیٹ پر فرضی نام، ماڈیول اور تاریخ۔

**پیغامات:** جو کچھ بھی رائے کے بٹن سے ہمیں بھیجا جائے، اس صفحے کے ساتھ جہاں سے بھیجا گیا۔

**ویٹ لسٹ:** اگر آپ ہماری ویب سائٹ پر ویٹ لسٹ میں شامل ہوں تو آپ کا ای میل پتہ، ملک، زبان اور آپ کے بچے کی عمر کا گروپ۔

**حفاظتی ریکارڈ:** کوئی کب سائن اِن کرتا ہے، اور استعمال ہونے والا انٹرنیٹ پتہ اور براؤزر، تاکہ ہم اکاؤنٹس کی حفاظت کر سکیں اور مسائل کی جانچ کر سکیں۔

## ہم اسے کیوں استعمال کرتے ہیں

- اکاؤنٹس، اسباق، پروجیکٹس، XP اور لیڈر بورڈز چلانے کے لیے؛
- والدین کو وہ ای میلز بھیجنے کے لیے جن کی سروس کو ضرورت ہے (مثلاً ای میل کی تصدیق، پاس ورڈ نیا کرنا یا ادائیگی کی رسید)، اور پیش رفت کی ماہانہ ای میل جسے والدین بند کر سکتے ہیں؛
- پلانز کی ادائیگی وصول کرنے کے لیے؛
- بچوں کو محفوظ اور سروس کو سیکیور رکھنے کے لیے؛
- ایسے اعداد و شمار سے جن سے کسی کی شناخت نہ ہو، یہ سمجھنے کے لیے کہ پائلٹ کیسا جا رہا ہے اور کیا بہتر کرنا ہے۔

ہم اشتہار نہیں دکھاتے، ٹریکرز یا بیرونی اینالیٹکس استعمال نہیں کرتے، اور کسی اور مقصد کے لیے بچوں کی پروفائلز نہیں بناتے۔

## اسے کون دیکھ سکتا ہے

- **دوسرے صارفین** عوامی لیڈر بورڈز پر صرف بچے کا فرضی نام، اوتار اور XP دیکھتے ہیں، اور شیئر لنک کے ذریعے اس کے پروجیکٹس، اور ان میں سے ہر ایک صرف تب جب والدین اسے آن کریں۔ شیئر کیے گئے پروجیکٹس ایک الگ ویب سائٹ پتے پر کھلتے ہیں جو صرف بچوں کے کوڈ کے لیے ہے۔
- **جس کے پاس سرٹیفکیٹ کا کوڈ ہو** وہ اس کی تصدیق کر سکتا ہے: وہ فرضی نام، ماڈیول اور تاریخ دیکھتا ہے، اور کچھ نہیں۔
- **ہماری ٹیم**: صرف وہ لوگ جنہیں سروس چلانے اور محفوظ رکھنے کے لیے اس کی ضرورت ہے، اور ان کا ہر کام ریکارڈ ہوتا ہے۔
- **سروس فراہم کرنے والے** جو ہمارے لیے سائٹ ہوسٹ کرتے، فائلیں محفوظ کرتے، ای میلز بھیجتے اور کارڈ سے ادائیگی وصول کرتے ہیں (Stripe)، صرف یہ کام کرنے کے لیے اور معاہدے کے تحت۔
- **سرکاری ادارے**، صرف جب قانون اس کا تقاضا کرے۔

## کوکیز

ہم صرف وہ کوکیز استعمال کرتے ہیں جن کی سائٹ کو کام کرنے کے لیے ضرورت ہے: ایک آپ کو سائن اِن رکھنے کے لیے اور ایک آپ کی زبان یاد رکھنے کے لیے۔ اشتہار یا ٹریکنگ کی کوئی کوکی نہیں۔

## ہم اسے کتنی دیر رکھتے ہیں

جب تک اکاؤنٹ کھلا ہے ہم اکاؤنٹ کی معلومات رکھتے ہیں۔ جب والدین بچے کا اکاؤنٹ حذف کرتے ہیں تو ہم بچے کا فرضی نام، اوتار، سائن اِن کی تفصیلات، مقام، کوڈ، پروجیکٹس، سرٹیفکیٹس اور پیغامات فوراً ہٹا دیتے ہیں۔ اسباق کی پیش رفت اور XP صرف گمنام اعداد کے طور پر رہتے ہیں۔ جب والدین اپنا اکاؤنٹ حذف کرتے ہیں تو اس کے ہر بچے کے ساتھ یہی ہوتا ہے، اور والدین کا ای میل، نام اور پاس ورڈ بھی ہٹا دیا جاتا ہے۔ انوائسز، ادائیگی کے ریکارڈ اور والدین کی رضامندی کے ریکارڈ ہم اتنی دیر رکھتے ہیں جتنی قانون تقاضا کرتا ہے، ایک گمنام اکاؤنٹ کے ساتھ۔ ویٹ لسٹ کے جو پتے کبھی تصدیق نہ ہوں وہ 30 دن بعد حذف ہو جاتے ہیں۔ حفاظتی ریکارڈ محدود مدت تک رکھے جاتے ہیں اور پھر حذف کر دیے جاتے ہیں۔

## آپ کے انتخاب اور حقوق

والدین کے طور پر آپ کسی بھی وقت اپنے ڈیش بورڈ پر اپنے بچے کی تفصیلات اور شیئرنگ کے انتخاب دیکھ اور بدل سکتے ہیں، ماہانہ ای میل بند کر سکتے ہیں، اپنے خاندان کی معلومات کی **کاپی ڈاؤن لوڈ** کر سکتے ہیں، اور بچے کا اکاؤنٹ یا اپنا پورا اکاؤنٹ **حذف** کر سکتے ہیں۔ کوئی ایسی چیز درست کروانے کے لیے جو آپ خود نہیں بدل سکتے، ہم سے رابطہ کریں، ہم 30 دن کے اندر جواب دیں گے۔ آپ جہاں رہتے ہیں اس کے مطابق، آپ کو ڈیٹا پروٹیکشن کے ادارے میں شکایت کرنے کا حق بھی ہو سکتا ہے۔

## ہم اسے محفوظ کیسے رکھتے ہیں

پاس ورڈ خفیہ شکل میں محفوظ ہوتے ہیں، کنکشن انکرپٹڈ ہوتے ہیں، بچوں کا کوڈ الگ سینڈ باکس میں چلتا ہے، اور ٹیم کے اکاؤنٹس دو مرحلوں والا سائن اِن استعمال کرتے ہیں۔

## تبدیلیاں اور رابطہ

اگر ہم اس پالیسی میں کوئی اہم تبدیلی کریں تو تبدیلی لاگو ہونے سے پہلے والدین کو ای میل کریں گے۔ کوئی سوال؟ سائن اِن کے بعد **رائے** کا بٹن استعمال کریں، یا ہماری کسی بھی ای میل کا جواب دیں۔
`,
};
