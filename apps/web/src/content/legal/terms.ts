/**
 * The terms of use. Draft texts for the pilot: the lawyer and native speakers review
 * them before launch (see implementation plan, "Safety and legal"). When the meaning
 * changes, bump TERMS_VERSION and TERMS_UPDATED in packages/shared: parents accept the
 * new version at their next visit. Earlier versions are in the Git history.
 */
export const terms: Record<'en' | 'ar' | 'ur', string> = {
  en: `
These terms are an agreement between you and us, the team running Kids Coding Platform. By creating an account you accept them. We wrote them in plain words on purpose; please read them.

## Who can use it

- A **parent or legal guardian** aged 18 or over creates the family account and every child account. You confirm that you are the child's parent or guardian and accept these terms for them.
- Child accounts are for ages 13 to 16 for now.
- You are responsible for how your children use the platform, and for keeping your password (and theirs) private.

## Plans and payment

Some lessons and projects are **free**. **Premium** opens every lesson and project, certificates, and sharing a portfolio. Every new child can try Premium for free for 14 days (up to four children per family). Nothing is charged for the trial, and it ends by itself.

If you choose a plan, you see its price in your country's currency before you pay. One plan covers all your children, with a discount from the second child. Plans renew every month or year until you cancel them. You can cancel at any time on the **Plans and billing** page, and Premium stays on until the end of the period you paid for. Adding a child to a plan charges the difference for the rest of the period.

Card payments are handled by our payment provider, Stripe: we never see or store your card number. If something went wrong with a payment, write to us. Refunds follow the law of your country, and we are fair about mistakes.

## Be kind and stay safe

On the platform, please don't:

- put real names, addresses, phone numbers, school names or photos of people in projects or messages;
- write code meant to harm, trick or annoy other people, or try to break the sandbox, the site or other accounts;
- share an account, or use someone else's;
- copy other people's work and present it as your own.

If something breaks these rules we may remove it, and in serious or repeated cases pause or close the account. We will tell the parent why.

## Your work belongs to you

The code and projects a student makes are theirs. You give us permission to store them and to show them to the student, to their parent and, **only if the parent turns sharing on**, to the people they share them with. That permission ends when the work or the account is deleted.

## Our lessons

The lessons, challenges, pictures and other content on the platform belong to us or the people who licensed them to us. You may use them to learn with your family, but not copy or sell them.

## A pilot is a test

We are still building the platform. Things may change, move or sometimes stop working, and we can't promise that it will always be available or free of mistakes. As far as the law allows, we aren't responsible for losses that come from using it. Nothing in these terms takes away rights you have by law.

## Leaving

You can delete a child's account, or your whole account with every child in it, at any time from your dashboard, and download a copy of your family's information first. A plan stops when the account is deleted. We may close accounts that break these terms, or end the pilot, and we will tell you before we do.

## Changes and contact

If we change these terms in an important way, we will email you before the change takes effect, and ask you to accept the new version the next time you sign in. Questions? Use the **Feedback** button once you're signed in, or reply to any email from us.
`,
  ar: `
هذه الشروط اتفاق بينك وبيننا، الفريق الذي يدير منصة Kids Coding Platform. بإنشائك حسابًا فإنك توافق عليها. كتبناها بكلمات بسيطة عن قصد، فنرجو أن تقرأها.

## من يستطيع استخدامها

- ينشئ **وليّ الأمر أو الوصي القانوني** الذي عمره 18 سنة أو أكثر حساب العائلة وكل حسابات الأطفال. أنت تؤكد أنك وليّ أمر الطفل أو الوصي عليه وتقبل هذه الشروط نيابةً عنه.
- حسابات الأطفال متاحة حاليًا للأعمار من 13 إلى 16 سنة.
- أنت مسؤول عن طريقة استخدام أطفالك للمنصة، وعن إبقاء كلمة مرورك (وكلمات مرورهم) سرّية.

## الخطط والدفع

بعض الدروس والمشاريع **مجانية**. أمّا **بريميوم** فيفتح جميع الدروس والمشاريع والشهادات ومشاركة معرض الأعمال. يمكن لكل طفل جديد تجربة بريميوم مجانًا لمدة 14 يومًا (حتى أربعة أطفال لكل عائلة). لا يُخصم أي مبلغ مقابل التجربة، وتنتهي من تلقاء نفسها.

إذا اخترت خطة، فسترى سعرها بعملة بلدك قبل أن تدفع. خطة واحدة تشمل جميع أطفالك، مع خصم ابتداءً من الطفل الثاني. تتجدّد الخطط كل شهر أو كل سنة إلى أن تلغيها. يمكنك الإلغاء في أي وقت من صفحة **الخطط والفواتير**، ويبقى بريميوم مفعّلًا حتى نهاية المدة التي دفعت ثمنها. إضافة طفل إلى خطة تُحتسب بالفرق عن بقية المدة.

يتولّى مزوّد الدفع Stripe معالجة الدفع بالبطاقة: نحن لا نرى رقم بطاقتك ولا نحفظه. إذا حدث خطأ في دفعة ما، فراسلنا. يخضع الاسترداد لقوانين بلدك، ونتعامل مع الأخطاء بإنصاف.

## كن لطيفًا وابقَ آمنًا

على المنصة، نرجو ألا:

- تضع أسماء حقيقية أو عناوين أو أرقام هواتف أو أسماء مدارس أو صور أشخاص في المشاريع أو الرسائل؛
- تكتب كودًا هدفه إيذاء الآخرين أو خداعهم أو إزعاجهم، أو تحاول اختراق صندوق الحماية أو الموقع أو حسابات الآخرين؛
- تشارك حسابًا مع غيرك، أو تستخدم حساب شخص آخر؛
- تنسخ عمل غيرك وتقدّمه على أنه عملك.

إذا خالف شيء هذه القواعد فقد نحذفه، وفي الحالات الخطيرة أو المتكررة قد نوقف الحساب مؤقتًا أو نغلقه. وسنخبر وليّ الأمر بالسبب.

## عملك ملكك

الكود والمشاريع التي يصنعها الطالب ملكه. أنت تسمح لنا بحفظها وعرضها على الطالب ووليّ أمره، و**فقط إذا فعّل وليّ الأمر المشاركة**، على الأشخاص الذين يشاركها معهم. ينتهي هذا الإذن عند حذف العمل أو الحساب.

## دروسنا

الدروس والتحديات والصور وغيرها من محتوى المنصة ملك لنا أو لمن منحنا ترخيص استخدامها. يمكنك استخدامها للتعلّم مع عائلتك، لكن لا يجوز نسخها أو بيعها.

## المرحلة التجريبية تجربة

ما زلنا نبني المنصة. قد تتغيّر أشياء أو تنتقل أو تتوقف أحيانًا عن العمل، ولا نستطيع أن نعد بأنها ستكون متاحة دائمًا أو خالية من الأخطاء. في الحدود التي يسمح بها القانون، لسنا مسؤولين عن الخسائر الناتجة عن استخدامها. لا شيء في هذه الشروط يسلبك حقوقًا يمنحك إياها القانون.

## المغادرة

يمكنك في أي وقت حذف حساب طفلك، أو حسابك بالكامل مع جميع أطفالك، من لوحة التحكم، وتنزيل نسخة من معلومات عائلتك قبل ذلك. تتوقّف الخطة عند حذف الحساب. قد نغلق الحسابات التي تخالف هذه الشروط، أو ننهي المرحلة التجريبية، وسنخبرك قبل أن نفعل ذلك.

## التغييرات والتواصل

إذا غيّرنا هذه الشروط تغييرًا مهمًا، سنراسلك بالبريد الإلكتروني قبل أن يسري التغيير، وسنطلب منك الموافقة على النسخة الجديدة عند تسجيل دخولك التالي. لديك سؤال؟ استخدم زر **ملاحظات** بعد تسجيل الدخول، أو ردّ على أي بريد إلكتروني منا.
`,
  ur: `
یہ شرائط آپ اور ہمارے درمیان ایک معاہدہ ہیں، یعنی وہ ٹیم جو Kids Coding Platform چلاتی ہے۔ اکاؤنٹ بنا کر آپ انہیں قبول کرتے ہیں۔ ہم نے انہیں جان بوجھ کر آسان الفاظ میں لکھا ہے؛ براہ کرم انہیں پڑھیں۔

## اسے کون استعمال کر سکتا ہے

- 18 سال یا اس سے زیادہ عمر کے **والدین یا قانونی سرپرست** خاندان کا اکاؤنٹ اور بچوں کے تمام اکاؤنٹس بناتے ہیں۔ آپ تصدیق کرتے ہیں کہ آپ بچے کے والدین یا سرپرست ہیں اور ان کی طرف سے یہ شرائط قبول کرتے ہیں۔
- فی الحال بچوں کے اکاؤنٹس 13 سے 16 سال کی عمر کے لیے ہیں۔
- آپ اس کے ذمہ دار ہیں کہ آپ کے بچے پلیٹ فارم کو کیسے استعمال کرتے ہیں، اور اپنا (اور ان کا) پاس ورڈ خفیہ رکھنے کے بھی۔

## پلان اور ادائیگی

کچھ اسباق اور پروجیکٹس **مفت** ہیں۔ **پریمیم** تمام اسباق اور پروجیکٹس، سرٹیفکیٹس اور پورٹ فولیو شیئر کرنا کھول دیتا ہے۔ ہر نیا بچہ 14 دن تک پریمیم مفت آزما سکتا ہے (فی خاندان چار بچوں تک)۔ آزمائش کے کوئی پیسے نہیں لیے جاتے، اور یہ خود ہی ختم ہو جاتی ہے۔

اگر آپ کوئی پلان چنتے ہیں تو ادائیگی سے پہلے اپنے ملک کی کرنسی میں اس کی قیمت دیکھیں گے۔ ایک پلان آپ کے تمام بچوں کے لیے ہے، اور دوسرے بچے سے رعایت ملتی ہے۔ پلان ہر مہینے یا ہر سال خود تجدید ہوتے ہیں جب تک آپ انہیں منسوخ نہ کریں۔ آپ کسی بھی وقت **پلان اور بلنگ** کے صفحے سے منسوخ کر سکتے ہیں، اور پریمیم اس مدت کے آخر تک چالو رہتا ہے جس کی آپ نے ادائیگی کی ہے۔ پلان میں کسی بچے کو شامل کرنے پر باقی مدت کا فرق وصول کیا جاتا ہے۔

کارڈ کی ادائیگی ہمارا ادائیگی فراہم کنندہ Stripe سنبھالتا ہے: ہم آپ کے کارڈ کا نمبر نہ دیکھتے ہیں نہ محفوظ کرتے ہیں۔ اگر کسی ادائیگی میں کوئی غلطی ہو تو ہمیں لکھیں۔ رقم کی واپسی آپ کے ملک کے قانون کے مطابق ہوتی ہے، اور ہم غلطیوں کے معاملے میں انصاف سے کام لیتے ہیں۔

## مہربان رہیں اور محفوظ رہیں

پلیٹ فارم پر براہ کرم:

- پروجیکٹس یا پیغامات میں اصلی نام، پتے، فون نمبر، اسکول کے نام یا لوگوں کی تصاویر نہ ڈالیں؛
- ایسا کوڈ نہ لکھیں جس کا مقصد دوسروں کو نقصان پہنچانا، دھوکا دینا یا تنگ کرنا ہو، اور سینڈ باکس، سائٹ یا دوسروں کے اکاؤنٹس توڑنے کی کوشش نہ کریں؛
- اکاؤنٹ کسی کے ساتھ شیئر نہ کریں، اور کسی اور کا اکاؤنٹ استعمال نہ کریں؛
- دوسروں کا کام نقل کر کے اپنا ظاہر نہ کریں۔

اگر کوئی چیز ان اصولوں کو توڑے تو ہم اسے ہٹا سکتے ہیں، اور سنگین یا بار بار کی صورت میں اکاؤنٹ عارضی طور پر روک یا بند کر سکتے ہیں۔ ہم والدین کو وجہ بتائیں گے۔

## آپ کا کام آپ کا ہے

طالب علم جو کوڈ اور پروجیکٹس بناتا ہے وہ اسی کے ہیں۔ آپ ہمیں اجازت دیتے ہیں کہ ہم انہیں محفوظ رکھیں اور طالب علم، اس کے والدین اور، **صرف اگر والدین شیئرنگ آن کریں**، ان لوگوں کو دکھائیں جن کے ساتھ وہ شیئر کریں۔ یہ اجازت کام یا اکاؤنٹ حذف ہونے پر ختم ہو جاتی ہے۔

## ہمارے اسباق

پلیٹ فارم کے اسباق، چیلنجز، تصاویر اور دیگر مواد ہمارا ہے یا ان لوگوں کا جنہوں نے ہمیں اس کا لائسنس دیا۔ آپ انہیں اپنے خاندان کے ساتھ سیکھنے کے لیے استعمال کر سکتے ہیں، مگر نقل یا فروخت نہیں کر سکتے۔

## پائلٹ ایک آزمائش ہے

ہم ابھی پلیٹ فارم بنا رہے ہیں۔ چیزیں بدل سکتی ہیں، جگہ بدل سکتی ہیں یا کبھی کبھی کام کرنا بند کر سکتی ہیں، اور ہم وعدہ نہیں کر سکتے کہ یہ ہمیشہ دستیاب یا غلطیوں سے پاک ہوگا۔ جہاں تک قانون اجازت دیتا ہے، ہم اس کے استعمال سے ہونے والے نقصانات کے ذمہ دار نہیں۔ ان شرائط میں کوئی بات آپ سے وہ حقوق نہیں چھینتی جو قانون آپ کو دیتا ہے۔

## چھوڑنا

آپ کسی بھی وقت اپنے ڈیش بورڈ سے اپنے بچے کا اکاؤنٹ، یا اپنا پورا اکاؤنٹ اس کے تمام بچوں سمیت، حذف کر سکتے ہیں، اور اس سے پہلے اپنے خاندان کی معلومات کی ایک کاپی ڈاؤن لوڈ کر سکتے ہیں۔ اکاؤنٹ حذف ہونے پر پلان بند ہو جاتا ہے۔ ہم ان اکاؤنٹس کو بند کر سکتے ہیں جو ان شرائط کی خلاف ورزی کریں، یا پائلٹ ختم کر سکتے ہیں، اور ایسا کرنے سے پہلے آپ کو بتائیں گے۔

## تبدیلیاں اور رابطہ

اگر ہم ان شرائط میں کوئی اہم تبدیلی کریں تو تبدیلی لاگو ہونے سے پہلے آپ کو ای میل کریں گے، اور اگلی بار سائن اِن کرنے پر آپ سے نیا ورژن قبول کرنے کو کہیں گے۔ کوئی سوال؟ سائن اِن کے بعد **رائے** کا بٹن استعمال کریں، یا ہماری کسی بھی ای میل کا جواب دیں۔
`,
};
