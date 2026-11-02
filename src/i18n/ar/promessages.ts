import type { Catalogue } from "../core";

// Round G (EH4), Arabic: the professional's Messages (client, group,
// enquiry and business chats, offering plans, sharing to a group).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/pro/messages/ProMessages.tsx",
  "components/pro/messages/messagesModel.ts",
  "components/pro/messages/OfferPlansSheet.tsx",
  "components/pro/messages/parts.tsx",
  "components/pro/messages/SharePlaylistSheet.tsx",
  "components/pro/messages/ShareToGroupSheet.tsx",
  "components/pro/messages/useProMessagesSummary.ts",
];

// note (whole file): an enquiry «استفسار» (someone who messaged from the
// profile and hasn't hired yet), a broadcast «رسالة جماعية» (one message to
// several clients, each privately), an announcement «إعلان».
const promessages: Catalogue = {
  // == Messages · tabs and lists ==
  "Waiting for you": "بانتظارك",
  Broadcasts: "الرسائل الجماعية",
  They: "هو",
  Enquiry: "استفسار",
  Enquiries: "الاستفسارات",
  "Plans sent": "أُرسلت الخطط",
  Conversations: "المحادثات",
  "Plans sent.": "أُرسلت الخطط.",
  "Playlist shared.": "شُوركت قائمة التشغيل.",
  "Shared to the group.": "شُورك في المجموعة.",
  "Start a group for clients on the same programme.": "أنشئ مجموعة للعملاء على البرنامج نفسه.",
  "No enquiries yet": "لا استفسارات بعد",
  "People who message you from your profile appear here until they hire you.": "يظهر هنا من يراسلك من ملفك حتى يوظّفك.",
  "No business chats": "لا محادثات مع أنشطة تجارية",
  "No client chats yet": "لا محادثات مع عملاء بعد",
  "Chats with hired clients appear here, with voice and video calls.": "تظهر هنا المحادثات مع العملاء الذين وظّفوك، مع المكالمات الصوتية ومكالمات الفيديو.",
  "Members see each other's first name and photo, never health data.": "يرى الأعضاء الاسم الأول والصورة لبعضهم، ولا يرون البيانات الصحية أبدًا.",
  "Enquiries move to Clients when the person hires you.": "تنتقل الاستفسارات إلى العملاء عندما يوظّفك الشخص.",
  "New chat": "محادثة جديدة",
  "Message one of your clients": "راسل أحد عملائك",
  "Invite clients to a group chat": "دعوة العملاء إلى محادثة جماعية",
  "One message to several clients, each privately": "رسالة واحدة إلى عدة عملاء، كلٌّ على حدة",
  "You → {name}": "أنت ← {name}",

  // == Messages · offering plans and sharing ==
  "Send {n} plans": { zero: "إرسال {n} خطة", one: "إرسال خطة واحدة", two: "إرسال خطتين", few: "إرسال {n} خطط", many: "إرسال {n} خطة", other: "إرسال {n} خطة" },
  "{firstName} sees each plan with a Choose button. Choosing opens checkout and moves the chat to Clients.": "يرى {firstName} كل خطة مع زر «اختيار». الاختيار يفتح الدفع وينقل المحادثة إلى العملاء.",
  "You have no active plans to offer yet.": "ليست لديك خطط مفعّلة لتعرضها بعد.",
  "Edit services and prices": "تعديل الخدمات والأسعار",
  "e.g. Leg day": "مثل: يوم الأرجل",
  "Title (optional)": "العنوان (اختياري)",
  "Note (optional)": "ملاحظة (اختياري)",
  "They open it in their own music app. Nobody signs in to anything through Centium.": "يفتحونها في تطبيق الموسيقى لديهم. لا أحد يسجّل الدخول إلى أي شيء عبر Centium.",
  "A programme": "برنامج",
  "Members open it in Workout": "يفتحه الأعضاء في التمرين",
  "A meal plan": "خطة وجبات",
  "Only if you coach nutrition": "فقط إن كنت تدرّب على التغذية",
  "A group session": "جلسة جماعية",
  "Members book a place": "يحجز الأعضاء مكانًا",
  "An announcement": "إعلان",
  "Pinned to the top": "مثبّت في الأعلى",
  "A playlist": "قائمة تشغيل",
  "Spotify, Apple Music or YouTube Music": "Spotify أو Apple Music أو YouTube Music",
  "Send and pin": "إرسال وتثبيت",
  "Sharing never sends anyone's results or health data to the group.": "المشاركة لا ترسل نتائج أحد أو بياناته الصحية إلى المجموعة أبدًا.",
  "No programmes yet. Build one in Library.": "لا برامج بعد. أنشئ واحدًا في المكتبة.",
  "No upcoming sessions. Add one in Calendar.": "لا جلسات قادمة. أضف واحدة في التقويم.",
  "No meal plans yet. Make one in Meal plans first.": "لا خطط وجبات بعد. أنشئ واحدة في خطط الوجبات أولًا.",
  "Members see its name, its length and your note, never calories or macros.": "يرى الأعضاء اسمها ومدتها وملاحظتك، ولا يرون السعرات أو العناصر الغذائية الكبرى أبدًا.",
  Announcement: "إعلان",
};

export default promessages;
