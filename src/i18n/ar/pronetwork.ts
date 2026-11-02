import type { Catalogue } from "../core";

// Round G (EH4b), Arabic: the professional's tools, part 2: the Care network (referrals) and Businesses (exploring, invitations, a business's page).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/pro/care/careModel.ts",
  "components/pro/care/CareNetworkScreen.tsx",
  "components/pro/care/ReferSheet.tsx",
  "components/pro/care/useCareNetworkPending.ts",
  "components/pro/businesses/BusinessParts.tsx",
  "components/pro/businesses/ExploreParts.tsx",
  "components/pro/businesses/invitationLogic.ts",
  "components/pro/businesses/useBusinesses.ts",
  "pages/pro/more/Businesses.tsx",
  "pages/pro/more/BusinessDetail.tsx",
  "pages/pro/more/CareNetwork.tsx",
  "services/pro/careNetwork.ts",
  "services/pro/businesses.ts",
];

// note (whole file): professional «مختص», client «عميل» / «العملاء», as in
// pro.ts. The care network is «شبكة الرعاية» (as Settings and notifications
// say), a referral «إحالة» (feminine, so its status words agree: «مسحوبة»), a
// colleague «زميل», connecting «التواصل». A business «نشاط تجاري», its team
// «الفريق», a business ID «معرّف النشاط التجاري» in sentences (as the business
// screens say); the bare "Business ID" label keeps the onboarding form «رقم
// تعريف النشاط التجاري». {business}, {name}, {client} and {colleague} are
// names (user data). The distance bands follow the number: «2 إلى 5 كم».
// The decline reasons are stored in English (both professionals read them)
// and shown through t(), so a preset reads in Arabic and "Other" words stay
// as typed.
const pronetwork: Catalogue = {
  // == Care network · the page ==
  "Referrals between you and colleagues": "الإحالات بينك وبين زملائك",
  "Received|referrals tab": "الواردة", // note: the tab of received referrals; the bare "Received" is «تم الاستلام» elsewhere
  Network: "الشبكة",
  "Refer a client": "إحالة عميل",

  // == Care network · received referrals ==
  "Referred client": "عميل مُحال",
  "From {name}, {type}": "من {name}، {type}",
  "From a colleague, {type}": "من زميل، {type}",
  "Declined {when}": "رُفضت {when}",
  "Received {when}": "وردت {when}",
  "Received {when} · {name} agreed to the referral": "وردت {when} · وافق {name} على الإحالة",
  "Received {when} · The client agreed to the referral": "وردت {when} · وافق العميل على الإحالة",
  "Accepted. {name} has been told.": "تم القبول. أُبلغ {name}.",
  "Accepted. Your colleague has been told.": "تم القبول. أُبلغ زميلك.",
  "Message client": "مراسلة العميل",
  "Open client": "فتح ملف العميل",
  "{name} chooses whether to connect with you, and what to share.": "يختار {name} ما إذا كان سيتواصل معك، وما سيشاركه.",
  "The client chooses whether to connect with you, and what to share.": "يختار العميل ما إذا كان سيتواصل معك، وما سيشاركه.",
  "Ask support to look at this": "طلب مراجعة من الدعم",
  "No referrals yet": "لا إحالات بعد",
  "When a colleague refers a client to you and the client agrees, it shows here.": "عندما يحيل إليك زميل عميلًا ويوافق العميل، تظهر الإحالة هنا.",
  "With support": "لدى الدعم",
  "today, {time}": "اليوم، {time}",
  today: "اليوم",

  // == Care network · sent referrals ==
  "a colleague": "زميل",
  "{client} to {colleague}": "{client} إلى {colleague}",
  "{client} to a colleague": "{client} إلى زميل",
  "A client to {colleague}": "عميل إلى {colleague}",
  "A client to a colleague": "عميل إلى زميل",
  "sent just now": "أُرسلت الآن",
  "No referrals sent": "لا إحالات مُرسلة",
  "Refer a client to a colleague in your care network. The client agrees before your colleague sees anything.": "أحِل عميلًا إلى زميل في شبكة الرعاية. يوافق العميل قبل أن يرى زميلك أي شيء.",
  "Waiting for {name}": "بانتظار {name}",
  "Waiting for the client": "بانتظار العميل",
  "With {name}": "مع {name}",
  "With your colleague": "لدى زميلك",
  "{name} said no": "رفض {name}",
  "The client said no": "رفض العميل",
  Withdrawn: "مسحوبة",
  "Withdraw referral": "سحب الإحالة",
  "Referral withdrawn.": "سُحبت الإحالة.",
  "Sent to Centium support.": "أُرسلت إلى دعم Centium.",

  // == Care network · your network ==
  "Asking to connect": "يطلبون التواصل",
  "A colleague": "زميل",
  "Added to your care network.": "أُضيف إلى شبكة الرعاية.",
  "Your care network": "شبكة الرعاية الخاصة بك",
  "Add a colleague": "إضافة زميل",
  "in your network": "في شبكتك",
  "Removed from your care network.": "أُزيل من شبكة الرعاية.",
  "waiting for {name}": "بانتظار {name}",
  "waiting for them": "بانتظار الرد",
  "Request cancelled.": "أُلغي الطلب.",
  "Add colleagues you trust. Both of you agree, then you can refer clients to each other.": "أضف زملاء تثق بهم. بعد أن يوافق كلاكما، يمكنكما إحالة العملاء إلى بعضكما.",
  "Asked {name} to connect.": "طلبت التواصل مع {name}.",
  "Asked them to connect.": "أُرسل طلب التواصل.",

  // == Care network · declining a referral ==
  "Decline {name}?": "رفض {name}؟",
  "Decline this referral?": "رفض هذه الإحالة؟",
  "{name} sees your reason.": "يرى {name} سببك.",
  "{name} is told you declined.": "يُبلَّغ {name} برفضك.",
  "Your colleague sees your reason.": "يرى زميلك سببك.",
  "Your colleague is told you declined.": "يُبلَّغ زميلك برفضك.",
  "Not taking referrals right now": "لا أستقبل إحالات حاليًا",
  "Too far from the client": "بعيد جدًا عن العميل",
  "Tell {name} why": "أخبر {name} بالسبب",
  "Tell your colleague why": "أخبر زميلك بالسبب",
  "{name} sees this with the decline. Don't include health details.": "يرى {name} هذا مع الرفض. لا تذكر تفاصيل صحية.", // note: privacy line (no health details in the reason)
  "Your colleague sees this with the decline. Don't include health details.": "يرى زميلك هذا مع الرفض. لا تذكر تفاصيل صحية.", // note: privacy line (no health details in the reason)
  "Decline referral": "رفض الإحالة",
  "Keep referral": "الإبقاء على الإحالة",
  "Referral declined.": "رُفضت الإحالة.",

  // == Care network · asking support ==
  "Ask support": "طلب المساعدة من الدعم",
  "Send to support": "الإرسال إلى الدعم",
  "Centium support looks at what went wrong with this referral. Support sees both of you and the dates, never the client or the referral note.": "يراجع دعم Centium ما حدث مع هذه الإحالة. يرى الدعم كليكما والتواريخ، ولا يرى العميل أو ملاحظة الإحالة أبدًا.",
  "What went wrong?": "ما الذي حدث؟",
  "Don't include health details": "لا تذكر تفاصيل صحية", // note: privacy hint on the support note

  // == Care network · adding a colleague ==
  "Search colleagues": "ابحث عن زملاء",
  "Couldn't search. Check your connection and try again.": "تعذّر البحث. تحقّق من اتصالك وحاول مرة أخرى.",
  "No listed professionals match. Only professionals listed on Centium can be found here.": "لا يوجد مختصون مدرجون مطابقون. لا يمكن العثور هنا إلا على المختصين المدرجين على Centium.",
  "A professional": "مختص",
  "Ask to connect": "طلب التواصل",

  // == Care network · refer a client ==
  "your colleague": "زميلك",
  "Add a note for {name}.": "أضف ملاحظة لـ{name}.",
  "Add a note for your colleague.": "أضف ملاحظة لزميلك.",
  "Referral sent. {client} confirms before {colleague} sees anything.": "أُرسلت الإحالة. يؤكد {client} قبل أن يرى {colleague} أي شيء.",
  Colleague: "الزميل",
  "Your note": "ملاحظتك",
  "Send referral": "إرسال الإحالة",
  "You have no clients to refer yet.": "ليس لديك عملاء لإحالتهم بعد.",
  "Colleague type": "نوع الزميل",
  Nearby: "بالقرب منك",
  Dietitians: "أخصائيو التغذية",
  Physios: "أخصائيو العلاج الطبيعي", // note: reused from the member side; the type itself reads «أخصائي علاج فيزيائي» (onboarding), so one of the two may want aligning
  Doctors: "الأطباء",
  Trainers: "المدرّبون",
  "Finding colleagues near you…": "جارٍ البحث عن زملاء بالقرب منك…",
  "Set your area in Where you work to see colleagues near you.": "حدّد منطقتك في «مكان عملك» لترى الزملاء القريبين منك.",
  "You've searched a lot in the last hour. Try Nearby again later.": "بحثت كثيرًا خلال الساعة الماضية. جرّب «بالقرب منك» لاحقًا.",
  "Couldn't load colleagues near you.": "تعذّر تحميل الزملاء القريبين منك.",
  "No colleagues match.": "لا يوجد زملاء مطابقون.",
  "No listed colleagues work near your area yet.": "لا يعمل زملاء مدرجون بالقرب من منطقتك بعد.",
  "Your care network is empty. Add colleagues in Network first; you can refer only to them.": "شبكة الرعاية فارغة. أضف زملاء من «الشبكة» أولًا؛ لا يمكنك الإحالة إلا إليهم.",
  "{client} confirms before {colleague} sees anything. A referral passes on only your note; {client} chooses what to share with {colleague} later.": "يؤكد {client} قبل أن يرى {colleague} أي شيء. لا تنقل الإحالة سوى ملاحظتك؛ ويختار {client} لاحقًا ما يشاركه مع {colleague}.", // note: says no health data passes with a referral
  "Note to {name}": "ملاحظة إلى {name}",
  "Note to your colleague": "ملاحظة إلى زميلك",
  "under 2 km": "أقل من 2 كم",
  "2 to 5 km": "2 إلى 5 كم",
  "5 to 10 km": "5 إلى 10 كم",
  "10 to 25 km": "10 إلى 25 كم",
  "25 to 50 km": "25 إلى 50 كم",
  "over 50 km": "أكثر من 50 كم",

  // == Care network · service messages ==
  "That person isn't your client any more.": "لم يعد هذا الشخص عميلك.",
  "Refer only to colleagues in your care network.": "لا تُحِل إلا إلى زملاء في شبكة الرعاية.",
  "This has already been answered.": "تم الرد على هذا بالفعل.",
  "Couldn't answer. Try again.": "تعذّر الرد. حاول مرة أخرى.",
  "Couldn't send the referral. Try again.": "تعذّر إرسال الإحالة. حاول مرة أخرى.",
  "Couldn't answer the referral. Try again.": "تعذّر الرد على الإحالة. حاول مرة أخرى.",
  "Couldn't withdraw it. Try again.": "تعذّر السحب. حاول مرة أخرى.",
  "Couldn't send it to support. Try again.": "تعذّر الإرسال إلى الدعم. حاول مرة أخرى.",

  // == Businesses · the page ==
  "Where you work with a business": "حيث تعمل مع نشاط تجاري",
  Invitations: "الدعوات",
  "Connected|businesses": "المرتبطة", // note: the section of businesses whose team you're on; the bare "Connected" is «متصل»
  "You're not on a business's team yet.": "لست في فريق أي نشاط تجاري بعد.",
  "Enter a business ID below, or ask to join one from Explore.": "أدخل معرّف نشاط تجاري أدناه، أو اطلب الانضمام إلى أحدها من «استكشف».",
  "Requests sent": "الطلبات المُرسلة",
  "Sent {date} · waiting for reply": "أُرسل {date} · بانتظار الرد",
  Pending: "قيد الانتظار",
  Withdraw: "سحب",
  "Join a business": "الانضمام إلى نشاط تجاري",
  "Ask the business for its ID. They confirm your credentials before you appear on their team.": "اطلب من النشاط التجاري معرّفه. يتحقق من مؤهلاتك قبل أن تظهر في فريقه.",
  "You declined {business}'s invitation.": "رفضت دعوة {business}.",
  "Invitation removed.": "أُزيلت الدعوة.",
  "Request withdrawn.": "سُحب الطلب.",

  // == Businesses · a business card and invitation ==
  "Since {date}": "منذ {date}",
  "{business}'s owner hasn't turned on anything you can do in their business console yet.": "لم يفعّل مالك {business} بعد أي شيء يمكنك القيام به في لوحة تحكم نشاطه التجاري.",
  "What you can do at {business}": "ما يمكنك القيام به في {business}",
  "{business} invited you to their team": "دعاك {business} إلى فريقه",
  "Invited {date}": "أُرسلت الدعوة في {date}",
  "as {role}": "بصفة {role}",
  "Message from {business}": "رسالة من {business}",
  "Accepting lets {business} schedule you and see your licences. While you're on a team, your public listing in the directory is turned off. You can leave at any time.": "يتيح القبول لـ{business} جدولة مواعيدك والاطلاع على تراخيصك. ما دمت في فريق، يُوقف ظهورك العام في الدليل. يمكنك المغادرة في أي وقت.",
  "Accepting…": "جارٍ القبول…",
  "Expires {date}": "تنتهي في {date}",
  "{business} withdrew this invitation, so it can't be accepted.": "سحب {business} هذه الدعوة، لذا لا يمكن قبولها.",
  "This invitation has expired. Ask {business} to send it again.": "انتهت صلاحية هذه الدعوة. اطلب من {business} إرسالها مجددًا.",
  "A business ID has 6 letters and numbers.": "يتكوّن معرّف النشاط التجاري من 6 أحرف وأرقام.",
  "Request sent. You join once the business approves and you accept.": "أُرسل الطلب. تنضم بعد موافقة النشاط التجاري وقبولك.",
  "Enter a business ID": "أدخل معرّف نشاط تجاري",
  "Leave {business}?": "مغادرة {business}؟",
  "You lose access to their business. Your own account and clients stay.": "تفقد الوصول إلى نشاطهم التجاري. يبقى حسابك وعملاؤك كما هم.",
  "Leave business": "مغادرة النشاط التجاري",
  Stay: "البقاء",
  "Decline {business}'s invitation?": "رفض دعوة {business}؟",
  "They can invite you again later.": "يمكنهم دعوتك مجددًا لاحقًا.",

  // == Businesses · the business console areas (staffAreas, shown here) ==
  "Members, member codes and plans": "الأعضاء ورموز الأعضاء والخطط",
  "Check members in and see passes": "تسجيل حضور الأعضاء والاطلاع على البطاقات",
  "Classes, times and instructors": "الحصص والمواعيد والمدرّبون",
  "Products and orders": "المنتجات والطلبات",
  "Your store's products and orders": "منتجات متجرك وطلباته",
  "Offers, discounts and promotions": "العروض والخصومات والترويج",
  "Who works here and what they can do": "من يعمل هنا وما يمكنه فعله",
  Locations: "الأماكن",
  "Venue names, addresses and time zones": "أسماء الأماكن وعناوينها ومناطقها الزمنية",
  Revenue: "الإيرادات",
  "Payments recorded at the desk": "المدفوعات المسجّلة في الاستقبال",

  // == Businesses · roles ==
  Instructor: "المدرّب",
  Manager: "مدير",
  "Shop assistant": "مساعد متجر",

  // == Businesses · a business's page ==
  "Classes this month": "حصص هذا الشهر",
  "Your schedule here": "جدولك هنا",
  "No classes scheduled for you here.": "لا حصص مجدولة لك هنا.",
  "Business console": "لوحة تحكم النشاط التجاري",
  "Leave {business}": "مغادرة {business}",

  // == Businesses · Explore ==
  "Businesses, classes and colleagues": "أنشطة تجارية وحصص وزملاء",
  "Affiliated with": "منضم إلى",
  "You can still browse and reach out to other businesses below.": "لا يزال بإمكانك تصفّح أنشطة تجارية أخرى والتواصل معها أدناه.",
  "Ask to join": "طلب الانضمام",
  "Request sent": "أُرسل الطلب",
  "Your role": "دورك",
  "Choose a role": "اختر دورًا",
  "Message (optional)": "رسالة (اختيارية)",
  "The business checks your credentials before you appear on its team. Your clients and their data are never shared with the business.": "يتحقق النشاط التجاري من مؤهلاتك قبل أن تظهر في فريقه. لا تُشارك بيانات عملائك معه أبدًا.",
  "Open {name}": "فتح {name}",
  "In network": "في الشبكة",
  Requested: "مطلوب",

  // == Businesses · service messages ==
  "Couldn't withdraw. Try again.": "تعذّر السحب. حاول مرة أخرى.",
  "Your message can be up to 500 characters.": "يمكن أن تصل رسالتك إلى 500 حرف.",
  "Too many tries in a short time. Try again in an hour.": "محاولات كثيرة في وقت قصير. حاول مرة أخرى بعد ساعة.",
  "This business isn't taking requests right now.": "لا يستقبل هذا النشاط التجاري طلبات حاليًا.",
  "Couldn't send your request. Try again.": "تعذّر إرسال طلبك. حاول مرة أخرى.",
};

export default pronetwork;
