// Core data model for the Centium prototype.
// Deliberately simple — a real backend can replace these shapes later
// without changing how the UI consumes them.

export type Sex = "female" | "male" | "other";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "athlete";

export type Goal =
  | "lose_weight"
  | "build_muscle"
  | "get_stronger"
  | "improve_nutrition"
  | "improve_fitness"
  | "improve_health"
  | "track_health"
  | "live_healthier";

export type TrackPreference =
  | "nutrition"
  | "workouts"
  | "weight"
  | "steps"
  | "sleep"
  | "bloodwork"
  | "habits"
  | "body_composition";

// V2: who is signing up. The UI experience begins to branch on this without
// requiring three separate applications yet — see the Home/Professionals
// pages for where it's read.
export type AccountType = "customer" | "professional" | "business";
export type CustomerSubtype = "client" | "regular" | "athlete" | "general";
// V4: Physiotherapist split out as its own specialty (was folded into "other").
export type ProfessionalSubtype = "trainer" | "physiotherapist" | "dietitian" | "other";

// V7 (QA 7.0): a business account picks one of these during onboarding —
// drives which extra tabs (Employees/Classes) it gets in the Business UI.
export type BusinessType =
  | "gym"
  | "store"
  | "supplement_store"
  | "equipment_seller"
  | "wellness_service"
  | "clothing_store"
  | "meal_prep_service";

export interface UserProfile {
  id: string;
  firstName: string;
  // V10 (QA 10.0): collected on the new sign-in/sign-up step before account
  // type selection.
  email: string;
  // Collected as a real date in onboarding and stored in
  // profiles.date_of_birth. `age` below is DERIVED from it (see
  // ageFromDateOfBirth) — the date is the source of truth, the number is a
  // convenience for the calculations that want one.
  dateOfBirth?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goals: Goal[];
  activityLevel: ActivityLevel;
  tracking: TrackPreference[];
  onboarded: boolean;
  accountType: AccountType;
  customerSubtype?: CustomerSubtype;
  professionalSubtype?: ProfessionalSubtype;
  businessName?: string;
  businessType?: BusinessType;
  // V3: client<->professional linking
  linkedProfessionalCode?: string;
  linkedProfessionalName?: string;
  linkedProfessionalSubtype?: ProfessionalSubtype;
  linkedProfessionalCertificationUrl?: string;
  // V7 (QA 7.0): a business account's own unique ID (shown to professionals
  // who want to affiliate) and, for a professional account, which business
  // they've affiliated with by entering one.
  businessId?: string;
  affiliatedBusinessId?: string;
  affiliatedBusinessName?: string;
  // V4 (QA 4.0): user-uploaded profile photo, data URL — camera or gallery.
  avatarUrl?: string;
  // V5 (QA 5.0): professional's uploaded certification, data URL — camera
  // or file, captured during onboarding in place of age/height/sex.
  certificationUrl?: string;
  // V10 (QA 10.0): a professional's own bio (shown on their Explore listing,
  // grey placeholder text until filled) and public credentials — mirrored to
  // a linked client via the fields below, same snapshot mechanism as
  // certification.
  professionalBio?: string;
  professionalPhone?: string;
  professionalWebsite?: string;
  // QA 12.0: "In the profile tab have the ability for the Professional to
  // connect their socials. For now just have instagram, facebook and X."
  professionalInstagram?: string;
  professionalFacebook?: string;
  professionalX?: string;
  // QA 11.0: "have a credential tab that has the client's email and phone
  // number" — a customer-facing counterpart to professionalPhone above.
  phone?: string;
  // QA 12.0: "credentials which when pressed shows you all relevant info
  // including social media you can link like Instagram and X" — client's
  // own counterpart to professionalInstagram/X above.
  instagramHandle?: string;
  xHandle?: string;
  linkedProfessionalBio?: string;
  linkedProfessionalPhone?: string;
  linkedProfessionalWebsite?: string;
  linkedProfessionalInstagram?: string;
  linkedProfessionalFacebook?: string;
  linkedProfessionalX?: string;
  // QA 12.0: "a button called payments, whereby the professional can add
  // what his monthly rate is to be hired, alongside other types like
  // consultations and how much they cost. Also let the professional
  // choose what type of payment modality the client can pay with."
  monthlyRate?: number;
  consultationRate?: number;
  paymentModalities?: ("cash" | "card" | "whish")[];
}

