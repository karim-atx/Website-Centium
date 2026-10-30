import { appLocale } from "../../../i18n/format";
import { t, tk, tn } from "../../../i18n/core";
// The business onboarding lanes (Classes, Gym, Store): what each lane asks,
// its literal wording and sample-free defaults, and the pure rules (validation,
// summaries, the mapping onto the database). Pure (no React, no storage) so it
// is tested in node.
//
// Source of every string and number here: design-handover/business-ui/handoff
// source/BizOnboardingV10.dc.html (the steps) and SharedOnboardingV4.dc.html
// (the type step), COPY.md "Business onboarding lanes". Where a value is ours
// (not in the handover) it says OURS next to it.
//
// Round F: display labels in constants are tk() keys, shown through t(); the
// functions that build display text call t() (they run during render). Option
// values (category chips, amenities, plan types) stay English in the draft and
// the database; the policy templates' `lines` are the stored document body and
// stay English (see policyDocs).

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

/** English keys (reviewItems matches a reviewer's step name against them); shown through t(). */
export function bizStepNames(lane: BizLane): Record<BizStepKey, string> {
  return {
    business: tk("Your business"),
    where: tk("Where and when"),
    essentials: lane === "gym" ? tk("Gym essentials") : lane === "classes" ? tk("Class essentials") : tk("Store essentials"),
    policies: tk("Policies and verification"),
    payments: tk("Payments"),
    review: tk("Review and submit"),
  };
}

export const LANE_CHIP: Record<BizLane, string> = { classes: tk("Classes"), gym: tk("Gym"), store: tk("Store") };

// ---------------------------------------------------------------------------
// The type step (SharedOnboardingV4 bizType)

export const TYPE_CARDS: { key: BizLane; title: string; desc: string; points: [string, string] }[] = [
  { key: "classes", title: tk("Classes"), desc: tk("A studio with a class schedule."), points: [tk("Schedule sessions and take bookings"), tk("Manage instructors and class sizes")] },
  { key: "gym", title: tk("Gym"), desc: tk("Memberships, day passes and open gym."), points: [tk("Sell plans and day passes"), tk("Check members in at the door")] },
  { key: "store", title: tk("Store"), desc: tk("Products or services to buy."), points: [tk("List products with prices and stock"), tk("Offer pickup or delivery")] },
];

export const STORE_TYPES: { key: StoreType; title: string; desc: string }[] = [
  { key: "store", title: tk("Store"), desc: tk("General store, a bit of everything") },
  { key: "supplement_store", title: tk("Supplement Store"), desc: tk("Protein, vitamins, pre-workout") },
  { key: "equipment_seller", title: tk("Equipment Seller"), desc: tk("Weights, machines and gear") },
  { key: "wellness_service", title: tk("Wellness Service"), desc: tk("Massage, spa and recovery") },
  { key: "clothing_store", title: tk("Clothing Store"), desc: tk("Activewear and shoes") },
  { key: "meal_prep_service", title: tk("Meal-Prepping Service"), desc: tk("Ready meals and weekly plans") },
];

/** The store sub-type's name, translated (shown). */
export const storeTypeLabel = (s: StoreType | null): string => t(STORE_TYPES.find((x) => x.key === s)?.title ?? "Store");

export function typeCardsNote(sel: BizLane | null, storeConfirmed: boolean): string {
  if (sel === "classes") return t("Next, set up your classes: class types, a first class, booking policies and class sizes.");
  if (sel === "gym") return t("Next, set up your gym: amenities, hours, plans, day passes and entry rules.");
  if (sel === "store" && storeConfirmed) return t("Next, set up your store: what you sell, a first listing, delivery and returns.");
  return t("The next steps adapt to the type you pick.");
}

