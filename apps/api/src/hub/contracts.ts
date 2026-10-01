import { HUB_AGREEMENTS } from '@kcp/shared';

/**
 * The hub's agreements. DRAFTS written for the lawyer: nothing here has been reviewed
 * yet, and the hub stays closed in every country (Country.hubEnabled) until it has.
 * A change of meaning needs a new version in HUB_AGREEMENTS (packages/shared), which
 * asks parents and clients to accept again.
 */

export type ContractKind = 'parent' | 'client';
export type ContractLanguage = 'en' | 'ar' | 'ur';

export interface ContractText {
  kind: ContractKind;
  version: string;
  language: ContractLanguage;
  title: string;
  /** Markdown. */
  body: string;
}

const PARENT: Record<ContractLanguage, { title: string; body: string }> = {
  en: {
    title: 'Parent agreement for paid hub work',
    body: `**Draft for legal review.** This agreement is between you (the parent or guardian) and the platform. It covers your child's paid work on client projects in the hub.

## What hub work is
Hub projects are small software jobs for real businesses. Your child works in a team of students led by one of our lead developers, who plans the work, reviews every change before it reaches the client and signs off each delivery. The work is supervised, limited in time, and part of your child's learning.

## Who your child works with
- Clients sign their contract with the platform, never with your child. Your child doesn't sign anything.
- Clients never see your child's name, nickname, photo, age, school, town or contact details. They see an anonymous team name (for example "Developer B") with skills and finished projects.
- Clients and children never talk to each other. Client messages go to the lead developer only. The team's room is moderated like every room on the platform.

## Your approval
- You approve each project before your child joins it. You see what it is, roughly how many hours it takes and your child's share. You can say no.
- You can take this consent back at any time from your dashboard. Your child then leaves their projects; money they had already earned is still paid out.

## Hours
The platform limits hub work by country rules: a minimum age, a weekly maximum (6 hours a week at first) and allowed times (not during school hours, not late in the evening). The limits are enforced by the platform: your child can't log more time, and can't send code outside those times.

## Earnings
- Each project's price is split between the students, the lead developer and the platform (50%, 25% and 25% at first). Your child's part depends on the tasks they finished, agreed before work starts.
- Earnings are counted only once the client has accepted the work and paid. They are held for a short time (14 days at first) before they can be paid out, in case a payment is reversed.
- Money is paid only to a payout account in your name, never to your child. You confirm every payout before it is sent. You see a statement of everything earned, held and paid.
- Where the law asks us to, we hold back tax from payouts and show it on the statement. You are responsible for any tax that applies to your family.

## Intellectual property
The code, designs and texts your child makes for a client project belong to the platform, which passes them to the client once the client has paid. On your child's behalf, you agree to this transfer. Your child may show a finished project in their portfolio only if the client allows it. Lessons, practice projects and portfolio projects outside the hub stay your child's own.

## Data
For hub work we keep: the hours your child logs, the tasks and code reviews, their earnings, and your payout account (encrypted). Payout providers receive only what they need to send the money. See the privacy policy for how long we keep it.

## Ending
You or the platform can end hub work at any time. The platform may pause a student's hub work (for example after a safety report), and tells you why.`,
  },
  ar: {
    title: 'اتفاقية ولي الأمر للعمل المدفوع في المركز',
    body: `**مسودة للمراجعة القانونية.** هذه الاتفاقية بينك (ولي الأمر أو الوصي) وبين المنصة. وهي تغطي عمل طفلك المدفوع في مشاريع العملاء في المركز.

## ما هو العمل في المركز
مشاريع المركز أعمال برمجية صغيرة لشركات حقيقية. يعمل طفلك ضمن فريق من الطلاب يقوده أحد مطورينا الرئيسيين، الذي يخطط العمل ويراجع كل تغيير قبل وصوله إلى العميل ويعتمد كل تسليم. العمل تحت إشراف، ومحدود بالوقت، وجزء من تعلّم طفلك.

## مع من يعمل طفلك
- يوقّع العملاء عقدهم مع المنصة، وليس مع طفلك أبدًا. لا يوقّع طفلك على أي شيء.
- لا يرى العملاء أبدًا اسم طفلك أو لقبه أو صورته أو عمره أو مدرسته أو مدينته أو وسائل التواصل معه. يرون اسم فريق مجهولًا (مثل "المطوّر ب") مع المهارات والمشاريع المنجزة.
- لا يتحدث العملاء والأطفال مع بعضهم أبدًا. تصل رسائل العميل إلى المطوّر الرئيسي فقط. غرفة الفريق تخضع للإشراف مثل كل غرف المنصة.

## موافقتك
- توافق على كل مشروع قبل أن ينضم إليه طفلك. ترى ما هو، وعدد الساعات التقريبي، وحصة طفلك. ويمكنك الرفض.
- يمكنك سحب هذه الموافقة في أي وقت من لوحة التحكم. عندها يغادر طفلك مشاريعه؛ ويُدفع ما كسبه بالفعل.

## الساعات
تحدّ المنصة من العمل في المركز وفق قواعد كل بلد: حد أدنى للعمر، وحد أقصى أسبوعي (6 ساعات في الأسبوع في البداية)، وأوقات مسموحة (ليس خلال ساعات المدرسة، ولا في وقت متأخر من المساء). تطبّق المنصة هذه الحدود بنفسها: لا يستطيع طفلك تسجيل وقت أكثر، ولا إرسال الشيفرة خارج هذه الأوقات.

## الأرباح
- يُقسم ثمن كل مشروع بين الطلاب والمطوّر الرئيسي والمنصة (50% و25% و25% في البداية). تعتمد حصة طفلك على المهام التي أنهاها، ويُتفق عليها قبل بدء العمل.
- لا تُحتسب الأرباح إلا بعد أن يقبل العميل العمل ويدفع. وتُحجز لفترة قصيرة (14 يومًا في البداية) قبل أن يمكن دفعها، تحسبًا لاسترداد أي دفعة.
- تُدفع الأموال فقط إلى حساب استلام باسمك، وليس لطفلك أبدًا. تؤكد كل دفعة قبل إرسالها. وترى كشفًا بكل ما كُسب وحُجز ودُفع.
- حيث يطلب القانون ذلك، نقتطع الضريبة من الدفعات ونظهرها في الكشف. أنت مسؤول عن أي ضريبة تنطبق على أسرتك.

## الملكية الفكرية
الشيفرة والتصاميم والنصوص التي يصنعها طفلك لمشروع عميل تعود للمنصة، التي تنقلها إلى العميل بعد أن يدفع. وأنت توافق على هذا النقل نيابةً عن طفلك. يمكن لطفلك عرض مشروع منجز في ملف أعماله فقط إذا سمح العميل بذلك. أما الدروس ومشاريع التدريب ومشاريع ملف الأعمال خارج المركز فتبقى ملكًا لطفلك.

## البيانات
للعمل في المركز نحتفظ بـ: الساعات التي يسجلها طفلك، والمهام ومراجعات الشيفرة، وأرباحه، وحساب الاستلام الخاص بك (مشفّرًا). لا تتلقى جهات الدفع إلا ما تحتاجه لإرسال المال. راجع سياسة الخصوصية لمعرفة مدة الاحتفاظ.

## الإنهاء
يمكنك أو يمكن للمنصة إنهاء العمل في المركز في أي وقت. قد توقف المنصة عمل طالب في المركز مؤقتًا (مثلًا بعد بلاغ يتعلق بالسلامة)، وتخبرك بالسبب.`,
  },
  ur: {
    title: 'ہب میں معاوضے والے کام کے لیے والدین کا معاہدہ',
    body: `**قانونی جائزے کے لیے مسودہ۔** یہ معاہدہ آپ (والدین یا سرپرست) اور پلیٹ فارم کے درمیان ہے۔ یہ ہب میں کلائنٹ پروجیکٹس پر آپ کے بچے کے معاوضے والے کام کا احاطہ کرتا ہے۔

## ہب کا کام کیا ہے
ہب پروجیکٹس حقیقی کاروباروں کے لیے سافٹ ویئر کے چھوٹے کام ہیں۔ آپ کا بچہ طلبہ کی ایک ٹیم میں کام کرتا ہے جس کی قیادت ہمارا ایک لیڈ ڈیولپر کرتا ہے، جو کام کی منصوبہ بندی کرتا ہے، ہر تبدیلی کو کلائنٹ تک پہنچنے سے پہلے جانچتا ہے اور ہر ڈیلیوری کی منظوری دیتا ہے۔ یہ کام نگرانی میں، محدود وقت کے لیے، اور آپ کے بچے کی تعلیم کا حصہ ہے۔

## آپ کا بچہ کس کے ساتھ کام کرتا ہے
- کلائنٹ اپنا معاہدہ پلیٹ فارم سے کرتے ہیں، آپ کے بچے سے کبھی نہیں۔ آپ کا بچہ کسی چیز پر دستخط نہیں کرتا۔
- کلائنٹ آپ کے بچے کا نام، عرفی نام، تصویر، عمر، اسکول، شہر یا رابطے کی تفصیلات کبھی نہیں دیکھتے۔ وہ ایک گمنام ٹیم نام (مثلاً "ڈیولپر ب") کے ساتھ مہارتیں اور مکمل پروجیکٹس دیکھتے ہیں۔
- کلائنٹ اور بچے کبھی ایک دوسرے سے بات نہیں کرتے۔ کلائنٹ کے پیغامات صرف لیڈ ڈیولپر کو جاتے ہیں۔ ٹیم کا کمرہ پلیٹ فارم کے ہر کمرے کی طرح نگرانی میں ہوتا ہے۔

## آپ کی منظوری
- آپ ہر پروجیکٹ کی منظوری دیتے ہیں اس سے پہلے کہ آپ کا بچہ اس میں شامل ہو۔ آپ دیکھتے ہیں کہ یہ کیا ہے، اندازاً کتنے گھنٹے لگیں گے اور آپ کے بچے کا حصہ کیا ہے۔ آپ انکار کر سکتے ہیں۔
- آپ یہ رضامندی کسی بھی وقت اپنے ڈیش بورڈ سے واپس لے سکتے ہیں۔ تب آپ کا بچہ اپنے پروجیکٹس چھوڑ دیتا ہے؛ جو رقم وہ پہلے کما چکا ہے وہ پھر بھی ادا کی جاتی ہے۔

## اوقات
پلیٹ فارم ہر ملک کے قواعد کے مطابق ہب کا کام محدود کرتا ہے: کم از کم عمر، ہفتہ وار حد (شروع میں ہفتے میں 6 گھنٹے) اور اجازت والے اوقات (اسکول کے اوقات میں نہیں، رات دیر تک نہیں)۔ یہ حدیں پلیٹ فارم خود نافذ کرتا ہے: آپ کا بچہ زیادہ وقت درج نہیں کر سکتا، اور ان اوقات کے باہر کوڈ نہیں بھیج سکتا۔

## آمدنی
- ہر پروجیکٹ کی قیمت طلبہ، لیڈ ڈیولپر اور پلیٹ فارم میں تقسیم ہوتی ہے (شروع میں 50%، 25% اور 25%)۔ آپ کے بچے کا حصہ اس کے مکمل کیے گئے کاموں پر منحصر ہے، جو کام شروع ہونے سے پہلے طے ہوتا ہے۔
- آمدنی صرف تب شمار ہوتی ہے جب کلائنٹ کام قبول کر کے ادائیگی کر دے۔ ادائیگی کے قابل ہونے سے پہلے اسے کچھ دن (شروع میں 14 دن) روکا جاتا ہے، اگر کوئی ادائیگی واپس ہو جائے۔
- رقم صرف آپ کے نام کے پے آؤٹ اکاؤنٹ میں بھیجی جاتی ہے، کبھی آپ کے بچے کو نہیں۔ ہر ادائیگی بھیجنے سے پہلے آپ اس کی تصدیق کرتے ہیں۔ آپ کمائی گئی، روکی گئی اور ادا کی گئی ہر رقم کا گوشوارہ دیکھتے ہیں۔
- جہاں قانون تقاضا کرے، ہم ادائیگیوں سے ٹیکس کاٹتے ہیں اور اسے گوشوارے میں دکھاتے ہیں۔ آپ کے خاندان پر لاگو کسی بھی ٹیکس کی ذمہ داری آپ کی ہے۔

## دانشورانہ ملکیت
آپ کا بچہ کلائنٹ پروجیکٹ کے لیے جو کوڈ، ڈیزائن اور تحریریں بناتا ہے وہ پلیٹ فارم کی ملکیت ہیں، جو انہیں کلائنٹ کی ادائیگی کے بعد کلائنٹ کو منتقل کر دیتا ہے۔ اپنے بچے کی طرف سے آپ اس منتقلی سے اتفاق کرتے ہیں۔ آپ کا بچہ مکمل پروجیکٹ اپنے پورٹ فولیو میں صرف تب دکھا سکتا ہے جب کلائنٹ اجازت دے۔ ہب کے باہر اسباق، مشق کے پروجیکٹس اور پورٹ فولیو پروجیکٹس آپ کے بچے کے اپنے رہتے ہیں۔

## ڈیٹا
ہب کے کام کے لیے ہم یہ رکھتے ہیں: آپ کے بچے کے درج کیے گئے گھنٹے، کام اور کوڈ کے جائزے، اس کی آمدنی، اور آپ کا پے آؤٹ اکاؤنٹ (انکرپٹڈ)۔ ادائیگی فراہم کرنے والوں کو صرف وہی ملتا ہے جو رقم بھیجنے کے لیے ضروری ہو۔ ہم ڈیٹا کتنی دیر رکھتے ہیں، یہ رازداری کی پالیسی میں دیکھیں۔

## اختتام
آپ یا پلیٹ فارم کسی بھی وقت ہب کا کام ختم کر سکتے ہیں۔ پلیٹ فارم کسی طالب علم کا ہب کا کام عارضی طور پر روک سکتا ہے (مثلاً حفاظت سے متعلق رپورٹ کے بعد)، اور آپ کو وجہ بتاتا ہے۔`,
  },
};