// V3: a professional generates one of these for a prospective client; the
// client redeems it during onboarding (or later) to link accounts. Kept
// simple — no real backend, just a shared, unique code in local state.
// V7 (QA 7.0): a business's unique ID, generated once at onboarding — a
// professional affiliates by entering it (same shared-directory approach as
// ClientCode, since this prototype has no real multi-account backend).
export interface BusinessDirectoryEntry {
  id: string;
  businessName: string;
  // V7 (QA 7.0): a business's own subscription tier caps how many
  // professionals can affiliate with it, same concept as the professional's
  // own client-count-capped tiers.
  tier: string;
}

export interface ClientCode {
  code: string;
  professionalId: string;
  professionalName: string;
  // V7 (QA 7.0): lets the client's Professionals tab pick a matching icon
  // for the professional they just linked to.
  professionalSubtype?: ProfessionalSubtype;
  // V8 (QA 8.0): "If the professional attaches a certificate... it should
  // show on the professionals tab in the more tab within the Client UI as
  // well when viewing their profile" — snapshotted here at code-generation
  // time, the only channel this prototype has between the two accounts.
  professionalCertificationUrl?: string;
  professionalBio?: string;
  professionalPhone?: string;
  professionalWebsite?: string;
  professionalInstagram?: string;
  professionalFacebook?: string;
  professionalX?: string;
  createdAt: string;
  redeemed: boolean;
  // V7 (QA 7.0): profile info the professional entered for this client when
  // generating the code — pulled directly into the client's own onboarding
  // ("About you" is bypassed) instead of asking them to re-enter it.
  clientName?: string;
  clientAge?: number;
  clientSex?: Sex;
  clientHeightCm?: number;
  clientWeightKg?: number;
}

// V3: a professional's view of one client — mocked data standing in for
// what a real client-sharing permission model would sync from that client's
// own account.
/** A client's most recent logged training session. */
export interface ClientWorkoutActivity {
  /** yyyy-mm-dd of the most recent session, from workout_sessions.started_at. */
  lastSessionDate: string;
  /**
   * Whether that session started on the reading professional's local day.
   * Both sides of that comparison are local days; see
   * fetchClientWorkoutActivity for why, and for what it still cannot do
   * across timezones.
   */
  trainedToday: boolean;
}

