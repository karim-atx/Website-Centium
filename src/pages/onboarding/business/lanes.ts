// The business onboarding lanes (Classes, Gym, Store): what each lane asks,
// its literal wording and sample-free defaults, and the pure rules (validation,
// summaries, the mapping onto the database). Pure (no React, no storage) so it
// is tested in node.
//
// Source of every string and number here: design-handover/business-ui/handoff
// source/BizOnboardingV10.dc.html (the steps) and SharedOnboardingV4.dc.html
// (the type step), COPY.md "Business onboarding lanes". Where a value is ours
// (not in the handover) it says OURS next to it.

export type BizLane = "classes" | "gym" | "store";

/** The six store sub-types (the business_type enum values a Store lane stores). */
export type StoreType =
  | "store"
  | "supplement_store"
  | "equipment_seller"
  | "wellness_service"
  | "clothing_store"
  | "meal_prep_service";

/** What business_profiles.business_type stores for a lane. Classes = "studio" (D8). */
export function businessTypeFor(lane: BizLane, storeType: StoreType | null): string | null {
  if (lane === "classes") return "studio";
  if (lane === "gym") return "gym";
  return storeType;
}

/** The lane a stored business_type belongs to. */
export function laneForBusinessType(t: string | null | undefined): BizLane | null {
  if (!t) return null;
  if (t === "studio") return "classes";
  if (t === "gym") return "gym";
  return "store";
}

/** The six numbered steps by their flow keys (onboardingSteps.ts BIZ_FLOW_STEPS after the type step). */
export const BIZ_STEPS = ["bizBusiness", "bizWhere", "bizEssentials", "bizPolicies", "bizPayments", "bizReview"] as const;
export type BizFlowKey = (typeof BIZ_STEPS)[number];

export const BIZ_STEP_KEYS = ["business", "where", "essentials", "policies", "payments", "review"] as const;
export type BizStepKey = (typeof BIZ_STEP_KEYS)[number];

export function bizStepNames(lane: BizLane): Record<BizStepKey, string> {
  return {
    business: "Your business",
    where: "Where and when",
    essentials: lane === "gym" ? "Gym essentials" : lane === "classes" ? "Class essentials" : "Store essentials",
    policies: "Policies and verification",
    payments: "Payments",
    review: "Review and submit",
  };
}

export const LANE_CHIP: Record<BizLane, string> = { classes: "Classes", gym: "Gym", store: "Store" };

// ---------------------------------------------------------------------------
// The type step (SharedOnboardingV4 bizType)

export const TYPE_CARDS: { key: BizLane; title: string; desc: string; points: [string, string] }[] = [
  { key: "classes", title: "Classes", desc: "A studio with a class schedule.", points: ["Schedule sessions and take bookings", "Manage instructors and class sizes"] },
  { key: "gym", title: "Gym", desc: "Memberships, day passes and open gym.", points: ["Sell plans and day passes", "Check members in at the door"] },
  { key: "store", title: "Store", desc: "Products or services to buy.", points: ["List products with prices and stock", "Offer pickup or delivery"] },
];

export const STORE_TYPES: { key: StoreType; title: string; desc: string }[] = [
  { key: "store", title: "Store", desc: "General store, a bit of everything" },
  { key: "supplement_store", title: "Supplement Store", desc: "Protein, vitamins, pre-workout" },
  { key: "equipment_seller", title: "Equipment Seller", desc: "Weights, machines and gear" },
  { key: "wellness_service", title: "Wellness Service", desc: "Massage, spa and recovery" },
  { key: "clothing_store", title: "Clothing Store", desc: "Activewear and shoes" },
  { key: "meal_prep_service", title: "Meal-Prepping Service", desc: "Ready meals and weekly plans" },
];

export const storeTypeLabel = (t: StoreType | null): string =>
  STORE_TYPES.find((s) => s.key === t)?.title ?? "Store";