/** "Switch to {type}?" pop-up: what the old type loses (SharedOnboardingV4 `change`). */
export function switchPopup(from: BizLane, to: BizLane): { title: string; body: string; confirm: string; keep: string } {
  const lost: Record<BizLane, string> = {
    gym: tk("amenities, hours by area, membership plans, day passes, entry rules and your waiver"),
    // OURS: the Classes and Store lists (only Gym → Classes is drawn).
    classes: tk("class types, booking policies, class sizes, intro offer and your waiver and class terms"),
    store: tk("what you sell, delivery and pickup, returns and your store policies"),
  };
  const toType = t(LANE_CHIP[to]);
  const fromType = t(LANE_CHIP[from]);
  return {
    title: t("Switch to {type}?", { type: toType }),
    body: t("Your {type} setup answers will be cleared: {lost}. Basics, location and photos stay.", { type: fromType, lost: t(lost[from]) }),
    confirm: t("Switch to {type}", { type: toType }),
    keep: t("Keep {type}", { type: fromType }),
  };
}

// ---------------------------------------------------------------------------
// Step 1 · Your business

export function categoryLabel(lane: BizLane): string {
  return lane === "gym" ? t("Training styles") : lane === "classes" ? t("Activities") : t("What you sell");
}

/** The full list behind More; the first `shown` are chips on the page. Values (English, stored); shown through t(). */
export function categoryOptions(lane: BizLane, storeType: StoreType | null): { all: string[]; shown: number } {
  if (lane === "gym") return { all: [tk("Strength"), tk("HIIT"), tk("Spin"), tk("Boxing"), tk("CrossFit"), tk("Swimming"), tk("Mobility")], shown: 5 };
  if (lane === "classes") return { all: [tk("Yoga"), tk("Pilates"), tk("Barre"), tk("Breathwork"), tk("Dance"), tk("Meditation"), tk("Mobility")], shown: 5 };
  const lists: Record<StoreType, string[]> = {
    supplement_store: [tk("Protein"), tk("Vitamins and minerals"), tk("Pre-workout"), tk("Recovery"), tk("Snacks and bars"), tk("Weight gainers")],
    // OURS: the other five sub-types' lists (COPY: "categories from the store sub-type"; only Supplement Store is drawn).
    store: [tk("Supplements"), tk("Equipment"), tk("Activewear"), tk("Snacks and drinks"), tk("Accessories"), tk("Recovery")],
    equipment_seller: [tk("Weights"), tk("Machines"), tk("Cardio"), tk("Mats and accessories"), tk("Recovery tools"), tk("Bags and gear")],
    wellness_service: [tk("Massage"), tk("Spa"), tk("Recovery"), tk("Stretching"), tk("Physiotherapy"), tk("Nutrition advice")],
    clothing_store: [tk("Activewear"), tk("Shoes"), tk("Sportswear"), tk("Accessories"), tk("Swimwear"), tk("Outerwear")],
    meal_prep_service: [tk("Ready meals"), tk("Weekly plans"), tk("High protein"), tk("Vegetarian"), tk("Snacks"), tk("Juices")],
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
  return lane === "gym" ? t("e.g. Iron Peak Gym") : lane === "classes" ? t("e.g. Studio One") : t("e.g. Green Leaf Supplements");
}

export function coverLabel(lane: BizLane): string {
  return lane === "classes" ? t("studio cover photo") : lane === "gym" ? t("gym cover photo") : t("store cover photo");
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
  if (!b.coverPath) e.cover = t("Add a cover photo. It's the first thing clients see.");
  if (!b.name.trim()) e.name = t("Add your business name.");
  if (!phoneValid(b.phone)) e.phone = t("Add the country code, like +000 00 000 000.");
  // OURS: the email and Instagram messages (COPY: "Email (required, valid)").
  if (!emailValid(b.email)) e.email = t("Add an email clients can reach you at.");
  if (!instagramValid(b.instagram)) e.instagram = t("Use your Instagram handle, like @yourbusiness.");
  return e;
}

/** "Fix 3 things to continue." */
export function fixCountLine(n: number): string {
  return tn(n, "Fix {n} thing to continue.", "Fix {n} things to continue.");
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

/** English keys; shown through t(). */
export const DAY_SHORT_MON = [tk("Mon"), tk("Tue"), tk("Wed"), tk("Thu"), tk("Fri"), tk("Sat"), tk("Sun")];

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
  return `${H % 12 || 12}:${String(M).padStart(2, "0")} ${H < 12 ? t("AM") : t("PM")}`;
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
  if (!loc.address.trim()) e.address = t("Add your address.");
  // OURS: a venue row needs coordinates (gyms.lat / lng NOT NULL), so the pin is required.
  else if (loc.lat == null || loc.lng == null) e.address = t("Place the pin on the map so clients can find your entrance.");
  if (!hours.some((h) => h.open)) e.hours = t("Open at least one day.");
  return e;
}

/** "Mon to Fri 6:00 AM to 9:00 PM" for the review summary (first open run). */
export function hoursSummary(hours: DayHours[]): string {
  const open = hours.filter((h) => h.open);
  if (open.length === 0) return t("Closed every day");
  const first = open[0];
  let last = first;
  for (const h of open.slice(1)) {
    if (h.weekday === last.weekday + 1 && h.opens === first.opens && h.closes === first.closes) last = h;
    else break;
  }
  const day = (w: number) => t(DAY_SHORT_MON[w - 1]);
  const days = first === last ? day(first.weekday) : t("{from} to {to}", { from: day(first.weekday), to: day(last.weekday) });
  return t("{days} {opens} to {closes}", { days, opens: fmt12(first.opens), closes: fmt12(first.closes) });
}

// ---------------------------------------------------------------------------
// Step 3 · Essentials

export const CLASS_TYPES = [tk("Yoga"), tk("Pilates"), tk("Barre"), tk("Spin"), tk("Meditation"), tk("Dance"), tk("Mobility"), tk("Breathwork")];
// OURS: the extra class types behind More (the frame shows the More chip only).
export const CLASS_TYPES_MORE = [tk("Strength"), tk("HIIT"), tk("Boxing"), tk("Stretching"), tk("Prenatal")];
export const AMENITIES = [tk("Showers"), tk("Lockers"), tk("Towels"), tk("Parking"), tk("Sauna"), tk("Pool"), tk("Wi-Fi"), tk("Café")];
// OURS: the extra amenities behind More, each one amenity_vocabulary() can hold
// (B13 MK-02: gyms.amenities is a fixed list; "Steam room" and "Juice bar"
// had no key, so they were replaced).
export const AMENITIES_MORE = [tk("Changing rooms"), tk("Drinking water"), tk("Childcare"), tk("Accessible entrance")];

/** The onboarding chip labels as amenity_vocabulary() keys (gyms_amenities_known). */
const AMENITY_KEY_OF: Record<string, string> = {
  Showers: "showers",
  Lockers: "lockers",
  "Changing rooms": "changing_rooms",
  Towels: "towels",
  Parking: "parking",
  "Wi-Fi": "wifi",
  "Drinking water": "water",
  Café: "cafe",
  Sauna: "sauna",
  Pool: "pool",
  Childcare: "childcare",
  "Accessible entrance": "accessible",
};

/**
 * The draft's amenity labels as gyms.amenities keys, once each. A label with
 * no key (an older draft's "Steam room" or "Juice bar") is left out: the
 * column refuses anything outside the vocabulary.
 */
export function amenityKeysOf(labels: readonly string[]): string[] {
  return [...new Set(labels.map((l) => AMENITY_KEY_OF[l.trim()]).filter((k): k is string => !!k))];
}

export const CANCEL_OPTIONS = [12, 24, 2] as const;
export type CancelHours = (typeof CANCEL_OPTIONS)[number];

export type ReturnsRule = "returns_14" | "exchanges_only" | "no_returns";
export const RETURNS_OPTIONS: { key: ReturnsRule; title: string; desc?: string }[] = [
  { key: "returns_14", title: tk("Returns within 14 days"), desc: tk("Unopened items only") },
  { key: "exchanges_only", title: tk("Exchanges only") },
  { key: "no_returns", title: tk("No returns") },
];

/** Stored values (English); shown through t(). */
export type PlanType = "Monthly" | "Visit pack" | "Annual";
export const PLAN_TYPES: PlanType[] = [tk("Monthly"), tk("Visit pack"), tk("Annual")];
export const PLAN_INCLUDES = [tk("Main floor"), tk("Pool"), tk("Sauna"), tk("Classes")];

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
  if (lane === "classes" && e.classTypes.length === 0) out.push(t("Pick at least one class type.")); // OURS
  if (lane === "gym" && e.amenities.length === 0) out.push(t("Pick at least one facility.")); // OURS (V6-132: required)
  if (lane === "store") {
    if (categories.length === 0) out.push(t("Pick at least one thing you sell.")); // OURS
    if (!e.sellsProducts && !e.offersAppointments) out.push(t("Turn on Sells products or Offers appointments."));
    if (e.sellsProducts && !e.pickup && !e.delivery) out.push(t("Turn on pickup or delivery.")); // OURS (COPY: "at least one on")
  }
  return out;
}