/** Nutrition totals for a single day of a client's food diary. */
export interface ClientNutrition {
  /** yyyy-mm-dd of the most recent day the client logged anything. */
  lastLoggedDate: string;
  /** Totals for that day only — food_log_entries stores resolved totals. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
}

export interface ProfessionalClient {
  id: string;
  name: string;
  // V8 (QA 8.0): "Add prefix above first name like Mr, Ms, Dr, etc.."
  prefix?: string;
  // The client's own profile id, distinct from `id` (the relationship).
  clientId?: string;
  avatarUrl?: string | null;
  // No longer set for real rows: a relationship carries no invite code once
  // redeemed, and `client_codes` is provenance data the roster doesn't read.
  code?: string;
  joinedAt: string;
  // --- Everything below is CLIENT HEALTH/TRAINING DATA and is undefined on
  // real rows. It lives on the client's own tables behind
  // `client_access_grants`, which is still decorative, and those tables are
  // still mock. Anything reading these must handle undefined and say so in
  // the UI rather than rendering a confident zero. See the README follow-up
  // "The professional dashboard's client-health tiles are not wired".
  activityLevel?: ActivityLevel;
  activityType?: "cardio" | "strength" | "both";
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  /**
   * The client's most recent training session.
   *
   * Replaces a bare `workoutLoggedToday` boolean, which could say "did they
   * train today" and nothing else — so a client who trained yesterday was
   * indistinguishable from one who has never trained, and both rendered as
   * "No workout". Carrying the date lets an absence be stated as a fact
   * ("last trained 3 Sep") rather than as a verdict.
   *
   * FOUR STATES, read the same way as `nutrition`. The first comes from
   * `access.workoutActivity`, not from this field:
   *
   *   access.workoutActivity false   not shared. Say nothing about training.
   *   undefined                      shared, not loaded yet.
   *   null                           shared, nothing logged in the window.
   *   object                         shared, with a real session.
   */
  workout?: ClientWorkoutActivity | null;
  lastWeightKg?: number;
  weightTrend?: number;
  /**
   * Totals for the client's most recently logged day — NOT for yesterday,
   * and not a running average.
   *
   * "Yesterday" was the old framing and it was quietly dishonest: a client
   * who logs three times a week would show 0 kcal on four days out of seven,
   * which reads as "ate nothing" rather than "logged nothing". Reporting the
   * last day they actually logged, with that date attached, degrades to an
   * absence rather than to a false zero.
   *
   * FOUR STATES, and conflating any two of them misleads a professional. The
   * first is read from `access.foodDiary`, not from this field:
   *
   *   access.foodDiary false   not shared. Say nothing about logging — see
   *                            the note on `nutrition` absence below.
   *   undefined                shared, not loaded yet.
   *   null                     shared, nothing logged in the lookback window.
   *   object                   shared, with figures for `lastLoggedDate`.
   *
   * The not-shared case must never render as "no meals logged": that would
   * report the client's behaviour to someone who has not been given access to
   * it, and would be a guess presented as a fact.
   */
  nutrition?: ClientNutrition | null;
  // Real, from client_access_grants. `healthMetrics` is vitals only — steps,
  // sleep, heart rate, water, calories burned. Lab work and clinical records
  // are separate grants, because one switch covering both was not a question
  // a client could answer honestly.
  access: {
    foodDiary: boolean;
    workoutActivity: boolean;
    weight: boolean;
    progress: boolean;
    healthMetrics: boolean;
    labResults: boolean;
    medicalHistory: boolean;
  };
  assignedProgramName?: string;
  assignedFoodTemplateName?: string;
  // V4 (QA 4.0): a small health-metrics summary the professional can see once
  // the client grants `access.healthMetrics` — mocked, stands in for a real
  // sync of the client's Health page data.
  healthSummary?: { bodyFatPct: number; sleepHours: number; stepsAvg: number };
  // QA 12.0: "When the client toggles the recovery sensitive experience,
  // it should show a small status badge in the professional dashboard for
  // that specific client." This prototype has no live bridge from a
  // client's own account to a specific ProfessionalClient row (same
  // limitation as the hire-request inbox), so it's toggled here directly
  // as a stand-in for what would otherwise sync automatically.
  recoverySensitive?: boolean;
  // "The dashboard should also show the client's preferred contact style,
  // pronouns if provided, reminder preferences, and communication
  // boundaries."
  pronouns?: string;
  contactStyle?: string;
  reminderPreference?: string;
  communicationBoundaries?: string;
  // QA 13.0: "Anything added by the client in the health tab from past
  // comorbidities, previous surgeries, medications in the Client UI health
  // tab should also appear here [Professional Health Metrics]." Same
  // no-live-bridge limitation as `recoverySensitive` above — mocked
  // directly on the client row as a stand-in for a real sync of the
  // client's own `comorbidities`/`surgeries`/`medications` state.
  medicalHistory?: { comorbidities: string[]; surgeries: Surgery[]; medications: Medication[] };
}

// V4 (QA 4.0): a professional's own rating + written review for a professional,
// submitted from ProfessionalDetail. One per professional per user — kept in
// local state, no real backend.
export interface ProfessionalReview {
  professionalId: string;
  rating: number;
  text: string;
  date: string;
}

