import type { Catalogue } from "../core";

// Round G (EH3b), Arabic: Community (forum), courses, a professional's forms
// and reminders on Home, and booking appointments.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area
// file, and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/community/Community.tsx",
  "components/forum/age.ts",
  "components/forum/categoryColour.ts",
  "components/forum/forumColor.ts",
  "components/forum/ForumCompose.tsx",
  "components/forum/ForumHome.tsx",
  "components/forum/ForumPostView.tsx",
  "components/forum/ForumSafetySheet.tsx",
  "components/forum/NicknameScreen.tsx",
  "components/forum/OwnPostSheet.tsx",
  "components/forum/parts.tsx",
  "components/forum/useForumMe.ts",
  "components/forum/WarningNotice.tsx",
  "components/courses/author/CourseBuilder.tsx",
  "components/courses/author/MyCourses.tsx",
  "components/courses/certificates/certificateDate.ts",
  "components/courses/courseCover.ts",
  "components/courses/CourseDetailView.tsx",
  "components/courses/courseParts.tsx",
  "components/courses/CoursesCatalogue.tsx",
  "components/courses/drip.ts",
  "components/courses/LessonMarkdown.tsx",
  "components/courses/LessonView.tsx",
  "pages/courses/PublicCertificate.tsx",
  "services/courses/rules.ts",
  "components/client-forms/copy.ts",
  "components/client-forms/FormSheet.tsx",
  "components/client-forms/parts.tsx",
  "components/client-forms/ProfileProposals.tsx",
  "components/client-forms/ProReminders.tsx",
  "components/client-forms/ReferralSheet.tsx",
  "components/client-forms/ReminderCard.tsx",
  "components/client-forms/ReminderPopup.tsx",
  "components/client-forms/tone.ts",
  "services/client-forms/logic.ts",
  "services/client-forms/index.ts",
  "pages/appointments/AppointmentRoutes.tsx",
  "pages/appointments/BookAppointmentPage.tsx",
  "pages/appointments/MyAppointmentsPage.tsx",
  "pages/appointments/useAppointmentBooking.ts",
];