/** The collapsible summaries (the line under each title). */
export function essentialsSummaries(lane: BizLane, e: Essentials, categories: string[], address: string) {
  // The picked values are English (stored); each is shown through t().
  const list = (a: string[]) => (a.length ? a.map((x) => t(x)).join(t(", ")) : t("Nothing picked yet")); // OURS empty line
  if (lane === "classes") {
    return {
      a: list(e.classTypes),
      b: t("Free cancel until {hours} hours before · book {days} days ahead", { hours: e.cancelHours, days: e.bookAheadDays }),
      c: t("{spots} spots · waitlist of {waitlist}", { spots: e.spots, waitlist: e.waitlist }),
      d: e.introOn ? (e.introKind === "first_free" ? t("First class free") : e.introPrice ? t("Intro pack · ${price}", { price: e.introPrice }) : t("Intro pack")) : t("Off"),
    };
  }
  if (lane === "gym") {
    const checks = [t("QR check-in"), t("{age} and over", { age: e.minAge })].filter(Boolean).join(" · ");
    return {
      a: list(e.amenities).replace(/(^|, )\w/g, (m) => m.toLowerCase()).replace(/^./, (m) => m.toUpperCase()),
      b: checks,
      c: e.starterPlan ? `${e.starterPlan.name} · $${e.starterPlan.price}` : e.planSkipped ? t("Skipped for now") : t("Not added yet"),
      d: e.dayPassOn ? (e.dayPassPrice ? t("On · ${price}", { price: e.dayPassPrice }) : t("On")) : t("Off"),
    };
  }
  const offer = [e.sellsProducts ? t("Sells products") : null, e.offersAppointments ? t("Appointments") : null, e.delivery ? t("Delivery") : null, e.pickup ? t("Pickup") : null]
    .filter(Boolean)
    .join(" · ");
  const delivery =
    [e.pickup ? t("Pickup in store") : null, e.delivery ? (e.deliveryFee ? t("delivery ${fee}", { fee: e.deliveryFee }) : t("delivery")) : null].filter(Boolean).join(" · ") || t("Off");
  const returns = e.returnsRule === "returns_14" ? t("14 days, unopened") : e.returnsRule === "exchanges_only" ? t("Exchanges only") : t("No returns");
  return {
    o: offer || t("Nothing on yet"),
    a: list(categories),
    b: delivery,
    c: e.allowExchanges && e.returnsRule !== "no_returns" ? t("{returns} · exchanges in 30 days", { returns }) : returns,
    d: e.offersAppointments ? t("{n} min sessions", { n: e.sessionLength }) : t("Off"),
    address,
  };
}