// V6 (QA 6.0): Professional UI — Calendar tab, Apple-Calendar-inspired.
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  allDay: boolean;
  startTime?: string; // HH:mm
  endTime?: string;
  location?: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  invitees?: string[];
  url?: string;
  notes?: string;
  // V7 (QA 7.0): per-event background color, shown on the Day timeline.
  color?: string;
  // V9 (QA 9.0): "the client can add events" to their own copy of this
  // calendar (see More > Calendar) — marks which events are theirs to
  // edit/delete, as opposed to ones synced in from a professional/business.
  createdByClient?: boolean;
  // V10 (QA 10.0): marks a day-assignment synced in from a professional's
  // workout template — removed automatically if the assignment changes.
  sourceTemplateId?: string;
}

// V6 (QA 6.0): a professional-built workout template — same routine-builder
// UI as the client's Workout tab, but assignable to one or more clients
// instead of run by the professional themselves.
export interface WorkoutTemplateAssignment {
  id: string;
  name: string;
  exercises: Exercise[];
  assignedClientIds: string[];
  createdAt: string;
  // V7 (QA 7.0): organize templates into folders/subfolders, mirroring the
  // client UI's routine-folder system.
  folderId?: string | null;
  // V10 (QA 10.0): "Add a note section where anything the professional
  // writes will be shown on the client UI in the coach note section" —
  // copied onto the synced Routine's `coachNote` for each assigned client.
  coachNote?: string;
  // V10 (QA 10.0): "the ability to select a day to assign the workout to,
  // it would also appear at the assigned clients calendar."
  assignedDay?: string;
}

// V7 (QA 7.0): same shape as RoutineFolder, kept as its own store since
// template folders belong to the professional's UI, not the client's.
export interface WorkoutTemplateFolder {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string;
}

// V6 (QA 6.0): manual health-record fields a professional can add on top of
// the client's auto-synced health data.
export interface ClientHealthNote {
  comorbidities?: string;
  previousSurgeries?: string;
  medications?: string;
  currentInjuries?: string;
  personalityType?: string;
}

// V6 (QA 6.0): a professional<->client messaging board, separate from the
// one-off message sheet already on ProfessionalDetail.
export interface ProfessionalMessage {
  id: string;
  clientId: string;
  from: "professional" | "client";
  text: string;
  at: string; // ISO
  // V9 (QA 9.0): "alongside sending texts, the client should be able to
  // send voice notes and attach files/pictures" — text stays the common
  // case; a message carries at most one of these instead.
  attachment?: string;
  voiceNoteSec?: number;
}

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface Food {
  id: string;
  name: string;
  nameAr?: string;
  category:
    | "traditional"
    | "breakfast"
    | "lunch"
    | "dinner"
    | "snacks"
    | "drinks"
    | "restaurant"
    | "homemade"
    | "ingredients"
    // V10 (QA 10.0): "Limit filter in add food to just breakfast, lunch,
    // dinner, snacks, resturant, ingredients and meal prep" — a new
    // filterable category for meal-prepped custom foods.
    | "meal_prep";
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isLebanese?: boolean;
}

// V4: preset serving units, offered as tap targets instead of free typing.
export type ServingUnit = "serving" | "g" | "ml" | "cup" | "tbsp" | "tsp";

/**
 * One row of the food diary, mirroring public.food_log_entries.
 *
 * RESOLVED SNAPSHOT. `name` and the four macros are the TOTALS for this
 * entry — already multiplied by quantity at log time. They are never
 * per-serving values, and they are never recomputed on read: summing a day
 * is `sum(calories)` with no arithmetic per row.
 *
 * This is the one structural difference from the mock this type replaced,
 * where `food` held per-serving values that every read site multiplied by
 * `entryMultiplier(entry)`. Doing that here would double-count.
 */
