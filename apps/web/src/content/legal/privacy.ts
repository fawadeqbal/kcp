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

**Team rooms:** what children send in the rooms of their teams, classes and events (ready-made phrases, and from 13 typed messages), and reports about messages with what moderators did. Room messages are deleted after 90 days.

**Hackathon teams:** the team's name, who is in it (each child only with a parent's approval), and the team's work in a private repository on our own git server: files, commits (with the child's nickname as the author), pull requests, reviews, comments, what was handed in, and the judges' scores and rank.

**Classes and schools:** the classes a child joins (each only with a parent's approval), the lessons their teacher set and whether they were done. For schools with a licence: the school's name and city, a contact person's name and email for invoices, the licence and its payments.

**The hub readiness check:** the page a student builds in the timed check, when they started and handed it in, and the mentor's scores and comments.

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
- **Teammates in a hackathon** see each other's nickname and avatar and the team's work. The team's repository is private: only the team, its mentor, the event's judges and our team can open it.
- **A child's teacher** (an adult our team added for their school, who signs in with two-factor codes) sees the nicknames and avatars in their class, progress on the lessons they set, and a weekly board of nicknames and XP. Classmates see that board too.
- **Anyone with a certificate's code** can check it: they see the nickname, the module and the date, nothing else.
- **Our team**: only the people who need it to run the service and keep it safe, and what they do is recorded.
- **Service providers** that host the site, store files, send emails and take card payments (Stripe) for us, only to do that job for us and under contract.
- **Authorities**, only when the law requires it.

## The real-world hub (ages 15 and up)

Students of 15 and older can work on paid projects for real clients, only with a parent's agreement for each project. For this we also keep:

- **the parent's agreement** (to paid work and to receiving the earnings) and its version, the lead developer's sign-off, and the parent's approval of each project;
- **the work:** tasks, the time a student's timer ran (the platform limits the hours), code in the project's private repository, reviews and scores from the lead developer;
- **money:** what each student earned on each project, payouts to the parent, and our accounting records;
- **the parent's payout account:** the account holder's name and the IBAN (or other account details), stored encrypted. Only the last four characters are shown; staff look at the full details only to check them, and each look is recorded. Changes need the parent's password and can be paid only after 48 hours;
- **clients:** the business's name and country, and its people's names and emails, their project requests and files, messages with our team, and invoices.

**Clients never see who a student is:** they see "Developer A", "Developer B" and the work, never a nickname, name, age, country or photo, and they can't message students. Payouts go through our payout provider (Wise) or our bank, which receive the parent's name and account details and the amount, only to send the money. A short story about a student's hub work appears on our website only if a parent says yes (first name only), and the parent can take it back at any time. We keep earnings, payout and accounting records for as long as tax and accounting law requires, tied to an anonymous account if the family's account is deleted; payout account details are deleted when the parent's account is.

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

**غرف الفرق:** ما يرسله الأطفال في غرف فرقهم وصفوفهم وفعالياتهم (عبارات جاهزة، ومن عمر 13 رسائل مكتوبة)، والبلاغات عن الرسائل مع ما فعله المشرفون. تُحذف رسائل الغرف بعد 90 يومًا.

**فرق الهاكاثون:** اسم الفريق، ومن فيه (كل طفل بموافقة أحد والديه فقط)، وعمل الفريق في مستودع خاص على خادم git الخاص بنا: الملفات، والإيداعات (commits) باسم الطفل المستعار كمؤلف، وطلبات السحب، والمراجعات، والتعليقات، وما سُلِّم، ودرجات الحكّام والترتيب.

**الصفوف والمدارس:** الصفوف التي ينضم إليها الطفل (كل صف بموافقة أحد الوالدين فقط)، والدروس التي حددها معلّمه وهل أُنجزت. وللمدارس التي لديها ترخيص: اسم المدرسة ومدينتها، واسم شخص للتواصل وبريده الإلكتروني للفواتير، والترخيص ومدفوعاته.

**اختبار الجاهزية للمركز:** الصفحة التي يبنيها الطالب في الاختبار المحدد بوقت، ومتى بدأ وسلّم، ودرجات المرشد وتعليقاته.

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
- **أعضاء فريق الهاكاثون** يرون الاسم المستعار والصورة الرمزية لبعضهم وعمل الفريق. مستودع الفريق خاص: لا يفتحه إلا الفريق ومرشده وحكّام الفعالية وفريقنا.
- **معلّم الطفل** (شخص بالغ أضافه فريقنا لمدرسته، ويسجّل الدخول برموز التحقق بخطوتين) يرى الأسماء المستعارة والصور الرمزية في صفه، والتقدّم في الدروس التي يحددها، ولوحة أسبوعية بالأسماء المستعارة ونقاط الخبرة. ويرى زملاء الصف تلك اللوحة أيضًا.
- **أي شخص لديه رمز شهادة** يمكنه التحقق منها: يرى الاسم المستعار والوحدة والتاريخ، ولا شيء غير ذلك.
- **فريقنا**: فقط الأشخاص الذين يحتاجونها لتشغيل الخدمة وحمايتها، وكل ما يفعلونه مسجّل.
- **مزوّدو الخدمات** الذين يستضيفون الموقع ويحفظون الملفات ويرسلون الرسائل ويحصّلون المدفوعات بالبطاقة (Stripe) نيابةً عنا، فقط لأداء هذا العمل لنا وبموجب عقد.
- **الجهات الرسمية**، فقط عندما يفرض القانون ذلك.

## مركز المشاريع الحقيقية (من 15 عامًا فما فوق)

يمكن للطلاب من عمر 15 عامًا فما فوق العمل في مشاريع مدفوعة لعملاء حقيقيين، وذلك فقط بموافقة أحد الوالدين على كل مشروع. لهذا نحتفظ أيضًا بما يلي:

- **موافقة الوالد** (على العمل المدفوع وعلى استلام الأرباح) ونسختها، وتزكية المطوّر الرئيسي، وموافقة الوالد على كل مشروع؛
- **العمل:** المهام، والوقت الذي عمل فيه مؤقّت الطالب (المنصة تحدّد الساعات)، والكود في المستودع الخاص بالمشروع، ومراجعات المطوّر الرئيسي وتقييماته؛
- **المال:** ما ربحه كل طالب في كل مشروع، والدفعات إلى الوالد، وسجلاتنا المحاسبية؛
- **حساب الدفع الخاص بالوالد:** اسم صاحب الحساب ورقم IBAN (أو بيانات الحساب الأخرى)، مخزّنة مشفّرة. لا تظهر إلا آخر أربعة أحرف؛ ولا يطّلع فريقنا على البيانات كاملة إلا للتحقق منها، ويُسجَّل كل اطّلاع. يتطلب التغيير كلمة مرور الوالد، ولا يُدفع إلى الحساب الجديد إلا بعد 48 ساعة؛
- **العملاء:** اسم الشركة وبلدها، وأسماء أفرادها وبريدهم الإلكتروني، وطلبات مشاريعهم وملفاتهم، والرسائل مع فريقنا، والفواتير.

**لا يعرف العملاء أبدًا هوية الطالب:** يرون "المطوّر A" و"المطوّر B" والعمل، ولا يرون أبدًا اسمًا مستعارًا أو اسمًا أو عمرًا أو بلدًا أو صورة، ولا يمكنهم مراسلة الطلاب. تتم الدفعات عبر مزوّد الدفع لدينا (Wise) أو عبر بنكنا، اللذين يتلقيان اسم الوالد وبيانات حسابه والمبلغ فقط لإرسال المال. لا تظهر قصة قصيرة عن عمل طالب في المركز على موقعنا إلا إذا وافق أحد الوالدين (بالاسم الأول فقط)، ويمكنه سحبها في أي وقت. نحتفظ بسجلات الأرباح والدفعات والمحاسبة طوال المدة التي تفرضها قوانين الضرائب والمحاسبة، مرتبطة بحساب مجهول الهوية إذا حُذف حساب العائلة؛ وتُحذف بيانات حساب الدفع عند حذف حساب الوالد.

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

**ٹیم رومز:** بچے اپنی ٹیموں، کلاسوں اور ایونٹس کے رومز میں جو بھیجتے ہیں (تیار جملے، اور 13 سال سے لکھے گئے پیغامات)، اور پیغامات کی رپورٹس اور ان پر ماڈریٹرز کی کارروائی۔ رومز کے پیغامات 90 دن بعد حذف ہو جاتے ہیں۔

**ہیکاتھون ٹیمیں:** ٹیم کا نام، اس میں کون ہے (ہر بچہ صرف والدین کی منظوری سے)، اور ہمارے اپنے git سرور پر ایک نجی ریپوزٹری میں ٹیم کا کام: فائلیں، کمٹس (بچے کے فرضی نام کے ساتھ بطور مصنف)، پُل ریکویسٹس، ریویوز، تبصرے، جمع کرایا گیا کام، اور ججوں کے نمبر اور پوزیشن۔

**کلاسیں اور اسکول:** وہ کلاسیں جن میں بچہ شامل ہوتا ہے (ہر ایک صرف والدین کی منظوری سے)، استاد کے دیے گئے اسباق اور آیا وہ مکمل ہوئے۔ لائسنس والے اسکولوں کے لیے: اسکول کا نام اور شہر، انوائس کے لیے رابطے کے شخص کا نام اور ای میل، اور لائسنس اور اس کی ادائیگیاں۔

**ہب کے لیے تیاری کا امتحان:** وہ صفحہ جو طالب علم وقت والے امتحان میں بناتا ہے، کب شروع کیا اور کب جمع کرایا، اور مینٹور کے نمبر اور تبصرے۔

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
- **ہیکاتھون ٹیم کے ساتھی** ایک دوسرے کا فرضی نام، اوتار اور ٹیم کا کام دیکھتے ہیں۔ ٹیم کی ریپوزٹری نجی ہے: اسے صرف ٹیم، اس کا مینٹور، ایونٹ کے جج اور ہماری ٹیم کھول سکتے ہیں۔
- **بچے کا استاد** (ایک بالغ جسے ہماری ٹیم نے اس کے اسکول کے لیے شامل کیا، اور جو دو مرحلہ کوڈ سے سائن ان کرتا ہے) اپنی کلاس کے فرضی نام اور اوتار، دیے گئے اسباق میں پیش رفت، اور فرضی ناموں اور XP کا ہفتہ وار بورڈ دیکھتا ہے۔ ہم جماعت بھی وہ بورڈ دیکھتے ہیں۔
- **جس کے پاس سرٹیفکیٹ کا کوڈ ہو** وہ اس کی تصدیق کر سکتا ہے: وہ فرضی نام، ماڈیول اور تاریخ دیکھتا ہے، اور کچھ نہیں۔
- **ہماری ٹیم**: صرف وہ لوگ جنہیں سروس چلانے اور محفوظ رکھنے کے لیے اس کی ضرورت ہے، اور ان کا ہر کام ریکارڈ ہوتا ہے۔
- **سروس فراہم کرنے والے** جو ہمارے لیے سائٹ ہوسٹ کرتے، فائلیں محفوظ کرتے، ای میلز بھیجتے اور کارڈ سے ادائیگی وصول کرتے ہیں (Stripe)، صرف یہ کام کرنے کے لیے اور معاہدے کے تحت۔
- **سرکاری ادارے**، صرف جب قانون اس کا تقاضا کرے۔

## حقیقی دنیا کا ہب (15 سال اور اس سے زیادہ)

15 سال یا اس سے بڑے طلبہ حقیقی کلائنٹس کے معاوضے والے پروجیکٹس پر کام کر سکتے ہیں، اور ہر پروجیکٹ کے لیے صرف والدین کی منظوری سے۔ اس کے لیے ہم یہ بھی رکھتے ہیں:

- **والدین کی رضامندی** (معاوضے والے کام اور آمدنی وصول کرنے کے لیے) اور اس کا ورژن، لیڈ ڈیولپر کی منظوری، اور ہر پروجیکٹ پر والدین کی منظوری؛
- **کام:** ٹاسکس، طالب علم کا ٹائمر کتنا وقت چلا (پلیٹ فارم اوقات محدود رکھتا ہے)، پروجیکٹ کی نجی ریپوزٹری میں کوڈ، لیڈ ڈیولپر کے جائزے اور اسکور؛
- **رقم:** ہر طالب علم نے ہر پروجیکٹ پر کیا کمایا، والدین کو ادائیگیاں، اور ہمارے حساب کتاب کے ریکارڈ؛
- **والدین کا ادائیگی اکاؤنٹ:** اکاؤنٹ ہولڈر کا نام اور IBAN (یا دیگر اکاؤنٹ تفصیلات)، خفیہ (انکرپٹڈ) شکل میں محفوظ۔ صرف آخری چار حروف دکھائے جاتے ہیں؛ عملہ مکمل تفصیلات صرف جانچ کے لیے دیکھتا ہے اور ہر بار دیکھنا ریکارڈ ہوتا ہے۔ تبدیلی کے لیے والدین کا پاس ورڈ چاہیے، اور نئے اکاؤنٹ میں ادائیگی 48 گھنٹے بعد ہی ہو سکتی ہے؛
- **کلائنٹس:** کاروبار کا نام اور ملک، اس کے لوگوں کے نام اور ای میل، ان کی پروجیکٹ درخواستیں اور فائلیں، ہماری ٹیم کے ساتھ پیغامات، اور انوائسز۔

**کلائنٹس کبھی نہیں جانتے کہ طالب علم کون ہے:** وہ "ڈیولپر A"، "ڈیولپر B" اور کام دیکھتے ہیں، کبھی کوئی نک نیم، نام، عمر، ملک یا تصویر نہیں، اور وہ طلبہ کو پیغام نہیں بھیج سکتے۔ ادائیگیاں ہمارے ادائیگی فراہم کنندہ (Wise) یا ہمارے بینک کے ذریعے ہوتی ہیں، جنہیں والدین کا نام، اکاؤنٹ کی تفصیلات اور رقم صرف رقم بھیجنے کے لیے ملتی ہے۔ کسی طالب علم کے ہب کام کی مختصر کہانی ہماری ویب سائٹ پر صرف اس صورت میں آتی ہے جب والدین ہاں کہیں (صرف پہلا نام)، اور والدین اسے کسی بھی وقت واپس لے سکتے ہیں۔ ہم آمدنی، ادائیگی اور حساب کتاب کے ریکارڈ اتنی مدت تک رکھتے ہیں جتنی ٹیکس اور اکاؤنٹنگ کے قوانین تقاضا کرتے ہیں، اور اگر خاندان کا اکاؤنٹ حذف ہو تو یہ ایک گمنام اکاؤنٹ سے منسلک رہتے ہیں؛ ادائیگی اکاؤنٹ کی تفصیلات والدین کا اکاؤنٹ حذف ہونے پر حذف کر دی جاتی ہیں۔

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