export function typeCardsNote(sel: BizLane | null, storeConfirmed: boolean): string {
  if (sel === "classes") return "Next, set up your classes: class types, a first class, booking policies and class sizes.";
  if (sel === "gym") return "Next, set up your gym: amenities, hours, plans, day passes and entry rules.";
  if (sel === "store" && storeConfirmed) return "Next, set up your store: what you sell, a first listing, delivery and returns.";
  return "The next steps adapt to the type you pick.";
}

/** "Switch to {type}?" pop-up: what the old type loses (SharedOnboardingV4 `change`). */
export function switchPopup(from: BizLane, to: BizLane): { title: string; body: string; confirm: string; keep: string } {
  const lost: Record<BizLane, string> = {
    gym: "amenities, hours by area, membership plans, day passes, entry rules and your waiver",
    // OURS: the Classes and Store lists (only Gym → Classes is drawn).
    classes: "class types, booking policies, class sizes, intro offer and your waiver and class terms",
    store: "what you sell, delivery and pickup, returns and your store policies",
  };
  return {
    title: `Switch to ${LANE_CHIP[to]}?`,
    body: `Your ${LANE_CHIP[from]} setup answers will be cleared: ${lost[from]}. Basics, location and photos stay.`,
    confirm: `Switch to ${LANE_CHIP[to]}`,
    keep: `Keep ${LANE_CHIP[from]}`,
  };
}

// ---------------------------------------------------------------------------
// Step 1 · Your business

export function categoryLabel(lane: BizLane): string {
  return lane === "gym" ? "Training styles" : lane === "classes" ? "Activities" : "What you sell";
}

/** The full list behind More; the first `shown` are chips on the page. */
export function categoryOptions(lane: BizLane, storeType: StoreType | null): { all: string[]; shown: number } {
  if (lane === "gym") return { all: ["Strength", "HIIT", "Spin", "Boxing", "CrossFit", "Swimming", "Mobility"], shown: 5 };
  if (lane === "classes") return { all: ["Yoga", "Pilates", "Barre", "Breathwork", "Dance", "Meditation", "Mobility"], shown: 5 };
  const lists: Record<StoreType, string[]> = {
    supplement_store: ["Protein", "Vitamins and minerals", "Pre-workout", "Recovery", "Snacks and bars", "Weight gainers"],
    // OURS: the other five sub-types' lists (COPY: "categories from the store sub-type"; only Supplement Store is drawn).
    store: ["Supplements", "Equipment", "Activewear", "Snacks and drinks", "Accessories", "Recovery"],
    equipment_seller: ["Weights", "Machines", "Cardio", "Mats and accessories", "Recovery tools", "Bags and gear"],
    wellness_service: ["Massage", "Spa", "Recovery", "Stretching", "Physiotherapy", "Nutrition advice"],
    clothing_store: ["Activewear", "Shoes", "Sportswear", "Accessories", "Swimwear", "Outerwear"],
    meal_prep_service: ["Ready meals", "Weekly plans", "High protein", "Vegetarian", "Snacks", "Juices"],
  };
  return { all: lists[storeType ?? "supplement_store"], shown: 4 };
}

/** The chips on the page: the first `shown` options, then any picked ones from More. */
export function visibleCategoryChips(all: string[], shown: number, picked: string[]): string[] {
  const base = all.slice(0, shown);
  return base.concat(picked.filter((p) => !base.includes(p)));
}

export const MAX_CATEGORIES = 5;

const DB_CATEGORY: Record<string, string> = {
  Yoga: "yoga", Pilates: "pilates", Barre: "pilates", Dance: "dance", Boxing: "boxing", CrossFit: "crossfit",
  Swimming: "swimming", Strength: "gym", HIIT: "gym", Spin: "gym", Mobility: "recovery", Breathwork: "other",
  Meditation: "other", Protein: "supplements", "Vitamins and minerals": "supplements", "Pre-workout": "supplements",
  "Snacks and bars": "supplements", "Weight gainers": "supplements", Recovery: "recovery", Supplements: "supplements",
  Equipment: "equipment", Weights: "equipment", Machines: "equipment", Cardio: "equipment", "Mats and accessories": "equipment",
  "Recovery tools": "recovery", "Bags and gear": "equipment", Activewear: "clothing", Shoes: "clothing", Sportswear: "clothing",
  Accessories: "other", Swimwear: "clothing", Outerwear: "clothing", Massage: "spa", Spa: "spa", Stretching: "recovery",
  Physiotherapy: "physiotherapy", "Nutrition advice": "nutrition", "Ready meals": "meal_prep", "Weekly plans": "meal_prep",
  "High protein": "meal_prep", Vegetarian: "meal_prep", Snacks: "meal_prep", Juices: "meal_prep", "Snacks and drinks": "supplements",
};