export interface FoodLogEntry {
  id: string;
  // Provenance only, and at most one is ever set (the schema's
  // food_log_entries_single_source_check). Both null is legitimate: a food
  // the user typed in by hand. Both are ON DELETE SET NULL, so a deleted
  // catalog row empties the pointer without touching the snapshot above —
  // which is exactly why the snapshot exists.
  foodId: string | null;
  customFoodId: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // How much was logged, in `unit`. Display and provenance metadata ONLY —
  // the macros above are already multiplied, so never multiply by this.
  quantity: number;
  unit: ServingUnit;
  meal: MealType;
  date: string; // ISO date, yyyy-mm-dd
  loggedVia?: "search" | "ai" | "scan" | "barcode" | "recent" | "quick";
  // Presentation only, joined from the source catalog row at read time and
  // deliberately kept apart from the snapshot above so the boundary is
  // visible: nothing in here may ever feed a nutrition calculation.
  // Falls back to neutral values when there is no source row to join.
  display: {
    category: Food["category"];
    serving: string;
    isLebanese: boolean;
  };
}

// V2: editable per-exercise programming settings (Strong/Hevy-inspired).
export type RepMaxUpdateMode = "no_update" | "prompt" | "prompt_with_estimate";

// V4: "Muscle Group" (renamed from Body Part, multi-select) and
// "Classification" (renamed from Category) for the custom-exercise flow.
// V6 (QA 6.0): "arms" split into bicep/tricep, "legs" split into
// quads/hamstrings, per QA — more precise muscle-group targeting.
// Design refinement §6.5: "the taxonomy jumps from quads/hamstrings past
// the lower leg, and from bicep/tricep past the forearm" — calves and
// forearms added, visible from both front and back body views.
// QA 11.0: "Remove full body from muscle group classification, and update
// exercise muscle group accordingly" — every exercise previously tagged
// "full_body" now gets a real primary mover instead of a catch-all.
export type MuscleGroup =
  | "back"
  | "bicep"
  | "calves"
  | "cardio"
  | "chest"
  | "core"
  | "forearms"
  | "glutes"
  | "hamstrings"
  | "olympic"
  | "other"
  | "quads"
  | "shoulders"
  | "tricep";

export type ExerciseClassification =
  | "barbell"
  | "dumbbell"
  | "machine_other"
  | "weighted_bodyweight"
  | "assisted_bodyweight"
  | "reps_only"
  | "cardio"
  | "duration";

// Classifications that track an estimated 1-rep-max, editable in History.
export const ONE_RM_CLASSIFICATIONS: ExerciseClassification[] = [
  "barbell",
  "dumbbell",
  "weighted_bodyweight",
];

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  category:
    | "chest"
    | "back"
    | "shoulders"
    | "arms"
    | "legs"
    | "core"
    | "full_body"
    | "cardio";
  // V4: multi-select muscle groups + a classification, alongside the
  // original single `category` (kept for the exercise-library icon lookup).
  muscleGroups?: MuscleGroup[];
  // V10 (QA 10.0): secondary movers, e.g. a bench press is chest (primary),
  // shoulders/tricep (secondary). Filtering by muscle group only matches
  // against the primary `muscleGroups` list, per QA.
  secondaryMuscleGroups?: MuscleGroup[];
  classification?: ExerciseClassification;
  isCustom?: boolean;
  // Optional V2 programming detail — falls back to sensible defaults in the UI.
  minSets?: number;
  maxSets?: number;
  minReps?: number;
  maxReps?: number;
  intensityPct?: number;
  repMaxKg?: number;
  repMaxUpdateMode?: RepMaxUpdateMode;
  restSeconds?: number;
  rpe?: number;
  tempo?: string;
  // V4: estimated one-rep-max, tracked for barbell/dumbbell/weighted-bodyweight
  // exercises and editable from the History tab.
  estimatedOneRepMaxKg?: number;
  // QA 11.0: "When editing an exercise that falls under cardio, replace
  // things like min/max sets, min/max reps, intensity/rep max/RPE tempo
  // etc. with something more relevant to cardio training."
  cardioDurationMin?: number;
  cardioDistanceKm?: number;
  cardioInclinePct?: number;
  cardioPaceMinPerKm?: number;
  cardioAvgHeartRate?: number;
}

