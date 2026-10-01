/**
 * The safety page. Draft texts for the pilot: the lawyer and native speakers review
 * them before launch (see implementation plan, "Safety and legal").
 */
export const safety: Record<'en' | 'ar' | 'ur', string> = {
  en: `
Kids Coding Platform is built for children, so safety comes first in everything we make. This is how it works.

## Parents are in charge

- Only a parent or guardian can create a child's account. Children never sign up on their own.
- The parent chooses the child's nickname, avatar and password, and can change them, reset the password or delete the account at any time.
- Child accounts are for ages 13 to 16. Where we have switched it on in your country, children from 9 to 12 can join too, once a parent confirms with a verified consent step (a small card check, a signed form, or an email confirmation).

## Children stay anonymous

- Other people only ever see a **nickname** and one of our **preset avatars**. Never a real name, photo, school or exact location.
- Our nickname check blocks names that look like real names, rude words, links and phone numbers.
- There are **no private messages**: no adult can message a child, and children can't message each other one to one. Children talk only in **team rooms**, for a team, class or event they are part of. Under-13s send ready-made phrases only; from 13, typed messages pass a filter that blocks links, phone numbers, email addresses, other apps and unkind words. Parents can read their child's rooms, anyone in a room can report a message, and moderators deal with every report. Room messages are deleted after 90 days.
- **Hackathons** are team events for older students. A parent approves each child's place in a team. Teams build in a private repository that only the team, its mentor (an adult whose background check passed), the judges and our staff can open, and talk in their moderated team room. Only nicknames appear in the team's work, and our staff can take a student out of a team at any time.
- **Teachers** are adults our team adds for a school with an agreement with us; they sign in with two-factor codes. They see nicknames only, and a child joins a class only once a parent approves. Teachers and classmates talk in a moderated class room, never privately.

## Sharing is off until a parent turns it on

- **Leaderboards**: a child appears on public leaderboards only if their parent switches it on, and even then only with nickname, avatar and XP.
- **Projects**: shipped projects are private to the child and their parent. A parent can share them with a link, only while "Public projects" is on. Switching it off stops the link at once, for good.

## Code runs in a safe box

Students' code runs in a separate, locked-down "sandbox" on its own web address. It can't see anyone's account, can't send data anywhere and can't open other websites.

## Paid hub work stays safe

Students of 15 and up who join a paid hub project stay anonymous to the client ("Developer A"), and only talk with their lead developer and team in a moderated room — never with the client. The platform keeps the timer, and with it all hub work, outside school hours, before 9 pm and within a few hours a week. A parent approves every project and can stop hub work at any time; earnings go only to the parent.

## We collect as little as we can

We store a child's year of birth (not the full date), their country, and optionally a region and city, to run local leaderboards. No photos, no advertising and no trackers. The [privacy policy](privacy) has the details.

## Something worries you?

Tell us straight away with the **Feedback** button (at the bottom of every page once you're signed in) or by replying to any email from us. A person reads every message, and safety reports come first.
`,
  ar: `
صُنعت منصة Kids Coding Platform للأطفال، لذلك تأتي السلامة أولًا في كل ما نصنعه. هكذا تعمل.

## الأهل هم أصحاب القرار

- وليّ الأمر وحده يستطيع إنشاء حساب للطفل. لا يسجّل الأطفال بأنفسهم أبدًا.
- يختار وليّ الأمر الاسم المستعار للطفل وصورته الرمزية وكلمة مروره، ويستطيع تغييرها أو إعادة تعيين كلمة المرور أو حذف الحساب في أي وقت.
- حسابات الأطفال متاحة للأعمار من 13 إلى 16 سنة. وحيث نفعّل ذلك في بلدك، يمكن للأطفال من 9 إلى 12 سنة الانضمام أيضًا بعد أن يؤكد وليّ الأمر موافقته بخطوة تحقق (فحص بطاقة بسيط، أو نموذج موقّع، أو تأكيد بالبريد الإلكتروني).

## يبقى الأطفال مجهولي الهوية

- لا يرى الآخرون إلا **اسمًا مستعارًا** وإحدى **صورنا الرمزية الجاهزة**. لا اسم حقيقي ولا صورة ولا مدرسة ولا موقع دقيق أبدًا.
- يمنع فحص الأسماء المستعارة الأسماءَ التي تشبه الأسماء الحقيقية والكلمات المسيئة والروابط وأرقام الهواتف.
- **لا توجد رسائل خاصة**: لا يستطيع أي بالغ مراسلة طفل، ولا يستطيع الأطفال مراسلة بعضهم على انفراد. يتحدث الأطفال فقط في **غرف الفرق** الخاصة بفريق أو صف أو فعالية يشاركون فيها. من هم دون 13 سنة يرسلون عبارات جاهزة فقط، ومن عمر 13 تمرّ الرسائل المكتوبة عبر مرشّح يمنع الروابط وأرقام الهواتف وعناوين البريد الإلكتروني والتطبيقات الأخرى والكلمات المسيئة. يستطيع الأهل قراءة غرف أطفالهم، ويستطيع أي عضو في الغرفة الإبلاغ عن رسالة، ويتعامل المشرفون مع كل بلاغ. تُحذف رسائل الغرف بعد 90 يومًا.
- **الهاكاثونات** فعاليات جماعية للطلاب الأكبر سنًا. يوافق أحد الوالدين على مكان كل طفل في الفريق. تبني الفرق في مستودع خاص لا يفتحه إلا الفريق ومرشده (شخص بالغ اجتاز التحقق من خلفيته) والحكّام وفريقنا، وتتحدث في غرفة فريقها الخاضعة للإشراف. لا تظهر في عمل الفريق إلا الأسماء المستعارة، ويستطيع فريقنا إخراج أي طالب من فريق في أي وقت.
- **المعلّمون** بالغون يضيفهم فريقنا لمدرسة لديها اتفاق معنا، ويسجّلون الدخول برموز التحقق بخطوتين. لا يرون إلا الأسماء المستعارة، ولا ينضم الطفل إلى صف إلا بعد موافقة أحد والديه. يتحدث المعلّمون وزملاء الصف في غرفة صف خاضعة للإشراف، وليس بشكل خاص أبدًا.

## المشاركة مغلقة حتى يفعّلها وليّ الأمر

- **لوحات الصدارة**: يظهر الطفل في لوحات الصدارة العامة فقط إذا فعّل وليّ أمره ذلك، وحتى حينها يظهر الاسم المستعار والصورة الرمزية ونقاط الخبرة فقط.
- **المشاريع**: المشاريع المنشورة خاصة بالطفل ووليّ أمره. يستطيع وليّ الأمر مشاركتها برابط، فقط ما دامت «المشاريع العامة» مفعّلة. إيقافها يوقف الرابط فورًا وإلى الأبد.

## يعمل الكود في صندوق آمن

يعمل كود الطلاب في «صندوق حماية» منفصل ومغلق على عنوان ويب خاص به. لا يستطيع رؤية حساب أي أحد، ولا إرسال بيانات إلى أي مكان، ولا فتح مواقع أخرى.

## العمل المدفوع في المركز يبقى آمنًا

يبقى الطلاب من عمر 15 عامًا فما فوق الذين ينضمون إلى مشروع مدفوع في المركز مجهولي الهوية للعميل ("المطوّر A")، ولا يتحدثون إلا مع مطوّرهم الرئيسي وفريقهم في غرفة خاضعة للإشراف، وليس مع العميل أبدًا. تُبقي المنصة المؤقّت، ومعه كل العمل في المركز، خارج ساعات المدرسة، وقبل التاسعة مساءً، وضمن ساعات قليلة أسبوعيًا. يوافق الوالد على كل مشروع ويمكنه إيقاف العمل في أي وقت؛ وتذهب الأرباح إلى الوالد فقط.

## نجمع أقل قدر ممكن من البيانات

نحفظ سنة ميلاد الطفل (وليس التاريخ الكامل) وبلده، ومنطقته ومدينته إن أراد الأهل، لتشغيل لوحات الصدارة المحلية. لا صور ولا إعلانات ولا أدوات تتبّع. التفاصيل في [سياسة الخصوصية](privacy).

## هل يقلقك شيء؟

أخبرنا فورًا بزر **ملاحظات** (أسفل كل صفحة بعد تسجيل الدخول) أو بالرد على أي بريد إلكتروني منا. يقرأ شخص حقيقي كل رسالة، وبلاغات السلامة لها الأولوية.
`,
  ur: `
Kids Coding Platform بچوں کے لیے بنایا گیا ہے، اس لیے ہم جو کچھ بناتے ہیں اس میں حفاظت سب سے پہلے آتی ہے۔ یہ اس طرح کام کرتا ہے۔

## فیصلہ والدین کے ہاتھ میں

- صرف والدین یا سرپرست ہی بچے کا اکاؤنٹ بنا سکتے ہیں۔ بچے کبھی خود سائن اپ نہیں کرتے۔
- والدین بچے کا فرضی نام، اوتار اور پاس ورڈ چنتے ہیں، اور کسی بھی وقت انہیں بدل سکتے ہیں، پاس ورڈ نیا کر سکتے ہیں یا اکاؤنٹ حذف کر سکتے ہیں۔
- بچوں کے اکاؤنٹس 13 سے 16 سال کی عمر کے لیے ہیں۔ جہاں ہم نے آپ کے ملک میں اسے فعال کیا ہے، وہاں 9 سے 12 سال کے بچے بھی شامل ہو سکتے ہیں، جب والدین تصدیق شدہ رضامندی کا ایک مرحلہ مکمل کر لیں (کارڈ کی چھوٹی سی جانچ، دستخط شدہ فارم، یا ای میل کے ذریعے تصدیق)۔

## بچے گمنام رہتے ہیں

- دوسرے لوگ صرف ایک **فرضی نام** اور ہمارے **تیار اوتاروں** میں سے ایک دیکھتے ہیں۔ کبھی اصلی نام، تصویر، اسکول یا صحیح مقام نہیں۔
- ہماری فرضی نام کی جانچ اصلی ناموں جیسے نام، نامناسب الفاظ، لنکس اور فون نمبر روکتی ہے۔
- **کوئی نجی پیغامات نہیں**: کوئی بالغ کسی بچے کو پیغام نہیں بھیج سکتا، اور بچے ایک دوسرے کو الگ سے پیغام نہیں بھیج سکتے۔ بچے صرف **ٹیم رومز** میں بات کرتے ہیں، جو اس ٹیم، کلاس یا ایونٹ کے ہوتے ہیں جس کا وہ حصہ ہیں۔ 13 سال سے کم عمر بچے صرف تیار جملے بھیجتے ہیں؛ 13 سال سے لکھے گئے پیغامات ایک فلٹر سے گزرتے ہیں جو لنکس، فون نمبر، ای میل ایڈریس، دوسری ایپس اور برے الفاظ روکتا ہے۔ والدین اپنے بچے کے رومز پڑھ سکتے ہیں، روم کا کوئی بھی ممبر پیغام کی رپورٹ کر سکتا ہے، اور ماڈریٹرز ہر رپورٹ پر کارروائی کرتے ہیں۔ رومز کے پیغامات 90 دن بعد حذف ہو جاتے ہیں۔
- **ہیکاتھون** بڑی عمر کے طلبہ کے لیے ٹیم ایونٹس ہیں۔ والدین ٹیم میں ہر بچے کی جگہ منظور کرتے ہیں۔ ٹیمیں ایک نجی ریپوزٹری میں بناتی ہیں جسے صرف ٹیم، اس کا مینٹور (ایک بالغ جس کی بیک گراؤنڈ چیک پاس ہو چکی ہو)، جج اور ہمارا عملہ کھول سکتے ہیں، اور اپنے نگرانی والے ٹیم روم میں بات کرتی ہیں۔ ٹیم کے کام میں صرف فرضی نام نظر آتے ہیں، اور ہمارا عملہ کسی بھی وقت کسی طالب علم کو ٹیم سے نکال سکتا ہے۔
- **اساتذہ** وہ بالغ ہیں جنہیں ہماری ٹیم ہمارے ساتھ معاہدے والے اسکول کے لیے شامل کرتی ہے؛ وہ دو مرحلہ کوڈ سے سائن ان کرتے ہیں۔ وہ صرف فرضی نام دیکھتے ہیں، اور بچہ والدین کی منظوری کے بعد ہی کلاس میں شامل ہوتا ہے۔ اساتذہ اور ہم جماعت نگرانی والے کلاس روم میں بات کرتے ہیں، کبھی نجی طور پر نہیں۔

## شیئرنگ بند رہتی ہے جب تک والدین اسے آن نہ کریں

- **لیڈر بورڈز**: بچہ عوامی لیڈر بورڈز پر صرف تب آتا ہے جب والدین اسے آن کریں، اور تب بھی صرف فرضی نام، اوتار اور XP کے ساتھ۔
- **پروجیکٹس**: شائع شدہ پروجیکٹس صرف بچے اور اس کے والدین کے لیے ہیں۔ والدین انہیں لنک سے شیئر کر سکتے ہیں، صرف جب تک «عوامی پروجیکٹس» آن ہو۔ اسے بند کرتے ہی لنک فوراً اور ہمیشہ کے لیے بند ہو جاتا ہے۔

## کوڈ ایک محفوظ ڈبے میں چلتا ہے

طلبہ کا کوڈ ایک الگ، بند «سینڈ باکس» میں اپنے ویب پتے پر چلتا ہے۔ یہ کسی کا اکاؤنٹ نہیں دیکھ سکتا، کہیں ڈیٹا نہیں بھیج سکتا اور دوسری ویب سائٹس نہیں کھول سکتا۔

## ہب میں معاوضے والا کام محفوظ رہتا ہے

15 سال یا اس سے بڑے طلبہ جو ہب کے معاوضے والے پروجیکٹ میں شامل ہوتے ہیں، کلائنٹ کے لیے گمنام رہتے ہیں ("ڈیولپر A")، اور صرف اپنے لیڈ ڈیولپر اور ٹیم سے ایک نگرانی والے کمرے میں بات کرتے ہیں — کلائنٹ سے کبھی نہیں۔ پلیٹ فارم ٹائمر کو، اور اس کے ساتھ ہب کے سارے کام کو، اسکول کے اوقات سے باہر، رات 9 بجے سے پہلے اور ہفتے میں چند گھنٹوں کے اندر رکھتا ہے۔ والدین ہر پروجیکٹ کی منظوری دیتے ہیں اور کسی بھی وقت ہب کا کام روک سکتے ہیں؛ آمدنی صرف والدین کو جاتی ہے۔

## ہم کم سے کم معلومات جمع کرتے ہیں

ہم بچے کا پیدائش کا سال (پوری تاریخ نہیں) اور ملک، اور چاہیں تو علاقہ اور شہر، مقامی لیڈر بورڈز کے لیے رکھتے ہیں۔ نہ تصاویر، نہ اشتہار، نہ ٹریکرز۔ تفصیل [رازداری کی پالیسی](privacy) میں ہے۔

## کوئی بات پریشان کر رہی ہے؟

فوراً ہمیں **رائے** کے بٹن سے بتائیں (سائن اِن کے بعد ہر صفحے کے نیچے) یا ہماری کسی بھی ای میل کا جواب دیں۔ ہر پیغام ایک انسان پڑھتا ہے، اور حفاظت سے متعلق پیغامات سب سے پہلے۔
`,
};
