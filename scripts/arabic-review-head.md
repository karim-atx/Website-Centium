# Arabic review — Round F

Every Arabic string the languages PR ships, for Karim's review before merge.
Arabic shows as "Arabic (beta)" until every area is translated; a screen not
listed here still shows English inside the right-to-left layout.

Not in this file: the Refund and Cancellation Policy (`docs/legal/refund-policy.ar.md`,
Karim's reviewed version, with the lawyer), catalogue content
(exercises, foods, markers, Mind, achievements) and clinical guidance, which
stay English (F13), and server push and email text, which the Database writes.
The Terms, Privacy, Health and Community guidelines translations are in,
paired line by line with the English, under "Legal pages and summaries".

## Choices to confirm

- **Register:** Modern Standard Arabic, plain and friendly. The reader is
  addressed in the second person masculine singular, the usual default in
  Arabic apps (e.g. «غيّر ذلك من إعدادات المتصفح»). The alternative is
  gender-neutral wording everywhere, which is longer.
- **Buttons and menu items** use the verbal noun («حفظ», «حذف الحساب»,
  «إعادة المحاولة»), as the earlier strings do; sentences use the imperative.
- **Names stay in Latin letters:** Centium, Centium Premium, Atraxia, Apple,
  Google, App Store, Google Play. The one exception is the colour theme named
  "Centium" in Settings, which the frame's Arabic copy wrote «سنتيوم».
- **Digits** are Western (0–9) with Arabic month names (F9). Percent and
  units follow the number: «5 كغ», «20%».
- **Punctuation:** Arabic comma «،», question mark «؟» and semicolon «؛»;
  quotation marks «».

## Decided after the first review (ARABIC_REVIEW_FINDINGS.md, section A)

- **Legal pages:** every page says it is published in English and Arabic and
  the Arabic version prevails, in both languages. The lawyer confirms every
  row marked "legal (lawyer to confirm)", and the Privacy Policy change that
  names Groq and the food search sources (A12).
- **One pair of words everywhere, legal text included:** professional «مختص»,
  business «نشاط تجاري», two-factor «التحقق بخطوتين». The adjective «المهنية»
  stays.
- **Other people** keep the masculine where English is neutral.
- **Also changed:** "Reviews" «التقييمات»; "Get support now" «اطلب الدعم
  الآن»; "your business plan" «خطة نشاطك التجاري»; file sizes in sentences
  «20 ميغابايت»; "Earnings" «المداخيل»; WHOOP removed from Settings in both
  languages; the urgent form message offers 140 or 112 in Lebanon and no
  number elsewhere.
- **Left in English on purpose (agreed):** the business policy templates a gym
  publishes, the phone screenshots on the landing page, user and business
  data, and clinical guidance (F13).
- **Kept as they were, each with a note on its row:** Latin plan and brand
  names, the context words ("Online" «عبر الإنترنت», the map "Pin" «دبوس»,
  the business "Contact" «التواصل»), "Hire" «توظيف», "You're on {plan}"
  «خطتك: {plan}», the sign-up consent in the first person «أوافق على…», AM/PM
  «ص/م».

## Glossary

| English | Arabic |
|---|---|
| plan (subscription plan) | خطة |
| subscription / subscribe | اشتراك / اشترك |
| free trial | تجربة مجانية |
| refund / cancellation | استرداد / إلغاء |
| member (client of Centium) | عضو |
| client (of a professional) | عميل |
| professional | مختص |
| coach | مدرّب |
| business | نشاط تجاري / نشاطك التجاري |
| gym | نادٍ رياضي (النادي) |
| class / session | حصة / جلسة |
| programme | برنامج |
| workout | تمرين |
| meal / meal plan | وجبة / خطة وجبات |
| account | حساب |
| sign in / sign up / sign out | تسجيل الدخول / إنشاء حساب / تسجيل الخروج |
| password | كلمة المرور |
| email | البريد الإلكتروني |
| two-factor (two-step sign-in) | التحقق بخطوتين |
| settings | الإعدادات |
| notifications | الإشعارات |
| message / conversation / group | رسالة / محادثة / مجموعة |
| help / support | المساعدة / الدعم |
| Terms of Service / Privacy Policy | شروط الخدمة / سياسة الخصوصية |
| beta | تجريبية |