// V4 (QA 4.0): a custom exercise, saved to the searchable library on
// creation — it's only added to a routine when a user explicitly taps it,
// same as any built-in library exercise.
export interface CustomExerciseLibraryItem {
  name: string;
  muscleGroups?: MuscleGroup[];
  secondaryMuscleGroups?: MuscleGroup[];
  classification: ExerciseClassification;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  exercises: Exercise[];
  durationMin: number;
  level: "beginner" | "intermediate" | "advanced";
}

export interface WorkoutLogEntry {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  durationMin: number;
  completed: boolean;
  exercises: Exercise[];
}

// V2: routine organization (folders) + logged sessions with a running timer.
// V4: folders can nest (parentId), matching heavy-set-app folder trees.
export interface RoutineFolder {
  id: string;
  name: string;
  parentId?: string | null;
  // V7 (QA 7.0): chosen when creating the folder/subfolder.
  color?: string;
}

export interface Routine {
  id: string;
  folderId: string | null;
  name: string;
  color: string;
  estimatedDurationMin: number;
  exercises: Exercise[];
  // V10 (QA 10.0): a read-only note the hired professional writes for this
  // routine (via an assigned workout template), shown in a coach-note
  // button during the session.
  coachNote?: string;
  // V10 (QA 10.0): set when this routine came from a professional's
  // assigned template, so it can be identified/cleaned up if the
  // client-professional relationship ends.
  assignedByProfessional?: boolean;
  sourceTemplateId?: string;
}

// V3: per-set classification + notes + RPE, added via the "..." menu.
// QA 11.0: "When editing a routine, add more buttons like super set and
// PR" — sibling flags to the existing warmup/failure/dropset set types.
export type SetType = "normal" | "warmup" | "failure" | "dropset" | "superset" | "pr";

export interface LoggedSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  completed: boolean;
  setType?: SetType;
  notes?: string;
  rpe?: number;
  // V6 (QA 6.0): 1 (bad mood) to 10 (very good mood), set alongside RPE.
  mood?: number;
  // V9 (QA 9.0): 0 (no injury) to 10 (severe pain), shown above mood.
  pain?: number;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

// V6 (QA 6.0): the in-progress state of a routine that was quit (not
// finished) — enough to restore WorkoutSessionSheet exactly as it was.
export interface PausedWorkoutSession {
  logged: LoggedExercise[];
  elapsedSec: number;
  startedAt: string;
  started: boolean;
}

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  routineName: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  totalVolumeKg: number;
  exercises: LoggedExercise[];
  notes?: string;
}

export interface HealthMetricPoint {
  date: string;
  value: number;
}

export interface HealthMetric {
  // V10 (QA 10.0): "Replace the body fat % with heart rate that is synced
  // with apple health/ android health" — bodyFat retired from the Health
  // page in favor of heartRate.
  type: "weight" | "heartRate" | "steps" | "sleep" | "water" | "caloriesBurned";
  label: string;
  unit: string;
  current: number;
  trend: number; // positive/negative change
  history: HealthMetricPoint[];
}

export interface BloodMarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  /** Display string rebuilt from range_low/range_high; "—" when unknown. */
  range: string;
  /**
   * NULL WHEN THERE IS NO REFERENCE RANGE TO COMPUTE AGAINST, which is the
   * ordinary case for a captured marker rather than an edge case. This used to
   * default to "normal", which asserted a clinical finding nobody had
   * calculated. Every surface that renders a status must handle absence by
   * showing nothing.
   */
  status: "low" | "normal" | "high" | null;
  history: HealthMetricPoint[];
}

export interface BloodPanel {
  date: string;
  markers: BloodMarker[];
}

// QA 12.0: "I would like the biomarker widget to be inside a tab that not
// only has biomarkers but the ability to add imaging and/or other tests
// like urine analysis... comorbidities, past surgeries, medications."
export interface ImagingRecord {
  id: string;
  type: string;
  date: string;
  note?: string;
  /**
   * Object path in the private medical-imaging bucket, not a URL.
   *
   * Signed links are minted at the moment of viewing and live for minutes,
   * because Storage authorises a signed URL once rather than per request —
   * so a URL stored here would be both stale and a standing grant. Absent
   * when the record was typed in by hand rather than captured from a file.
   */
  filePath?: string;
}