// ---------------------------------------------------------------------------
// Step 4 · Policies and verification

export type PolicyKind = "waiver" | "class_terms" | "house_rules" | "returns" | "delivery" | "appointment_waiver";

export interface PolicyDoc {
  kind: PolicyKind;
  /** tk() keys, shown through t(). */
  title: string;
  sub: string;
  icon: "file-check" | "file-text" | "scroll-text" | "rotate-ccw" | "truck";
  optional?: boolean;
  /**
   * The document's text; template until the owner edits it. Stored as the
   * policy body (docBody), so it stays English: a translated template is a
   * legal decision (Round F report).
   */
  lines: string[];
}

/** The documents per lane, from the templates (BizOnboardingV10 docs + preview). */
export function policyDocs(lane: BizLane, storeType: StoreType | null, e?: Essentials): PolicyDoc[] {
  if (lane === "classes") {
    return [
      { kind: "waiver", title: tk("Liability waiver"), sub: tk("Accepted once, before the first booking"), icon: "file-check", lines: ["Liability waiver", "Before your first class", "• Tell your instructor about any injury or condition.", "• Use props and equipment only as shown.", "• Stop if you feel pain or dizziness.", "By booking, you accept that exercise carries some risk."] },
      { kind: "class_terms", title: tk("Class terms"), sub: tk("Shown at checkout"), icon: "file-text", lines: ["Class terms", "Bookings and cancellations", `• Cancel free until ${e?.cancelHours ?? 12} hours before class.`, "• Late cancels count as a used class."] },
    ];
  }
  if (lane === "gym") {
    return [
      { kind: "waiver", title: tk("Liability waiver"), sub: tk("Accepted once, before the first visit"), icon: "file-check", lines: ["Liability waiver", "Before your first visit", "• Tell staff about any injury or condition.", "• Use equipment only as shown.", "• Under 16s need a parent or guardian.", "By joining, you accept that exercise carries some risk."] },
      { kind: "house_rules", title: tk("House rules"), sub: tk("Optional · shown at the front desk"), icon: "scroll-text", optional: true, lines: ["House rules", "On the floor", "• Wipe equipment after use.", "• Re-rack weights when you're done."] },
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
    { kind: "returns", title: tk("Returns policy"), sub: tk("Built from your answers"), icon: "rotate-ccw", lines: ["Returns policy", "Returns", ...returnsLines, ...(storeType === "supplement_store" && rule !== "no_returns" ? ["Opened supplements can't be returned for safety."] : [])] },
    { kind: "delivery", title: tk("Delivery terms"), sub: tk("Shown at checkout"), icon: "truck", lines: ["Delivery terms", "Delivery", ...deliveryLines] },
  ];
  // COPY: Wellness Service adds a waiver for appointments.
  if (storeType === "wellness_service") {
    docs.push({ kind: "appointment_waiver", title: tk("Appointment waiver"), sub: tk("Accepted once, before the first appointment"), icon: "file-check", lines: ["Appointment waiver", "Before your first appointment", "• Tell your therapist about any injury or condition.", "• Stop if you feel pain or dizziness.", "By booking, you accept that treatments carry some risk."] });
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
  return lane === "store" ? t("Paid at pickup or on delivery") : lane === "classes" ? t("Paid at the studio") : t("Paid at the front desk");
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
    return h && h.open ? t("Open today {opens} to {closes}", { opens: fmt12(h.opens), closes: fmt12(h.closes) }) : t("Closed today");
  }
  if (lane === "classes") {
    const first = hours.find((h) => h.open);
    const dayNames = [tk("Monday"), tk("Tuesday"), tk("Wednesday"), tk("Thursday"), tk("Friday"), tk("Saturday"), tk("Sunday")];
    return first ? t("Classes from {day}, {time}", { day: t(dayNames[first.weekday - 1]), time: fmt12(first.opens) }) : t("Classes schedule coming soon");
  }
  const parts = [e.pickup ? t("Pickup in {area}", { area }) : null, e.delivery ? t("Delivery") : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : t("Appointments");
}

/** The neighbourhood part of an address: the last comma part. */
export function areaOf(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
}

export const TERMS_ERROR = tk("Accept the Business Terms and Privacy Policy to submit.");

// ---------------------------------------------------------------------------
// After submitting

export function approvedBody(lane: BizLane, name: string): string {
  return lane === "classes"
    ? t("{name} is on Explore. Clients can book your classes.", { name })
    : lane === "gym"
    ? t("{name} is on Explore. People can join and buy day passes.", { name })
    : t("{name} is on Explore. Clients can order for pickup or delivery.", { name });
}

/** "Gym", "Classes", or the store sub-type's name (translated). */
export function laneTypeLabel(lane: BizLane | null, storeType: StoreType | null): string {
  return lane === "gym" ? t("Gym") : lane === "classes" ? t("Classes") : storeTypeLabel(storeType);
}

/** "Today, 10:42 AM" / "Oct 12, 10:42 AM" (12-hour) and its day column. */
export function submittedLabel(iso: string | null, now: Date = new Date()): { line: string; day: string } {
  if (!iso) return { line: "", day: "" };
  const d = new Date(iso);
  const time = d.toLocaleTimeString(appLocale("en-US"), { hour: "numeric", minute: "2-digit" });
  const same = d.toDateString() === now.toDateString();
  const day = same ? t("Today") : d.toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
  return { line: t("{day}, {time}", { day, time }), day };
}
