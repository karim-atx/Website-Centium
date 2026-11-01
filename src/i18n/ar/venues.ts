import type { Catalogue } from "../core";

// Round F (DW/AB), Arabic: class no-shows, the 30-second gym pass and member codes (AB4–AB6).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. Files that are still
// English elsewhere (Workout, Pro tools, Business: later rounds) keep their
// new sentences in a copy module listed here, so each new string has Arabic.
export const FILES: string[] = [
  "services/no-shows/noShowModel.ts",
  "services/no-shows/index.ts",
  "services/venues/passCode.ts",
  "services/venues/passDevice.ts",
  "services/business-members/codeCopy.ts",
  "components/marketplace/BookingPausedNote.tsx",
  "components/marketplace/useBookingPause.ts",
  "components/marketplace/PassDevicesSheet.tsx",
  "components/marketplace/usePassCode.ts",
  "pages/business-analytics/members/BookingPausesCard.tsx",
];

// note (whole file): "no-show" is «عدم الحضور» as in the shared catalogue; a
// booking pause is «إيقاف الحجوزات مؤقتًا»; the gym pass is «بطاقة العضوية»
// and its QR value «الرمز». {gym} is the business's own name (user data).
// The permission names (Schedule, Front desk, Members) read as the team
// screens will: «الجدول» و«الاستقبال» و«الأعضاء».
const venues: Catalogue = {
  // == AB4 · the roster (attendance) ==
  Attended: "حضر",
  "Mark attended": "تسجيل الحضور",
  "Mark no-show": "تسجيل عدم الحضور",
  "Undo mark": "التراجع عن التسجيل",
  "Marked attended.": "سُجّل الحضور.",
  "Marked as a no-show.": "سُجّل عدم الحضور.",
  "Mark undone.": "تم التراجع عن التسجيل.",
  "Attendance can be marked once the class starts.": "يمكن تسجيل الحضور بعد بدء الحصة.",
  "A mark can only be undone within 24 hours.": "لا يمكن التراجع عن التسجيل إلا خلال 24 ساعة.",
  "That booking couldn't be found. Reload the roster.": "تعذّر العثور على هذا الحجز. أعد تحميل القائمة.",
  "Marking attendance needs Schedule or Front desk access. Ask the owner.": "يتطلب تسجيل الحضور صلاحية الجدول أو الاستقبال. اطلبها من المالك.",
  "Couldn't save attendance. Try again.": "تعذّر حفظ الحضور. حاول مرة أخرى.",

  // == AB4 · Booking policies ==
  "Pause bookings after 3 no-shows": "إيقاف الحجوزات مؤقتًا بعد 3 مرات عدم حضور",
  "Bookings don't pause after no-shows": "لا تتوقف الحجوزات بعد عدم الحضور",
  "Members who miss 3 classes in 30 days can't book new classes here for 7 days.": "الأعضاء الذين يتغيّبون عن 3 حصص خلال 30 يومًا لا يمكنهم حجز حصص جديدة هنا لمدة 7 أيام.",
  "No-show pause turned on.": "تم تشغيل الإيقاف المؤقت لعدم الحضور.",
  "No-show pause turned off.": "تم إيقاف الإيقاف المؤقت لعدم الحضور.",
  "Late-cancel counting and fees are coming soon.": "احتساب الإلغاء المتأخر ورسومه قريبًا.",
  "No-shows": "عدم الحضور",
  "Only staff who manage the schedule can change this.": "لا يمكن تغيير هذا إلا للموظفين الذين يديرون الجدول.",
  "Couldn't save this. Try again.": "تعذّر حفظ هذا. حاول مرة أخرى.",

  // == AB4 · paused members (staff) ==
  "Paused bookings": "حجوزات موقوفة مؤقتًا",
  "Lift pause": "رفع الإيقاف",
  "Pause lifted. They can book classes again.": "رُفع الإيقاف. يمكنه حجز الحصص مجددًا.",
  "Booking pauses end by themselves after 7 days.": "ينتهي إيقاف الحجوزات تلقائيًا بعد 7 أيام.",
  "Paused until {date}": "موقوف حتى {date}",
  "Bookings paused": "الحجوزات موقوفة",
  "{n} no-shows in 30 days": {
    zero: "لا مرات عدم حضور خلال 30 يومًا",
    one: "مرة عدم حضور واحدة خلال 30 يومًا",
    two: "مرتا عدم حضور خلال 30 يومًا",
    few: "{n} مرات عدم حضور خلال 30 يومًا",
    many: "{n} مرة عدم حضور خلال 30 يومًا",
    other: "{n} مرة عدم حضور خلال 30 يومًا",
  },
  "Lift {name}'s booking pause": "رفع إيقاف حجوزات {name}",
  "Lifting a pause needs Members access. Ask the owner.": "يتطلب رفع الإيقاف صلاحية الأعضاء. اطلبها من المالك.",
  "Couldn't load paused bookings.": "تعذّر تحميل الحجوزات الموقوفة.",
  "Couldn't lift the pause. Try again.": "تعذّر رفع الإيقاف. حاول مرة أخرى.",
  Member: "عضو",

  // == AB4 · the member (class page, booking, notices) ==
  "You missed 3 classes at {gym} in 30 days, so new bookings there are paused until {date}. Your existing bookings are kept.":
    "تغيّبت عن 3 حصص في {gym} خلال 30 يومًا، لذا أُوقفت الحجوزات الجديدة هناك مؤقتًا حتى {date}. حجوزاتك الحالية باقية.",
  "You missed 3 classes here in 30 days, so new bookings here are paused until {date}. Your existing bookings are kept.":
    "تغيّبت عن 3 حصص هنا خلال 30 يومًا، لذا أُوقفت الحجوزات الجديدة هنا مؤقتًا حتى {date}. حجوزاتك الحالية باقية.",
  "You missed 3 classes at {gym} in 30 days, so new bookings there are paused for 7 days. Your existing bookings are kept.":
    "تغيّبت عن 3 حصص في {gym} خلال 30 يومًا، لذا أُوقفت الحجوزات الجديدة هناك مؤقتًا لمدة 7 أيام. حجوزاتك الحالية باقية.",
  "You missed 3 classes in 30 days, so new class bookings there are paused for 7 days. Your existing bookings are kept.":
    "تغيّبت عن 3 حصص خلال 30 يومًا، لذا أُوقفت حجوزات الحصص الجديدة هناك مؤقتًا لمدة 7 أيام. حجوزاتك الحالية باقية.",
  "You missed 2 classes at {gym} in the last 30 days. After 3, new bookings there pause for 7 days.":
    "تغيّبت عن حصتين في {gym} خلال آخر 30 يومًا. بعد 3 مرات، تتوقف الحجوزات الجديدة هناك لمدة 7 أيام.",
  "You missed 2 classes in the last 30 days. After 3, new bookings there pause for 7 days.":
    "تغيّبت عن حصتين خلال آخر 30 يومًا. بعد 3 مرات، تتوقف الحجوزات الجديدة هناك لمدة 7 أيام.",
  "You can book classes at {gym} again.": "يمكنك حجز الحصص في {gym} مجددًا.",
  "You can book classes there again.": "يمكنك حجز الحصص هناك مجددًا.",
  "You missed 2 classes": "تغيّبت عن حصتين",
  "Class bookings paused": "حجوزات الحصص موقوفة مؤقتًا",
  "Bookings open again": "الحجوزات متاحة مجددًا",
  "Your new class bookings here are paused until {date}.": "حجوزاتك الجديدة للحصص هنا موقوفة مؤقتًا حتى {date}.",
  "Your new class bookings here are paused for now.": "حجوزاتك الجديدة للحصص هنا موقوفة مؤقتًا في الوقت الحالي.",
  "Couldn't check your bookings.": "تعذّر التحقق من حجوزاتك.",

  // == AB5 · the 30-second pass ==
  "This code refreshes every 30 seconds. Screenshots won't work at the desk.": "يتجدّد هذا الرمز كل 30 ثانية. لقطات الشاشة لن تعمل عند الاستقبال.",
  "Your devices": "أجهزتك",
  "Devices with this pass": "الأجهزة التي تحمل هذه البطاقة",
  "Each device makes its own code. Remove one you no longer use, and its code stops working at the desk.":
    "كل جهاز يُنشئ رمزه الخاص. أزِل جهازًا لم تعد تستخدمه، فيتوقف رمزه عن العمل عند الاستقبال.",
  "No devices yet. Opening your pass adds this one.": "لا أجهزة بعد. فتح بطاقتك يضيف هذا الجهاز.",
  "This device": "هذا الجهاز",
  "Last used {date}": "آخر استخدام {date}",
  "That device couldn't be found. Reload and try again.": "تعذّر العثور على هذا الجهاز. أعد التحميل وحاول مرة أخرى.",
  "That membership couldn't be found.": "تعذّر العثور على هذه العضوية.",
  "Couldn't load your devices. Try again.": "تعذّر تحميل أجهزتك. حاول مرة أخرى.",
  "Couldn't remove that device. Try again.": "تعذّرت إزالة هذا الجهاز. حاول مرة أخرى.",
  "Code expired": "انتهت صلاحية الرمز",
  "This code has expired. Ask the member to open their pass.": "انتهت صلاحية هذا الرمز. اطلب من العضو فتح بطاقته.",

  // == AB6 · member codes ==
  "Can be used": "عدد مرات الاستخدام",
  "How many people can join with this code.": "عدد الأشخاص الذين يمكنهم الانضمام بهذا الرمز.",
  "Fewer uses": "استخدامات أقل",
  "More uses": "استخدامات أكثر",
  "Code options": "خيارات الرمز",
  "Revoke code": "إلغاء الرمز",
  "Replace code": "استبدال الرمز",
  "Revoke this code?": "إلغاء هذا الرمز؟",
  "The code stops working now. Anyone who already joined keeps their membership.": "يتوقف الرمز عن العمل الآن. من انضم سابقًا يحتفظ بعضويته.",
  "Replace this code?": "استبدال هذا الرمز؟",
  "The old code stops working now. Anyone who already joined keeps their membership.": "يتوقف الرمز القديم عن العمل الآن. من انضم سابقًا يحتفظ بعضويته.",
  "Code revoked.": "أُلغي الرمز.",
  "Code replaced. The new code is {code}.": "استُبدل الرمز. الرمز الجديد هو {code}.",
  "Couldn't revoke this code. Try again.": "تعذّر إلغاء هذا الرمز. حاول مرة أخرى.",
  "Couldn't replace this code. Try again.": "تعذّر استبدال هذا الرمز. حاول مرة أخرى.",
  "You need Members access to change member codes. Ask the owner.": "تحتاج إلى صلاحية الأعضاء لتغيير رموز العضوية. اطلبها من المالك.",
  "That code couldn't be found. Refresh and try again.": "تعذّر العثور على هذا الرمز. حدّث الصفحة وحاول مرة أخرى.",
  Used: "مستخدَم",
  "Single use": "استخدام واحد",
  "Used {n} of {max}": "استُخدم {n} من {max}",
  "1 person": "شخص واحد",
  "Up to {n} people": {
    zero: "حتى {n} شخص",
    one: "حتى شخص واحد",
    two: "حتى شخصين",
    few: "حتى {n} أشخاص",
    many: "حتى {n} شخصًا",
    other: "حتى {n} شخص",
  },
  "This code no longer works. Ask the gym for a new one.": "هذا الرمز لم يعد يعمل. اطلب رمزًا جديدًا من النادي.",
  "That code has expired. Ask the business for a new one.": "انتهت صلاحية هذا الرمز. اطلب رمزًا جديدًا من النشاط التجاري.",
  "That code is for your own business, so you can't join with it.": "هذا الرمز لنشاطك التجاري نفسه، لذا لا يمكنك الانضمام به.",
  "You work at this business, so you can't join it with a member code.": "أنت تعمل في هذا النشاط التجاري، لذا لا يمكنك الانضمام إليه برمز عضوية.",
  "You're already a member of this business.": "أنت عضو في هذا النشاط التجاري بالفعل.",
  "This gym admits members aged {age} and over.": "يقبل هذا النادي الأعضاء من عمر {age} وما فوق.",
  "This gym has a minimum age for members.": "لهذا النادي حدّ أدنى لعمر الأعضاء.",
  "That plan is no longer available. Ask the business for a new code.": "هذه الخطة لم تعد متاحة. اطلب رمزًا جديدًا من النشاط التجاري.",
};

export default venues;