export interface Surgery {
  id: string;
  name: string;
  date: string;
}

export type MedicationRoute = "oral" | "injectable" | "topical" | "inhaled" | "other";

export interface Medication {
  id: string;
  name: string;
  dose: string;
  route: MedicationRoute;
  // HH:MM entries — one per scheduled daily dose.
  times: string[];
  notifyEnabled: boolean;
  notes?: string;
}

// V2: camera-captured biomarker extraction (mocked "AI" step).
export interface ExtractedBiomarker {
  name: string;
  value: number;
  unit: string;
  selected: boolean;
}

export type ProfessionalType =
  | "trainer"
  | "dietitian"
  | "physiotherapist"
  | "doctor";

export interface Professional {
  id: string;
  name: string;
  type: ProfessionalType;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  bio: string;
  connected?: boolean;
  // V9 (QA 9.0): "hire that when pressed shows you how much they charge" —
  // a flat monthly rate for hiring this professional.
  monthlyRate: number;
}

export interface Gym {
  id: string;
  name: string;
  location: string;
  perk: string;
  rating: number;
  distanceKm?: number;
  lat: number;
  lng: number;
  // V7 (QA 7.0): shown in the gym detail sheet.
  bio: string;
  reviewCount: number;
  pricing: { plan: string; price: string }[];
}

// V8 (QA 8.0): a purchased gym plan — a day pass expires 24h after
// purchase and stacks alongside an active monthly/annual membership,
// which instead stays active until explicitly cancelled.
export interface GymPurchase {
  plan: string;
  purchasedAt: number;
  oneTime: boolean;
}

// V8 (QA 8.0): a marketplace store-item in the cart, ready for checkout.
export interface CartItem {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  price: number;
  quantity: number;
}

// V4: a small curated set of minimalistic icon choices for habits, replacing
// the free-form emoji picker. See utils/icons.tsx for the icon lookup.
export type HabitIconKey =
  | "water"
  | "steps"
  | "workout"
  | "journal"
  | "meditation"
  | "sleep"
  | "book"
  | "custom";

export interface HabitItem {
  id: string;
  label: string;
  icon: HabitIconKey;
  done: boolean;
  streakDays: number;
}

export interface Streak {
  id: string;
  label: string;
  days: number;
  goalDays: number;
  // V4: the four core streaks (logging/movement/workout/nutrition) are
  // auto-derived from real activity and can't be edited or given a goal.
  auto?: boolean;
  // V4 (QA 4.0): a user-added streak is linked to one existing habit — its
  // `days` count tracks that habit's own streakDays automatically.
  habitId?: string;
}

// V2: Home page widget system (Apple-widget-inspired: small/large, reorderable).
export type WidgetType =
  | "steps"
  | "weight"
  | "water"
  | "sleep"
  | "nutrition"
  | "workout"
  | "bodyFat"
  | "heartRate"
  | "habits"
  | "journal"
  | "meditation"
  | "gymPasses";
export type WidgetSize = "small" | "large";

// Future Supabase migration: device_presentation_settings (per-platform,
// stays local, never synced) — widget/home-screen layout is presentation,
// not a synced app preference. See the `widgets` field on AppState.
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  visible: boolean;
}

// V2: Food page — TDEE-driven goals, editable macro split, meal prep.
export type WeightGoalType = "lose" | "gain" | "maintain";
export type PlanType = "custom" | "existing";

export interface MacroSplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface NutritionGoal {
  weightGoal: WeightGoalType;
  weeklyRateKg: number;
  planType: PlanType;
  macroSplit: MacroSplit;
  targetCalories: number;
  // V4: an explicit target weight, confirmed separately from the weekly rate,
  // used to project a reach-by date on the weight trend graph.
  desiredWeightKg?: number;
  desiredWeightConfirmed?: boolean;
}