const TYPE_CATEGORY: Record<string, string> = {
  studio: "studio", gym: "gym", store: "other", supplement_store: "supplements", equipment_seller: "equipment",
  wellness_service: "spa", clothing_store: "clothing", meal_prep_service: "meal_prep",
};

/**
 * business_profiles.categories is a closed set of 18 values (max 5). The
 * handover's chips are finer ("Barre", "Pre-workout"), so they are mapped onto
 * the set, the business's own type first, de-duplicated, at most five. The
 * exact chip labels stay in the onboarding draft (BACKEND: no column).
 */
export function dbCategories(businessType: string | null, picked: string[]): string[] {
  const out: string[] = [];
  const add = (v: string | undefined) => {
    if (v && !out.includes(v) && out.length < MAX_CATEGORIES) out.push(v);
  };
  add(businessType ? TYPE_CATEGORY[businessType] : undefined);
  for (const p of picked) add(DB_CATEGORY[p] ?? "other");
  return out;
}

export function namePlaceholder(lane: BizLane): string {
  return lane === "gym" ? "e.g. Iron Peak Gym" : lane === "classes" ? "e.g. Studio One" : "e.g. Green Leaf Supplements";
}

export function coverLabel(lane: BizLane): string {
  return lane === "classes" ? "studio cover photo" : lane === "gym" ? "gym cover photo" : "store cover photo";
}

export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 160;

/** Two letters for the logo tile when there is no logo. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** A phone with a country code: "+" then 7 to 15 digits (spaces allowed). */
export function phoneValid(v: string): boolean {
  const t = v.trim();
  if (!t.startsWith("+")) return false;
  const digits = t.slice(1).replace(/[\s-]/g, "");
  return /^\d{7,15}$/.test(digits);
}

export function emailValid(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** The Instagram handle (the column stores the handle, not a URL). */
export function instagramHandle(v: string): string {
  return v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
}

export function instagramValid(v: string): boolean {
  const h = instagramHandle(v);
  return h === "" || /^[A-Za-z0-9._]{1,30}$/.test(h);
}

export interface BusinessBasics {
  coverPath: string | null;
  name: string;
  phone: string;
  email: string;
  instagram: string;
}

/** Step 1's field errors, in order; empty when it can continue. */
export function yourBusinessErrors(b: BusinessBasics): { cover?: string; name?: string; phone?: string; email?: string; instagram?: string } {
  const e: { cover?: string; name?: string; phone?: string; email?: string; instagram?: string } = {};
  if (!b.coverPath) e.cover = "Add a cover photo. It's the first thing clients see.";
  if (!b.name.trim()) e.name = "Add your business name.";
  if (!phoneValid(b.phone)) e.phone = "Add the country code, like +000 00 000 000.";
  // OURS: the email and Instagram messages (COPY: "Email (required, valid)").
  if (!emailValid(b.email)) e.email = "Add an email clients can reach you at.";
  if (!instagramValid(b.instagram)) e.instagram = "Use your Instagram handle, like @yourbusiness.";
  return e;
}

/** "Fix 3 things to continue." */
export function fixCountLine(n: number): string {
  return n === 1 ? "Fix 1 thing to continue." : `Fix ${n} things to continue.`;
}

// ---------------------------------------------------------------------------
// Step 2 · Where and when

export interface DayHours {
  /** 1 = Monday … 7 = Sunday (gym_hours.weekday). */
  weekday: number;
  open: boolean;
  /** "HH:MM", 24-hour, stored; shown 12-hour. */
  opens: string;
  closes: string;
}

export const DAY_SHORT_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The drawn defaults: weekdays per lane, Saturday 8 to 2, Sunday open except Gym. */
export function defaultHours(lane: BizLane): DayHours[] {
  const base = lane === "store" ? ["10:00", "20:00"] : lane === "classes" ? ["07:00", "20:00"] : ["06:00", "21:00"];
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
    weekday <= 5
      ? { weekday, open: true, opens: base[0], closes: base[1] }
      : { weekday, open: weekday === 6 || lane !== "gym", opens: "08:00", closes: "14:00" }
  );
}