const CLIENT = {
  title: 'Client agreement',
  body: `**Draft for legal review.** This agreement is between your organisation (the client) and the platform. It applies to every project you bring to the hub; each project also has a statement of work, made from its quote.

## The service
The platform delivers small software projects built by teams of supervised student developers, led and reviewed by the platform's lead developers. The platform is responsible for the quality of what it delivers.

## The students
- The developers are students, some of them under 18. You contract with the platform only, never with a student.
- You will not try to find out who the students are, contact them, or offer them work, outside the platform or inside it. You see anonymous team members only.
- Your messages go to the lead developer and the platform's staff. Don't send personal data about anyone, and never ask for any.

## Quotes and statements of work
The lead developer scopes your project and sends a quote. When you approve it, its statement of work (deliverables, price, deposit, timing) becomes part of this agreement. Changes you ask for that aren't in the statement of work need a new quote.

## Payment
You pay the deposit invoice before work starts, and the final invoice when you accept the work. Invoices are due within 14 days, by card or bank transfer. Prices are in the currency of the quote.

## Previews and acceptance
The platform shares previews of each milestone. You accept a delivery or ask for changes in the client portal. Changes inside the statement of work are made at no extra cost.

## Intellectual property
Once you have paid in full, the platform transfers to you the rights in the work made for your project, except open-source components (under their own licences) and the platform's own tools. Students may show the finished project in their portfolio only if you allow it.

## Confidentiality and data
Each side keeps the other's confidential information private. Share only what the project needs; the platform never needs personal data of your customers for a hub project unless the statement of work says so.

## Warranty and liability
The platform fixes defects you report within 30 days of acceptance, at no cost. Liability is limited to the fees you paid for the project, except where the law doesn't allow a limit.

## Ending
Either side may end a project with written notice. You pay for the work accepted so far; the platform refunds payments for work not started.`,
};

