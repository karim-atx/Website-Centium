import type { Catalogue } from "../core";

// Round G (EH4b), Arabic: the professional's tools, part 2: Forms (the form builder, sending, responses, check-ins and note templates).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/pro/forms/CheckInsProgress.tsx",
  "components/pro/forms/FormBuilder.tsx",
  "components/pro/forms/formModel.ts",
  "components/pro/forms/FormsHome.tsx",
  "components/pro/forms/formsList.ts",
  "components/pro/forms/moKit.tsx",
  "components/pro/forms/noteTemplateModel.ts",
  "components/pro/forms/QuestionCard.tsx",
  "components/pro/forms/ResponseScreen.tsx",
  "components/pro/forms/reviewModel.ts",
  "components/pro/forms/SendSheets.tsx",
  "components/pro/forms/useReorder.ts",
  "pages/pro/more/Forms.tsx",
  "services/pro/forms.ts",
  "services/pro/noteTemplates.ts",
];

// note (whole file): a form is «نموذج» (plural «النماذج»), an intake form
// «نموذج الاستقبال» and the Intake tab «الاستقبال», as in proclients.ts and
// proprofile.ts; a check-in «متابعة» («المتابعات»); a template «قالب»; a
// question «سؤال», an answer «إجابة»; a section «قسم»; a condition (Only ask
// if…) «شرط»; "Carry into the profile" «النقل إلى الملف الشخصي»;
// recovery-sensitive mode «الوضع المراعي للتعافي», as in the shared catalogue;
// a response the client sent is «الرد» only where English says reply. The
// stored defaults a new question gets ("Yes" / "No", the body measurement
// prompts Weight / Waist / Hips and their units) stay English in the saved form
// (they are the form's own content, and "Yes" / "No" is how a yes / no
// question is recognised); the screens show "Yes" / "No" in Arabic. Template
// titles and descriptions come from the Database and stay as written; so do
// the notes a template's rules give the professional (form_response_notes).
const proforms: Catalogue = {
  // == Forms list ==
  Forms: "النماذج",
  "What clients fill in, and when": "ما يعبّئه العملاء، ومتى",
  "Intake|form": "الاستقبال",
  "Your forms": "نماذجك",
  "No intake forms yet. Start one with + or from a template.": "لا نماذج استقبال بعد. ابدأ واحدًا بالزر + أو من قالب.",
  "No check-ins yet. Start one with + or from a template.": "لا متابعات بعد. ابدأ واحدة بالزر + أو من قالب.",
  "Templates from Centium": "قوالب من Centium",
  "Use {name}": "استخدام {name}",
  Use: "استخدام",
  "New form": "نموذج جديد",
  "{n} questions": { zero: "لا أسئلة", one: "سؤال واحد", two: "سؤالان", few: "{n} أسئلة", many: "{n} سؤالًا", other: "{n} سؤال" },
  "Sent automatically when someone hires you": "يُرسل تلقائيًا عندما يوظّفك أحد",
  "Sent manually": "يُرسل يدويًا",
  "Not scheduled": "غير مجدول",
  "On a schedule": "ضمن جدول",
  "Every day · {time}": "كل يوم · {time}",
  "Every {n} weeks · {day} {time}": {
    zero: "كل {n} أسبوع · {day} {time}",
    one: "كل أسبوع · {day} {time}",
    two: "كل أسبوعين · {day} {time}",
    few: "كل {n} أسابيع · {day} {time}",
    many: "كل {n} أسبوعًا · {day} {time}",
    other: "كل {n} أسبوع · {day} {time}",
  },
  "Free text": "نص حر",
  "{n} sections": { zero: "لا أقسام", one: "قسم واحد", two: "قسمان", few: "{n} أقسام", many: "{n} قسمًا", other: "{n} قسم" },

  // == Form builder ==
  Form: "النموذج",
  "This form isn't available any more.": "لم يعد هذا النموذج متاحًا.",
  "New check-in": "متابعة جديدة",
  "Only professionals can write and send forms.": "لا يمكن إلا للمختصين كتابة النماذج وإرسالها.",
  "Give the form a title.": "أعطِ النموذج عنوانًا.",
  "Keep the title under {n} characters.": "اجعل العنوان أقل من {n} حرفًا.",
  "(optional)": "(اختياري)",
  "What it's for, shown to the client above the questions": "الغرض منه، ويظهر للعميل فوق الأسئلة",
  "Send when someone hires you": "الإرسال عندما يوظّفك أحد",
  "Due 3 days after they hire you": "يُستحق بعد 3 أيام من توظيفك",
  "Questions · {n}": "الأسئلة · {n}",
  "Add at least one question.": "أضف سؤالًا واحدًا على الأقل.",
  "Add question": "إضافة سؤال",
  "Add section": "إضافة قسم",
  "Remove form": "إزالة النموذج",
  "Sending|form delivery": "الإرسال",
  "Add a section": "إضافة قسم",
  "Add a question": "إضافة سؤال",
  "A section starts with a question. Choose its first one, then give the section a title.": "يبدأ القسم بسؤال. اختر سؤاله الأول، ثم أعطِ القسم عنوانًا.",
  "Short text": "نص قصير",
  "Long text": "نص طويل",
  "Single choice": "اختيار واحد",
  "Multiple choice": "اختيار متعدد",
  "Number with unit": "رقم مع وحدة",
  "Scale 1 to 10": "مقياس من 1 إلى 10",
  "Scale {min} to {max}": "مقياس من {min} إلى {max}",
  Scale: "مقياس",
  "Yes or no": "نعم أو لا",
  "Photo or file": "صورة أو ملف",
  "Discard your changes?": "تجاهل تغييراتك؟",
  "What you changed since the last save is lost.": "ستفقد ما غيّرته منذ آخر حفظ.",
  Discard: "تجاهل",
  "Keep editing": "متابعة التعديل",
  "It leaves your forms. Answers clients already sent stay on their pages.": "سيُزال من نماذجك. تبقى الإجابات التي أرسلها العملاء على صفحاتهم.",

  // == Form builder · a question ==
  "Short answer": "إجابة قصيرة",
  "Long answer": "إجابة طويلة",
  "Answer {n}": "الإجابة {n}",
  "Can't be renamed": "لا يمكن إعادة تسميتها",
  "Remove answer {n}": "إزالة الإجابة {n}",
  "Answers with a lock can't be renamed or removed: recovery-sensitive mode, a note for you or a safety message depends on them.": "لا يمكن إعادة تسمية الإجابات التي عليها قفل أو إزالتها: يعتمد عليها الوضع المراعي للتعافي أو ملاحظة لك أو رسالة أمان.", // note: names the recovery-sensitive mode and the safety message; neutral
  "Add an answer": "إضافة إجابة",
  Unit: "الوحدة",
  "Very low": "منخفض جدًا",
  "Very high": "مرتفع جدًا",
  "Pick a date": "اختر تاريخًا",
  "Add photos or a file": "إضافة صور أو ملف",
  "Start a section here": "بدء قسم هنا",
  "Section title": "عنوان القسم",
  "Section {n} title": "عنوان القسم {n}",
  "Move question {n} of {count}. Use the arrow keys.": "نقل السؤال {n} من {count}. استخدم مفاتيح الأسهم.",
  "Required: {question}": "مطلوب: {question}",
  "question {n}": "السؤال {n}",
  "Remove question {n}": "إزالة السؤال {n}",
  "Question {n}": "السؤال {n}",
  "Write your question": "اكتب سؤالك",
  "Safety question: answers that suggest {topic} flag the check-in for you, so it can't be turned off.": "سؤال أمان: الإجابات التي توحي بـ{topic} تنبّهك إلى المتابعة، لذا لا يمكن إيقافه.", // note: health; the safety topics below fill {topic}
  pain: "ألم", // note: health (safety topic, inside a sentence)
  "an injury": "إصابة", // note: health (safety topic, inside a sentence)
  illness: "مرض", // note: health (safety topic, inside a sentence)
  "worrying symptoms": "أعراض مقلقة", // note: health (safety topic, inside a sentence)
  "Write the question.": "اكتب السؤال.",
  "Keep the question under {n} characters.": "اجعل السؤال أقل من {n} حرفًا.",
  "Add at least two answers.": "أضف إجابتين على الأقل.",
  "Up to {n} answers.": "حتى {n} إجابة.",
  "Each answer once.": "كل إجابة مرة واحدة.",
  "Keep the unit under {n} characters.": "اجعل الوحدة أقل من {n} حرفًا.",
  "The scale needs a low and a high end.": "يحتاج المقياس إلى حد أدنى وحد أعلى.",
  "Give the section a title.": "أعطِ القسم عنوانًا.",
  "Keep the section title under {n} characters.": "اجعل عنوان القسم أقل من {n} حرفًا.",

  // == Form builder · Only ask if… ==
  "Only ask if…": "السؤال فقط إذا…",
  "The client sees this question only when an earlier answer matches. Otherwise it's skipped.": "يرى العميل هذا السؤال فقط عندما تطابق إجابة سابقة. وإلا يُتخطّى.",
  "Earlier question": "سؤال سابق",
  "Add a choice, yes or no, or scale question above this one first.": "أضف أولًا سؤال اختيار أو نعم/لا أو مقياس فوق هذا السؤال.",
  "Always ask": "السؤال دائمًا",
  "Condition|form logic": "الشرط",
  Is: "هي",
  "Is not": "ليست",
  "Is either of": "إحدى",
  "Doesn't include": "لا تتضمن",
  "Any of these answers": "أيٌّ من هذه الإجابات",
  "This answer": "هذه الإجابة",
  "Save condition": "حفظ الشرط",
  "Choose another question": "اختيار سؤال آخر",
  "The question this depends on was removed. Choose another.": "أُزيل السؤال الذي يعتمد عليه هذا. اختر سؤالًا آخر.",
  "Move this below the question it depends on.": "انقل هذا السؤال إلى أسفل السؤال الذي يعتمد عليه.",
  "Choose the condition again.": "اختر الشرط مرة أخرى.",
  "The answer this depends on changed. Choose it again.": "تغيّرت الإجابة التي يعتمد عليها هذا. اخترها مرة أخرى.",
  "{list} or {last}": "{list} أو {last}",
  "is {value}": "هي {value}",
  "is not {value}": "ليست {value}",
  "includes {value}": "تتضمن {value}",
  "doesn't include {value}": "لا تتضمن {value}",
  '"{prompt}"': "«{prompt}»",
  "an earlier question": "سؤال سابق",
  "Only ask if {question} {condition}": "اسأل فقط إذا كانت إجابة {question} {condition}", // note: reads «إذا كانت إجابة «…» هي نعم»; the condition words above agree with «إجابة» (feminine)

  // == Form builder · Carry into the profile ==
  "Carry into the profile": "النقل إلى الملف الشخصي",
  "Carry into the profile: {field}": "النقل إلى الملف الشخصي: {field}",
  "After sending, the client is asked whether to add this answer to their profile. Nothing is added unless they confirm it. Weight is never offered while they use recovery-sensitive mode.": "بعد الإرسال، يُسأل العميل إن كان يريد إضافة هذه الإجابة إلى ملفه الشخصي. لا يُضاف شيء ما لم يؤكد. لا يُعرض الوزن أبدًا أثناء استخدامه الوضع المراعي للتعافي.", // note: health-adjacent (weight, recovery-sensitive mode)
  "Don't carry it": "عدم النقل",
  Medications: "الأدوية", // note: health (a profile field)
  Injuries: "الإصابات", // note: health (a profile field)

  // == Sending (intake) ==
  "In 3 days": "بعد 3 أيام",
  "In a week": "بعد أسبوع",
  "Sent to {name}.": "أُرسل إلى {name}.",
  "Send to {name}": "الإرسال إلى {name}",
  "Automatically when someone hires you": "تلقائيًا عندما يوظّفك أحد",
  "Save the form first": "احفظ النموذج أولًا",
  "Only when I send it": "فقط عندما أرسله",
  "Choose who gets it below": "اختر من يتلقاه أدناه",
  "Carry answers into the client's profile": "نقل الإجابات إلى الملف الشخصي للعميل",
  "Allergies and restrictions": "الحساسية والقيود الغذائية", // note: health (allergies)
  "Into the dietary needs card": "إلى بطاقة الاحتياجات الغذائية",
  "Into the profile": "إلى الملف الشخصي",
  "Into the medical history": "إلى التاريخ الطبي", // note: health
  "A weigh-in, never in recovery-sensitive mode": "قياس وزن، وليس أبدًا في الوضع المراعي للتعافي", // note: health-adjacent (weight)
  "Set this on each question. The client confirms each answer before it's added.": "حدّد ذلك في كل سؤال. يؤكد العميل كل إجابة قبل إضافتها.",
  "Send to": "الإرسال إلى",
  "Save the form first.": "احفظ النموذج أولًا.",
  "You have no clients to send it to yet.": "ليس لديك عملاء لترسله إليهم بعد.",

  // == Schedule (check-in) ==
  "{name}: {message}": "{name}: {message}",
  "Scheduled for {name}.": "جُدولت لـ{name}.",
  "Scheduled for {n} clients.": {
    zero: "لم تُجدول لأي عميل.",
    one: "جُدولت لعميل واحد.",
    two: "جُدولت لعميلين.",
    few: "جُدولت لـ{n} عملاء.",
    many: "جُدولت لـ{n} عميلًا.",
    other: "جُدولت لـ{n} عميل.",
  },
  "{label}: {value}": "{label}: {value}",
  "Every {n} weeks": { zero: "كل {n} أسبوع", one: "كل أسبوع", two: "كل أسبوعين", few: "كل {n} أسابيع", many: "كل {n} أسبوعًا", other: "كل {n} أسبوع" },
  "Due at": "موعد الاستحقاق",
  "Who gets it": "من يتلقاها",
  "Clients on a meal plan": "العملاء الذين لديهم خطة وجبات",
  "Clients on a programme": "العملاء الذين لديهم برنامج",
  "Choose below": "اختر أدناه",
  "Already getting it": "يتلقاها بالفعل",
  "A reminder goes 2 hours before it is due, and again the next morning if it's still open.": "يُرسل تذكير قبل موعد الاستحقاق بساعتين، ومرة أخرى في صباح اليوم التالي إن بقيت مفتوحة.",
  "Save the check-in first.": "احفظ المتابعة أولًا.",
  "Getting it now": "يتلقونها الآن",
  "Stop {name}'s check-ins": "إيقاف متابعات {name}",
  "Stop these check-ins?": "إيقاف هذه المتابعات؟",
  "{name} won't get this check-in any more. Answers already sent stay.": "لن يتلقى {name} هذه المتابعة بعد الآن. تبقى الإجابات المرسلة.",
  "Stop check-ins": "إيقاف المتابعات",
  "Stopped for {name}.": "أُوقفت لـ{name}.",

  // == A response (check-in review, intake answers) ==
  "Great work": "عمل رائع",
  "Let's talk": "لنتحدث",
  "Adjusting your plan": "سأعدّل خطتك",
  "This response isn't available any more.": "لم يعد هذا الرد متاحًا.",
  "{label}, photo {n}": "{label}، الصورة {n}",
  "About: {question}": "عن: {question}",
  Urgent: "عاجل", // note: health (a response marked urgent)
  Flagged: "مُعلَّم", // note: health (a response its safety answers flagged)
  "{name} gave an answer this form marks urgent.": "قدّم {name} إجابة يعتبرها هذا النموذج عاجلة.", // note: health
  "Answers mention {topics}. Suggest {name} talks to a doctor.": "تذكر الإجابات {topics}. اقترح على {name} التحدث إلى طبيب.", // note: health (FINAL_PLAN 3 §6.2 wording, neutral)
  "Notes for you": "ملاحظات لك",
  "Only you see these.": "أنت وحدك ترى هذه.",
  "Week {n}": "الأسبوع {n}",
  "To review · Week {n}": "للمراجعة · الأسبوع {n}",
  "Submitted {day}, {time}": "أُرسلت {day}، {time}",
  "Submitted {day}, {time} · compared with the last check-in": "أُرسلت {day}، {time} · مقارنةً بالمتابعة السابقة",
  "First answer": "أول إجابة",
  "Was {value}": "كانت {value}",
  'Reviewed. {name} got your reply: "{reply}"': "تمت المراجعة. وصل ردّك إلى {name}: «{reply}»",
  "Reviewed. {name} was told you reviewed it.": "تمت المراجعة. أُبلغ {name} بأنك راجعتها.",
  "Reply to {name}": "الرد على {name}",
  "Mark as reviewed": "التحديد كمُراجَعة",
  "Next check-in · {name}": "المتابعة التالية · {name}",
  "Added to {name}’s profile": "أُضيف إلى الملف الشخصي لـ{name}",
  "Submitted {date} · {answered} of {total} answered": "أُرسل {date} · أُجيب عن {answered} من {total}",
  "Not answered": "لم تتم الإجابة",
  "{value} of {max}": "{value} من {max}",
  "{n} photos": { zero: "لا صور", one: "صورة واحدة", two: "صورتان", few: "{n} صور", many: "{n} صورة", other: "{n} صورة" },

  // == A client's check-ins (Progress) ==
  "No check-ins yet": "لا متابعات بعد",
  "{n} check-ins · last {date}": {
    zero: "لا متابعات · آخرها {date}",
    one: "متابعة واحدة · آخرها {date}",
    two: "متابعتان · آخرها {date}",
    few: "{n} متابعات · آخرها {date}",
    many: "{n} متابعة · آخرها {date}",
    other: "{n} متابعة · آخرها {date}",
  },
  "{name} hasn't sent a check-in yet.": "لم يرسل {name} أي متابعة بعد.",
  "Charts start after the second check-in.": "تبدأ الرسوم البيانية بعد المتابعة الثانية.",
  "How is {name} answering week to week?": "كيف يجيب {name} من أسبوع لآخر؟",
  "Check-ins range": "مدى المتابعات",
  "6W": "6 أسابيع",
  "3M": "3 أشهر",
  "W{n}": "أ{n}",
  "{label}: {values}.": "{label}: {values}.",
  "Drag sideways to scrub, tap a point to pin it": "اسحب جانبيًا للتنقل، واضغط على نقطة لتثبيتها",
  "{n} sets · {date}": {
    zero: "لا مجموعات · {date}",
    one: "مجموعة واحدة · {date}",
    two: "مجموعتان · {date}",
    few: "{n} مجموعات · {date}",
    many: "{n} مجموعة · {date}",
    other: "{n} مجموعة · {date}",
  },
  "Reviewed|check-in": "تمت المراجعة",
  today: "اليوم",
  Day: "اليوم",
  Stop: "إيقاف",

  // == Service messages (forms and note templates) ==
  "That person isn't your client any more.": "لم يعد هذا الشخص عميلك.",
  "Only professionals can send forms.": "لا يمكن إلا للمختصين إرسال النماذج.",
  "This form has already been sent.": "أُرسل هذا النموذج بالفعل.",
  "Couldn't save the questions. Try again.": "تعذّر حفظ الأسئلة. حاول مرة أخرى.",
  "A condition or profile field doesn't fit its question. Check the questions and try again.": "شرط أو حقل في الملف الشخصي لا يناسب سؤاله. راجع الأسئلة وحاول مرة أخرى.",
  "Couldn't save the form. Try again.": "تعذّر حفظ النموذج. حاول مرة أخرى.",
  "Couldn't change when it's sent. Try again.": "تعذّر تغيير موعد إرساله. حاول مرة أخرى.",
  "Couldn't remove the form. Try again.": "تعذّرت إزالة النموذج. حاول مرة أخرى.",
  "This template isn't available yet.": "هذا القالب غير متاح بعد.",
  "This template isn't for your practice.": "هذا القالب ليس لنوع ممارستك.",
  "Couldn't add the template. Try again.": "تعذّرت إضافة القالب. حاول مرة أخرى.",
  "Couldn't send the form. Try again.": "تعذّر إرسال النموذج. حاول مرة أخرى.",
  "Couldn't stop it. Try again.": "تعذّر إيقافها. حاول مرة أخرى.",
  "Couldn't mark it as reviewed. Try again.": "تعذّر تحديدها كمُراجَعة. حاول مرة أخرى.",
  "Couldn't save the template. Try again.": "تعذّر حفظ القالب. حاول مرة أخرى.",
  "Couldn't remove the template. Try again.": "تعذّرت إزالة القالب. حاول مرة أخرى.",
};

export default proforms;