/** "Copy Monday to all weekdays": Tuesday to Friday take Monday's hours. */
export function copyMondayToWeekdays(hours: DayHours[]): DayHours[] {
  const mon = hours.find((h) => h.weekday === 1);
  if (!mon) return hours;
  return hours.map((h) => (h.weekday >= 2 && h.weekday <= 5 ? { ...h, open: mon.open, opens: mon.opens, closes: mon.closes } : h));
}

/** 12-hour label "6:00 AM" from "06:00". */
export function fmt12(hhmm: string): string {
  const [H, M] = hhmm.split(":").map(Number);
  return `${H % 12 || 12}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`;
}

export interface Location {
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface Area {
  name: string;
  hours: DayHours[];
}

export function whereErrors(loc: Location, hours: DayHours[]): { address?: string; hours?: string } {
  const e: { address?: string; hours?: string } = {};
  if (!loc.address.trim()) e.address = "Add your address.";
  // OURS: a venue row needs coordinates (gyms.lat / lng NOT NULL), so the pin is required.
  else if (loc.lat == null || loc.lng == null) e.address = "Place the pin on the map so clients can find your entrance.";
  if (!hours.some((h) => h.open)) e.hours = "Open at least one day.";
  return e;
}

/** "Mon to Fri 6:00 AM to 9:00 PM" for the review summary (first open run). */
export function hoursSummary(hours: DayHours[]): string {
  const open = hours.filter((h) => h.open);
  if (open.length === 0) return "Closed every day";
  const first = open[0];
  let last = first;
  for (const h of open.slice(1)) {
    if (h.weekday === last.weekday + 1 && h.opens === first.opens && h.closes === first.closes) last = h;
    else break;
  }
  const days = first === last ? DAY_SHORT_MON[first.weekday - 1] : `${DAY_SHORT_MON[first.weekday - 1]} to ${DAY_SHORT_MON[last.weekday - 1]}`;
  return `${days} ${fmt12(first.opens)} to ${fmt12(first.closes)}`;
}

// ---------------------------------------------------------------------------
// Step 3 · Essentials

export const CLASS_TYPES = ["Yoga", "Pilates", "Barre", "Spin", "Meditation", "Dance", "Mobility", "Breathwork"];
// OURS: the extra class types behind More (the frame shows the More chip only).
export const CLASS_TYPES_MORE = ["Strength", "HIIT", "Boxing", "Stretching", "Prenatal"];
export const AMENITIES = ["Showers", "Lockers", "Towels", "Parking", "Sauna", "Pool", "Wi-Fi", "Café"];
// OURS: the extra amenities behind More.
export const AMENITIES_MORE = ["Steam room", "Childcare", "Accessible entrance", "Juice bar"];

export const CANCEL_OPTIONS = [12, 24, 2] as const;
export type CancelHours = (typeof CANCEL_OPTIONS)[number];

export type ReturnsRule = "returns_14" | "exchanges_only" | "no_returns";
export const RETURNS_OPTIONS: { key: ReturnsRule; title: string; desc?: string }[] = [
  { key: "returns_14", title: "Returns within 14 days", desc: "Unopened items only" },
  { key: "exchanges_only", title: "Exchanges only" },
  { key: "no_returns", title: "No returns" },
];

export type PlanType = "Monthly" | "Visit pack" | "Annual";
export const PLAN_TYPES: PlanType[] = ["Monthly", "Visit pack", "Annual"];
export const PLAN_INCLUDES = ["Main floor", "Pool", "Sauna", "Classes"];

export interface StarterPlan {
  type: PlanType;
  name: string;
  price: string;
  includes: string[];
}

export interface Essentials {
  // Classes
  classTypes: string[];
  cancelHours: CancelHours;
  bookAheadDays: number;
  closesBeforeMin: number;
  spots: number;
  waitlist: number;
  introOn: boolean;
  introKind: "first_free" | "pack";
  introPrice: string;
  // Gym
  amenities: string[];
  qrCheckIn: boolean;
  frontDeskCheckIn: boolean;
  minAge: number;
  guestPasses: number;
  starterPlan: StarterPlan | null;
  planSkipped: boolean;
  dayPassOn: boolean;
  dayPassPrice: string;
  // Store
  sellsProducts: boolean;
  offersAppointments: boolean;
  pickup: boolean;
  delivery: boolean;
  deliveryFee: string;
  freeOver: string;
  deliveryTime: string;
  returnsRule: ReturnsRule;
  allowExchanges: boolean;
  sessionLength: number;
}

/** The drawn starting values (the frames' own), with nothing picked for types. */
export function defaultEssentials(lane: BizLane, storeType: StoreType | null): Essentials {
  const wellness = storeType === "wellness_service";
  return {
    classTypes: [],
    cancelHours: 12,
    bookAheadDays: 14,
    closesBeforeMin: 30,
    spots: 16,
    waitlist: 5,
    introOn: false,
    introKind: "first_free",
    introPrice: "",
    amenities: [],
    qrCheckIn: true,
    frontDeskCheckIn: true,
    minAge: 16,
    guestPasses: 2,
    starterPlan: null,
    planSkipped: false,
    dayPassOn: false,
    dayPassPrice: "",
    sellsProducts: lane === "store" ? !wellness : false,
    offersAppointments: lane === "store" ? wellness : false,
    pickup: lane === "store" && !wellness,
    delivery: false,
    deliveryFee: "",
    freeOver: "",
    deliveryTime: "",
    returnsRule: "returns_14",
    allowExchanges: false,
    sessionLength: 60,
  };
}

export function essentialsErrors(lane: BizLane, e: Essentials, categories: string[]): string[] {
  const out: string[] = [];
  if (lane === "classes" && e.classTypes.length === 0) out.push("Pick at least one class type."); // OURS
  if (lane === "gym" && e.amenities.length === 0) out.push("Pick at least one facility."); // OURS (V6-132: required)
  if (lane === "store") {
    if (categories.length === 0) out.push("Pick at least one thing you sell."); // OURS
    if (!e.sellsProducts && !e.offersAppointments) out.push("Turn on Sells products or Offers appointments.");
    if (e.sellsProducts && !e.pickup && !e.delivery) out.push("Turn on pickup or delivery."); // OURS (COPY: "at least one on")
  }
  return out;
}

/** The collapsible summaries (the line under each title). */
export function essentialsSummaries(lane: BizLane, e: Essentials, categories: string[], address: string) {
  const list = (a: string[]) => (a.length ? a.join(", ") : "Nothing picked yet"); // OURS empty line
  if (lane === "classes") {
    return {
      a: list(e.classTypes),
      b: `Free cancel until ${e.cancelHours} hours before · book ${e.bookAheadDays} days ahead`,
      c: `${e.spots} spots · waitlist of ${e.waitlist}`,
      d: e.introOn ? (e.introKind === "first_free" ? "First class free" : `Intro pack${e.introPrice ? ` · $${e.introPrice}` : ""}`) : "Off",
    };
  }
  if (lane === "gym") {
    const checks = [e.qrCheckIn ? "QR check-in" : null, `${e.minAge} and over`].filter(Boolean).join(" · ");
    return {
      a: list(e.amenities).replace(/(^|, )\w/g, (m) => m.toLowerCase()).replace(/^./, (m) => m.toUpperCase()),
      b: checks,
      c: e.starterPlan ? `${e.starterPlan.name} · $${e.starterPlan.price}` : e.planSkipped ? "Skipped for now" : "Not added yet",
      d: e.dayPassOn ? `On${e.dayPassPrice ? ` · $${e.dayPassPrice}` : ""}` : "Off",
    };
  }
  const offer = [e.sellsProducts ? "Sells products" : null, e.offersAppointments ? "Appointments" : null, e.delivery ? "Delivery" : null, e.pickup ? "Pickup" : null]
    .filter(Boolean)
    .join(" · ");
  const delivery = [e.pickup ? "Pickup in store" : null, e.delivery ? `delivery${e.deliveryFee ? ` $${e.deliveryFee}` : ""}` : null].filter(Boolean).join(" · ") || "Off";
  const returns = e.returnsRule === "returns_14" ? "14 days, unopened" : e.returnsRule === "exchanges_only" ? "Exchanges only" : "No returns";
  return {
    o: offer || "Nothing on yet",
    a: list(categories),
    b: delivery,
    c: e.allowExchanges && e.returnsRule !== "no_returns" ? `${returns} · exchanges in 30 days` : returns,
    d: e.offersAppointments ? `${e.sessionLength} min sessions` : "Off",
    address,
  };
}

// ---------------------------------------------------------------------------
// Step 4 · Policies and verification

export type PolicyKind = "waiver" | "class_terms" | "house_rules" | "returns" | "delivery" | "appointment_waiver";

export interface PolicyDoc {
  kind: PolicyKind;
  title: string;
  sub: string;
  icon: "file-check" | "file-text" | "scroll-text" | "rotate-ccw" | "truck";
  optional?: boolean;
  /** The document's text; template until the owner edits it. */
  lines: string[];
}

/** The documents per lane, from the templates (BizOnboardingV10 docs + preview). */
export function policyDocs(lane: BizLane, storeType: StoreType | null, e?: Essentials): PolicyDoc[] {
  if (lane === "classes") {
    return [
      { kind: "waiver", title: "Liability waiver", sub: "Accepted once, before the first booking", icon: "file-check", lines: ["Liability waiver", "Before your first class", "• Tell your instructor about any injury or condition.", "• Use props and equipment only as shown.", "• Stop if you feel pain or dizziness.", "By booking, you accept that exercise carries some risk."] },
      { kind: "class_terms", title: "Class terms", sub: "Shown at checkout", icon: "file-text", lines: ["Class terms", "Bookings and cancellations", `• Cancel free until ${e?.cancelHours ?? 12} hours before class.`, "• Late cancels count as a used class."] },
    ];
  }
  if (lane === "gym") {
    return [
      { kind: "waiver", title: "Liability waiver", sub: "Accepted once, before the first visit", icon: "file-check", lines: ["Liability waiver", "Before your first visit", "• Tell staff about any injury or condition.", "• Use equipment only as shown.", "• Under 16s need a parent or guardian.", "By joining, you accept that exercise carries some risk."] },
      { kind: "house_rules", title: "House rules", sub: "Optional · shown at the front desk", icon: "scroll-text", optional: true, lines: ["House rules", "On the floor", "• Wipe equipment after use.", "• Re-rack weights when you're done."] },
    ];
  }
  // "Built from your answers": the returns and delivery lines follow Step 3.
  const rule = e?.returnsRule ?? "returns_14";
  const returnsLines =
    rule === "no_returns"
      ? ["• Sales are final. We don't take returns."]
      : [
          rule === "returns_14" ? "• Return unopened items within 14 days." : "• We exchange items, we don't refund them.",
          ...(e?.allowExchanges || rule === "exchanges_only" ? ["• Exchanges within 30 days with a receipt."] : []),
          "• Bring your receipt or order number.",
          ...(rule === "returns_14" ? ["• Refunds go back to the original payment."] : []),
        ];
  const fee = e?.deliveryFee ? "$" + e.deliveryFee : null;
  const over = e?.freeOver ? "$" + e.freeOver : null;
  const deliveryLines = [
    `• We deliver within ${e?.deliveryTime?.trim() || "1 to 2 days"}.`,
    fee ? `• Delivery is ${fee}${over ? `, free over ${over}` : ""}.` : over ? `• Free delivery over ${over}.` : "• Delivery fees are shown at checkout.",
    "• Someone must be there to receive the order.",
  ];
  const docs: PolicyDoc[] = [
    { kind: "returns", title: "Returns policy", sub: "Built from your answers", icon: "rotate-ccw", lines: ["Returns policy", "Returns", ...returnsLines, ...(storeType === "supplement_store" && rule !== "no_returns" ? ["Opened supplements can't be returned for safety."] : [])] },
    { kind: "delivery", title: "Delivery terms", sub: "Shown at checkout", icon: "truck", lines: ["Delivery terms", "Delivery", ...deliveryLines] },
  ];
  // COPY: Wellness Service adds a waiver for appointments.
  if (storeType === "wellness_service") {
    docs.push({ kind: "appointment_waiver", title: "Appointment waiver", sub: "Accepted once, before the first appointment", icon: "file-check", lines: ["Appointment waiver", "Before your first appointment", "• Tell your therapist about any injury or condition.", "• Stop if you feel pain or dizziness.", "By booking, you accept that treatments carry some risk."] });
  }
  return docs;
}

/** The three short lines on the document card (heading + two bullets, no "•"). */
export function docCardLines(doc: PolicyDoc): [string, string, string] {
  const body = doc.lines.slice(1);
  const bullets = body.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, ""));
  return [body[0] ?? "", bullets[0] ?? "", bullets[1] ?? ""];
}

