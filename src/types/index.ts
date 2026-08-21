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
export type ProfessionalSubtype = "trainer" | "dietitian" | "other";

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
  avatarEmoji: string;
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
  emoji: string;
}

export interface FoodLogEntry {
  id: string;
  foodId: string;
  food: Food;
  quantity: number;
  meal: MealType;
  date: string; // ISO date, yyyy-mm-dd
  loggedVia?: "search" | "ai" | "scan" | "barcode" | "recent" | "quick";
}

// V2: editable per-exercise programming settings (Strong/Hevy-inspired).
export type RepMaxUpdateMode = "no_update" | "prompt" | "prompt_with_estimate";

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
export interface RoutineFolder {
  id: string;
  name: string;
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
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
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
  avatarEmoji: string;
  connected?: boolean;
}

export interface Gym {
  id: string;
  name: string;
  location: string;
  perk: string;
  emoji: string;
  rating: number;
  distanceKm?: number;
  lat: number;
  lng: number;
}

export interface HabitItem {
  id: string;
  label: string;
  emoji: string;
  done: boolean;
  streakDays: number;
}

export interface Streak {
  id: string;
  label: string;
  emoji: string;
  days: number;
  goalDays: number;
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
}

export interface MealPrepItem {
  id: string;
  foodId: string;
  food: Food;
  quantity: number;
}

export type MealPrepPlan = Record<MealType, MealPrepItem[]>;

// V2: Journal — organized into folders, entries retain their date.
export interface JournalFolder {
  id: string;
  name: string;
}

export interface JournalEntry {
  id: string;
  folderId: string;
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