// V4: Meal Prep reworked — a custom meal is just a named group of existing
// food items; logging it logs each item individually (MyNetDiary-inspired).
export interface CustomMealItem {
  food: Food;
  quantity: number;
  unit?: ServingUnit;
}

export interface CustomMeal {
  id: string;
  title: string;
  items: CustomMealItem[];
  // V7 (QA 7.0): which meal slot this plan is intended for.
  mealType?: MealType;
}

// V2: Journal — organized into folders, entries retain their date.
export interface JournalFolder {
  id: string;
  name: string;
}

export interface JournalEntry {
  id: string;
  folderId: string;
  // V4: entries show only their title in the list; tapping opens the full
  // text.
  title: string;
  text: string;
  date: string; // yyyy-mm-dd, auto-set at creation
  createdAt: string; // ISO timestamp
}

// V3: appearance — accent color theme, alongside light/dark.
// Future Supabase migration: device_presentation_settings (per-platform,
// stays local, never synced).
export type ColorTheme = "centium" | "ocean" | "sunset" | "berry";

// V3: custom (user-added) foods, kept separate from the curated mock database.
export interface CustomFood extends Food {
  isCustom: true;
}

// V3: expanded mock sleep-stage breakdown for the Health page detail view.
export interface SleepDetail {
  score: number;
  remMin: number;
  deepMin: number;
  lightMin: number;
  awakeMin: number;
  summary: string;
}

// V4: Explore/marketplace categories, used to route to a per-category
// listing page instead of the old flat "browse everything" list.
export type MarketplaceCategoryId =
  | "gyms"
  | "classes"
  | "stores"
  | "clothing"
  | "equipment"
  | "supplements"
  | "wellness"
  | "meal_prep";

// V4: a business's own product/service listing in the marketplace.
// V10 (QA 10.0): "In the operations tab, I want a button that has to do
// with the gym itself. Inside it can list/edit/delete the different type
// of gym memberships it can offer, by stating the price, type (Daily,
// monthly, annually, etc..), and payment type... generate unique QR codes
// for each client that will show up in the client UI upon purchase."
export type MembershipBilling = "daily" | "monthly" | "annually";
export interface MembershipPlan {
  id: string;
  name: string;
  price: string;
  billing: MembershipBilling;
  paymentType: string;
}

export interface BusinessOffering {
  id: string;
  title: string;
  category: MarketplaceCategoryId;
  price?: string;
  description: string;
}

// V7 (QA 7.0): Business UI additions — Employees (affiliated professionals),
// Classes (gym-type businesses only) and a customer messaging board.
export interface BusinessEmployee {
  professionalId: string;
  professionalName: string;
  professionalSubtype?: ProfessionalSubtype;
}

export interface BusinessClass {
  id: string;
  title: string;
  classType: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId?: string;
  // V8 (QA 8.0): a free-text note for the assigned professional.
  notes?: string;
  // V9 (QA 9.0): "the business can add single or multiple clients at once
  // to affiliated professionals and/or classes."
  clientIds?: string[];
  // V10 (QA 10.0): "list/edit/delete the different type of classes it can
  // offer, by stating the price, type, and payment type... generate unique
  // QR codes for each client."
  price?: string;
  paymentType?: string;
}

export interface BusinessMessage {
  id: string;
  customerId: string;
  from: "business" | "customer";
  text: string;
  at: string;
}

// V9 (QA 9.0): "a hub for all clients to share information publicly" — a
// lightweight community forum, one flat list of posts each with its own
// comment thread (no nested categories/subforums, to match the rest of this
// prototype's "keep it simple" feature depth).
export interface ForumComment {
  id: string;
  authorName: string;
  text: string;
  at: string;
}

export interface ForumPost {
  id: string;
  authorName: string;
  category: ForumCategory;
  title: string;
  body: string;
  likes: number;
  likedByMe: boolean;
  comments: ForumComment[];
  at: string;
  mine?: boolean;
}

export type ForumCategory = "Nutrition" | "Workouts" | "Progress" | "Motivation" | "General";