/** A document's stored body (policy_versions.body). */
export function docBody(doc: PolicyDoc): string {
  return doc.lines.join("\n");
}

/** Age in whole years from "YYYY-MM-DD". */
export function ageFrom(dob: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Step 5 · Payments

export function cashLine(lane: BizLane): string {
  return lane === "store" ? "Paid at pickup or on delivery" : lane === "classes" ? "Paid at the studio" : "Paid at the front desk";
}

/** "$29" from a tier price: no cents when whole. */
export function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Step 6 · Review

export function listingTags(categories: string[]): string[] {
  return categories.slice(0, 3);
}

/** The listing preview's line (BizOnboardingV10 PREV). */
export function listingLine(lane: BizLane, hours: DayHours[], e: Essentials, area: string): string {
  if (lane === "gym") {
    const today = ((new Date().getDay() + 6) % 7) + 1;
    const h = hours.find((x) => x.weekday === today);
    return h && h.open ? `Open today ${fmt12(h.opens)} to ${fmt12(h.closes)}` : "Closed today";
  }
  if (lane === "classes") {
    const first = hours.find((h) => h.open);
    return first ? `Classes from ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][first.weekday - 1]}, ${fmt12(first.opens)}` : "Classes schedule coming soon";
  }
  const parts = [e.pickup ? `Pickup in ${area}` : null, e.delivery ? "Delivery" : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Appointments";
}

/** The neighbourhood part of an address: the last comma part. */
export function areaOf(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
}

export const TERMS_ERROR = "Accept the Business Terms and Privacy Policy to submit.";

// ---------------------------------------------------------------------------
// After submitting

export function approvedBody(lane: BizLane, name: string): string {
  return `${name} is on Explore. ${lane === "classes" ? "Clients can book your classes." : lane === "gym" ? "People can join and buy day passes." : "Clients can order for pickup or delivery."}`;
}

/** "Gym", "Classes", or the store sub-type's name. */
export function laneTypeLabel(lane: BizLane | null, storeType: StoreType | null): string {
  return lane === "gym" ? "Gym" : lane === "classes" ? "Classes" : storeTypeLabel(storeType);
}

/** "Today, 10:42 AM" / "Oct 12, 10:42 AM" (12-hour) and its day column. */
export function submittedLabel(iso: string | null, now: Date = new Date()): { line: string; day: string } {
  if (!iso) return { line: "", day: "" };
  const d = new Date(iso);
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const same = d.toDateString() === now.toDateString();
  const day = same ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { line: `${day}, ${t}`, day };
}
