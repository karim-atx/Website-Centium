import type { Catalogue } from "../core";

// Round F (AV), Arabic: shared components, popups and sheets opened from the translated screens.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk/tx key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/profile/ContactUsPopup.tsx",
  "components/profile/ReportBugPopup.tsx",
  "components/profile/RateAppPopup.tsx",
  "components/profile/StorageUsageRow.tsx",
  "components/profile/ChangePasswordSheet.tsx",
  "components/profile/ColorThemePicker.tsx",
  "components/profile/CycleTrackingRow.tsx",
  "components/profile/DobInline.tsx",
  "components/forum/ForumBlocksSetting.tsx",
  "components/moderation/GetSupportPopup.tsx",
  "components/health-checks/HealthChecksNotificationRow.tsx",
  "components/health-checks/HealthCheckPopups.tsx",
  "components/music/PlaylistField.tsx",
  "components/market/MarketStates.tsx",
  "components/cv/CvSheets.tsx",
  "components/pro/profile/useCoverPicker.tsx",
  "components/moderation/ImageApproval.tsx",
  "components/pro/calendar/BookingSheets.tsx",
  "components/pro/messages/ShareChatCard.tsx",
  "components/pro/states.tsx",
  "components/security/SecurityCheck.tsx",
  "components/business-more/kit.tsx",
  "components/business-more/BusinessLegal.tsx",
  "pages/business-more/BusinessTwoFactorViews.tsx",
  "pages/business-more/AppPages.tsx",
  "pages/business-more/CloseBusinessSheet.tsx",
  "components/security/RecoveryCodesCard.tsx",
  "components/security/RecoveryCodesView.tsx",
];

