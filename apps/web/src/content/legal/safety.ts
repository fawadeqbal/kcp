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
- For now, child accounts are for ages 13 to 16. Younger children will join once a stronger parental consent process is ready.

## Children stay anonymous

- Other people only ever see a **nickname** and one of our **preset avatars**. Never a real name, photo, school or exact location.
- Our nickname check blocks names that look like real names, rude words, links and phone numbers.
- There is **no chat** of any kind: children can't message each other, and no adult can message a child.

## Sharing is off until a parent turns it on

- **Leaderboards**: a child appears on public leaderboards only if their parent switches it on, and even then only with nickname, avatar and XP.
- **Projects**: shipped projects are private to the child and their parent. A parent can share them with a link, only while "Public projects" is on. Switching it off stops the link at once, for good.

## Code runs in a safe box

Students' code runs in a separate, locked-down "sandbox" on its own web address. It can't see anyone's account, can't send data anywhere and can't open other websites.

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
- حاليًا، حسابات الأطفال متاحة للأعمار من 13 إلى 16 سنة. سينضم الأطفال الأصغر عندما تصبح إجراءات موافقة الأهل الأقوى جاهزة.

## يبقى الأطفال مجهولي الهوية

- لا يرى الآخرون إلا **اسمًا مستعارًا** وإحدى **صورنا الرمزية الجاهزة**. لا اسم حقيقي ولا صورة ولا مدرسة ولا موقع دقيق أبدًا.
- يمنع فحص الأسماء المستعارة الأسماءَ التي تشبه الأسماء الحقيقية والكلمات المسيئة والروابط وأرقام الهواتف.
- **لا توجد دردشة** من أي نوع: لا يستطيع الأطفال مراسلة بعضهم، ولا يستطيع أي بالغ مراسلة طفل.

## المشاركة مغلقة حتى يفعّلها وليّ الأمر

- **لوحات الصدارة**: يظهر الطفل في لوحات الصدارة العامة فقط إذا فعّل وليّ أمره ذلك، وحتى حينها يظهر الاسم المستعار والصورة الرمزية ونقاط الخبرة فقط.
- **المشاريع**: المشاريع المنشورة خاصة بالطفل ووليّ أمره. يستطيع وليّ الأمر مشاركتها برابط، فقط ما دامت «المشاريع العامة» مفعّلة. إيقافها يوقف الرابط فورًا وإلى الأبد.

## يعمل الكود في صندوق آمن

يعمل كود الطلاب في «صندوق حماية» منفصل ومغلق على عنوان ويب خاص به. لا يستطيع رؤية حساب أي أحد، ولا إرسال بيانات إلى أي مكان، ولا فتح مواقع أخرى.

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
- فی الحال بچوں کے اکاؤنٹس 13 سے 16 سال کی عمر کے لیے ہیں۔ چھوٹے بچے اس وقت شامل ہوں گے جب والدین کی رضامندی کا زیادہ مضبوط طریقہ تیار ہو جائے گا۔

## بچے گمنام رہتے ہیں

- دوسرے لوگ صرف ایک **فرضی نام** اور ہمارے **تیار اوتاروں** میں سے ایک دیکھتے ہیں۔ کبھی اصلی نام، تصویر، اسکول یا صحیح مقام نہیں۔
- ہماری فرضی نام کی جانچ اصلی ناموں جیسے نام، نامناسب الفاظ، لنکس اور فون نمبر روکتی ہے۔
- کسی بھی قسم کی **چیٹ نہیں**: بچے ایک دوسرے کو پیغام نہیں بھیج سکتے، اور کوئی بالغ کسی بچے کو پیغام نہیں بھیج سکتا۔

## شیئرنگ بند رہتی ہے جب تک والدین اسے آن نہ کریں

- **لیڈر بورڈز**: بچہ عوامی لیڈر بورڈز پر صرف تب آتا ہے جب والدین اسے آن کریں، اور تب بھی صرف فرضی نام، اوتار اور XP کے ساتھ۔
- **پروجیکٹس**: شائع شدہ پروجیکٹس صرف بچے اور اس کے والدین کے لیے ہیں۔ والدین انہیں لنک سے شیئر کر سکتے ہیں، صرف جب تک «عوامی پروجیکٹس» آن ہو۔ اسے بند کرتے ہی لنک فوراً اور ہمیشہ کے لیے بند ہو جاتا ہے۔

## کوڈ ایک محفوظ ڈبے میں چلتا ہے

طلبہ کا کوڈ ایک الگ، بند «سینڈ باکس» میں اپنے ویب پتے پر چلتا ہے۔ یہ کسی کا اکاؤنٹ نہیں دیکھ سکتا، کہیں ڈیٹا نہیں بھیج سکتا اور دوسری ویب سائٹس نہیں کھول سکتا۔

## ہم کم سے کم معلومات جمع کرتے ہیں

ہم بچے کا پیدائش کا سال (پوری تاریخ نہیں) اور ملک، اور چاہیں تو علاقہ اور شہر، مقامی لیڈر بورڈز کے لیے رکھتے ہیں۔ نہ تصاویر، نہ اشتہار، نہ ٹریکرز۔ تفصیل [رازداری کی پالیسی](privacy) میں ہے۔

## کوئی بات پریشان کر رہی ہے؟

فوراً ہمیں **رائے** کے بٹن سے بتائیں (سائن اِن کے بعد ہر صفحے کے نیچے) یا ہماری کسی بھی ای میل کا جواب دیں۔ ہر پیغام ایک انسان پڑھتا ہے، اور حفاظت سے متعلق پیغامات سب سے پہلے۔
`,
};