// note (whole file): a forum post «منشور» and a reply «رد»; a nickname «اسم
// مستعار»; moderators «المشرفون»; withdraw (your own post) «سحب»; report
// «الإبلاغ عن»; a course «دورة» (feminine: «منشورة»، «جديدة»), a lesson «درس»,
// a quiz «اختبار», the full course «الدورة الكاملة», a learner «متعلم»; a
// professional's check-in «متابعة» (Round F findings B) and form «نموذج», an
// intake «نموذج البداية»; a referral «إحالة»; an appointment «موعد», free
// times «الأوقات المتاحة». The forum's short ages ("2h", "3d") read «2 س»
// and «3 ي», as the business catalogue's "{n} h" / "{n} d". User content
// (posts, course and lesson text, form questions, names) stays as written.
const community: Catalogue = {
  // == Forum · list ==
  "{n}m": "{n} د",
  "{n}h": "{n} س",
  "{n}d": "{n} ي",
  "Pinned · {age}": "مثبّت · {age}",
  "{age} ago": "منذ {age}",
  "Couldn't load the forum.": "تعذّر تحميل المنتدى.",
  "Couldn't load the forum. Check your connection and try again.": "تعذّر تحميل المنتدى. تحقّق من اتصالك وحاول مرة أخرى.",
  "New post": "منشور جديد",
  "New Post": "منشور جديد",
  "Your nickname:": "اسمك المستعار:",
  "You choose nickname or name each time you post.": "تختار الاسم المستعار أو اسمك في كل مرة تنشر فيها.",
  "Community rules:": "قواعد المجتمع:",
  // note: health wording (not medical advice; not a substitute for a doctor), as the English.
  "Be kind, share experience rather than medical advice, and report anything that worries you. Posts here aren't a substitute for a doctor.": "كن لطيفًا، وشارك تجربتك بدلًا من النصائح الطبية، وأبلغ عن أي شيء يقلقك. المنشورات هنا لا تغني عن الطبيب.",
  "Your post, waiting for review": "منشورك، بانتظار المراجعة",
  "No posts here yet": "لا منشورات هنا بعد",
  "Start the conversation.": "ابدأ النقاش.",
  "You post under your name and title. Clients post under a nickname.": "تنشر باسمك ولقبك المهني. ينشر العملاء باسم مستعار.",
  "Load older posts": "تحميل المنشورات الأقدم",
  "Loading older posts…": "جارٍ تحميل المنشورات الأقدم…",
  "Withdraw post": "سحب المنشور",
  "Withdraw reply": "سحب الرد",
  "Report post": "الإبلاغ عن المنشور",
  "Report reply": "الإبلاغ عن الرد",
  "Post options": "خيارات المنشور",
  "Like": "إعجاب",
  "Unlike": "إلغاء الإعجاب",
  "Like reply": "الإعجاب بالرد",
  "Unlike reply": "إلغاء الإعجاب بالرد",
  "{n} replies": { zero: "لا ردود", one: "ردّ واحد", two: "ردّان", few: "{n} ردود", many: "{n} ردًّا", other: "{n} ردّ" },
  "{n} likes": { zero: "لا إعجابات", one: "إعجاب واحد", two: "إعجابان", few: "{n} إعجابات", many: "{n} إعجابًا", other: "{n} إعجاب" },

  // == Forum · post ==
  "It can't be empty.": "لا يمكن أن يكون فارغًا.",
  "Post": "منشور",
  "This post isn't available.": "هذا المنشور غير متاح.",
  "Pinned|post": "مثبّت",
  "edited|forum reply": "معدَّل",
  "Photo attached to the post": "صورة مرفقة بالمنشور",
  "Likes": { zero: "إعجاب", one: "إعجاب", two: "إعجابان", few: "إعجابات", many: "إعجابًا", other: "إعجاب" },
  "Replies": { zero: "رد", one: "رد", two: "ردّان", few: "ردود", many: "ردًا", other: "رد" },
  "Reply as": "الرد باسم",
  "Reply as {name}": "الرد باسم {name}",
  "This post isn't taking new replies.": "لا يقبل هذا المنشور ردودًا جديدة.",
  "Your nickname": "اسمك المستعار",
  "Your first name": "اسمك الأول",
  "{n} minutes left to edit": { zero: "لم تبقَ دقائق للتعديل", one: "بقيت دقيقة واحدة للتعديل", two: "بقيت دقيقتان للتعديل", few: "بقيت {n} دقائق للتعديل", many: "بقيت {n} دقيقة للتعديل", other: "بقيت {n} دقيقة للتعديل" },
  "Editable for 30 minutes after posting": "قابل للتعديل لمدة 30 دقيقة بعد النشر",

  // == Forum · new post ==
  "Give your post a title of at least 3 characters.": "اكتب لمنشورك عنوانًا من 3 أحرف على الأقل.",
  "Write something in your post.": "اكتب شيئًا في منشورك.",
  "Post to forum": "النشر في المنتدى",
  "Post as": "النشر باسم",
  "Nobody can see who is behind your nickname. You can't change this after posting.": "لا أحد يستطيع معرفة من وراء اسمك المستعار. لا يمكنك تغيير هذا بعد النشر.",
  "Category: {name}": "الفئة: {name}",
  "none": "لا شيء",
  "What's on your mind?": "بماذا تفكّر؟",
  "Share a win, ask a question, or pass on a tip…": "شارك إنجازًا، أو اطرح سؤالًا، أو قدّم نصيحة…",
  "The photo you're adding": "الصورة التي تضيفها",
  "Preparing photo…": "جارٍ تجهيز الصورة…",
  "Add a photo (optional)": "إضافة صورة (اختياري)",
  "Location and camera details are removed from photos before they're shared.": "تُزال تفاصيل الموقع والكاميرا من الصور قبل مشاركتها.",
  "Posting as": "تنشر باسم",
  "Posts with links are checked by a moderator before they appear. Photos are checked by our team first, usually within a day.": "يراجع أحد المشرفين المنشورات التي تحتوي على روابط قبل ظهورها. ويراجع فريقنا الصور أولًا، عادةً خلال يوم.",

  // == Forum · held and removed posts ==
  "Post removed by a moderator": "أزال أحد المشرفين هذا المنشور",
  "Reply removed by a moderator": "أزال أحد المشرفين هذا الرد",
  "Only you can see this for now.": "أنت وحدك ترى هذا حاليًا.",
  // note: gentle self-harm support line (safety wording).
  "If you're going through something hard, you don't have to face it alone.": "إذا كنت تمر بشيء صعب، فلست مضطرًا لمواجهته وحدك.",
  // note: safety wording, as the Round F findings (A5): «اطلب الدعم».
  "Get support": "اطلب الدعم",
  "Only you can see this until our team checks it.": "أنت وحدك ترى هذا إلى أن يراجعه فريقنا.",

  // == Forum · nickname ==
  "Choose a forum nickname": "اختر اسمًا مستعارًا للمنتدى",
  "Each time you post, you choose whether to use this nickname or your first name. Nobody in the community can see who is behind your nickname.": "في كل مرة تنشر فيها، تختار استخدام هذا الاسم المستعار أو اسمك الأول. لا أحد في المجتمع يستطيع معرفة من وراء اسمك المستعار.",
  "Nickname": "الاسم المستعار",
  "3 to 20 letters, numbers or underscores": "من 3 إلى 20 حرفًا أو رقمًا أو شرطة سفلية",
  "Not your real name, and not a name that sounds official, like \"Doctor\" or \"Support\"": "ليس اسمك الحقيقي، ولا اسمًا يبدو رسميًا مثل «Doctor» أو «Support»",
  "You can change it once every 30 days, from the forum or Profile › Credentials": "يمكنك تغييره مرة كل 30 يومًا، من المنتدى أو من الملف الشخصي › المؤهلات",

  // == Forum · report, block and withdraw ==
  "Report this post": "الإبلاغ عن هذا المنشور",
  "Report this reply": "الإبلاغ عن هذا الرد",
  "A moderator will review it. The author won't be told who reported it.": "سيراجعه أحد المشرفين. لن يُبلَّغ الكاتب بمن أبلغ عنه.",
  "Report sent. Thank you.": "أُرسل البلاغ. شكرًا لك.",
  "Blocking hides their posts and replies from you, and yours from them, here and in messages.": "الحظر يخفي منشوراته وردوده عنك، ومنشوراتك عنه، هنا وفي الرسائل.",
  "Withdraw this post?": "سحب هذا المنشور؟",
  "Withdraw this reply?": "سحب هذا الرد؟",
  "It will disappear for everyone. This can't be undone.": "سيختفي لدى الجميع. لا يمكن التراجع عن ذلك.",
  "A message from the moderators": "رسالة من المشرفين",
  "I understand": "فهمت",
  // The report reasons (services/forum/rules.ts FORUM_REPORT_REASONS, shown through t()).
  // note: health wording (unsafe health advice).
  "Harmful or unsafe health advice": "نصائح صحية ضارة أو غير آمنة",
  "Harassment or bullying": "تحرّش أو تنمّر",
  "Pretending to be someone else": "انتحال شخصية شخص آخر",

  // == Community page ==
  "Answer questions from clients and colleagues, or teach a course": "أجب عن أسئلة العملاء والزملاء، أو قدّم دورة",
  "Discuss with other clients, or learn from a course": "ناقش مع العملاء الآخرين، أو تعلّم من دورة",
  Forum: "المنتدى",
  Courses: "الدورات",
  // services/forum/rules.ts and services/courses/rules.ts access lines, shown through t().
  "The community is for adults. You can join the forum from age 18.": "المجتمع مخصص للبالغين. يمكنك الانضمام إلى المنتدى من سن 18.",
  "Add your date of birth in Profile to join the forum.": "أضف تاريخ ميلادك في الملف الشخصي لتنضم إلى المنتدى.",
  "Add your date of birth in Profile to see courses.": "أضف تاريخ ميلادك في الملف الشخصي لترى الدورات.",
  "The community is for adults. You can take courses from age 18.": "المجتمع مخصص للبالغين. يمكنك متابعة الدورات من سن 18.",

  // == Courses · catalogue and cards ==
  "By {name}": "تقديم {name}",
  "New|course": "جديدة",
  "All levels": "كل المستويات",
  "about 1 hour a week": "نحو ساعة في الأسبوع",
  "about {n} hours a week": "نحو {n} ساعات في الأسبوع",
  "{n} videos": { zero: "لا فيديوهات", one: "فيديو واحد", two: "فيديوهان", few: "{n} فيديوهات", many: "{n} فيديو", other: "{n} فيديو" },
  "{n} quizzes": { zero: "لا اختبارات", one: "اختبار واحد", two: "اختباران", few: "{n} اختبارات", many: "{n} اختبارًا", other: "{n} اختبار" },
  "{n} PDFs": { zero: "لا ملفات PDF", one: "ملف PDF واحد", two: "ملفا PDF", few: "{n} ملفات PDF", many: "{n} ملف PDF", other: "{n} ملف PDF" },
  "{n} images": { zero: "لا صور", one: "صورة واحدة", two: "صورتان", few: "{n} صور", many: "{n} صورة", other: "{n} صورة" },
  "{n} check-ins": { zero: "لا متابعات", one: "متابعة واحدة", two: "متابعتان", few: "{n} متابعات", many: "{n} متابعة", other: "{n} متابعة" },
  "{n} learners": { zero: "لا متعلمين", one: "متعلم واحد", two: "متعلمان", few: "{n} متعلمين", many: "{n} متعلمًا", other: "{n} متعلم" },
  "Paid courses open soon.": "الدورات المدفوعة متاحة قريبًا.",
  "Courses are for members aged 18 and over.": "الدورات مخصصة للأعضاء من سن 18 فما فوق.",
  "Quizzes are part of the full course.": "الاختبارات جزء من الدورة الكاملة.",
  "Downloadable plans are part of the full course.": "الخطط القابلة للتنزيل جزء من الدورة الكاملة.",
  "Questions to the professional are part of the full course.": "الأسئلة الموجّهة إلى المختص جزء من الدورة الكاملة.",
  "This course is only open to the people its author chose.": "هذه الدورة متاحة فقط للأشخاص الذين اختارهم صاحبها.",
  "Start the course first, then try again.": "ابدأ الدورة أولًا، ثم حاول مرة أخرى.",
  "Start the course before rating it.": "ابدأ الدورة قبل تقييمها.",
  "That course isn't available any more.": "لم تعد هذه الدورة متاحة.",
  "Write an answer of up to 4,000 characters.": "اكتب إجابة لا تتجاوز 4,000 حرف.",
  "You've asked a lot of questions today. Try again tomorrow.": "طرحت أسئلة كثيرة اليوم. حاول مرة أخرى غدًا.",
  "That's too many in a short time. Try again later.": "هذا كثير خلال وقت قصير. حاول مرة أخرى لاحقًا.",

  // == Courses · course page ==
  "This course isn't available.": "هذه الدورة غير متاحة.",
  "Your free start couldn't be switched to the full course yet. Try again later.": "تعذّر تحويل بدايتك المجانية إلى الدورة الكاملة بعد. حاول مرة أخرى لاحقًا.",
  "No ratings yet": "لا تقييمات بعد",
  "Focus: {focus}": "المحور: {focus}",
  "What you'll learn": "ما ستتعلّمه",
  Syllabus: "المنهج",
  "All {n} weeks": "كل الأسابيع ({n})",
  "{n} more weeks": { zero: "لا أسابيع أخرى", one: "أسبوع آخر", two: "أسبوعان آخران", few: "{n} أسابيع أخرى", many: "{n} أسبوعًا آخر", other: "{n} أسبوع آخر" },
  "Choose how to take it": "اختر طريقة متابعتها",
  "Watch free": "المشاهدة مجانًا",
  "All video lessons and readings": "كل دروس الفيديو والقراءات",
  "Full course · {price}": "الدورة الكاملة · {price}",
  "Adds quizzes, PDFs and a certificate": "تضيف الاختبارات وملفات PDF وشهادة",
  "Starting…": "جارٍ البدء…",
  "Continue watching free": "متابعة المشاهدة مجانًا",
  "Start watching free": "بدء المشاهدة مجانًا",
  // note: health wording (general guidance, not personal medical advice), as the English.
  "Reviewed by Centium before publishing. Courses share general guidance, not personal medical advice. A certificate of completion is not a professional qualification.": "يراجع Centium الدورات قبل نشرها. تقدّم الدورات إرشادات عامة، لا نصائح طبية شخصية. وشهادة الإتمام ليست مؤهلًا مهنيًا.",
  "Open your course": "فتح دورتك",
  "Continue the course": "متابعة الدورة",
  "Start the course": "بدء الدورة",
  "Get the full course": "الحصول على الدورة الكاملة",
  "{done} of {n} lessons": { zero: "{done} من {n} درس", one: "{done} من درس واحد", two: "{done} من درسين", few: "{done} من {n} دروس", many: "{done} من {n} درسًا", other: "{done} من {n} درس" },
  "{weekday}, {date}": "{weekday}، {date}",
  "{author} opens a week at a time. Week {week} opens {when}.": "يفتح {author} أسبوعًا في كل مرة. يُفتح الأسبوع {week} يوم {when}.",
  "Week {week} opens {weekday}, {date}. {author} opens a week at a time.": "يُفتح الأسبوع {week} يوم {weekday}، {date}. يفتح {author} أسبوعًا في كل مرة.",
  "Write at least a few words.": "اكتب بضع كلمات على الأقل.",
  "Questions to {name}": "أسئلة إلى {name}",
  "Ask a question about the course": "اطرح سؤالًا عن الدورة",
  "Ask {name} a question": "اطرح سؤالًا على {name}",
  "Questions and answers are shared with everyone taking the full course. Your name isn't shown.": "تُشارَك الأسئلة والأجوبة مع كل من يتابع الدورة الكاملة. لا يظهر اسمك.",
  Ask: "طرح السؤال",
  "No questions yet.": "لا أسئلة بعد.",
  "Rate this course": "تقييم هذه الدورة",
  "Rating saved": "تم حفظ التقييم",
  "Thanks, your rating is saved.": "شكرًا، تم حفظ تقييمك.",
  "Save rating": "حفظ التقييم",
  "Add a few words (optional)": "أضف بضع كلمات (اختياري)",

  // == Courses · lesson ==
  "the professional": "المختص",
  "Back to course": "العودة إلى الدورة",
  "This lesson isn't open yet.": "هذا الدرس غير مفتوح بعد.",
  "This lesson isn't available.": "هذا الدرس غير متاح.",
  "Week {week} · Lesson {n} of {total}": "الأسبوع {week} · الدرس {n} من {total}",
  "Mark as complete": "تحديد كمكتمل",
  "This week": "هذا الأسبوع",
  "Full course": "الدورة الكاملة",
  "Get more from this course": "احصل على المزيد من هذه الدورة",
  "Quizzes, printable plans, questions answered by {name} and a certificate when you finish.": "اختبارات وخطط قابلة للطباعة وأسئلة يجيب عنها {name} وشهادة عند الانتهاء.",
  "Get the full course · {price}": "الحصول على الدورة الكاملة · {price}",
  "Download the PDF": "تنزيل ملف PDF",
  "Answer every question first.": "أجب عن كل الأسئلة أولًا.",
  "Pass mark {n}%": "علامة النجاح {n}%",
  "your best {score}%, passed": "أفضل نتيجة لك {score}%، ناجح",
  "your best {score}%": "أفضل نتيجة لك {score}%",
  "Question {n}": "السؤال {n}",
  "Passed with {score}%.": "نجحت بنتيجة {score}%.",
  "{score}%. You need {n}% to pass. Have another go.": "{score}%. تحتاج إلى {n}% للنجاح. حاول مرة أخرى.",
  "Check my answers": "التحقق من إجاباتي",
  "The image isn't ready yet.": "الصورة ليست جاهزة بعد.",
  "Start the course to see this image.": "ابدأ الدورة لترى هذه الصورة.",
  "Keep your answer to {n} characters.": "اجعل إجابتك في حدود {n} حرف.",
  "Start the course to answer.": "ابدأ الدورة لتجيب.",
  "Your answer": "إجابتك",
  "Only {name} sees your answer.": "لا يرى إجابتك إلا {name}.",
  "You answered. Only {name} sees it.": "أجبت. لا يراها إلا {name}.",
  "Change my answer": "تغيير إجابتي",

  // == Courses · your courses (professionals) ==
  "Your courses": "دوراتك",
  "In Community › Courses, under your name": "في المجتمع › الدورات، باسمك",
  "Courses are written by verified professionals": "يكتب الدورات مختصون موثَّقون",
  "Add your licence in Profile and we'll verify it. Once it's verified you can write and publish courses here.": "أضف ترخيصك في الملف الشخصي وسنتحقق منه. بعد التحقق منه يمكنك كتابة الدورات ونشرها هنا.",
  "Go to Profile": "الانتقال إلى الملف الشخصي",
  "No courses yet": "لا دورات بعد",
  "A course is weeks of lessons: videos, readings, PDFs and quizzes. It stays a draft until you publish it.": "الدورة أسابيع من الدروس: فيديوهات وقراءات وملفات PDF واختبارات. تبقى مسودة إلى أن تنشرها.",
  "Create a course": "إنشاء دورة",
  "Create course": "إنشاء دورة",
  "No published courses": "لا دورات منشورة",
  "No drafts courses": "لا مسودات دورات",
  "No archived courses": "لا دورات مؤرشفة",
  "Archived courses are hidden from new clients. Anyone enrolled keeps access.": "الدورات المؤرشفة مخفية عن العملاء الجدد. يحتفظ المسجلون فيها بإمكانية الوصول.",
  "{title} is with Centium for review.": "«{title}» قيد المراجعة لدى Centium.",
  "Saved as a draft.": "حُفظت كمسودة.",
  published: "منشورة",
  "{n} enrolled": "{n} مسجّل",
  "{n} took it": { zero: "لم يتابعها أحد", one: "تابعها شخص واحد", two: "تابعها شخصان", few: "تابعها {n} أشخاص", many: "تابعها {n} شخصًا", other: "تابعها {n} شخص" },
  "Unpublished {date}": "أُلغي نشرها في {date}",
  "Submitted {date}": "أُرسلت في {date}",
  // components/pro/courses/courseModel.ts COURSE_TABS and statusLabel, shown through t() here.
  Drafts: "المسودات",
  "Changes requested": "مطلوب تعديلات",
  Unpublished: "أُلغي نشرها",

  // == Courses · public certificate ==
  "A certificate of completion, not a professional qualification.": "شهادة إتمام، وليست مؤهلًا مهنيًا.",
  "Certificate · Centium": "الشهادة · Centium",
  "We couldn't find that certificate": "لم نتمكن من العثور على هذه الشهادة",
  "Check the link and try again.": "تحقّق من الرابط وحاول مرة أخرى.",
  "This certifies that": "نشهد بأنّ",
  "completed|certificate": "أتمّ",
  "Taught by": "قدّمها",
  "The professional who taught this course has since closed their account.": "أغلق المختص الذي قدّم هذه الدورة حسابه منذ ذلك الحين.",
  Serial: "الرقم التسلسلي",

  // == Courses · catalogue ==
  "Search courses": "البحث في الدورات",
  "Course categories": "فئات الدورات",
  "Continue learning": "متابعة التعلّم",
  "Week {week} · Lesson {n}: {title}": "الأسبوع {week} · الدرس {n}: {title}",
  "{n}% complete": "مكتمل بنسبة {n}%",
  Popular: "الأكثر رواجًا",
  "Write a course": "كتابة دورة",
  "No courses match": "لا دورات مطابقة",
  "Try another category or search.": "جرّب فئة أو بحثًا آخر.",
  "Check back soon.": "عُد قريبًا.",

  // == Client forms · a form or check-in ==
  // note: health wording (talk to a doctor), the eh-health check-in's own Arabic.
  "It may help to talk to a doctor about how you've been feeling.": "قد يفيدك أن تتحدث مع طبيب عن شعورك في الفترة الأخيرة.",
  "See warning signs": "عرض العلامات التحذيرية",
  // note: consent line; "check-in" is «متابعة» (Round F findings B), a form «نموذج».
  "Your answers go to {pro} when you send. {pro} sees them with this check-in only.": "تصل إجاباتك إلى {pro} عند الإرسال. يراها {pro} مع هذه المتابعة فقط.",
  "Your answers go to {pro} when you send. {pro} sees your photos and measurements with this check-in only.": "تصل إجاباتك إلى {pro} عند الإرسال. يرى {pro} صورك وقياساتك مع هذه المتابعة فقط.",
  "Your answers go to {pro} when you send. {pro} sees them with this form only.": "تصل إجاباتك إلى {pro} عند الإرسال. يراها {pro} مع هذا النموذج فقط.",
  "Your answers go to {pro} when you send. {pro} sees your photos and measurements with this form only.": "تصل إجاباتك إلى {pro} عند الإرسال. يرى {pro} صورك وقياساتك مع هذا النموذج فقط.",
  "Share these answers with {pro}": "مشاركة هذه الإجابات مع {pro}",
  // note: support prompt (safety wording).
  "If things are hard right now, you can talk to someone. Only you see this.": "إذا كانت الأمور صعبة الآن، يمكنك التحدث مع أحد. أنت وحدك ترى هذا.",
  "Thanks. {pro} will review it.": "شكرًا. سيراجعه {pro}.",
  "Check-in sent": "أُرسلت المتابعة",
  "Form sent": "أُرسل النموذج",
  "Weekly check-in": "المتابعة الأسبوعية",
  saved: "محفوظ",
  saving: "جارٍ الحفظ",
  "not saved yet": "لم يُحفظ بعد",
  "For {name}": "إلى {name}",
  "section {n} of {total}": "القسم {n} من {total}",
  "part {n} of {total}": "الجزء {n} من {total}",
  "(optional)": "(اختياري)",
  "{n} of {max}": "{n} من {max}",
  // note: emergency call button (Lebanon: 140 or 112), safety wording.
  "Call {n}": "اتصل بـ{n}",
  "This week's measurements": "قياسات هذا الأسبوع",
  "Your measurements": "قياساتك",
  "Send to {name}": "الإرسال إلى {name}",
  Submit: "إرسال",
  "Next check-in: {date}": "المتابعة التالية: {date}",
  "Nothing to answer here. You can send it as it is.": "لا شيء للإجابة عنه هنا. يمكنك إرساله كما هو.",
  "Add your {name} measurement to continue": "أضف قياس {name} للمتابعة",
  "Add a photo to continue": "أضف صورة للمتابعة",
  "Answer this question to continue": "أجب عن هذا السؤال للمتابعة",
  "Tick the box to share these answers before you send them.": "حدّد المربع لمشاركة هذه الإجابات قبل إرسالها.",
  "This form has already been sent.": "أُرسل هذا النموذج بالفعل.",
  "This form isn't open any more.": "لم يعد هذا النموذج مفتوحًا.",
  "Some required answers are missing.": "بعض الإجابات المطلوبة ناقصة.",
  "Couldn't save your answers. Try again.": "تعذّر حفظ إجاباتك. حاول مرة أخرى.",
  "Couldn't add that photo. Use a JPEG, PNG or HEIC under 10 MB.": "تعذّرت إضافة هذه الصورة. استخدم JPEG أو PNG أو HEIC أصغر من 10 ميغابايت.",

  // == Client forms · add these to your profile ==
  "Couldn't load the answers you can add to your profile.": "تعذّر تحميل الإجابات التي يمكنك إضافتها إلى ملفك الشخصي.",
  "Add these to your profile?": "إضافة هذه إلى ملفك الشخصي؟",
  "From your form answers.": "من إجاباتك في النموذج.",
  "From your answers.": "من إجاباتك.",
  "Check each one, change it if you need to, and add only what you want.": "راجع كل واحدة، وغيّرها إن احتجت، وأضف ما تريده فقط.",
  "Your answer to \"{prompt}\"": "إجابتك عن «{prompt}»",
  "Added to your profile.": "أُضيفت إلى ملفك الشخصي.",
  "Not added.": "لم تُضف.",
  "Add to my profile": "إضافة إلى ملفي الشخصي",
  // note: health record fields (allergy, medication, injury), neutral labels.
  Allergen: "مسبّب الحساسية",
  "Choose…": "اختر…",
  "How severe": "مدى الشدة",
  "Note (optional)": "ملاحظة (اختياري)",
  Diet: "النظام الغذائي",
  "Is it": "هل هو",
  "Something I must avoid": "شيء يجب أن أتجنّبه",
  "A preference": "تفضيل",
  "Dose (optional)": "الجرعة (اختياري)",
  "e.g. 500 mg": "مثل: 500 mg",
  "How you take it": "طريقة تناوله",
  Injury: "إصابة",
  "Body area (optional)": "منطقة الجسم (اختياري)",
  "e.g. Left knee": "مثل: الركبة اليسرى",
  "Since (optional)": "منذ (اختياري)",
  "Weight (kg)": "الوزن (kg)",
  // services/client-forms/proposals.ts FIELD_LABEL and MEDICATION_ROUTES, shown through t() (eh-health's Arabic).
  Allergy: "حساسية",
  Medication: "دواء",
  Oral: "عن طريق الفم",
  Injectable: "حقن",
  Topical: "موضعي",
  Inhaled: "استنشاق",
  "Weight isn't added while recovery-sensitive mode is on.": "لا يُضاف الوزن عندما يكون الوضع المراعي للتعافي مفعّلًا.",
  "You already decided this one.": "سبق أن قرّرت بشأن هذه.",
  "This isn't available any more.": "لم يعد هذا متاحًا.",
  "Check the details and try again.": "تحقّق من التفاصيل وحاول مرة أخرى.",
  "Couldn't add it. Try again.": "تعذّرت إضافتها. حاول مرة أخرى.",
  "Couldn't skip it. Try again.": "تعذّر تخطّيها. حاول مرة أخرى.",

  // == Client forms · reminders from your professional ==
  "{n} from {name}": "{n} من {name}",
  "Most urgent first. Anything you skip stays here.": "الأكثر إلحاحًا أولًا. ما تتخطّاه يبقى هنا.",
  "{note} One more from {name}.": "{note} وواحد آخر من {name}.",
  "This request was already answered.": "تم الرد على هذا الطلب مسبقًا.",
  "{service} · Today {time}.": "{service} · اليوم {time}.",
  "Session noted.": "سُجّلت الجلسة.",
  "You're offline. Updates from your professional show when you're back online.": "أنت غير متصل. تظهر تحديثات مختصك عندما تعود متصلًا.",
  "Couldn't load updates from your professional.": "تعذّر تحميل تحديثات مختصك.",
  "Thanks. {name}'s referral is on its way.": "شكرًا. إحالة {name} في طريقها.",
  "Referral declined.": "رُفضت الإحالة.",
  "You're connected with {name}.": "أنت الآن متصل بـ{name}.",
  "You're connected.": "أنت الآن متصل.",
  "Was due {when} {time}": "كان مستحقًا {when} {time}",
  "Due {when} {time}": "مستحق {when} {time}",
  "due {time}": "مستحق {time}",
  "due {when} {time}": "مستحق {when} {time}",
  "{n} minutes": { zero: "{n} دقيقة", one: "دقيقة واحدة", two: "دقيقتان", few: "{n} دقائق", many: "{n} دقيقة", other: "{n} دقيقة" },
  "Session with {name} now": "جلسة مع {name} الآن",
  "Session with {name} in {n} min": "جلسة مع {name} بعد {n} دقيقة",
  "Session with {name} at {time}": "جلسة مع {name} الساعة {time}",
  "Finish your intake for {name}": "أكمل نموذج البداية لـ{name}",
  "{done} of {total} done · saved": "تم {done} من {total} · محفوظ",
  "Your intake for {name}": "نموذج البداية لـ{name}",
  "{n} questions": { zero: "لا أسئلة", one: "سؤال واحد", two: "سؤالان", few: "{n} أسئلة", many: "{n} سؤالًا", other: "{n} سؤال" },
  "Section {n} of {total}": "القسم {n} من {total}",
  "Part {n} of {total}": "الجزء {n} من {total}",
  "{done} of {total} done": "تم {done} من {total}",
  "Continue your check-in": "تابع متابعتك",
  "{weekday} check-in is due": "متابعة {weekday} مستحقة",
  "Your check-in is ready": "متابعتك جاهزة",
  "Today {time} · {service}": "اليوم {time} · {service}",

  // == Client forms · referrals ==
  "{from} wants to refer you to {to}": "يريد {from} إحالتك إلى {to}",
  "{from} wants to refer you": "يريد {from} إحالتك",
  "If you agree, {to} gets {from}'s referral and the reason for it. Nothing else is shared.": "إذا وافقت، يحصل {to} على إحالة {from} وسببها. لا يُشارَك أي شيء آخر.",
  "To another professional. If you agree, they get {from}'s referral and the reason for it. Nothing else is shared.": "إلى مختص آخر. إذا وافقت، يحصل على إحالة {from} وسببها. لا يُشارَك أي شيء آخر.",
  "{to} accepted {from}'s referral": "قبل {to} إحالة {from}",
  "Your referral from {from} was accepted": "قُبلت إحالتك من {from}",
  "Connect to become {name}'s client. You choose what {name} can see. Nothing is shared until you do.": "تواصل لتصبح عميلًا لـ{name}. أنت تختار ما يمكن أن يراه {name}. لا يُشارَك شيء حتى تفعل ذلك.",
  "Connect to become their client. You choose what they can see. Nothing is shared until you do.": "تواصل لتصبح عميلًا له. أنت تختار ما يمكن أن يراه. لا يُشارَك شيء حتى تفعل ذلك.",
  "Connect and choose what to share": "التواصل واختيار ما تشاركه",
  "Agree and share": "الموافقة والمشاركة",
  "What {name} can see": "ما يمكن أن يراه {name}",
  "What they can see": "ما يمكن أن يراه",
  "You can change these any time from your professional's sharing settings.": "يمكنك تغيير هذه في أي وقت من إعدادات المشاركة مع مختصك.",
  "This referral isn't waiting for your answer any more.": "لم تعد هذه الإحالة بانتظار إجابتك.",
  "This referral can't be used to connect any more.": "لم يعد بالإمكان استخدام هذه الإحالة للتواصل.",
  "Couldn't connect. Try again.": "تعذّر التواصل. حاول مرة أخرى.",

  // == Appointments · book ==
  "Couldn't book. Try again.": "تعذّر الحجز. حاول مرة أخرى.",
  "Booking is coming soon.": "الحجز قريبًا.",
  "Loading services": "جارٍ تحميل الخدمات",
  "Couldn't load this place's services.": "تعذّر تحميل خدمات هذا المكان.",
  "Not found": "غير موجود",
  "This place may not be on Explore right now.": "قد لا يكون هذا المكان في الاستكشاف حاليًا.",
  "No services to book yet": "لا خدمات للحجز بعد",
  "When this place adds its services and free times, you can book them here.": "عندما يضيف هذا المكان خدماته وأوقاته المتاحة، يمكنك حجزها هنا.",
  "Booking appointments is coming soon.": "حجز المواعيد قريبًا.",
  "Free times · {day}": "الأوقات المتاحة · {day}",
  "Loading free times": "جارٍ تحميل الأوقات المتاحة",
  "Couldn't load the free times.": "تعذّر تحميل الأوقات المتاحة.",
  "No free times this day. Try another day.": "لا أوقات متاحة في هذا اليوم. جرّب يومًا آخر.",
  "Afternoon and evening": "بعد الظهر والمساء",
  "Your booking": "حجزك",
  "Pay at the visit": "الدفع عند الزيارة",
  "It goes in your calendar. You can cancel from My appointments.": "يُضاف إلى تقويمك. يمكنك الإلغاء من «مواعيدي».",
  "Book {time}": "حجز {time}",
  "Any available": "أي شخص متاح",
  // services/appointments bookErrorMessage, shown through t().
  "That time is outside their hours. Pick another.": "هذا الوقت خارج ساعات عمله. اختر وقتًا آخر.",
  "That time was just booked. Pick another.": "حُجز هذا الوقت للتو. اختر وقتًا آخر.",
  "This service isn't available any more.": "لم تعد هذه الخدمة متاحة.",
  "Bookings for that day aren't open yet.": "لم تُفتح الحجوزات لذلك اليوم بعد.",
  "Bookings for that time have closed. Pick a later one.": "أُغلقت الحجوزات لذلك الوقت. اختر وقتًا لاحقًا.",
  "Accept this place's terms before booking.": "اقبل شروط هذا المكان قبل الحجز.",
  "That person doesn't work here any more. Pick another time.": "لم يعد هذا الشخص يعمل هنا. اختر وقتًا آخر.",

  // == Appointments · my appointments ==
  "My appointments": "مواعيدي",
  "No appointments coming up": "لا مواعيد قادمة",
  "No past appointments": "لا مواعيد سابقة",
  "Book with wellness services on Explore and they show here.": "احجز لدى خدمات العافية في الاستكشاف وستظهر هنا.",
  "Appointments you've had or cancelled show here.": "تظهر هنا المواعيد التي حضرتها أو ألغيتها.",
  "Booked. It's in your calendar.": "تم الحجز. الموعد في تقويمك.",
  "Thanks. You've accepted the terms.": "شكرًا. لقد قبلت الشروط.",
  "Loading your appointment": "جارٍ تحميل موعدك",
  "The place": "المكان",
  "Cancelling is coming soon.": "الإلغاء قريبًا.",
  "Couldn't cancel. Try again.": "تعذّر الإلغاء. حاول مرة أخرى.",
  "Appointment cancelled. You paid {place}: ask them for your money back.": "أُلغي الموعد. دفعت لـ{place}: اطلب منهم استرداد مالك.",
  "Appointment cancelled.": "أُلغي الموعد.",
  "How long": "المدة",
  "Before your visit": "قبل زيارتك",
  "{place} asks you to accept its terms before your appointment.": "يطلب منك {place} قبول شروطه قبل موعدك.",
  "Read and accept": "القراءة والقبول",
  "Change of plans": "تغيير الخطط",
  "{place} is told. This can't be undone.": "سيُبلَّغ {place}. لا يمكن التراجع عن ذلك.",
  "Reason for the place": "السبب للمكان",
  // services/appointments apptWords and payWords, shown through t().
  Missed: "فائت",
  Refunded: "مُسترد",

  // == Words other areas already use (the same Arabic) ==
  "Posting…": "جارٍ النشر…", // same Arabic as bizanalytics
  "Add": "إضافة", // same Arabic as bizteam
  "Categories": "الفئات", // same Arabic as business
  "More options": "خيارات أكثر", // same Arabic as bizteam
  "Send reply": "إرسال الرد", // same Arabic as food
  "Withdrawing…": "جارٍ السحب…", // same Arabic as bizteam
  "Week {n}": "الأسبوع {n}", // same Arabic as bizrevenue
  "Show fewer": "عرض أقل", // same Arabic as bizanalytics
  "See all": "عرض الكل", // same Arabic as bizmarket
  "Completed": "مكتمل", // same Arabic as bizteam
  "Sent to {name}": "أُرسل إلى {name}", // same Arabic as workout
  "on {date}": "يوم {date}", // same Arabic as bizops
  "Beginner": "مبتدئ", // same Arabic as mind
  "Intermediate": "متوسط", // same Arabic as mind
  "Advanced": "متقدّم", // same Arabic as mind
  "{n} readings": {"zero":"لا قراءات","one":"قراءة واحدة","two":"قراءتان","few":"{n} قراءات","many":"{n} قراءة","other":"{n} قراءة"}, // same Arabic as workout
  "Show less": "عرض أقل", // same Arabic as bizanalytics
  "tomorrow": "غدًا", // same Arabic as bizmarket
  "yesterday": "أمس", // same Arabic as bizanalytics
  "Book an appointment": "حجز موعد", // same Arabic as bizteam
  "Service": "الخدمة", // same Arabic as bizops
  "Pay in the app": "الدفع في التطبيق", // same Arabic as bizteam
  "Loading your appointments": "جارٍ تحميل مواعيدك", // same Arabic as bizops
  "Couldn't load your appointments.": "تعذّر تحميل مواعيدك.", // same Arabic as bizops
  "Appointment": "موعد", // same Arabic as bizanalytics
  "Couldn't load this appointment.": "تعذّر تحميل هذا الموعد.", // same Arabic as bizops
  "Appointment not found": "لم يُعثر على الموعد", // same Arabic as bizops
  "It may have been removed.": "ربما أُزيل.", // same Arabic as bizteam
  "Cash at the visit": "نقدًا عند الزيارة", // same Arabic as bizops
  "Cancel appointment": "إلغاء الموعد", // same Arabic as bizops
  "Cancel this appointment?": "إلغاء هذا الموعد؟", // same Arabic as bizops
};

export default community;
