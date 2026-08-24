// Core data model for the Sohati prototype.
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

export interface UserProfile {
  id: string;
  firstName: string;
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
  // V3: client<->professional linking
  linkedProfessionalCode?: string;
  linkedProfessionalName?: string;
  // V4 (QA 4.0): user-uploaded profile photo, data URL — camera or gallery.
  avatarUrl?: string;
  // V5 (QA 5.0): professional's uploaded certification, data URL — camera
  // or file, captured during onboarding in place of age/height/sex.
  certificationUrl?: string;
}

// V3: a professional generates one of these for a prospective client; the
// client redeems it during onboarding (or later) to link accounts. Kept
// simple — no real backend, just a shared, unique code in local state.
export interface ClientCode {
  code: string;
  professionalId: string;
  professionalName: string;
  createdAt: string;
  redeemed: boolean;
}

// V3: a professional's view of one client — mocked data standing in for
// what a real client-sharing permission model would sync from that client's
// own account.
export interface ProfessionalClient {
  id: string;
  name: string;
  code: string;
  joinedAt: string;
  activityLevel: ActivityLevel;
  activityType: "cardio" | "strength" | "both";
  access: {
    foodDiary: boolean;
    workoutActivity: boolean;
    weight: boolean;
    progress: boolean;
    healthMetrics: boolean;
  };
  lastWeightKg: number;
  weightTrend: number;
  lastCaloriesKcal: number;
  assignedProgramName?: string;
  assignedFoodTemplateName?: string;
  // V4 (QA 4.0): a small health-metrics summary the professional can see once
  // the client grants `access.healthMetrics` — mocked, stands in for a real
  // sync of the client's Health page data.
  healthSummary?: { bodyFatPct: number; sleepHours: number; stepsAvg: number };
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
}

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface Food {
  id: string;
  name: string;
  nameAr?: string;
  category:
    | "lebanese"
    | "breakfast"
    | "lunch"
    | "dinner"
    | "snacks"
    | "drinks"
    | "restaurant"
    | "homemade"
    | "ingredients";
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isLebanese?: boolean;
}

// V4: preset serving units, offered as tap targets instead of free typing.
export type ServingUnit = "serving" | "g" | "ml" | "cup" | "tbsp" | "tsp";

export interface FoodLogEntry {
  id: string;
  foodId: string;
  food: Food;
  quantity: number;
  unit?: ServingUnit;
  meal: MealType;
  date: string; // ISO date, yyyy-mm-dd
  loggedVia?: "search" | "ai" | "scan" | "barcode" | "recent" | "quick";
}

// V2: editable per-exercise programming settings (Strong/Hevy-inspired).
export type RepMaxUpdateMode = "no_update" | "prompt" | "prompt_with_estimate";

// V4: "Muscle Group" (renamed from Body Part, multi-select) and
// "Classification" (renamed from Category) for the custom-exercise flow.
// V6 (QA 6.0): "arms" split into bicep/tricep, "legs" split into
// quads/hamstrings, per QA — more precise muscle-group targeting.
export type MuscleGroup =
  | "back"
  | "bicep"
  | "cardio"
  | "chest"
  | "core"
  | "full_body"
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
}

// V4 (QA 4.0): a custom exercise, saved to the searchable library on
// creation — it's only added to a routine when a user explicitly taps it,
// same as any built-in library exercise.
export interface CustomExerciseLibraryItem {
  name: string;
  muscleGroups?: MuscleGroup[];
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
}

export interface Routine {
  id: string;
  folderId: string | null;
  name: string;
  color: string;
  estimatedDurationMin: number;
  exercises: Exercise[];
}

// V3: per-set classification + notes + RPE, added via the "..." menu.
export type SetType = "normal" | "warmup" | "failure" | "dropset";

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
  type: "weight" | "bodyFat" | "steps" | "sleep" | "water" | "caloriesBurned";
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
  range: string;
  status: "low" | "normal" | "high";
  history: HealthMetricPoint[];
}

export interface BloodPanel {
  date: string;
  markers: BloodMarker[];
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
  | "habits"
  | "journal"
  | "meditation";
export type WidgetSize = "small" | "large";

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
export type ColorTheme = "sohati" | "ocean" | "sunset" | "berry";

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
export interface BusinessOffering {
  id: string;
  title: string;
  category: MarketplaceCategoryId;
  price?: string;
  description: string;
}