export function parentAgreement(language: string): ContractText {
  const lang = (['en', 'ar', 'ur'] as const).find((l) => l === language) ?? 'en';
  return { kind: 'parent', version: HUB_AGREEMENTS.parent, language: lang, ...PARENT[lang] };
}

/** In English only for now (businesses; translations once the lawyer has reviewed it). */
export function clientAgreement(): ContractText {
  return { kind: 'client', version: HUB_AGREEMENTS.client, language: 'en', ...CLIENT };
}

export interface SowInput {
  orgName: string;
  projectTitle: string;
  summary: string;
  quoteVersion: number;
  currency: string;
  priceMinor: number;
  depositMinor: number;
  deadline: string | null;
  tasks: { title: string; estimateMinutes: number }[];
}

const money = (minor: number, currency: string) =>
  `${(minor / 100).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

/** The statement of work for a quote (kept with the quote as the client approved it). */
export function statementOfWork(input: SowInput): string {
  const hours = Math.ceil(input.tasks.reduce((sum, t) => sum + t.estimateMinutes, 0) / 60);
  const deliverables = input.tasks.map((t) => `- ${t.title}`).join('\n');
  return `# Statement of work — ${input.projectTitle} (quote ${input.quoteVersion})

**Draft for legal review.** Version ${HUB_AGREEMENTS.sow}. Part of the client agreement (version ${HUB_AGREEMENTS.client}) between ${input.orgName} and the platform.

## The project
${input.summary}

## Deliverables
${deliverables}

About ${hours} hours of supervised student work, led and reviewed by the platform's lead developer.${input.deadline ? ` Target date: ${input.deadline}.` : ''}

## Price
${money(input.priceMinor, input.currency)} in total. Deposit before work starts: ${money(input.depositMinor, input.currency)}. The rest is invoiced when you accept the final delivery.

## Acceptance
Each milestone has a preview. You accept it, or ask for changes inside this statement of work, in the client portal.`;
}
