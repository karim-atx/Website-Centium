// The business lane's answers, kept inside the onboarding draft (one object so
// the shell's draft persistence carries it whole: localStorage on this device,
// onboarding_drafts.payload on the server, B5). Pure types and helpers.

import {
  type BizFlowKey,
  businessTypeFor,
  defaultEssentials,
  defaultHours,
  policyDocs,
  type PolicyDoc,
  type Area,
  type BizLane,
  type BizStepKey,
  type DayHours,
  type Essentials,
  type Location,
  type PolicyKind,
  type StoreType,
} from "./lanes";

export interface UploadSlot {
  /** Storage object path once uploaded (business-verification, private). */
  path: string | null;
  fileName: string | null;
  sizeBytes: number | null;
}

export interface BusinessLaneDraft {
  v: 1;
  lane: BizLane | null;
  storeType: StoreType | null;
  /** Server ids once created (business_profiles.id, gyms.id, membership_plans.id). */
  businessId: string | null;
  gymId: string | null;
  planId: string | null;
  /** Steps answered offline, written on the next save that reaches the server. */
  unsynced: BizFlowKey[];
  // Step 1
  coverPath: string | null;
  logoPath: string | null;
  name: string;
  description: string;
  categories: string[];
  phone: string;
  email: string;
  instagram: string;
  website: string;
  // Step 2
  location: Location;
  extraLocations: Location[];
  hours: DayHours[];
  areas: Area[];
  // Step 3
  essentials: Essentials;
  // Step 4
  /** Edited document text by kind; absent = the template. */
  docEdits: Partial<Record<PolicyKind, string[]>>;
  proof: UploadSlot;
  idFront: UploadSlot;
  idBack: UploadSlot;
  // Step 5
  cash: boolean;
  // Step 6
  termsAccepted: boolean;
  /** The furthest step reached (for Back / Edit jumps). */
  reached: BizStepKey | null;
  submittedAt: string | null;
}

export const emptySlot = (): UploadSlot => ({ path: null, fileName: null, sizeBytes: null });

export function emptyBusinessDraft(): BusinessLaneDraft {
  return {
    v: 1,
    lane: null,
    storeType: null,
    businessId: null,
    gymId: null,
    planId: null,
    unsynced: [],
    coverPath: null,
    logoPath: null,
    name: "",
    description: "",
    categories: [],
    phone: "",
    email: "",
    instagram: "",
    website: "",
    location: { address: "", lat: null, lng: null },
    extraLocations: [],
    hours: defaultHours("gym"),
    areas: [],
    essentials: defaultEssentials("gym", null),
    docEdits: {},
    proof: emptySlot(),
    idFront: emptySlot(),
    idBack: emptySlot(),
    cash: true,
    termsAccepted: false,
    reached: null,
    submittedAt: null,
  };
}

/**
 * A lane picked (or switched): the type-specific answers reset to the new
 * lane's defaults; basics, location and photos stay (OB-065 "Basics, location
 * and photos stay"). Hours keep what was set unless nothing was touched yet.
 */
export function withLane(d: BusinessLaneDraft, lane: BizLane, storeType: StoreType | null): BusinessLaneDraft {
  const sameLane = d.lane === lane;
  return {
    ...d,
    lane,
    storeType: lane === "store" ? storeType : null,
    categories: sameLane && d.storeType === storeType ? d.categories : [],
    hours: sameLane ? d.hours : defaultHours(lane),
    areas: lane === "gym" ? d.areas : [],
    essentials: sameLane && d.storeType === storeType ? d.essentials : defaultEssentials(lane, storeType),
    docEdits: sameLane ? d.docEdits : {},
  };
}

/**
 * Whether switching away would clear answers (so the pop-up is worth asking):
 * any step continued past, or Step 1 categories picked for this type.
 */
export function hasTypeAnswers(d: BusinessLaneDraft): boolean {
  return d.reached !== null || d.categories.length > 0;
}

/**
 * This business's documents: the lane's templates built from its answers,
 * the owner's edits applied; Delivery terms only when it delivers (OURS).
 */
export function docsFor(d: BusinessLaneDraft): PolicyDoc[] {
  if (!d.lane) return [];
  return policyDocs(d.lane, d.storeType, d.essentials)
    .filter((doc) => !(doc.kind === "delivery" && !d.essentials.delivery))
    .map((doc) => (d.docEdits[doc.kind] ? { ...doc, lines: d.docEdits[doc.kind]! } : doc));
}

/** Merge a stored draft over today's defaults (fields added later are filled in). */
export function normaliseBusinessDraft(raw: unknown): BusinessLaneDraft {
  const base = emptyBusinessDraft();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<BusinessLaneDraft>;
  const lane = r.lane ?? null;
  return {
    ...base,
    ...r,
    v: 1,
    location: { ...base.location, ...(r.location ?? {}) },
    hours: Array.isArray(r.hours) && r.hours.length === 7 ? r.hours : lane ? defaultHours(lane) : base.hours,
    essentials: { ...defaultEssentials(lane ?? "gym", r.storeType ?? null), ...(r.essentials ?? {}) },
    proof: { ...emptySlot(), ...(r.proof ?? {}) },
    idFront: { ...emptySlot(), ...(r.idFront ?? {}) },
    idBack: { ...emptySlot(), ...(r.idBack ?? {}) },
    docEdits: r.docEdits ?? {},
    extraLocations: Array.isArray(r.extraLocations) ? r.extraLocations : [],
    areas: Array.isArray(r.areas) ? r.areas : [],
    categories: Array.isArray(r.categories) ? r.categories : [],
    unsynced: Array.isArray(r.unsynced) ? r.unsynced : [],
  };
}

/** The onboarding draft's business fields the flow reads (resume, sync, finish), from the lane draft. */
export function mirrorFields(b: BusinessLaneDraft): { businessName: string; businessType: string | null; businessId: string | null } {
  return { businessName: b.name, businessType: b.lane ? businessTypeFor(b.lane, b.storeType) : null, businessId: b.businessId };
}