const shared: Catalogue = {
  // == Settings › Contact us ==
  "Live chat": "دردشة مباشرة",
  "Live chat, {badge} unread": "دردشة مباشرة، {badge} غير مقروءة",
  "Opening…": "جارٍ الفتح…",

  // == Settings › Report a bug ==
  "What happened?": "ماذا حدث؟",
  "The weight I logged this morning isn't showing on Home…": "الوزن الذي سجّلته صباح اليوم لا يظهر في الرئيسية…", // note: a sample of what a person might type, written in their voice (first person)
  "Too long: {count} of {max} characters.": "طويل جدًا: {count} من {max} حرف.", // note: «حرف» after a figure that may be any size; reads as "characters" in a counter
  "Preparing…": "جارٍ التحضير…",
  "Add screenshot": "إضافة لقطة شاشة",
  "Remove screenshot": "إزالة لقطة الشاشة",
  "Report sent": "تم إرسال البلاغ",
  "Thank you. The team reads these when reviewing reports. You won’t get a reply here.": "شكرًا لك. يقرأ الفريق هذه البلاغات عند مراجعتها. لن يصلك رد هنا.",
  "You need to be signed in to send a report.": "يجب أن تسجّل الدخول لإرسال بلاغ.",
  "That report couldn't be sent.": "تعذّر إرسال هذا البلاغ.",
  "Sent with this report: the page you were on ({route}), your browser version and your screenshot. Nothing from your health records is included unless your screenshot shows it.":
    "يُرسل مع هذا البلاغ: الصفحة التي كنت فيها ({route})، وإصدار متصفحك، ولقطة الشاشة. لا يُرفق شيء من سجلاتك الصحية إلا إذا ظهر في لقطة الشاشة.", // note: privacy disclosure (exception 1): one sentence per case, so nothing is stitched
  "Sent with this report: the page you were on ({route}), your browser version. Nothing from your health records is included.":
    "يُرسل مع هذا البلاغ: الصفحة التي كنت فيها ({route})، وإصدار متصفحك. لا يُرفق شيء من سجلاتك الصحية.",
  "Sent with this report: the page you were on, your browser version and your screenshot. Nothing from your health records is included unless your screenshot shows it.":
    "يُرسل مع هذا البلاغ: الصفحة التي كنت فيها، وإصدار متصفحك، ولقطة الشاشة. لا يُرفق شيء من سجلاتك الصحية إلا إذا ظهر في لقطة الشاشة.",
  "Sent with this report: the page you were on, your browser version. Nothing from your health records is included.":
    "يُرسل مع هذا البلاغ: الصفحة التي كنت فيها، وإصدار متصفحك. لا يُرفق شيء من سجلاتك الصحية.",

  // == Settings › Rate this app ==
  "Your review (optional)": "تقييمك (اختياري)",
  "What works well, and what doesn't? (optional)": "ما الذي يعمل جيدًا، وما الذي لا يعمل؟ (اختياري)",
  "Review sent": "تم إرسال التقييم",
  "Thank you. The team reads these when reviewing feedback. You won’t get a reply here.": "شكرًا لك. يقرأ الفريق هذه التقييمات عند مراجعة الملاحظات. لن يصلك رد هنا.",
  "You need to be signed in to leave a review.": "يجب أن تسجّل الدخول لترك تقييم.",
  "That review couldn't be sent.": "تعذّر إرسال هذا التقييم.",
  "Sent with this review: the page you were on ({route}) and your browser version. Nothing from your health records is included.":
    "يُرسل مع هذا التقييم: الصفحة التي كنت فيها ({route}) وإصدار متصفحك. لا يُرفق شيء من سجلاتك الصحية.",
  "Sent with this review: the page you were on and your browser version. Nothing from your health records is included.":
    "يُرسل مع هذا التقييم: الصفحة التي كنت فيها وإصدار متصفحك. لا يُرفق شيء من سجلاتك الصحية.",

  // == Settings › Storage ==
  Storage: "مساحة التخزين",
  "Storage used": "مساحة التخزين المستخدمة",
  "Lab reports, scans and other files you upload.": "تقارير المختبر والصور الطبية وغيرها من الملفات التي ترفعها.", // note: "scans" = medical imaging scans
  "{used} of {cap}": "{used} من {cap}", // note: sizes stay "21 KB", "2 GB" (Latin units, inside <bdi>)
  "You're running low. Remove a lab report or scan you no longer need to free up space.": "المساحة توشك على النفاد. احذف تقرير مختبر أو صورة طبية لم تعد تحتاجها لتوفير مساحة.",

  // == Settings › Change password ==
  "Set a password": "تعيين كلمة مرور",
  "Set password": "تعيين كلمة المرور",
  "You sign in with Google": "تسجّل الدخول باستخدام Google",
  "If you'd also like to sign in with {email} and a password, you can set one here.": "إن أردت أيضًا تسجيل الدخول باستخدام {email} وكلمة مرور، يمكنك تعيين واحدة هنا.",
  "If you'd also like to sign in with your email and a password, you can set one here.": "إن أردت أيضًا تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة مرور، يمكنك تعيين واحدة هنا.",
  "Current password": "كلمة المرور الحالية",
  "Hide current password": "إخفاء كلمة المرور الحالية",
  "Show current password": "إظهار كلمة المرور الحالية",
  "Hide new password": "إخفاء كلمة المرور الجديدة",
  "Show new password": "إظهار كلمة المرور الجديدة",
  "Your current password isn't right.": "كلمة المرور الحالية غير صحيحة.",
  "Enter the code from your email to continue.": "أدخل الرمز الذي وصلك بالبريد الإلكتروني للمتابعة.",
  "We sent a new code to {email}.": "أرسلنا رمزًا جديدًا إلى {email}.",
  "For your security, we emailed a 6-digit code to {email}. Enter it to finish changing your password.": "حفاظًا على أمانك، أرسلنا رمزًا من 6 أرقام إلى {email}. أدخله لإكمال تغيير كلمة المرور.",
  "Six-digit code from your email": "الرمز المكوّن من ستة أرقام من بريدك الإلكتروني",
  "Send a new code": "إرسال رمز جديد",
  "Password set. You can now also sign in with {email} and this password.": "عُيّنت كلمة المرور. يمكنك الآن أيضًا تسجيل الدخول باستخدام {email} وكلمة المرور هذه.",
  "Password changed. You're still signed in here, and other devices will be asked to sign in again.": "تم تغيير كلمة المرور. ما زلت مسجّل الدخول هنا، وستُطلب إعادة تسجيل الدخول على الأجهزة الأخرى.",

  // == Profile › Cycle tracking ==
  "Switch it on to start tracking.": "فعّله لبدء التتبّع.",
  "Switching the tracker off hides it and stops sharing your phase. Your logs are kept. Use Delete all cycle data if you want them gone.":
    "إيقاف التتبّع يُخفيه ويوقف مشاركة مرحلتك. تبقى سجلاتك محفوظة. استخدم «حذف كل بيانات الدورة» إن أردت إزالتها.", // note: services/cycle/guidance.ts TRACKER_OFF_KEEPS_DATA, shown here through t(); «حذف كل بيانات الدورة» must match the cycle area's name for that button when it is translated

  // == Profile › Date of birth ==
  "Save date of birth": "حفظ تاريخ الميلاد",
  "You need to be signed in to change this.": "يجب أن تسجّل الدخول لتغيير هذا.",

  // == Settings › Blocked members ==
  "Blocked members": "الأعضاء المحظورون",
  "They can't message you, reply to you or see your posts in the forum.": "لا يمكنهم مراسلتك أو الرد عليك أو رؤية منشوراتك في المنتدى.",
  "They'll be able to message you, reply to you and see your posts in the forum again.": "سيتمكنون مجددًا من مراسلتك والرد عليك ورؤية منشوراتك في المنتدى.",
  "You haven't blocked anyone.": "لم تحظر أحدًا.",
  "Blocked {date}": "حُظر في {date}",
  "Couldn't unblock. Try again.": "تعذّر إلغاء الحظر. حاول مرة أخرى.",
  "You're offline. Connect to see who you've blocked.": "أنت غير متصل. اتصل بالإنترنت لترى من حظرت.",
  "Couldn't load blocked members.": "تعذّر تحميل الأعضاء المحظورين.",
  Unblocking: "جارٍ إلغاء الحظر",

  // == Get support ==
  "You're not alone": "لست وحدك",
  "If you're thinking about hurting yourself, you can talk to someone now. It's free and confidential.": "إن كنت تفكّر في إيذاء نفسك، يمكنك التحدث إلى أحد الآن. الخدمة مجانية وسرّية.", // note: safety wording; worth a look at the clinical review
  "Call {number}": "اتصل بالرقم {number}",
  "Find a helpline": "البحث عن خط مساعدة",
  "Call your local emergency number.": "اتصل برقم الطوارئ المحلي.",
  "Outside Lebanon? {site}": "خارج لبنان؟ {site}",
  "Find a helpline near you: {site}": "ابحث عن خط مساعدة قريب منك: {site}",
  "I'm OK, continue": "أنا بخير، متابعة", // note: first person, the person's own answer (as in the English)
  "Nobody is told about this. Read our {link}.": "لن يُبلَّغ أحد بهذا. اقرأ {link}.",
  "community guidelines": "إرشادات المجتمع",
  "Embrace Lifeline": "Embrace Lifeline", // note: the helpline's own name (Embrace, Lebanon), kept in Latin
  Emergency: "الطوارئ",
  "Red Cross": "الصليب الأحمر",
  "Turn on recovery-sensitive mode": "تفعيل الوضع المراعي للتعافي", // note: «مراعٍ للتعافي» as in onboarding's «تجربة مراعية للتعافي»
  "Hides calories, weight and other numbers.": "يُخفي السعرات والوزن والأرقام الأخرى.",

  // == Settings › Notifications › Health checks ==
  "No reminders yet": "لا توجد تذكيرات بعد",
  "{n} reminders · {names}": {
    zero: "لا تذكيرات · {names}",
    one: "تذكير واحد · {names}",
    two: "تذكيران · {names}",
    few: "{n} تذكيرات · {names}",
    many: "{n} تذكيرًا · {names}",
    other: "{n} تذكير · {names}",
  }, // note: check names after the dot stay English (screening catalogue, F13); a member's own check name is their data

  // == Health checks › popups ==
  "Today · {date}": "اليوم · {date}",
  "When was it done?": "متى أُجري؟",
  "Date done": "تاريخ الإجراء",
  "Date done: {date}": "تاريخ الإجراء: {date}",
  "Date done: add a date": "تاريخ الإجراء: أضف تاريخًا",
  "Next due works out from how often this check is done.": "يُحسب الموعد التالي من عدد مرات إجراء هذا الفحص.", // note: services/health-checks/checkStatus.ts nextDueLine, shown through t()
  "Next due works out from how often this check is done. This one isn't repeated.": "يُحسب الموعد التالي من عدد مرات إجراء هذا الفحص. هذا الفحص لا يتكرر.",
  "Edit check": "تعديل الفحص",
  "Log a check": "تسجيل فحص",
  "Mark a check as done to work out when it's next due.": "علّم الفحص كمُنجز لمعرفة موعده التالي.",
  Check: "الفحص", // note: the field label "Check" (a health check), not the verb
  "Choose a check": "اختر فحصًا",
  "Other…": "غير ذلك…",
  "Name of the check": "اسم الفحص",
  "How often": "كم مرة",
  "How often, in months": "كم مرة، بالأشهر",
  "Every {field} months": "كل {field} أشهر", // note: {field} is the number box; «أشهر» fits the usual 3–10 range, the box holds any 1–120
  "Every {n} months": {
    zero: "كل {n} شهر",
    one: "كل شهر",
    two: "كل شهرين",
    few: "كل {n} أشهر",
    many: "كل {n} شهرًا",
    other: "كل {n} شهر",
  },
  "Enter a number from 1 to 120.": "أدخل رقمًا من 1 إلى 120.",
  "Add a date": "إضافة تاريخ",
  "Clear the date": "مسح التاريخ",
  "Remind me when it's due": "ذكّرني عند حلول موعده",
  "Delete this check?": "حذف هذا الفحص؟",
  "Hide this check?": "إخفاء هذا الفحص؟",
  "{name} and its reminder are removed. This can't be undone.": "سيُزال «{name}» وتذكيره. لا يمكن التراجع عن ذلك.",
  "{name} moves to Hidden checks. You can show it again from the menu.": "سينتقل «{name}» إلى «الفحوصات المخفية». يمكنك إظهاره مجددًا من القائمة.",
  Keep: "إبقاء",
  Hide: "إخفاء",
  "Hidden checks": "الفحوصات المخفية",
  "Nothing hidden.": "لا شيء مخفي.",
  Show: "إظهار",
  "Notifications are off.": "الإشعارات متوقفة.",
  "Turn on ›": "تفعيل ›", // note: the chevron points the reading way in English; kept as drawn
  Custom: "مخصّص",
  "Set a reminder": "ضبط تذكير",
  "Save reminder": "حفظ التذكير",
  "Couldn't set the reminder. Try again.": "تعذّر ضبط التذكير. حاول مرة أخرى.",
  "Pick a date from today on.": "اختر تاريخًا من اليوم فصاعدًا.",
  "Date: {date}": "التاريخ: {date}",
  Repeat: "التكرار",

  // == Playlist field ==
  "Playlist (optional)": "قائمة التشغيل (اختياري)",
  "Paste a Spotify, Apple Music or YouTube Music link": "الصق رابطًا من Spotify أو Apple Music أو YouTube Music",
  "Clear the playlist link": "مسح رابط قائمة التشغيل",
  "Spotify, Apple Music or YouTube Music: a playlist or an album.": "Spotify أو Apple Music أو YouTube Music: قائمة تشغيل أو ألبوم.",
  "That's a {service} link, but not a playlist or an album.": "هذا رابط من {service}، لكنه ليس قائمة تشغيل ولا ألبومًا.",
  "That's a music link, but not a playlist or an album.": "هذا رابط موسيقى، لكنه ليس قائمة تشغيل ولا ألبومًا.", // note: services/music/playlistLink.ts field lines, shown only in this field through t()
  "Paste the full link, starting with https://": "الصق الرابط كاملًا، بدءًا بـ https://",
  "That link is too long. Copy the share link from the app.": "هذا الرابط طويل جدًا. انسخ رابط المشاركة من التطبيق.",
  "Use a YouTube Music link (music.youtube.com), not a YouTube one.": "استخدم رابطًا من YouTube Music ‏(music.youtube.com)، لا من YouTube.",
  "Short links can't be checked. Open it in Spotify, then copy the full link.": "لا يمكن التحقق من الروابط المختصرة. افتحه في Spotify، ثم انسخ الرابط كاملًا.",
  "Only Spotify, Apple Music and YouTube Music links work here.": "لا تعمل هنا إلا روابط Spotify وApple Music وYouTube Music.",

  // == Market › shared states (MarketError's {thing}) ==
  "Couldn't load {thing}. Check your connection and try again.": "تعذّر تحميل {thing}. تحقّق من اتصالك وحاول مرة أخرى.", // note: one sentence; {thing} is a noun phrase below (or one a caller already translated)
  "You're offline. Showing what was loaded.": "أنت غير متصل. يظهر ما حُمّل.",
  businesses: "الأنشطة التجارية",
  memberships: "الاشتراكات", // note: gym memberships
  "more of your history": "المزيد من سجلك",
  offers: "العروض",
  openings: "الوظائف الشاغرة",
  products: "المنتجات",
  professionals: "المختصين", // note: object case after «تحميل»
  reviews: "التقييمات",
  rewards: "المكافآت",
  services: "الخدمات",
  "the applicants": "المتقدّمين",
  "the points values": "قيم النقاط",
  "this business": "هذا النشاط التجاري",
  "this class": "هذه الحصة",
  "this gym": "هذا النادي",
  "this offer": "هذا العرض",
  "this plan": "هذه الخطة",
  "who's booked": "من حجزوا",
  "work history": "سجل العمل",
  "your applications": "طلباتك",
  "your bookings": "حجوزاتك",
  "your business": "نشاطك التجاري",
  "your free window": "فترتك المجانية",
  "your listing": "صفحتك",
  "your listing performance": "أداء صفحتك",
  "your marketplace": "صفحتك في السوق",
  "your marketplace figures": "أرقامك في السوق",
  "your members": "أعضائك",
  "your offer figures": "أرقام عروضك",
  "your offer performance": "أداء عروضك",
  "your offers": "عروضك",
  "your openings": "وظائفك الشاغرة",
  "your performance": "أدائك",
  "your photos": "صورك",
  "your plans": "خططك",
  "your points history": "سجل نقاطك",
  "your products": "منتجاتك",
  "your promotions": "عروضك الترويجية",
  "your reviews": "تقييماتك",
  "your rewards": "مكافآتك",
  "your schedule": "جدولك",
  "your services": "خدماتك",
  "your showcase": "واجهة عرضك",
  "your team": "فريقك",
  "your voucher": "قسيمتك",
  "your work": "عملك",
  "your work history": "سجل عملك",

  // Keys these files use that already have Arabic elsewhere (not repeated here): Loading, Delete, Saving…, Name, Location, Description, Optional, Role, Review, Skills, Languages, Add a licence, Add experience, Add education, Community guidelines, Not approved, Meal plan, Group session, Save, No charge, No notice, Up to the start, Who can book, Reminders to clients, Booking window, Offline, showing last update, {n} days, {n} hours.

  // == Shared › Security check (Turnstile) ==
  "The security check couldn't load. Check your connection, then reload the page.": "تعذّر تحميل التحقق الأمني. تحقّق من اتصالك، ثم أعد تحميل الصفحة.",

  // == Shared › Professional data states ==
  "Couldn't load this. Check your connection and try again.": "تعذّر تحميل هذا. تحقّق من اتصالك وحاول مرة أخرى.",

  // == Shared › Image approval (badge and note) ==
  "Waiting for approval": "بانتظار الموافقة", // note: from services/moderation/imageCopy.ts PENDING_BADGE, translated where ImageApproval shows it
  "Only you can see this until our team approves it, usually within a day.": "لا يراها أحد غيرك حتى يوافق عليها فريقنا، عادةً خلال يوم.", // note: "this" is the photo, hence the feminine «يراها»
  "{reason} Choose another photo.": "{reason} اختر صورة أخرى.",
  "It shows something our community guidelines don't allow.": "تُظهر شيئًا لا تسمح به إرشادات مجتمعنا.", // note: the five rejection reasons are services/moderation/imageCopy.ts REASON_TEXT, translated where ImageApproval shows them
  "It shows contact details, which can't be shared in public places. Use messages for that.": "تُظهر بيانات اتصال، ولا يمكن مشاركتها في الأماكن العامة. استخدم الرسائل لذلك.",
  "It doesn't match what it's for.": "لا تتوافق مع الغرض منها.",
  "It's too hard to see clearly.": "يصعب رؤيتها بوضوح.",
  "It doesn't meet our community guidelines.": "لا تستوفي إرشادات مجتمعنا.",

  // == Shared › Cover photo picker ==
  "Couldn't add your cover. Try again.": "تعذّرت إضافة صورة الغلاف. حاول مرة أخرى.",

  // == Shared › Chat share cards (programme, session, meal plan, playlist) ==
  Programme: "برنامج",
  Playlist: "قائمة تشغيل",
  Album: "ألبوم",
  "{service} playlist": "قائمة تشغيل {service}", // note: {service} is Spotify, Apple Music, etc.
  "{service} album": "ألبوم {service}",
  "{n} weeks": { zero: "0 أسابيع", one: "أسبوع واحد", two: "أسبوعان", few: "{n} أسابيع", many: "{n} أسبوعًا", other: "{n} أسبوع" },
  "{n} exercises": { zero: "0 تمارين", one: "تمرين واحد", two: "تمرينان", few: "{n} تمارين", many: "{n} تمرينًا", other: "{n} تمرين" },
  "{n} min": "{n} دقيقة",

  // == Settings › Practice › Booking sheets ==
  "Booking link": "رابط الحجز",
  "Notice and cancellation": "المهلة والإلغاء",
  "Booking approvals": "موافقات الحجز",
  "Sync with your calendar": "المزامنة مع تقويمك",
  "Everyone with the link": "كل من لديه الرابط",
  "New people send a request first": "يرسل الأشخاص الجدد طلبًا أولًا",
  "Active clients only": "العملاء النشطون فقط",
  "Clients you work with now": "العملاء الذين تعمل معهم الآن",
  "All your clients": "كل عملائك",
  "Clients in any stage": "العملاء في أي مرحلة",
  "{time} before": "قبل {time}",
  "Charge the full price": "احتساب السعر كاملًا",
  "Charge {p}% of the price": "احتساب {p}% من السعر",
  "{n} weeks ahead": { zero: "0 أسابيع مسبقًا", one: "أسبوع واحد مسبقًا", two: "أسبوعان مسبقًا", few: "{n} أسابيع مسبقًا", many: "{n} أسبوعًا مسبقًا", other: "{n} أسبوع مسبقًا" },
  "{label}, {value}": "{label}، {value}",
  "Link copied": "تم نسخ الرابط",
  "Book a session": "احجز جلسة",
  "Booking link QR code": "رمز QR لرابط الحجز",
  "Couldn't draw the QR code. Try again.": "تعذّر رسم رمز QR. حاول مرة أخرى.",
  "Anyone with this link sees your open slots and session types, then books under your rules.": "يرى كل من لديه هذا الرابط مواعيدك المتاحة وأنواع جلساتك، ثم يحجز وفق قواعدك.",
  Link: "الرابط",
  "Copy link, {url}": "نسخ الرابط، {url}",
  "Choose your handle on your public profile to get your booking link.": "اختر اسم المستخدم في ملفك العام لتحصل على رابط الحجز.",
  "Link is on": "الرابط مفعّل",
  "Link is off": "الرابط متوقف",
  "Copy link": "نسخ الرابط",
  Share: "مشاركة",
  "Selected clients": "عملاء محدّدون",
  "Choose who in the list below": "اختر من القائمة أدناه",
  "No one": "لا أحد",
  "Only you can add sessions": "أنت وحدك تضيف الجلسات",
  "Minimum notice to book": "أقل مهلة مسبقة للحجز",
  "Free cancellation until": "الإلغاء المجاني حتى",
  "Late cancellation": "الإلغاء المتأخر",
  "No-show": "عدم الحضور",
  "Clients see these rules before they book and in every reminder.": "يرى العملاء هذه القواعد قبل الحجز وفي كل تذكير.",
  "New clients": "العملاء الجدد",
  "Need your OK": "يحتاجون موافقتك",
  "Booked automatically": "يُحجز تلقائيًا",
  "New clients need your OK": "العملاء الجدد يحتاجون موافقتك",
  "Repeat bookings": "الحجوزات المتكررة",
  "Bookings outside working hours": "الحجوزات خارج ساعات العمل",
  "Approve within": "الموافقة خلال",
  "Slots start every": "تبدأ المواعيد كل",
  "Most sessions a day": "أقصى عدد جلسات في اليوم",
  "24 hours before": "قبل 24 ساعة",
  "1 hour before": "قبل ساعة",
  "Push notification": "إشعار فوري",
  "Email confirmation": "تأكيد بالبريد الإلكتروني",
  "Include your note": "تضمين ملاحظتك",
  "Events from your other calendars block those times here, so clients can't book over them.": "تحجب أحداث تقاويمك الأخرى تلك الأوقات هنا، فلا يستطيع العملاء الحجز فوقها.",
  // Practice settings shows windowLabel's English without " ahead" through t() (pages/pro/more/PracticeSettings.tsx); "1 week" and "12 weeks" are in other areas.
  "2 weeks": "أسبوعان", // note: for Practice settings › How far ahead
  "3 weeks": "3 أسابيع",
  "4 weeks": "4 أسابيع",
  "6 weeks": "6 أسابيع",
  "8 weeks": "8 أسابيع",

  // == Professional CV › Experience, Education, Awards, Publications, Volunteering, Links ==
  "Tap again to confirm": "اضغط مرة أخرى للتأكيد",
  "Edit experience": "تعديل الخبرة",
  "Save experience": "حفظ الخبرة",
  "Title|job title": "المسمّى الوظيفي",
  Title: "العنوان", // note: a publication's title
  Organisation: "الجهة",
  "e.g. Head Coach": "مثال: مدرّب رئيسي",
  "Gym, clinic or company": "نادٍ رياضي أو عيادة أو شركة",
  Start: "البداية",
  End: "النهاية",
  "What you did": "ما قمت به",
  "Edit education": "تعديل التعليم",
  "Save education": "حفظ التعليم",
  Institution: "المؤسسة التعليمية",
  Degree: "الشهادة",
  "Field of study": "مجال الدراسة",
  "University, college or school": "جامعة أو كلية أو مدرسة",
  "e.g. BSc (optional)": "مثال: بكالوريوس علوم (اختياري)",
  "e.g. Sports Science (optional)": "مثال: علوم الرياضة (اختياري)",
  "Dates are optional.": "التواريخ اختيارية.",
  "Add award": "إضافة جائزة",
  "Edit award": "تعديل الجائزة",
  "Save award": "حفظ الجائزة",
  "Award name": "اسم الجائزة",
  "Awarded by": "الجهة المانحة",
  Date: "التاريخ",
  "Add publication": "إضافة منشور",
  "Edit publication": "تعديل المنشور",
  "Save publication": "حفظ المنشور",
  Publisher: "الناشر",
  "Published|publication date": "تاريخ النشر",
  "https:// (optional)": "https:// (اختياري)",
  "Add volunteering": "إضافة عمل تطوعي",
  "Edit volunteering": "تعديل العمل التطوعي",
  "Save volunteering": "حفظ العمل التطوعي",
  "Add link": "إضافة رابط",
  "Edit link": "تعديل الرابط",
  "Save link": "حفظ الرابط",
  Label: "التسمية",
  "e.g. Portfolio": "مثال: معرض الأعمال",
  "https://": "https://",

  // == Professional CV › Licence ==
  "Edit licence": "تعديل الرخصة",
  "Save licence": "حفظ الرخصة",
  "Delete licence": "حذف الرخصة",
  "Replacing this file starts a new check, and the Verified badge comes off until it's approved. If you're on Explore, you stay listed.":
    "استبدال هذا الملف يبدأ تحققًا جديدًا، وتُزال شارة «موثّق» حتى تتم الموافقة عليه. إن كنت ظاهرًا في «استكشف»، تبقى ظاهرًا.", // note: components/cv/CvBadges.tsx REPLACE_RESETS_REVIEW, translated where the sheet shows it
  "e.g. Certified Personal Trainer": "مثال: مدرّب شخصي معتمد",
  "Issuing organisation": "الجهة المُصدِرة",
  "Who issued it": "من أصدرها",
  Issued: "تاريخ الإصدار",
  Expires: "تاريخ الانتهاء",
  "Doesn't expire": "لا تنتهي صلاحيتها",
  "Credential ID": "رقم الاعتماد",
  "Only you and our review team can see this": "لا يراه إلا أنت وفريق المراجعة لدينا",
  "Credential link": "رابط الاعتماد",
  "https:// (optional, shown to clients)": "https:// (اختياري، يظهر للعملاء)",
  "Document for verification": "مستند للتحقق",
  "Licence document": "مستند الرخصة",
  "Private: only our review team sees the document. Clients see a Verified badge once it's approved.": "خاص: لا يرى المستند إلا فريق المراجعة لدينا. يرى العملاء شارة «موثّق» بعد اعتماده.",
  "Show to clients after it expires": "إظهار للعملاء بعد انتهاء الصلاحية", // note: matches the wording quoted in auth.ts ("Turn on Show to clients after it expires")
  "Off: expired licences are hidden from clients": "عند الإيقاف: تُخفى الرخص المنتهية عن العملاء",
  "New licences start hidden from clients. Once it's saved, you choose whether to show it on your profile.": "تبدأ الرخص الجديدة مخفية عن العملاء. بعد حفظها، تختار إن كنت تريد إظهارها في ملفك.", // note: components/cv/licencePublishState.ts PUBLISH_STRINGS.newLicence

  // == Professional CV › Skills and languages ==
  "Skills and languages": "المهارات واللغات",
  "e.g. Mobility": "مثال: المرونة الحركية",
  "{language} level": "مستوى {language}",
  "Remove {language}": "إزالة {language}",
  "Add a language": "إضافة لغة",
  "e.g. Arabic": "مثال: العربية",
  Level: "المستوى",
  "Adding…": "جارٍ الإضافة…",
  "Add language": "إضافة لغة",
  "That language is already on your CV.": "هذه اللغة موجودة في سيرتك الذاتية.",
  "Changes save as you make them.": "تُحفظ التغييرات فور إجرائها.",
  "Native|language level": "اللغة الأم", // note: the level names are services/professional-cv PROFICIENCIES, shown through tx() with context because "Professional" is «مختص» elsewhere
  "Fluent|language level": "بطلاقة",
  "Professional|language level": "مهني",
  "Conversational|language level": "محادثة",
  "Basic|language level": "أساسي",


  // == Business More › shared kit (header, offline line, states, search) ==
  "Clear search": "مسح البحث",
  "You're offline. Changes need a connection.": "أنت غير متصل. تحتاج التغييرات إلى اتصال.",
  "Couldn't load this. Try again.": "تعذّر تحميل هذا. حاول مجددًا.",

  // == Terms of Service / Privacy Policy › Business sections ==
  // note: legal text, translated with the vocabulary of src/marketing/legal/text.ar.ts (business «شركة», professional «مهنيّ», client «عميل», refund «استرداد»); the lawyer must confirm every entry in this group before release.
  "For business accounts": "لحسابات الشركات", // note: lawyer must confirm
  "Business accounts": "حسابات الشركات", // note: lawyer must confirm; also the Terms heading of the same name
  "A business account must be opened by someone allowed to act for the business. You confirm you have that authority and that the business details you give are true.":
    "يجب أن يفتح حسابَ الشركة شخصٌ مخوَّل بالتصرّف نيابةً عنها. وأنت تؤكّد أنك تملك هذه الصلاحية وأنّ بيانات الشركة التي تقدّمها صحيحة.", // note: lawyer must confirm
  "Your listing": "صفحتك على المنصة", // note: lawyer must confirm; "listing" is «صفحتك» in the app (auth.ts), «على المنصة» added so the heading stands alone
  "Keep your listing, classes, prices, photos and opening hours accurate and up to date. Don't show photos of a space that isn't yours.":
    "حافظ على دقّة صفحتك وحصصك وأسعارك وصورك وساعات العمل وعلى تحديثها. ولا تعرض صورًا لمكان لا يخصّك.", // note: lawyer must confirm
  "Payments, fees and refunds": "المدفوعات والرسوم والاسترداد", // note: lawyer must confirm
  "Clients may pay you through Whish or in cash. Centium's fees are shown before you accept them. You're responsible for refunds to your clients under your own policy.":
    "يجوز للعملاء الدفع لك عبر Whish أو نقدًا. وتُعرض رسوم Centium قبل أن تقبلها. وأنت مسؤول عن الاسترداد لعملائك وفق سياستك الخاصة.", // note: lawyer must confirm
  "Your policies and waivers": "سياساتك وإقرارات إخلاء المسؤولية", // note: lawyer must confirm; waiver «إقرار إخلاء المسؤولية» as in auth.ts
  "Your cancellation rules, waivers and class terms are yours. You're responsible for what they say and for applying them fairly.":
    "قواعد الإلغاء وإقرارات إخلاء المسؤولية وشروط الحصص خاصة بك. وأنت مسؤول عن مضمونها وعن تطبيقها بإنصاف.", // note: lawyer must confirm
  "Professionals join your business with your business ID and use a seat. You're responsible for how your staff behave on Centium.":
    "ينضمّ المهنيون إلى شركتك برقم تعريف شركتك، ويشغل كلّ منهم مقعدًا. وأنت مسؤول عن سلوك موظفيك على Centium.", // note: lawyer must confirm; heading "Your team" reuses «فريقك» from another area
  "Reviews of your business": "التقييمات المتعلّقة بشركتك", // note: lawyer must confirm
  "Don't post or pay for fake reviews. Reply to reviews politely and never share a client's private details in a reply.":
    "لا تنشر تقييمات مزيّفة ولا تدفع مقابلها. وردّ على التقييمات بلباقة، ولا تكشف أبدًا التفاصيل الخاصة لأيّ عميل في ردّك.", // note: lawyer must confirm
  "Promotions and featured placement": "العروض الترويجية والظهور المميَّز", // note: lawyer must confirm
  "Promotions must be honest. Paid featured placement is labelled as featured and doesn't change your rating.":
    "يجب أن تكون العروض الترويجية صادقة. ويُوسَم الظهور المميَّز المدفوع بأنه مميَّز، ولا يغيّر تقييمك.", // note: lawyer must confirm
  "Suspending or closing a business account": "تعليق حساب الشركة أو إغلاقه", // note: lawyer must confirm
  "We may suspend a business account that breaks these terms or puts clients at risk. You can close yours at any time from Settings.":
    "يجوز لنا تعليق حساب أيّ شركة يخالف هذه الشروط أو يعرّض العملاء للخطر. ويمكنك إغلاق حسابك في أيّ وقت من الإعدادات.", // note: lawyer must confirm
  "Business data we collect": "بيانات الشركات التي نجمعها", // note: lawyer must confirm
  "Your business details, staff and roles, schedules, offerings, promotions and the transactions that run through Centium.":
    "بيانات شركتك، وموظفوها وأدوارهم، والجداول، والخدمات المعروضة، والعروض الترويجية، والمعاملات التي تتمّ عبر Centium.", // note: lawyer must confirm
  "Client data shared with a business": "بيانات العملاء التي تُشارَك مع الشركة", // note: lawyer must confirm
  "A business sees a client's name, bookings and membership status. Clients who haven't shared their profile show as a member number. Health data is never shared unless the client switches it on.":
    "ترى الشركة اسم العميل وحجوزاته وحالة عضويته. ويظهر العملاء الذين لم يشاركوا ملفهم الشخصي برقم عضوية. ولا تُشارَك البيانات الصحية أبدًا ما لم يفعّل العميل مشاركتها.", // note: lawyer must confirm
  "Your responsibilities as a business": "مسؤولياتك بوصفك شركة", // note: lawyer must confirm
  "Use client data only to run your services. Don't export it for unrelated marketing, and keep staff access to the people who need it.":
    "لا تستخدم بيانات العملاء إلّا لتقديم خدماتك. ولا تصدّرها لأغراض تسويقية لا صلة لها بذلك، واقصر وصول الموظفين إليها على من يحتاجون إليه.", // note: lawyer must confirm
  "Analytics for businesses": "التحليلات للشركات", // note: lawyer must confirm
  "Reports show counts and trends across your clients, not the private details of any one person.":
    "تعرض التقارير أعدادًا واتجاهات على مستوى عملائك، لا التفاصيل الخاصة بأيّ فرد.", // note: lawyer must confirm
  "Payment data": "بيانات الدفع", // note: lawyer must confirm
  "Whish handles payments. We keep the amount, method and status of each payment, never full card or account numbers.":
    "تتولّى Whish معالجة المدفوعات. ونحتفظ بمبلغ كلّ دفعة وطريقتها وحالتها، ولا نحتفظ أبدًا بأرقام البطاقات أو الحسابات كاملة.", // note: lawyer must confirm
  "Closing a business account": "إغلاق حساب الشركة", // note: lawyer must confirm
  "When a business account is closed, its listing and team access end at once. Business records are removed within the deletion period, except what the law requires us to keep.":
    "عند إغلاق حساب الشركة، تنتهي صفحتها ووصول فريقها فورًا. وتُزال سجلات الشركة خلال فترة الحذف، باستثناء ما يُلزمنا القانون بالاحتفاظ به.", // note: lawyer must confirm

  // == Business More › Close your business ==
  "Nothing is deleted. Members keep their records, receipts, bookings and reviews.": "لا يُحذف شيء. يحتفظ الأعضاء بسجلاتهم وإيصالاتهم وحجوزاتهم وتقييماتهم.",
  "No new bookings, sales, memberships, check-ins, staff invites or join requests.": "لا حجوزات ولا مبيعات ولا عضويات ولا تسجيلات حضور ولا دعوات موظفين ولا طلبات انضمام جديدة.",
  "Your business leaves Explore.": "يختفي نشاطك التجاري من «استكشف».",
  "There's no reopening. To stop for a while instead, deactivate it.": "لا يمكن إعادة الفتح. لتتوقف لفترة بدلًا من ذلك، أوقفه مؤقتًا.",
  "Close your business?": "إغلاق نشاطك التجاري؟",
  "Closing is for good. Here's what it means.": "الإغلاق نهائي. إليك ما يعنيه.",
  "Reason (optional)": "السبب (اختياري)",
  "For your records": "لسجلاتك",
  "Type {name} to confirm": "اكتب {name} للتأكيد",
  "You're offline. Connect to close your business.": "أنت غير متصل. اتصل بالإنترنت لإغلاق نشاطك التجاري.",
  "Closing…": "جارٍ الإغلاق…",
  "Close business for good": "إغلاق النشاط التجاري نهائيًا",

  // == Business More › Two-factor authentication ==
  "Sign-in method": "طريقة تسجيل الدخول",
  "Backup": "طريقة احتياطية", // note: the heading over Recovery codes (a backup way in), not a data backup
  "–– codes left": "–– رموز متبقية",
  "No codes yet": "لا رموز بعد",
  "{left} of {n} codes left": {
    zero: "تبقّى {left} من أصل {n} رمز",
    one: "تبقّى {left} من أصل رمز واحد",
    two: "تبقّى {left} من أصل رمزين",
    few: "تبقّى {left} من أصل {n} رموز",
    many: "تبقّى {left} من أصل {n} رمزًا",
    other: "تبقّى {left} من أصل {n} رمز",
  }, // note: the plural follows the set's size {n}; English keeps "codes" for every count, as before
  "View codes": "عرض الرموز",
  "Enter a code from your authenticator app to confirm. Anyone with your password could then sign in to your business.":
    "أدخل رمزًا من تطبيق المصادقة للتأكيد. بعدها سيتمكّن أي شخص يعرف كلمة مرورك من تسجيل الدخول إلى نشاطك التجاري.",
  "That code didn't match. Check your authenticator app and try the current code.": "لم يتطابق هذا الرمز. تحقّق من تطبيق المصادقة وجرّب الرمز الحالي.", // note: services/auth's sentence, matched here to show the frame's wording; if the services area also catalogues it, keep one Arabic
  "That code didn't work. Check the time on your phone and try the newest code.": "لم ينجح هذا الرمز. تحقّق من الوقت على هاتفك وجرّب أحدث رمز.",
  "Scan the code with your authenticator app, then enter the 6-digit code it shows.": "امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز المكوّن من 6 أرقام الذي يظهر.",
  "STEP 1 OF 2": "الخطوة 1 من 2", // note: upper case in English; Arabic has no case
  "Scan this code with your authenticator app.": "امسح هذا الرمز بتطبيق المصادقة.",
  "Setup key copied": "تم نسخ مفتاح الإعداد",
  "Next": "التالي",
  "STEP 2 OF 2": "الخطوة 2 من 2",
  "Enter the six-digit code your app shows.": "أدخل الرمز المكوّن من ستة أرقام الذي يعرضه تطبيقك.",
  "Each code works once if you lose your phone. Keep them somewhere safe.": "يعمل كل رمز مرة واحدة إن فقدت هاتفك. احتفظ بها في مكان آمن.",
  "Two-factor is on": "المصادقة الثنائية مفعّلة",
  "{left} of {n} codes left. Codes are only shown once, when they're made; generate new ones if you've lost them.": {
    zero: "تبقّى {left} من أصل {n} رمز. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
    one: "تبقّى {left} من أصل رمز واحد. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
    two: "تبقّى {left} من أصل رمزين. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
    few: "تبقّى {left} من أصل {n} رموز. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
    many: "تبقّى {left} من أصل {n} رمزًا. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
    other: "تبقّى {left} من أصل {n} رمز. لا تظهر الرموز إلا مرة واحدة عند إنشائها؛ أنشئ رموزًا جديدة إن فقدتها.",
  },
  "Save these codes. Each one signs you in once if you lose your phone.": "احفظ هذه الرموز. يتيح لك كل رمز تسجيل الدخول مرة واحدة إن فقدت هاتفك.",
  "Your recovery codes": "رموز الاسترداد الخاصة بك",
  "Copied": "تم النسخ",
  "Copy codes": "نسخ الرموز",
  "Download codes": "تنزيل الرموز",

  // == Settings › Two-factor › Recovery codes (card and page) ==
  "Couldn't read your recovery codes. If you lose your phone, contact support.": "تعذّرت قراءة رموز الاسترداد. إن فقدت هاتفك، تواصل مع الدعم.",
  "Hidden code": "رمز مخفي",
  "Copy all": "نسخ الكل",
  "Download": "تنزيل",
  "I’ve saved them": "حفظتها",

  // == Business More › Notifications ==
  "Choose what you're told about, and how.": "اختر ما نُعلمك به، وكيف.",
  "Loading notifications": "جارٍ تحميل الإشعارات",
  "Bookings": "الحجوزات",
  "New orders and returns": "الطلبات الجديدة والمرتجعات",
  "New bookings, cancellations and classes under 40% booked": "الحجوزات الجديدة والإلغاءات والحصص المحجوزة بأقل من 40%",
  "New members and renewals": "الأعضاء الجدد والتجديدات",
  "Join requests and substitute requests": "طلبات الانضمام وطلبات البدلاء",
  "Money owed, weekly summary": "المبالغ المستحقة، والملخص الأسبوعي",
  "Reputation": "السمعة",
  "Flagged reviews": "التقييمات المُبلَّغ عنها",
  "Always on for safety": "مفعّل دائمًا حفاظًا على السلامة",
  "How you're told": "طريقة إعلامك",
  "Push, email and quiet hours": "الإشعارات الفورية والبريد الإلكتروني وساعات الهدوء",
  "Allow notifications on this device": "السماح بالإشعارات على هذا الجهاز",

  // == Business More › Export reports ==
  "Transactions": "المعاملات",
  "Every order with products, date and status": "كل طلب مع منتجاته وتاريخه وحالته",
  "Join dates and order counts": "تواريخ الانضمام وعدد الطلبات",
  "Payments, refunds and methods": "المدفوعات والمبالغ المستردة وطرق الدفع",
  "Plans, join dates and status": "الخطط وتواريخ الانضمام والحالة",
  "{file} downloaded.": "تم تنزيل {file}.",
  "Export reports": "تصدير التقارير",
  "Download a spreadsheet of your data.": "نزّل بياناتك في جدول بيانات.",
  "Report|export": "التقرير", // note: "Report" as an exported document; the plain key "Report" is the report-abuse action («إبلاغ»)
  "Loading reports": "جارٍ تحميل التقارير",
  "Range": "الفترة",
  "Last 30 days": "آخر 30 يومًا",
  "This year": "هذا العام",
  "Custom range": "فترة مخصّصة",
  "Format": "الصيغة",
  "CSV (Excel, Google Sheets)": "CSV (Excel، Google Sheets)",
  "Download report": "تنزيل التقرير",

  // == Business More › Security ==
  "Browser": "المتصفح",
  "this device": "هذا الجهاز",
  "{browser} on {os}": "{browser} على {os}",
  "Keep your business account safe.": "حافظ على أمان حساب نشاطك التجاري.",
  "View": "عرض",
  "{left} of {n} left": {
    zero: "تبقّى {left} من {n}",
    one: "تبقّى {left} من {n}",
    two: "تبقّى {left} من {n}",
    few: "تبقّى {left} من {n}",
    many: "تبقّى {left} من {n}",
    other: "تبقّى {left} من {n}",
  },
  "Your other devices will be listed here soon.": "ستظهر أجهزتك الأخرى هنا قريبًا.",
  "{device} · this device": "{device} · هذا الجهاز",
  "Sign out everywhere else": "تسجيل الخروج من الأجهزة الأخرى",
  "Every other device has to sign in again": "سيتعيّن على كل جهاز آخر تسجيل الدخول مجددًا",
  "Sign out everywhere else?": "تسجيل الخروج من الأجهزة الأخرى؟",
  "Every other phone and browser signed in to this account is signed out. This device stays signed in.":
    "سيُسجَّل الخروج من كل هاتف ومتصفح آخر مسجّل الدخول إلى هذا الحساب. ويبقى هذا الجهاز مسجّل الدخول.",
  "Sign out others": "تسجيل خروج الآخرين",
  "Signed out everywhere else.": "تم تسجيل الخروج من الأجهزة الأخرى.",

  // == Business More › Deactivate or delete ==
  "Your business is active again.": "عاد نشاطك التجاري إلى العمل.",
  "Your business is deactivated.": "تم إيقاف نشاطك التجاري.",
  "Choose what happens to your business on Centium.": "اختر ما يحدث لنشاطك التجاري على Centium.",
  "Reason: {reason}": "السبب: {reason}",
  "Business closed": "النشاط التجاري مغلق",
  "Closed {date}. Nothing was deleted: members keep their records, receipts, bookings and reviews. It takes no new bookings, sales, memberships, check-ins, staff invites or join requests, and it isn't on Explore.":
    "أُغلق في {date}. لم يُحذف شيء: يحتفظ الأعضاء بسجلاتهم وإيصالاتهم وحجوزاتهم وتقييماتهم. لا يستقبل حجوزات أو مبيعات أو عضويات أو تسجيلات حضور أو دعوات موظفين أو طلبات انضمام جديدة، ولا يظهر في «استكشف».",
  "Deactivate": "إيقاف", // note: matches «إيقاف أو حذف» (Deactivate or delete) already in the catalogue
  "Reactivate": "إعادة التفعيل",
  "Reactivate business": "إعادة تفعيل النشاط التجاري",
  "Deactivate business": "إيقاف النشاط التجاري",
  "Deactivated {date}. New bookings and sales resume; turn Show on Explore back on to be listed.":
    "أُوقف في {date}. تُستأنف الحجوزات والمبيعات الجديدة؛ أعد تفعيل «الظهور في استكشف» لتظهر في القائمة.",
  "Deactivated {date}. {detail}": "أُوقف في {date}. {detail}",
  "Hide your listing and stop new bookings, sales, code redemptions and join requests. Members still check in and keep and renew their memberships, and you can still invite staff.":
    "أخفِ صفحتك وأوقف الحجوزات والمبيعات واستبدال الرموز وطلبات الانضمام الجديدة. يواصل الأعضاء تسجيل الحضور ويحتفظون بعضوياتهم ويجدّدونها، ويمكنك مواصلة دعوة الموظفين.",
  "Close business": "إغلاق النشاط التجاري",
  "For good: no new activity of any kind, and no reopening. Nothing is deleted.": "نهائيًا: لا نشاط جديد من أي نوع، ولا إعادة فتح. لا يُحذف شيء.",
  "Deletes your account after 30 days. Your business closes then; nothing in it is deleted, and members keep their records.":
    "يُحذف حسابك بعد 30 يومًا. يُغلق نشاطك التجاري حينها؛ لا يُحذف شيء منه، ويحتفظ الأعضاء بسجلاتهم.",
  "Reactivate {name}?": "إعادة تفعيل {name}؟",
  "Reactivate your business?": "إعادة تفعيل نشاطك التجاري؟",
  "Deactivate {name}?": "إيقاف {name}؟",
  "Deactivate your business?": "إيقاف نشاطك التجاري؟",
  "New bookings and sales open again. Your listing stays hidden until you turn Show on Explore back on.":
    "تُفتح الحجوزات والمبيعات الجديدة مجددًا. تبقى صفحتك مخفية حتى تعيد تفعيل «الظهور في استكشف».",
  "Your listing is hidden, and new bookings, sales, code redemptions and join requests stop. Members still check in and keep and renew their memberships, and you can still invite staff. You can reactivate at any time.":
    "تُخفى صفحتك، وتتوقف الحجوزات والمبيعات واستبدال الرموز وطلبات الانضمام الجديدة. يواصل الأعضاء تسجيل الحضور ويحتفظون بعضوياتهم ويجدّدونها، ويمكنك مواصلة دعوة الموظفين. يمكنك إعادة التفعيل في أي وقت.",
  "Your business is closed.": "تم إغلاق نشاطك التجاري.",
  "Only the owner can close the business.": "يمكن للمالك وحده إغلاق النشاط التجاري.", // note: services/business-closure's CLOSE_OWNER_ONLY, translated at display here; if the services area catalogues it too, keep one Arabic
  "Only the owner can deactivate or reactivate the business.": "يمكن للمالك وحده إيقاف النشاط التجاري أو إعادة تفعيله.", // note: services/business-more's PAUSE_OWNER_ONLY, translated at display here; same as above

  // == Settings › Business terms and waivers ==
  "Centium business terms": "شروط Centium للأنشطة التجارية",
  "The terms for business accounts": "الشروط الخاصة بحسابات الأنشطة التجارية",
  "Your liability waiver": "إقرار إخلاء المسؤولية الخاص بك",
  "Your class terms": "شروط حصصك",
  "Your house rules": "قواعد ناديك", // note: shown to gyms only
  "Your returns policy": "سياسة الإرجاع لديك",
  "Your appointment waiver": "إقرار المواعيد الخاص بك",
  "Your policies and waivers are yours. Centium shows them to clients before they book or buy.": "سياساتك وإقراراتك خاصة بك. يعرضها Centium على العملاء قبل أن يحجزوا أو يشتروا.",
};

export default shared;
