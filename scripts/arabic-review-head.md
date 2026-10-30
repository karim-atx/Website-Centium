# Arabic review — Round F

Every Arabic string the languages PR ships, for Karim's review before merge.
Arabic shows as "Arabic (beta)" until every area is translated; a screen not
listed here still shows English inside the right-to-left layout.

Not in this file: the Refund and Cancellation Policy (`docs/legal/refund-policy.ar.md`
on the policy PR, reviewed separately with the lawyer), catalogue content
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

## Open questions from the translation

1. **Legal pages.** The English Terms and Privacy Policy don't say which
   language version prevails (the refund policy says the Arabic does). No
   such line was added to the Arabic pages. Decide with the lawyer, who also
   confirms every row marked "legal (lawyer to confirm)".
2. **"Professional" and "business" in legal text.** The legal pages follow
   the refund policy («مهنيّ», «شركة»); the app follows the glossary
   («مختص», «نشاط تجاري»). Pick one pair for both, or keep legal and UI apart.
3. **Two-factor.** The earlier Settings strings say «المصادقة الثنائية»; the
   glossary and the newer sign-in sentences say «التحقق بخطوتين». Pick one.
4. **Gendered references to other people.** Safety and notification
   sentences about another person ("{name} won't be told", "{name} booked")
   use the masculine. English is neutral.
5. **Plan and demo names.** Premium, Starter, Growth, Pro and the plan names
   stored in the database stay in Latin letters. The landing page's demo people
   are written in Arabic letters (رامي حداد, لارا خوري); gym and class brand
   names stay Latin (Atlas Fitness, Vinyasa Flow).
6. **Words with one English form and two meanings** now have their own
   Arabic: "Online" as a session format «عبر الإنترنت» (presence in Messages
   «متصل الآن»), the map "Pin" «دبوس» (pin a chat «تثبيت»), the business
   "Contact" section «التواصل» (the navbar's «اتصل بنا»).
7. **Smaller choices**, each with a note on its row: "Reviews" «الآراء»
   (or «التقييمات»), "Hire" «توظيف», file sizes in Latin units (KB, MB),
   "You're on {plan}" «خطتك: {plan}», "a new {rating}-star review" «تقييم
   جديد ({rating} من 5)», the sign-up consent in the first person «أوافق
   على…», "use a free seat" read as an unused seat «مقعدًا شاغرًا», the
   Lebanese Dietetic Association's Arabic name, AM/PM «ص/م».
8. **Left in English on purpose:** the business policy templates a gym
   publishes (waiver, class terms, house rules: stored policy text, a legal
   choice), the phone screenshots on the landing page (images of the English
   app), user and business data, and clinical guidance (F13).

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
| business | نشاط تجاري / عملك |
| gym | نادٍ رياضي (النادي) |
| class / session | حصة / جلسة |
| programme | برنامج |
| workout | تمرين |
| meal / meal plan | وجبة / خطة وجبات |
| account | حساب |
| sign in / sign up / sign out | تسجيل الدخول / إنشاء حساب / تسجيل الخروج |
| password | كلمة المرور |
| email | البريد الإلكتروني |
| two-step sign-in | التحقق بخطوتين |
| settings | الإعدادات |
| notifications | الإشعارات |
| message / conversation / group | رسالة / محادثة / مجموعة |
| help / support | المساعدة / الدعم |
| Terms of Service / Privacy Policy | شروط الخدمة / سياسة الخصوصية |
| beta | تجريبية |
