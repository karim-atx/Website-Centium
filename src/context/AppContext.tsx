import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  UserProfile,
  FoodLogEntry,
  WorkoutLogEntry,
  MealType,
  HabitItem,
  Streak,
  WidgetConfig,
  WidgetType,
  WidgetSize,
  TrackPreference,
  NutritionGoal,
  WeightGoalType,
  MacroSplit,
  CustomMeal,
  Recipe,
  RecipeItem,
  RoutineFolder,
  Routine,
  WorkoutSession,
  PausedWorkoutSession,
  JournalFolder,
  JournalEntry,
  BloodMarker,
  LabReport,
  ExtractedBiomarker,
  ImagingRecord,
  Surgery,
  Medication,
  WorkoutTemplateFolder,
  BusinessDirectoryEntry,
  ProfessionalClient,
  ColorTheme,
  CustomFood,
  HabitIconKey,
  CustomExerciseLibraryItem,
  CalendarEvent,
  WorkoutTemplate,
  WorkoutTemplateAssignment,
  ClientHealthNote,
  ProfessionalMessage,
  BusinessMessage,
  GymPurchase,
  CartItem,
  ForumPost,
  ForumCategory,
} from "../types";
import {
  createCustomMeal as createCustomMealRemote,
  deleteCustomMeal as deleteCustomMealRemote,
  getCustomMeals,
  updateCustomMeal as updateCustomMealRemote,
} from "../services/custom-meals";
import {
  createRecipe as createRecipeRemote,
  deleteRecipe as deleteRecipeRemote,
  getRecipes,
  updateRecipe as updateRecipeRemote,
} from "../services/recipes";
import {
  createCustomExercise as createCustomExerciseRemote,
  deleteCustomExercise as deleteCustomExerciseRemote,
  getCustomExercises,
  listExercises,
  updateCustomExercise as updateCustomExerciseRemote,
  type CatalogExercise,
} from "../services/exercises";
import {
  adoptTemplate as adoptTemplateRemote,
  assignTemplate as assignTemplateRemote,
  createTemplate as createTemplateRemote,
  createTemplateFolder,
  deleteTemplate as deleteTemplateRemote,
  deleteTemplateFolder,
  getTemplateAssignments,
  getTemplateFolders,
  getTemplates,
  unassignTemplate as unassignTemplateRemote,
  updateTemplate as updateTemplateRemote,
  updateTemplateFolder,
  type AssignResult,
} from "../services/templates";
import {
  createRoutine as createRoutineRemote,
  createRoutineFolder as createRoutineFolderRemote,
  deleteRoutine as deleteRoutineRemote,
  deleteRoutineFolder as deleteRoutineFolderRemote,
  getRoutineFolders,
  getRoutines,
  setFolderPositions,
  updateRoutine as updateRoutineRemote,
  updateRoutineFolder as updateRoutineFolderRemote,
  type ExerciseLookup,
} from "../services/routines";
import { mockForumPosts } from "../data/mockForum";
import { defaultHabits, streaks as seedStreaks } from "../data/mockHealthData";
import { todaysWorkout, workoutPrograms } from "../data/mockWorkouts";
import { estimate1RM } from "../services/workout";
import {
  clearPausedSession as clearPausedSessionRemote,
  getPausedSessions,
  getPersonalRecords,
  recordPersonalRecord,
  savePausedSession as savePausedSessionRemote,
  type RecordRef,
} from "../services/workout/records";
import { ONE_RM_CLASSIFICATIONS } from "../types";
import {
  suggestNutritionGoal,
  normalizeMacroSplit,
  rescaleEntry,
} from "../services/nutrition";
import { translations, type Language } from "../i18n/translations";
import type { DietaryRestriction } from "../utils/dietaryRestrictions";
import type { Session } from "@supabase/supabase-js";
import { getCurrentSession, hasStoredSessionToken, onAuthChange, signOutRemote } from "../services/auth";
import { unsubscribeFromPush } from "../services/push";
import { usePushSubscriptionSync } from "../hooks/usePushSubscriptionSync";
import {
  cancelAccountDeletion as cancelAccountDeletionRemote,
  onPasswordRecovery,
  requestAccountDeletion,
} from "../services/auth";
import {
  copyDiaryEntry,
  createCustomFood,
  getDiaryEntries,
  isRemoteEntryId,
  isUuid,
  logFoodEntry,
  manualFood,
} from "../services/food";
import { isAdminAccount } from "../services/admin";
import { isMfaChallengePending } from "../services/mfa";
import { isLocalOnlyAvatar, migrateLocalAvatar } from "../services/avatar";
import { ensureProfileRow, fetchProfile } from "../services/profile";
import {
  AUTO_STREAK_CATEGORIES,
  AUTO_STREAK_LABEL_BY_CATEGORY,
  ensureAutoStreaks,
  getAutoStreaks,
} from "../services/streaks";
import {
  getRecoveryPendingUserId,
  markRecoveryPending,
  clearRecoveryPending,
  isRecoveryExchangeInFlight,
} from "../../lib/supabase/recovery";
import { getMyReferrerReward } from "../services/redemption";
import { createClientCode, disconnectClient, fetchRoster } from "../services/roster";
import {
  fetchClientImaging,
  fetchClientLabs,
  fetchClientMedicalHistory,
  fetchClientNutrition,
  fetchClientWeight,
  fetchClientWorkoutActivity,
} from "../services/professional-client";
import {
  addComorbidityRemote,
  addMedicationRemote,
  addSurgeryRemote,
  deleteMedicationRemote,
  deleteSurgeryRemote,
  getMedicalHistory,
  removeComorbidityRemote,
  updateMedicationRemote,
} from "../services/medical-history";
import { getHealthMetrics, logHealthMetric } from "../services/health-metrics";
import {
  addImagingRecordRemote,
  deleteImagingRecordRemote,
  getImagingRecords,
} from "../services/imaging";
import { deleteLabPanel, getBloodMarkers, getLabReports, recordPanel } from "../services/labs";
import { touchLastActive } from "../services/activity";
import { getWorkoutSessions, saveWorkoutSession as saveWorkoutSessionRemote } from "../services/workout/log";
import { todayLocal } from "../utils/date";

// How much history the diary loads from Supabase in one read. Chosen so the
// auto-streaks (which walk backwards through every dated entry) and
// copy-yesterday keep working without a query per day. A streak longer than
// this would cap, which is not reachable on an app with no logging history.
const DIARY_WINDOW_DAYS = 90;

const defaultUser: UserProfile = {
  id: "u1",
  firstName: "Abdallah",
  email: "",
  age: 29,
  sex: "male",
  heightCm: 178,
  weightKg: 106.4,
  goals: ["build_muscle", "improve_health"],
  activityLevel: "moderate",
  tracking: ["nutrition", "workouts", "weight", "steps", "sleep"],
  onboarded: false,
  accountType: "customer",
  customerSubtype: "general",
};

function seedWorkoutLog(): WorkoutLogEntry[] {
  return [
    {
      id: "wseed1",
      workoutId: todaysWorkout.id,
      workoutName: todaysWorkout.name,
      date: todayLocal(),
      durationMin: todaysWorkout.durationMin,
      completed: true,
      exercises: todaysWorkout.exercises,
    },
  ];
}

// Pre-onboarding fallback shape for the persisted "widgets" state — real
// seeding happens in widgetsForGoals once the user's tracking prefs exist.
const defaultWidgets: WidgetConfig[] = [
  { id: "w-steps", type: "steps", size: "small", visible: true },
  { id: "w-weight", type: "weight", size: "small", visible: true },
  { id: "w-water", type: "water", size: "large", visible: true },
  { id: "w-sleep", type: "sleep", size: "small", visible: true },
  { id: "w-nutrition", type: "nutrition", size: "large", visible: true },
  { id: "w-workout", type: "workout", size: "small", visible: true },
];

// V8 (QA 8.0): every trackable widget maps to a "What do you want to
// track?" onboarding preference, except Water — that one has no tracking
// equivalent and always stays on the board.
const trackableWidgets: { type: WidgetType; size: WidgetSize; trackKey?: TrackPreference }[] = [
  { type: "steps", size: "small", trackKey: "steps" },
  { type: "weight", size: "small", trackKey: "weight" },
  { type: "water", size: "large" },
  { type: "sleep", size: "small", trackKey: "sleep" },
  { type: "nutrition", size: "large", trackKey: "nutrition" },
  { type: "workout", size: "small", trackKey: "workouts" },
  { type: "habits", size: "small", trackKey: "habits" },
  // V9 (QA 9.0): "a widget in the homescreen that has a logo of a
  // minimalistic key" — no tracking equivalent, same as Water.
  { type: "gymPasses", size: "small" },
];

/** Seeds the board from the user's "What do you want to track?" selections
 * (a widget with no matching preference is simply left off), then does a
 * light goal-based reordering to nudge the most relevant ones toward the
 * top. Still fully editable afterward — this only sets a starting layout. */
function widgetsForGoals(goals: UserProfile["goals"], tracking: TrackPreference[]): WidgetConfig[] {
  const board = trackableWidgets
    .filter((w) => !w.trackKey || tracking.includes(w.trackKey))
    .map((w) => ({ id: `w-${w.type}`, type: w.type, size: w.size, visible: true }));
  const priority = (type: WidgetType): number => {
    if (goals.includes("lose_weight") && type === "weight") return -3;
    if (goals.includes("build_muscle") && type === "workout") return -3;
    if (goals.includes("improve_nutrition") && type === "nutrition") return -3;
    if (goals.includes("improve_fitness") && type === "steps") return -2;
    if (goals.includes("track_health") && type === "weight") return -2;
    return 0;
  };
  return board.sort((a, b) => priority(a.type) - priority(b.type));
}

const defaultRoutineFolders: RoutineFolder[] = [
  { id: "rf-strength", name: "Strength" },
  { id: "rf-hypertrophy", name: "Hypertrophy" },
];

function seedRoutines(): Routine[] {
  return workoutPrograms.slice(0, 4).map((p, i) => ({
    id: `routine-${p.id}`,
    folderId: i < 2 ? "rf-strength" : "rf-hypertrophy",
    name: p.name,
    color: ["#7D6BB5", "#6F9993", "#4C8FD1", "#9C4F7C"][i % 4],
    estimatedDurationMin: p.durationMin,
    exercises: p.exercises,
  }));
}

const defaultJournalFolders: JournalFolder[] = [
  { id: "jf-personal", name: "Personal" },
  { id: "jf-training", name: "Training" },
  { id: "jf-nutrition", name: "Nutrition" },
  { id: "jf-general", name: "General" },
];

interface AppState {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;

  // Real Supabase auth session, kept in sync by onAuthStateChange rather
  // than read once at load — a session can arrive well after first paint
  // (returning from an email-confirmation link or the Google OAuth round
  // trip) or expire mid-session.
  session: Session | null;
  authUserId: string | null;
  // True while this session arrived from a password-reset link and the new
  // password has not been set yet. Route guards refuse everything under /app
  // while it holds.
  recoveryPending: boolean;
  // Diary read state. Loading never blanks the screen — cached entries stay
  // visible — and an error keeps them rather than replacing them with nothing.
  diaryLoading: boolean;
  diaryError: string | null;
  /** Set when workout history could not be refreshed from the server. */
  workoutHistoryError: string | null;
  /** Set when weight/water history could not be read. Never means "empty". */
  metricsError: string | null;
  /** Set when medical records could not be read. Never means "none". */
  medicalError: string | null;
  /** Set when imaging records could not be read. Never means "none". */
  imagingError: string | null;
  /** Set when lab results could not be read. Never means "no bloodwork". */
  labsError: string | null;
  // Ends the recovery block. Must be used instead of clearRecoveryPending():
  // the guards read React state, not localStorage, so clearing only storage
  // leaves the app redirecting for the rest of the page session.
  clearRecovery: () => void;
  // False until the initial getSession() settles, so the auth screen isn't
  // flashed at a user who is already signed in.
  authReady: boolean;
  // False until the server profile has been read for the current session.
  // Route guards must wait for this: `user.onboarded` is seeded from
  // localStorage, and acting on it early sends an onboarded user through
  // onboarding again.
  profileReady: boolean;
  // Whether this account is an administrator, or null while the answer is
  // still outstanding. Administrators have no place in the consumer app —
  // the route guards stop them at a notice rather than walking them into
  // onboarding as if they were a new customer.
  isAdmin: boolean | null;
  // False until the admin check has settled for the current session. Separate
  // from isAdmin for the same reason profileReady is separate from `user`: a
  // guard must be able to tell "not an admin" from "not asked yet".
  adminReady: boolean;
  // Lets an administrator past that notice for this browser session only.
  // Nothing persists across a new tab or a new sign-in.
  continueAsConsumer: () => void;
  adminConsumerOptIn: boolean;
  // True when this session has authenticated but still owes a second factor.
  // A password-only sign-in on a 2FA account lands here: the session is real
  // and reads data, so a route guard is what holds it back.
  mfaPending: boolean;
  // False until the assurance level has been read for the current session,
  // for the same reason profileReady and adminReady exist.
  mfaReady: boolean;
  // Re-reads the assurance level after a challenge, an enrolment, or a
  // turn-off — none of which change the account this is keyed to.
  refreshMfaState: () => Promise<void>;

  theme: "light" | "dark";
  toggleTheme: () => void;

  // Future Supabase migration: app_preferences (syncs across all platforms).
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;

  // V7 (QA 7.0): granular per-category notification toggles (was one
  // all-or-nothing switch), and a couple of real accessibility settings.
  // Future Supabase migration: app_preferences (syncs across all platforms).
  notificationPrefs: Record<
    "mealReminders" | "workoutReminders" | "streakAlerts" | "professionalMessages" | "weeklySummary",
    boolean
  >;
  updateNotificationPrefs: (patch: Partial<AppState["notificationPrefs"]>) => void;

  // Future Supabase migration: device_presentation_settings (per-platform,
  // stays local, never synced) — larger text / reduce motion are
  // presentation, not synced app preferences.
  accessibility: { largerText: boolean; reduceMotion: boolean };
  updateAccessibility: (patch: Partial<AppState["accessibility"]>) => void;

  foodLog: FoodLogEntry[];
  addFoodEntry: (entry: Omit<FoodLogEntry, "id" | "date">) => void;
  // Inserts an entry that already exists in food_log_entries, keeping its
  // real database id. addFoodEntry mints a local id instead, which is fine
  // for the paths that are still local-only but would make a future diary
  // hydration duplicate rather than replace this row.
  addFoodEntryRecord: (entry: FoodLogEntry) => void;
  // V4: logged foods are editable (quantity/unit) and removable.
  updateFoodEntry: (id: string, patch: Partial<Pick<FoodLogEntry, "quantity" | "unit" | "meal">>) => void;
  removeFoodEntry: (id: string) => void;

  workoutLog: WorkoutLogEntry[];
  logWorkout: (entry: Omit<WorkoutLogEntry, "id" | "date">) => void;

  workoutSessions: WorkoutSession[];
  saveWorkoutSession: (
    session: Omit<WorkoutSession, "id">
  ) => Promise<{ ok: boolean; message?: string }>;

  // V6 (QA 6.0): quitting a started routine (instead of finishing it)
  // preserves logged sets + elapsed time, keyed by routine, so reopening it
  // resumes exactly where the user left off.
  pausedSessions: Record<string, PausedWorkoutSession>;
  savePausedSession: (routineId: string, session: PausedWorkoutSession) => void;
  clearPausedSession: (routineId: string) => void;

  // V4: estimated 1RM per exercise name (barbell/dumbbell/weighted-bodyweight
  // only) — auto-updated from logged sets, editable from History/Metrics.
  /** Best estimated 1RM per movement, read from current_personal_records. */
  personalRecords: Record<string, number>;
  /**
   * Records the value and writes it to personal_records.
   *
   * `ref` is the movement the caller already knows it is talking about; without
   * it the name is resolved against the catalog and then the user's own
   * movements. A record for a custom movement that has not synced is QUEUED —
   * the table requires a real id — and written when that id arrives.
   */
  setPersonalRecord: (
    exerciseName: string,
    kg: number,
    ref?: { catalogExerciseId?: string; customExerciseId?: string }
  ) => void;
  /** Records waiting on a custom exercise to finish syncing. Never silently dropped. */
  pendingPersonalRecords: { name: string; kg: number; achievedAt: string }[];
  /**
   * The records this device holds that the server has never seen, which is
   * exactly what the one-time review asks about. Empty once it is dealt with.
   */
  personalRecordsReviewItems: Record<string, number>;
  /**
   * The one-time review of PRs that only ever lived in this browser.
   *
   * Null while it is still loading or not needed. Entries the user confirms
   * are written with achieved_at = now; anything skipped is simply not
   * written, and the flag below stops it ever appearing again.
   */
  personalRecordsReviewDone: boolean;
  completePersonalRecordsReview: (
    confirmed: { name: string; kg: number }[]
  ) => Promise<{ written: number; queued: number; unresolved: string[] }>;

  /**
   * Folders and routines, held in public.routine_folders / public.routines.
   *
   * EVERY WRITE RESOLVES TO AN ERROR SENTENCE OR undefined, the shape custom
   * meals established. Two of them can fail for reasons the user can act on
   * rather than merely retry — a folder cannot be filed inside its own subtree
   * (ATX16) or under another account's folder (ATX17) — so the caller is given
   * something worth showing rather than a boolean.
   */
  routineFolders: RoutineFolder[];
  addRoutineFolder: (
    name: string,
    parentId?: string | null,
    color?: string
  ) => Promise<string | undefined>;
  renameRoutineFolder: (id: string, name: string) => Promise<string | undefined>;
  deleteRoutineFolder: (id: string) => Promise<string | undefined>;
  // QA 11.0: "The folders in routines should be given the option to
  // shuffle and re-order them" + the "⋮" menu should have an Edit option
  // for things like folder color.
  updateRoutineFolder: (id: string, patch: Partial<RoutineFolder>) => Promise<string | undefined>;
  moveRoutineFolder: (id: string, direction: "up" | "down") => Promise<string | undefined>;
  /** Null until the first folder/routine hydration finishes or fails. */
  routinesError: string | null;
  routines: Routine[];
  /** Resolves to the new routine's id, or null when the write failed. */
  addRoutine: (routine: Omit<Routine, "id">) => Promise<string | null>;
  updateRoutine: (id: string, patch: Partial<Routine>) => Promise<string | undefined>;
  deleteRoutine: (id: string) => Promise<string | undefined>;

  water: number;
  // Iteration 6 "Team" streak board: whether each of the last 7 days met
  // its water sub-goal needs every day's total, not just the selected
  // date's — exposed read-only, the same map addWater/setWaterAmount
  // already keep current.
  waterByDate: Record<string, number>;
  // REMOTE-REQUIRED, like saveWorkoutSession and for the same reason: the
  // session guard makes an unauthenticated render impossible, so the offline
  // case these used to cover cannot arise, and a local fallback would mean a
  // value on screen that no other device will ever see. Both report failure
  // instead of silently keeping a number that was never stored.
  addWater: (ml: number) => Promise<{ ok: boolean; message?: string }>;
  setWaterAmount: (ml: number) => Promise<{ ok: boolean; message?: string }>;
  waterGoalMl: number;
  setWaterGoal: (ml: number) => void;

  habits: HabitItem[];
  toggleHabit: (id: string) => void;
  addHabit: (label: string, icon: HabitIconKey) => void;
  removeHabit: (id: string) => void;
  renameHabit: (id: string, label: string) => void;

  streaks: Streak[];
  updateStreak: (id: string, patch: Partial<Streak>) => void;
  // V4 (QA 4.0): a new streak is linked to an existing habit — its days
  // count is kept in sync with that habit's own streakDays.
  addStreak: (habitId: string, goalDays: number) => void;
  removeStreak: (id: string) => void;

  // Iteration 6 "Team" §8: the Home streak board's plant. See the
  // definitions above AppContext for what each holds and why.
  plantStage: number;
  setPlantStage: (stage: number) => void;
  plantSpecies: PlantSpecies;
  cyclePlantSpecies: () => void;

  metricValues: { weight: number; heartRate: number; steps: number; sleepHours: number; caloriesBurned: number };
  updateMetricValue: (
    type: "weight" | "heartRate" | "steps" | "sleepHours" | "caloriesBurned",
    value: number
  ) => void;
  // V8 (QA 8.0): "Add metric" can log today's weight, not just water — this
  // tracks whether it's already been logged today so the input resets once
  // a new day starts instead of staying pre-filled forever.
  weightLoggedDate: string | null;
  weightByDate: Record<string, number>;
  logWeightForToday: (value: number) => Promise<{ ok: boolean; message?: string }>;
  // V8 (QA 8.0): "Pressing the edit feature only prompts you to edit daily
  // step count goal" — the goal is user-configurable; the count itself
  // stays auto-synced.
  stepsGoal: number;
  setStepsGoal: (goal: number) => void;

  // V9 (QA 9.0): "swiping down on [Health] should prompt syncing data with
  // selected integrated health data device" — lifted out of IntegrationsCard
  // (was component-local) so the Health page can tell whether one is on.
  healthIntegrationConnected: boolean;
  setHealthIntegrationConnected: (connected: boolean) => void;

  // Future Supabase migration: device_presentation_settings (per-platform,
  // stays local, never synced) — see the WidgetConfig type comment.
  widgets: WidgetConfig[];
  addWidget: (type: WidgetType, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (id: string, size: WidgetSize) => void;

  nutritionGoal: NutritionGoal;
  setNutritionGoal: (goal: NutritionGoal) => void;
  setWeightGoal: (weightGoal: WeightGoalType, weeklyRateKg: number) => void;
  setMacroSplit: (split: MacroSplit) => void;
  // QA 11.0: shared between Goals & Macros (where it's picked) and the
  // Diary tab (where matching items get highlighted).
  dietaryRestriction: DietaryRestriction | null;
  setDietaryRestriction: (r: DietaryRestriction | null) => void;

  // QA 12.0: "Recovery-sensitive experience" — a reversible, private mode
  // that reduces number-focused and potentially triggering content for a
  // client recovering from (or affected by) disordered eating. Deliberately
  // NOT named after "ED" anywhere client-facing. `recoverySensitiveIntroSeen`
  // gates the one-time explainer shown the first time it's active.
  recoverySensitive: boolean;
  setRecoverySensitive: (on: boolean) => void;
  /** Null until the first streak read finishes or fails. */
  streaksError: string | null;
  recoverySensitiveIntroSeen: boolean;
  setRecoverySensitiveIntroSeen: (seen: boolean) => void;
  /**
   * Whether the voice-logging privacy notice has been acknowledged.
   *
   * Voice is the first feature that sends anything a user produces to a
   * company other than Supabase, and a microphone permission prompt says
   * "this page wants your mic" -- not "this audio leaves for a third party".
   * Nobody should learn the second part from a network tab, so it is said once
   * before the first recording. Same shape as recoverySensitiveIntroSeen: a
   * persisted boolean gating a dismissible notice, not a blocking modal.
   */
  voiceDisclosureSeen: boolean;
  setVoiceDisclosureSeen: (seen: boolean) => void;
  /**
   * The professional has dismissed the "turn on two-factor" nudge.
   *
   * SAME SHAPE AS THE TWO FLAGS ABOVE — a persisted boolean gating a
   * dismissible notice — because that is what this app already does for
   * non-blocking prompts, and a third mechanism for a third prompt would be
   * three things to reason about instead of one.
   *
   * DISMISSAL IS PER DEVICE, and that is the honest reading of localStorage
   * rather than a limitation being papered over: the flag is not on the
   * account, so signing in elsewhere shows the nudge again. For a security
   * reminder that is the better failure direction — the cost of seeing it
   * twice is a banner, and the cost of never seeing it again is an
   * unprotected account.
   *
   * NOTHING READS THIS EXCEPT THE BANNER. It gates no route, no query and no
   * capability; see TwoFactorNudge.
   */
  twoFactorNudgeDismissed: boolean;
  setTwoFactorNudgeDismissed: (dismissed: boolean) => void;
  // "Let users pause reminders, summaries, and notifications with one
  // tap." No real notification engine exists in this prototype to hook
  // into, so this is the user-facing flag that would gate it.
  remindersPaused: boolean;
  setRemindersPaused: (paused: boolean) => void;

  // V4: Meal Prep reworked into "Create Meal" — group existing foods under
  // one title; logging the meal logs every item individually.
  customMeals: CustomMeal[];
  // Promise-returning since these reach custom_meals. They resolve to a
  // message when the write failed and undefined when it did not, so a caller
  // can surface the reason -- an item the food database does not know about
  // is refused rather than silently dropped. See services/custom-meals.
  addCustomMeal: (title: string, items: CustomMeal["items"], mealType?: MealType) => Promise<string | undefined>;
  updateCustomMeal: (
    id: string,
    title: string,
    items: CustomMeal["items"],
    mealType?: MealType
  ) => Promise<string | undefined>;
  removeCustomMeal: (id: string) => Promise<void>;
  /** Null until the first hydration finishes or fails. */
  customMealsError: string | null;
  // QA 11.0: "Meal plans created by the professional should ONLY appear
  // for the assigned client and not everyone" — a professional-authored
  // plan now lives in its own per-client store instead of the single
  // shared `customMeals` list every client's Meal Prep tab read from.
  //
  // STILL LOCAL, AND NOT FOR WANT OF A TABLE. custom_meals.scoped_to_client_id
  // is exactly this, and its RLS already lets the scoped client read the meal.
  // What is missing is the id: `clientId` here is a RELATIONSHIP id, and that
  // column references profiles(id). Writing one into the other would point at
  // nothing. addClientCustomFood is local for the same reason and says so.
  clientCustomMeals: Record<string, CustomMeal[]>;
  addClientCustomMeal: (clientId: string, title: string, items: CustomMeal["items"], mealType?: MealType) => void;
  updateClientCustomMeal: (
    clientId: string,
    id: string,
    title: string,
    items: CustomMeal["items"],
    mealType?: MealType
  ) => void;
  removeClientCustomMeal: (clientId: string, id: string) => void;
  logCustomMeal: (mealId: string, meal: MealType, date: string) => Promise<void>;

  // Mobile handoff item 10: Recipes. Mirrors the customMeals block above
  // exactly — same offline-first local-id pattern, same client-scoped local
  // store for professional-authored recipes (handoff Q6), same reasoning in
  // services/recipes for why it stays local rather than writing
  // scoped_to_client_id from a relationship id that would point at nothing.
  recipes: Recipe[];
  addRecipe: (
    title: string,
    items: RecipeItem[],
    servings: number,
    steps?: string
  ) => Promise<string | undefined>;
  updateRecipe: (
    id: string,
    title: string,
    items: RecipeItem[],
    servings: number,
    steps?: string
  ) => Promise<string | undefined>;
  removeRecipe: (id: string) => Promise<void>;
  recipesError: string | null;
  /** Re-reads custom meals and recipes (Meal Prep's pull-to-refresh). Local-only items are kept. */
  reloadMealPrep: () => Promise<void>;
  clientRecipes: Record<string, Recipe[]>;
  addClientRecipe: (clientId: string, title: string, items: RecipeItem[], servings: number, steps?: string) => void;
  updateClientRecipe: (
    clientId: string,
    id: string,
    title: string,
    items: RecipeItem[],
    servings: number,
    steps?: string
  ) => void;
  removeClientRecipe: (clientId: string, id: string) => void;
  // Logs `servingsToLog` servings' worth of the recipe's ingredients,
  // per-serving (`ingredient total / recipe.servings`), never the whole
  // batch — matching the handoff's "per-serving arithmetic" rule.
  logRecipe: (recipeId: string, servingsToLog: number, meal: MealType, date: string) => Promise<void>;

  journalFolders: JournalFolder[];
  journalEntries: JournalEntry[];
  addJournalEntry: (folderId: string, title: string, text: string) => void;
  updateJournalEntry: (id: string, patch: Partial<Pick<JournalEntry, "title" | "text">>) => void;
  removeJournalEntry: (id: string) => void;
  addJournalFolder: (name: string) => void;

  bloodMarkers: BloodMarker[];
  /** Panels carrying an uploaded report, newest first. Empty when none do. */
  labReports: LabReport[];
  // REMOTE-REQUIRED, and it writes a PANEL rather than loose markers: the
  // schema models blood work as one report carrying several results, and the
  // composite foreign key means the panel has to exist before any marker can
  // reference it. The optional File is the lab report itself.
  recordBiomarkers: (
    entries: ExtractedBiomarker[],
    file?: File
  ) => Promise<{ ok: boolean; message?: string }>;
  // Deletes the PANEL, not just the report: the markers it recorded go with
  // it via ON DELETE CASCADE. The only way a client can remove blood work they
  // uploaded — until this existed, a lab report was permanent.
  removeLabReport: (id: string) => Promise<{ ok: boolean; message?: string }>;

  // QA 12.0: imaging/other tests, medical history (comorbidities/surgeries),
  // and medications — the "biomarker widget lives inside a wider records
  // tab" ask. Also surfaced read-only in the Professional UI's Health
  // Metrics tab for clients sharing health data.
  imagingRecords: ImagingRecord[];
  // REMOTE-REQUIRED, and the first writer in this app that also puts a FILE
  // somewhere. The optional File is uploaded to the private medical-imaging
  // bucket before the row is written; see services/imaging for the ordering
  // and why nothing here is transactional.
  addImagingRecord: (
    r: Omit<ImagingRecord, "id" | "filePath">,
    file?: File
  ) => Promise<{ ok: boolean; message?: string }>;
  removeImagingRecord: (id: string) => Promise<{ ok: boolean; message?: string }>;
  comorbidities: string[];
  // REMOTE-REQUIRED, like the workout and metric writers before them. A
  // medical record that exists only in one browser is worse than no record:
  // it reads as saved, and the professional it was shared with never sees it.
  // Every one of these reports failure rather than keeping a value the server
  // never accepted.
  setComorbidities: (list: string[]) => Promise<{ ok: boolean; message?: string }>;
  surgeries: Surgery[];
  addSurgery: (s: Omit<Surgery, "id">) => Promise<{ ok: boolean; message?: string }>;
  removeSurgery: (id: string) => Promise<{ ok: boolean; message?: string }>;
  medications: Medication[];
  addMedication: (m: Omit<Medication, "id">) => Promise<{ ok: boolean; message?: string }>;
  updateMedication: (id: string, patch: Partial<Medication>) => Promise<{ ok: boolean; message?: string }>;
  removeMedication: (id: string) => Promise<{ ok: boolean; message?: string }>;

  selectedDate: string;
  goToPrevDate: () => void;
  goToNextDate: () => void;
  goToToday: () => void;
  goToDate: (date: string) => void;
  copyYesterdayFood: () => Promise<void>;
  // QA 11.0: "The Swipe to copy yesterdays food option should be located
  // under each type of meal" — copies just one meal type and returns the
  // new entries' ids so the caller can offer an undo.
  copyYesterdayMeal: (meal: MealType) => Promise<string[]>;

  today: string;

  // Future Supabase migration: device_presentation_settings (per-platform,
  // stays local, never synced) — see the ColorTheme type comment.
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;

  customFoods: CustomFood[];
  addCustomFood: (food: Omit<CustomFood, "id" | "isCustom">) => Promise<CustomFood>;

  // V7 (QA 7.0): a food a professional creates while building a specific
  // client's meal plan goes only into that client's own food database, not
  // the professional's personal custom foods or any other client's.
  clientCustomFoods: Record<string, CustomFood[]>;
  addClientCustomFood: (clientId: string, food: Omit<CustomFood, "id" | "isCustom">) => CustomFood;

  /**
   * The public exercise catalog, read from public.exercises.
   *
   * EMPTY UNTIL THE FIRST READ RETURNS, and empty again if it failed — there
   * is no bundled copy to fall back on any more, which is the point: one
   * source, shared by every client, instead of a list each app ships its own
   * version of. `exerciseCatalogError` is how a surface tells the two apart.
   */
  exerciseCatalog: CatalogExercise[];
  /** Null until the first catalog read finishes or fails. */
  exerciseCatalogError: string | null;

  // V4 (QA 4.0): custom exercises are saved to a searchable library, not
  // auto-added to whichever routine was open when they were created.
  customExercises: CustomExerciseLibraryItem[];
  /** Resolves to an error sentence, or undefined when the write landed. */
  addCustomExercise: (item: CustomExerciseLibraryItem) => Promise<string | undefined>;
  // V8 (QA 8.0): "ability to edit each exercise if pressed on in the
  // library" — keyed by id now that these are rows, so a rename is an
  // ordinary update rather than a lookup that its own result invalidates.
  updateCustomExercise: (
    id: string,
    item: CustomExerciseLibraryItem
  ) => Promise<string | undefined>;
  removeCustomExercise: (id: string) => Promise<void>;
  /** Null until the first hydration finishes or fails. */
  customExercisesError: string | null;

  // `professionalReviews` and `submitProfessionalReview` used to live here: a
  // localStorage array keyed by whatever string the calling screen chose. The
  // client rating their linked professional wrote the literal key "me", and
  // the professional read that same key back on their own device, where no
  // client had ever written it. They are professional_reviews rows now, read
  // and written through hooks/useProfessionalReviews.

  // V9 (QA 9.0): "a hub for all clients to share information publicly."
  forumPosts: ForumPost[];
  addForumPost: (category: ForumCategory, title: string, body: string) => void;
  toggleForumLike: (postId: string) => void;
  addForumComment: (postId: string, text: string) => void;

  // WHICH SEEDED MOCK PROFESSIONALS THE USER HAS DISMISSED.
  //
  // This was an ADDED list — ids the mock hire flow had "connected" — until
  // that flow was removed for creating no state a server ever saw. Inverted
  // rather than deleted, because `mockProfessionals` ships one entry already
  // flagged `connected: true` and Remove had no way to turn it off: it
  // filtered an array the seed flag never appeared in, so the button
  // navigated away and the entry was connected again on the next visit.
  //
  // ONLY MOCK IDS EVER LAND HERE. Whether a real professional is connected is
  // decided by `professional_clients`, which this browser cannot edit; the
  // page reads that separately and never consults this list.
  dismissedMockProfessionalIds: string[];
  dismissMockProfessional: (id: string) => void;

  // V7 (QA 7.0): Professional UI — Explore reframes categories as job
  // postings for hiring the professional, gated by a unique-ID affiliation
  // with a business (mirrors the client<->professional code system).
  businessDirectory: BusinessDirectoryEntry[];
  updateMyBusinessTier: (tier: string) => void;

  // professionalTier/setProfessionalTier are GONE. They were a localStorage
  // string the subscription screen wrote on a demo purchase, and no client can
  // change its own plan at all: subscription_states has no write policy or
  // grant for any client role. The plan is read from the database now — see
  // fetchMySubscriptionTier in services/subscription-tiers.

  // V8 (QA 8.0): "as a place holder add a plus sign logo that increases the
  // tier by 1000 points" — added on top of the streak-derived total.
  bonusPoints: number;
  addBonusPoints: (amount: number) => void;
  // QA 11.0: "Put a referral tab... gives you a code when another client,
  // professional and/or business subscribes to Centium. The code applies
  // a 10% discount to the subscription model for a one time use per
  // account. The client who succeeded in referral gets 1500 points in the
  // tier list as well as 15% off of the next month subscription." One
  // account in this prototype, so redeeming a code demonstrates both the
  // redeemer's one-time 10% discount and the referrer's reward on the
  // same account — there's no second account to actually credit.
  referralRedeemed: boolean;
  referralDiscountPct: number;
  referralNextMonthDiscountPct: number;
  // Records the outcome of a real redeem_referral() call locally so the
  // subscription UI can show the discount. Only the referee's side is
  // applied here — the referrer's points and next-month discount are
  // credited to THEIR account by the RPC, not this one, which is the part
  // the old single-account mock had to fake.
  applyReferralReward: (discountPct: number) => void;

  // V8 (QA 8.0): gym membership purchases — day passes expire after 24h and
  // stack with an active monthly/annual plan, which stays active until
  // explicitly cancelled.
  gymPurchases: Record<string, GymPurchase[]>;
  purchaseGymPlan: (gymId: string, plan: string, oneTime: boolean) => void;
  cancelGymPlan: (gymId: string, plan: string) => void;

  // V8 (QA 8.0): "If I choose a subscription plan, it gets saved and a
  // small minimalistic logo appears next to my name" — client-only
  // Centium Premium status, persisted so the badge survives a reload.
  premiumPlan: "monthly" | "yearly" | null;
  setPremiumPlan: (plan: "monthly" | "yearly" | null) => void;

  // V8 (QA 8.0): "When bought it goes to a cart that adopts the same
  // features of checkout most store pages have."
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Issues a real invite code via create_client_code(). Takes no client
  // details: `client_codes` stores provenance only, and the client's profile
  // comes from their own account when they redeem. Creates no relationship —
  // the client appears on the roster only after redeeming.
  generateClientCode: () => Promise<{ ok: boolean; code?: string; message?: string }>;

  // Real, from active_professional_clients + related_profile_summary +
  // client_access_grants. Refetched via refreshRoster().
  professionalClients: ProfessionalClient[];
  rosterLoading: boolean;
  rosterError: string | null;
  refreshRoster: () => Promise<void>;
  removeProfessionalClient: (id: string) => Promise<{ ok: boolean; message?: string }>;

  // The hire inbox that used to be simulated here is real: ProfessionalDashboard
  // reads `pending_client_requests` and answers through accept_client_request /
  // reject_client_request. The localStorage array and its three functions are
  // gone with the mock hire flow that was its only writer.
  updateProfessionalClientAccess: (
    id: string,
    access: Partial<ProfessionalClient["access"]>
  ) => void;
  updateProfessionalClient: (id: string, patch: Partial<ProfessionalClient>) => void;
  assignProgramToClient: (clientId: string, programName: string) => void;
  assignFoodTemplateToClient: (clientId: string, templateName: string) => void;

  // V6 (QA 6.0): Professional UI — Calendar, Workout Template Builder,
  // per-client health notes, and a messaging board.
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeCalendarEvent: (id: string) => void;

  /**
   * The professional's own templates, plus every curated one.
   *
   * A curated template carries `isPublic: true` and no owner. It is readable
   * by everyone and writable by no client role, so the UI must offer neither
   * editing nor assignment for it — the database refuses both anyway (ATX09
   * from the assign function, and no policy permits the write).
   */
  workoutTemplates: WorkoutTemplate[];
  addWorkoutTemplate: (
    t: Omit<WorkoutTemplate, "id" | "createdAt" | "isPublic" | "isVerified" | "ownerId">
  ) => Promise<string | undefined>;
  updateWorkoutTemplate: (
    id: string,
    patch: Partial<Omit<WorkoutTemplate, "id" | "createdAt" | "isPublic" | "isVerified" | "ownerId">>
  ) => Promise<string | undefined>;
  removeWorkoutTemplate: (id: string) => Promise<string | undefined>;

  /**
   * One row per (template, client), each with its own day.
   *
   * WRITTEN ONLY BY THE DATABASE FUNCTION. No client role holds INSERT or
   * UPDATE on workout_template_assignments; `assignTemplate` calls
   * assign_template_to_client, which also creates or refreshes the client's
   * routine and syncs their calendar event. Deleting is the one thing a
   * professional may do directly, and it deliberately leaves the routine.
   */
  templateAssignments: WorkoutTemplateAssignment[];
  assignTemplate: (
    templateId: string,
    clientId: string,
    assignedDay: string | null,
    confirmOverwrite?: boolean
  ) => Promise<AssignResult>;
  unassignTemplate: (assignmentId: string) => Promise<string | undefined>;
  /**
   * Copies a curated starter program into a routine of the user's own.
   *
   * Resolves to an error sentence, or undefined when the routine landed. Every
   * call creates a FRESH routine — adopting the same program twice is two
   * independent routines, which is what "it's mine now" has to mean.
   */
  adoptTemplate: (templateId: string) => Promise<string | undefined>;
  /** Null until the first template hydration finishes or fails. */
  templatesError: string | null;

  workoutTemplateFolders: WorkoutTemplateFolder[];
  addWorkoutTemplateFolder: (
    name: string,
    parentId?: string | null,
    color?: string
  ) => Promise<string | undefined>;
  renameWorkoutTemplateFolder: (id: string, name: string) => Promise<string | undefined>;
  deleteWorkoutTemplateFolder: (id: string) => Promise<string | undefined>;

  clientHealthNotes: Record<string, ClientHealthNote>;
  updateClientHealthNote: (clientId: string, patch: Partial<ClientHealthNote>) => void;

  professionalMessages: ProfessionalMessage[];
  sendProfessionalMessage: (
    clientId: string,
    from: "professional" | "client",
    text: string,
    extra?: { attachment?: string; voiceNoteSec?: number }
  ) => void;

  signOut: () => Promise<void>;
  /**
   * Schedules deletion after a 30-day grace period. Returns the outcome
   * rather than assuming it: nothing local is cleared and the user is not
   * signed out unless the request actually succeeded.
   */
  deleteAccount: () => Promise<{ ok: boolean; message?: string }>;
  cancelDeletion: () => Promise<{ ok: boolean; message?: string }>;
  /** ISO timestamp while a deletion is pending, else null. */
  deletionRequestedAt: string | null;

  businessListing: {
    perk: string;
    active: boolean;
    membersReached: number;
    bio: string;
    location: string;
    // V9 (QA 9.0): "give you an option to write branch type if the
    // business has multiple branches."
    branchType?: string;
    // V10 (QA 10.0): "a credentials tab should include the email, phone
    // number, website. If either one is filled, it should reflect in the
    // client UI as well as part of the explore tab for that specific
    // profile."
    email?: string;
    phone?: string;
    website?: string;
  };
  updateBusinessListing: (patch: Partial<AppState["businessListing"]>) => void;

  // The four business-owned catalog collections used to live here:
  // membershipPlans and discounts nested in businessListing, businessOfferings
  // and businessClasses as their own arrays. All four are real tables now —
  // membership_plans, business_discounts, business_offerings, business_classes
  // — read and written through hooks/useBusinessCatalog. membershipPlans was
  // the worst of them: it shipped seeded with two invented plans, so every
  // business account has been showing "Monthly Membership $45" and "Day Pass
  // $8" to itself since onboarding.
  //
  // What stays here is what is still genuinely local: the perk, the active
  // toggle and the members-reached figure, none of which has a write path yet.

  businessMessages: BusinessMessage[];
  sendBusinessMessage: (customerId: string, from: "business" | "customer", text: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = "centium-state";

// Iteration 6 "Team" §8: the five streak-board plant species — tulip is
// the shipped default, the other four are the tap-to-cycle exploration set
// (README → Interactions). Purely cosmetic; see plantStage below for the
// actual growth mechanic.
export type PlantSpecies = "tulip" | "rose" | "sunflower" | "daisy" | "lily";

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Where an administrator's "let me into the consumer app anyway" lives.
 *
 * DELIBERATELY OUTSIDE `centium-state:`. Everything under that prefix is
 * localStorage and is the app's persisted cache; this is sessionStorage and
 * holds an account id, not a preference. signOut() clears it explicitly
 * rather than by prefix, for that reason.
 */
const ADMIN_CONSUMER_KEY = "centium-admin-consumer";

function readAdminConsumerOptIn(userId: string | null): boolean {
  if (!userId) return false;
  try {
    return window.sessionStorage.getItem(ADMIN_CONSUMER_KEY) === userId;
  } catch {
    return false;
  }
}

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const loaded = loadPersisted(key, initial);
    // Shallow-merge over the current default shape so a field added to an
    // object-shaped piece of state after a user already saved a session
    // (e.g. metricValues gaining sleepHours/caloriesBurned) fills in with a
    // sane default instead of staying `undefined` and crashing consumers —
    // rather than re-litigating this per persisted key.
    if (isPlainObject(initial) && isPlainObject(loaded)) {
      return { ...initial, ...loaded } as T;
    }
    return loaded;
  });
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(state));
    } catch (e) {
      // AN UNCAUGHT THROW HERE WOULD TAKE THE APP DOWN, not just lose a
      // write: this runs inside a React effect, on every persisted key in the
      // file, so whatever React does with a thrown effect it does to the
      // whole tree. The realistic trigger is QuotaExceededError — a private
      // window where storage is refused outright, or an origin that has
      // filled its quota. Profile pictures used to be stored here as base64
      // (a 7.5 MB photo became a 10 MB string), which is exactly how an
      // origin fills a 5 MB Safari quota; that is fixed separately, but the
      // hole it exposed is this line.
      //
      // Losing the write is survivable on its own terms: React state is
      // already correct, so the session continues with the right values and
      // only a reload would forget them.
      console.warn(`[state] Could not persist "${key}":`, e);
    }
  }, [key, state]);
  return [state, setState] as const;
}

// Pure UTC-based date-string arithmetic — deliberately never touches the
// browser's local timezone, so "yesterday"/"tomorrow" land on the correct
// calendar day regardless of where the app is running (mixing a local-time
// parse with a UTC serialization silently shifted dates by a day for any
// UTC+ timezone, e.g. Beirut).
function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // WHICH DAY IT IS, for everything date-keyed: the diary, weight, water,
  // streaks, journal entries. This was a hardcoded "2026-08-20" for as long
  // as the app had no backend, which was harmless while every date was
  // invented and stopped being harmless the moment Postgres began stamping
  // real ones. A workout written with a real started_at did not match the day
  // the app thought it was, and the streak anchors sat three weeks in the
  // past, so a genuine logging streak counted zero.
  //
  // STATE RATHER THAN A CONSTANT, because a constant evaluated once at import
  // is the same bug with a shorter fuse: an app left open across midnight
  // would go on stamping yesterday. It re-checks on a timer and whenever the
  // tab comes back, so the rollover lands within a minute either way.
  const [today, setToday] = useState(todayLocal);

  useEffect(() => {
    const tick = () =>
      setToday((prev) => {
        const now = todayLocal();
        return prev === now ? prev : now;
      });
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const [user, setUser] = usePersistentState<UserProfile>("user", defaultUser);

  // --- Supabase session ----------------------------------------------------
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Restore an existing session on load, so an already-signed-in user is
    // never shown the auth screen again.
    void getCurrentSession().then((existing) => {
      if (cancelled) return;
      setSession(existing);
      setAuthReady(true);
    });

    // Then stay subscribed. This is the single place a profiles row gets
    // created: every path into a session (email confirmation, password
    // sign-in, Google OAuth, token refresh on a later visit) lands here, so
    // one idempotent upsert covers all of them instead of three separate
    // call sites that can drift apart.
    const unsubscribe = onAuthChange((next) => {
      if (cancelled) return;
      setSession(next);
      setAuthReady(true);
      if (next?.user) {
        // SEQUENCED, NOT FIRED TOGETHER. streaks.owner_id references
        // profiles(id), so seeding before the profile row exists fails the
        // foreign key on a brand-new account — the one case this is for.
        //
        // Both are idempotent and both swallow their own failures, so this
        // runs on every auth event rather than only on sign-up: an account
        // created before the four streaks existed gets them on its next visit
        // without a migration.
        //
        // AND THE SAME REFERENCE IS WHY THE CHAIN CAN STOP. An administrator
        // gets no profiles row (see ensureProfileRow), so seeding streaks for
        // one would fail that foreign key on every single auth event. The
        // reported flag is what says which case this is.
        void ensureProfileRow(next.user.id, next.user.email ?? null).then(({ profileEnsured }) => {
          if (!profileEnsured) return;
          return ensureAutoStreaks(next.user.id);
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const authUserId = session?.user?.id ?? null;

  // Re-registers this browser for push when a session begins, if — and only if
  // — the browser already holds a permission grant. Never prompts.
  //
  // MOUNTED HERE RATHER THAN IN Layout, and the difference is not cosmetic.
  // UnreadProvider lives in Layout because its work is continuous and belongs
  // to the authenticated shell; Layout unmounts whenever someone visits a
  // marketing route, so a once-per-session guard held there would reset on
  // every trip to the landing page and re-fire on the way back. AppProvider
  // wraps the router and never unmounts, so "once per sign-in" means exactly
  // that. See src/hooks/usePushSubscriptionSync.ts.
  usePushSubscriptionSync(authUserId);

  // A session ending must clear the local cache, however it ended.
  //
  // signOut() clears `centium-state:*` itself, so the deliberate path was
  // always safe. Every other way a session ends was not: an expired token, a
  // session revoked elsewhere, or closing the browser with "Remember me" off
  // all leave the cache fully populated with no session behind it. The route
  // guard now refuses to render in that state, but refusing to render is not
  // the same as not holding the data — the previous account's name, email and
  // hydrated server data would still be sitting in localStorage for the next
  // person to open the browser, or for any script on the origin to read.
  //
  // A TRANSITION IS NOT ENOUGH, and this is the case that nearly got missed.
  //
  // Watching only for non-null → null catches a session expiring while the
  // tab is open, and misses the commonest way this happens by far: the
  // browser is closed and reopened. That is a fresh page load which never
  // sees a session at all, so there is no transition to observe — and the
  // cache from the previous run is sitting right there.
  //
  // So the test is "is there cached account data with no session to justify
  // it", not "did I watch a session end". A never-signed-in visitor is
  // excluded by looking at whether the cached profile belongs to a real
  // account: defaultUser ships with an empty email and onboarded false, while
  // a hydrated one carries the account's own address. That keeps an anonymous
  // visitor's theme and language alone.
  const seenSession = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    if (authUserId) {
      seenSession.current = authUserId;
      return;
    }

    // A STORED TOKEN MEANS "COULD NOT VERIFY", NOT "SIGNED OUT", and the
    // difference is the whole reason this guard exists.
    //
    // Reproduced rather than theorised: opening the app offline with an
    // expired access token makes getSession() attempt a refresh, fail, and
    // return null — identical, from here, to having no session. This effect
    // then wiped all 63 `centium-state:*` keys and the route guard showed the
    // sign-in screen to someone who had never signed out. Server-backed data
    // came back on reconnect; habits, streaks, journal, routines, calendar
    // events and custom foods have no server copy and did not.
    //
    // The cookie is still present through all of that, carrying a refresh
    // token that works the moment there is a network. So the presence of a
    // stored token is treated as reason enough to keep the cache — the
    // security case this guard was built for is a session that genuinely
    // ended, and sign-out removes the cookie.
    if (hasStoredSessionToken()) return;

    let cacheBelongsToAnAccount = false;
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:user`);
      const cached = raw ? (JSON.parse(raw) as Partial<UserProfile>) : null;
      cacheBelongsToAnAccount = !!cached && (!!cached.email || cached.onboarded === true);
    } catch {
      // Unparseable cache is not worth keeping either way.
      cacheBelongsToAnAccount = true;
    }

    if (!seenSession.current && !cacheBelongsToAnAccount) return;
    seenSession.current = null;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_KEY))
      .forEach((k) => localStorage.removeItem(k));
    setUser({ ...defaultUser });
  }, [authUserId, authReady, setUser]);

  // --- password recovery scoping ------------------------------------------
  //
  // A recovery session is a real session, so nothing stops it reaching the
  // app on its own. These two pieces of state are what refuse it.
  // Set from profile hydration and from the deletion RPCs themselves, so a
  // returning user inside the grace period is shown their pending deletion
  // rather than having to remember they asked for it.
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<string | null>(null);

  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(() =>
    getRecoveryPendingUserId()
  );
  // Covers the window before PASSWORD_RECOVERY fires: GoTrue saves the session
  // first and notifies afterwards, so for a moment a session exists and the
  // flag does not. Detected from the PKCE verifier, which carries the flow
  // type, so it needs no event.
  const [recoveryInFlight, setRecoveryInFlight] = useState(() => isRecoveryExchangeInFlight());

  useEffect(() => {
    const unsubscribe = onPasswordRecovery((userId) => {
      markRecoveryPending(userId);
      setRecoveryUserId(userId);
      // The flag now covers what the in-flight check was covering.
      setRecoveryInFlight(false);
    });
    return unsubscribe;
  }, []);

  // Self-clearing: once the verifier is consumed the exchange is over, and
  // whether it was a recovery is recorded in the flag by then.
  useEffect(() => {
    if (recoveryInFlight && !isRecoveryExchangeInFlight()) setRecoveryInFlight(false);
  }, [session, authReady, recoveryInFlight]);

  const recoveryPending =
    recoveryInFlight || (!!authUserId && recoveryUserId === authUserId);

  // Both halves, together. Clearing storage alone was the bug: the flag went
  // away but recoveryUserId did not, so recoveryPending stayed true and the
  // guards bounced every navigation back to /app/reset-password. Only a full
  // page load re-ran the state initializer and freed the account — and since
  // sign-out and sign-in are client-side too, neither of them helped.
  const clearRecovery = useCallback(() => {
    clearRecoveryPending();
    setRecoveryUserId(null);
    setRecoveryInFlight(false);
  }, []);

  // Hydrate the local profile from the server whenever the signed-in account
  // changes.
  //
  // `user` is one localStorage entry, not keyed by account, so it carries
  // whoever used this browser last — and signOut resets it to the seeded
  // demo profile ("Abdallah", 106.4kg). Both make it useless as a source of
  // truth for `onboarded`: a genuinely onboarded user signing in on a fresh
  // or reset browser was sent back through onboarding. The server row wins;
  // the cached copy only survives for fields `profiles` has no column for.
  // Which account the local profile has been hydrated for. `undefined` means
  // "not yet", and is deliberately distinct from `null`, which means "hydrated
  // for the signed-out state".
  const [hydratedFor, setHydratedFor] = useState<string | null | undefined>(undefined);

  // DERIVED, not stored. This is what closes the race.
  //
  // A stored `profileReady` flag stays stale for one render after the account
  // changes: signing in flips authUserId immediately, but the effect that
  // would reset the flag only runs after that render. In that window a route
  // guard sees "ready" next to the PREVIOUS account's data — or, right after
  // sign-out reset it, next to the seeded default with onboarded:false — and
  // acts on it. Comparing against the id we actually hydrated for cannot go
  // stale, because both sides come from the same render.
  //
  // Held in state rather than a ref because completing a hydration has to
  // re-render; a ref would update silently and readiness would never become
  // visible to the guards.
  const profileReady = authReady && hydratedFor === authUserId;

  // --- admin detection -----------------------------------------------------
  //
  // WHY THE CONSUMER APP ASKS THIS AT ALL. An admin account signing in here
  // was routed straight into onboarding like a brand-new user, because nothing
  // on this side knew what it was looking at. is_admin() is the only way to
  // find out: admin_users has no grants and no policies, so the table itself
  // is unreadable, and the function is SECURITY DEFINER over auth.uid().
  //
  // ONLY WITH A SESSION. The EXECUTE grant covers authenticated and
  // service_role and deliberately excludes anon, so calling this signed out
  // returns 42501 rather than false — measured. The guard below is what keeps
  // that out of the console on every signed-out render.
  //
  // Keyed the same way hydratedFor is, and for the same reason: a stored
  // boolean stays stale for one render after the account changes, which is
  // exactly the window a route guard reads it in.
  const [adminFor, setAdminFor] = useState<{ userId: string | null; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!authUserId) {
      // Signed out: not an admin, and nobody to ask about. Answered rather
      // than left pending, so the guards never hold a signed-out render on a
      // question with no subject.
      setAdminFor({ userId: null, isAdmin: false });
      return;
    }
    let cancelled = false;
    void isAdminAccount().then((result) => {
      if (cancelled) return;
      // isAdminAccount() already turns a failed check into false. An admin
      // seeing the consumer app because a round trip failed is where they
      // were already; every user stuck on a loading screen is not.
      setAdminFor({ userId: authUserId, isAdmin: result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, authReady]);

  const adminReady = authReady && adminFor?.userId === authUserId;
  const isAdmin = adminReady ? (adminFor?.isAdmin ?? false) : null;

  // --- two-factor ----------------------------------------------------------
  //
  // THE SESSION IS ALREADY REAL BY THE TIME THIS MATTERS. Signing in with a
  // password alone, on an account with a verified factor, produces a session,
  // fires SIGNED_IN, and reads data through RLS perfectly happily — measured.
  // The JWT simply says aal1 while the account can reach aal2. Nothing about
  // that looks like a failure, which is why the second factor has to be
  // enforced by a route guard here rather than assumed to be handled.
  //
  // Keyed per account exactly like adminFor, for the reason written there: a
  // bare boolean is stale for one render after the account changes, and that
  // render is the one a guard reads.
  const [mfaFor, setMfaFor] = useState<{ userId: string | null; pending: boolean } | null>(null);

  const resolveMfa = useCallback(async (userId: string | null) => {
    if (!userId) {
      setMfaFor({ userId: null, pending: false });
      return;
    }
    // A failed check resolves to "not pending", the same direction adminFor
    // fails in and for the same reason. Holding every signed-in user on a
    // loading screen because one round trip failed is a worse outcome than a
    // challenge that does not appear — and the sensitive operations behind
    // the challenge are refused by the server anyway, which is the layer that
    // actually enforces this.
    const pending = await isMfaChallengePending();
    setMfaFor({ userId, pending });
  }, []);

  // No cancellation flag, unlike the effects around it, because the key does
  // that job: a resolve that lands after the account changed writes the OLD
  // user id, which makes mfaReady false rather than answering the new
  // account's question with the previous one's answer.
  useEffect(() => {
    if (!authReady) return;
    void resolveMfa(authUserId);
  }, [authUserId, authReady, resolveMfa]);

  const mfaReady = authReady && mfaFor?.userId === authUserId;
  const mfaPending = mfaReady ? (mfaFor?.pending ?? false) : false;

  /**
   * Re-reads the assurance level after something changed it.
   *
   * Needed because this is keyed to the ACCOUNT, not the session token, and
   * passing a challenge changes the token without changing the account. The
   * alternative — depending on the access token — would re-run a round trip
   * on every silent refresh, which on this project is every five minutes.
   */
  const refreshMfaState = useCallback(async () => {
    await resolveMfa(authUserId);
  }, [authUserId, resolveMfa]);

  // The same answer, readable from inside an async continuation.
  //
  // Three hydration effects below carry local seed data up to the server once
  // per account — custom meals, custom exercises, routines and their folders.
  // Every one of those inserts references profiles(id), so for an
  // administrator they fail their foreign key in a burst of 409s on every
  // page load, writing nothing. Measured after this change went in, with an
  // admin who had reached the app through the interstitial's escape hatch.
  //
  // A REF RATHER THAN A DEPENDENCY, because the uploads run inside a .then()
  // after a network read: by then the current value is the right one, and
  // adding a dependency would re-run three effects on an answer that only
  // ever matters to a handful of lines inside them. Read as `!== true`, never
  // `=== false`, so an answer still in flight behaves exactly as it did
  // before this existed — the admin case is worth tidying, not worth putting
  // a real user's one-time upload behind another round trip.
  const isAdminRef = useRef<boolean | null>(null);
  isAdminRef.current = isAdmin;

  // The admin's way past the interstitial, for this browser session only.
  //
  // SESSION STORAGE, NOT LOCAL STORAGE, and the difference is the whole
  // point. "Let me through today" must not quietly become "never show me
  // this again" on a machine somebody keeps signed in — the notice exists to
  // say the admin console is elsewhere, and a permanent dismissal would
  // erase that for good. sessionStorage dies with the tab.
  //
  // Keyed by account id so it cannot carry to whoever signs in next, and
  // cleared outright by signOut() so it does not carry across a sign-out for
  // the SAME admin either — skipping a notice nobody asked to skip is the
  // failure mode worth spending a line on.
  const [adminConsumerOptIn, setAdminConsumerOptIn] = useState(false);

  useEffect(() => {
    setAdminConsumerOptIn(readAdminConsumerOptIn(authUserId));
  }, [authUserId]);

  const continueAsConsumer = useCallback(() => {
    if (!authUserId) return;
    try {
      window.sessionStorage.setItem(ADMIN_CONSUMER_KEY, authUserId);
    } catch {
      // Storage refused (private mode, or a browser with it disabled). The
      // state below still flips, so the admin gets through on this page life
      // and only a reload asks again — worse than remembering, better than a
      // button that does nothing.
    }
    setAdminConsumerOptIn(true);
  }, [authUserId]);

  // --- activity stamping ---------------------------------------------------
  //
  // Records the account as in use, on open and on every foreground-resume.
  // Nothing reads last_active_at yet; this ships first so that when the
  // inactive-account work lands there is real history behind it rather than a
  // column that only starts meaning something from that day onward.
  //
  // RESUME MATTERS AS MUCH AS OPEN, and arguably more. A phone that keeps this
  // tab alive for weeks produces exactly one cold open, so an app-open-only
  // signal would show someone as inactive throughout genuine daily use — which
  // is precisely the population an inactivity sweep would then act on.
  //
  // GATED ON profileReady, NOT JUST ON A SESSION. The RPC raises 'profile not
  // found' rather than creating a row, so firing it in the window between a
  // session appearing and ensureProfileRow finishing would throw on a first
  // sign-up. profileReady already means "this user's profile has been read",
  // which is the same condition every other loader here waits for.
  //
  // Its own listeners rather than the day-rollover ones above: that effect is
  // deliberately auth-agnostic with an empty dependency array, and giving it a
  // session dependency to carry this would make a well-understood piece of
  // date handling re-subscribe on every auth change to serve an unrelated
  // concern. Two cheap listeners are worth less coupling than one.
  //
  // AND NOT FOR AN ADMINISTRATOR, for the same reason. They have no profiles
  // row at all, so every stamp would raise 'profile not found' — a warning on
  // each tab focus, describing a state that is correct.
  useEffect(() => {
    if (!profileReady || !authUserId || isAdmin !== false) return;
    const uid = authUserId;

    touchLastActive(uid);
    // visibilitychange also fires on the way OUT. Stamping then would record
    // the moment someone left as activity, which is the opposite of the
    // signal, so only the visible edge counts.
    const onWake = () => {
      if (document.visibilityState === "visible") touchLastActive(uid);
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [authUserId, profileReady, isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    if (!authUserId) {
      // Signed out: nothing to hydrate, and guards shouldn't block.
      setHydratedFor(null);
      return;
    }
    let cancelled = false;
    void fetchProfile(authUserId).then((result) => {
      if (cancelled) return;
      if (result) {
        setUser((prev) => ({ ...prev, ...result.profile }));
        // Deliberately NOT cleared on sign-in. Reviving an account because
        // someone happened to log in would undo a deliberate request without
        // them asking; cancelling is an explicit action.
        setDeletionRequestedAt(result.deletionRequestedAt);
      }
      // Marked hydrated even on failure — a read error must not lock the user
      // out of the app behind a permanent loading state.
      setHydratedFor(authUserId);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, authReady, setUser]);

  // --- rescuing profile pictures that never reached the server -------------
  //
  // WHAT THESE PEOPLE HAVE. Before services/avatar existed, picking a profile
  // picture read the file into a base64 `data:` URL and put it in local
  // state. Nothing was uploaded and profiles.avatar_url was never written, so
  // the picture exists in exactly one browser's localStorage — invisible to
  // their coach, to the other side of every message thread, and to themselves
  // on any other device. It also dies the first time they sign out, since
  // signOut clears `centium-state:*`. This gets it to the server first.
  //
  // THE CANDIDATE TEST IS THE VALUE'S OWN SHAPE, the same trick the custom
  // meal, custom exercise and routine uploads use rather than a migration
  // flag that can drift: `data:` means local-only, anything else came from
  // the server. A successful migration replaces the value with an https URL,
  // so the same picture cannot qualify twice — and the ref below stops a
  // FAILED attempt retrying in a loop, with the next page load as the retry.
  //
  // AFTER profileReady, WHICH IS WHAT MAKES IT SAFE. fetchProfile overwrites
  // the local value whenever the server holds one, so a `data:` URL surviving
  // hydration is proof the column is empty — there is no round trip needed to
  // ask, and no chance of overwriting a picture set on another device.
  const avatarMigrationAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    if (avatarMigrationAttempted.current === authUserId) return;
    const local = user.avatarUrl;
    if (!isLocalOnlyAvatar(local)) return;

    avatarMigrationAttempted.current = authUserId;
    let cancelled = false;
    void migrateLocalAvatar(authUserId, local!).then((result) => {
      if (cancelled || !result.ok) return;
      // Only if it is still the same picture. Someone who picked a new one
      // while this was in flight has already written a real URL, and the
      // migration must not put the old face back.
      setUser((prev) => (prev.avatarUrl === local ? { ...prev, avatarUrl: result.url } : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, user.avatarUrl, setUser]);

  const [theme, setTheme] = usePersistentState<"light" | "dark">("theme", "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const [language, setLanguage] = usePersistentState<Language>("language", "en");
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);
  const t = (key: string) => translations[language][key] ?? key;
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const [notificationPrefs, setNotificationPrefs] = usePersistentState<AppState["notificationPrefs"]>(
    "notificationPrefs",
    {
      mealReminders: true,
      workoutReminders: true,
      streakAlerts: true,
      professionalMessages: true,
      weeklySummary: true,
    }
  );
  const updateNotificationPrefs: AppState["updateNotificationPrefs"] = (patch) =>
    setNotificationPrefs((prev) => ({ ...prev, ...patch }));

  const [accessibility, setAccessibility] = usePersistentState<AppState["accessibility"]>("accessibility", {
    largerText: false,
    reduceMotion: false,
  });
  const updateAccessibility: AppState["updateAccessibility"] = (patch) =>
    setAccessibility((prev) => ({ ...prev, ...patch }));
  useEffect(() => {
    document.documentElement.style.fontSize = accessibility.largerText ? "112.5%" : "";
    document.documentElement.classList.toggle("larger-icons", accessibility.largerText);
    document.documentElement.classList.toggle("reduce-motion", accessibility.reduceMotion);
  }, [accessibility]);

  // Starts empty. The seeded demo meals are gone — see services/food, which
  // is what will hydrate this from food_log_entries.
  //
  // The key is versioned because the persisted SHAPE changed. Entries used to
  // nest a whole Food and hold per-serving macros; they now hold totals and a
  // `display` block. An old entry read back under the new type has no
  // `display` at all, and the diary crashes on `e.display.category` — a
  // failure the type system cannot catch, because localStorage is untyped by
  // construction. Reading a fresh key sidesteps every stale row at once.
  // Migrating them was rejected: they are local-only prototype data whose
  // foodIds point at mock foods that no longer exist.
  const [foodLog, setFoodLog] = usePersistentState<FoodLogEntry[]>("foodLog_v2", []);

  // Drop the superseded key rather than leaving it to accumulate in every
  // existing user's browser forever.
  useEffect(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}:foodLog`);
    } catch {
      // A browser blocking site data is not a reason to fail startup.
    }
  }, []);
  const [workoutLog, setWorkoutLog] = usePersistentState<WorkoutLogEntry[]>(
    "workoutLog",
    seedWorkoutLog()
  );
  const [workoutSessions, setWorkoutSessions] = usePersistentState<WorkoutSession[]>(
    "workoutSessions",
    []
  );
  const [workoutHistoryError, setWorkoutHistoryError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [medicalError, setMedicalError] = useState<string | null>(null);
  const [imagingError, setImagingError] = useState<string | null>(null);
  const [labsError, setLabsError] = useState<string | null>(null);
  const [personalRecords, setPersonalRecords] = usePersistentState<Record<string, number>>(
    "personalRecords",
    {}
  );

  /**
   * PRs still sitting in localStorage that name a movement the server cannot
   * reference yet — a custom exercise created offline and not yet uploaded.
   *
   * personal_records takes `num_nonnulls(...) = 1`, so there is nothing to
   * write until that movement has a row. Queued rather than dropped, and
   * flushed by the effect below the moment the id exists. Persisted, because
   * the sync it is waiting for may not happen in this page's lifetime.
   */
  const [pendingPersonalRecords, setPendingPersonalRecords] = usePersistentState<
    { name: string; kg: number; achievedAt: string }[]
  >("pendingPersonalRecords", []);

  /**
   * Whether the one-time PR review has been dealt with on this device.
   *
   * PER DEVICE, NOT PER ACCOUNT, and that is the right scope: what it reviews
   * is this browser's localStorage, which is also per device. A second device
   * with its own old local records gets its own prompt, and one with none
   * never sees it at all.
   */
  const [personalRecordsReviewDone, setPersonalRecordsReviewDone] = usePersistentState<boolean>(
    "personalRecordsReviewDone",
    false
  );

  /**
   * Exactly the records that only ever lived in this browser.
   *
   * CAPTURED BEFORE THE FIRST SERVER READ REPLACES THE MAP, and persisted,
   * because that replacement is what would otherwise lose them: the local map
   * becomes the server's answer, and anything the server never had would be
   * gone before the user was asked about it.
   *
   * It is also what stops the review asking about records it just wrote. A
   * name the server already returns is not a leftover, so a PR set through
   * normal logging never appears here.
   */
  const [personalRecordsReviewItems, setPersonalRecordsReviewItems] = usePersistentState<
    Record<string, number>
  >("personalRecordsReviewItems", {});

  const [pausedSessions, setPausedSessions] = usePersistentState<Record<string, PausedWorkoutSession>>(
    "pausedSessions",
    {}
  );

  // A paused session belongs to a ROUTINE ROW. routine_id is NOT NULL on
  // paused_workout_sessions and a uuid, so a freeform session (no routine at
  // all) and a routine that has not synced both stay local-only — the sheet
  // already refuses to pause without a routineId, and this refuses to send one
  // the table could not accept.
  const isPausableRoutineId = (routineId: string) => isUuid(routineId);

  const savePausedSession: AppState["savePausedSession"] = (routineId, session) => {
    setPausedSessions((prev) => ({ ...prev, [routineId]: session }));
    if (!authUserId || !isPausableRoutineId(routineId)) return;
    void savePausedSessionRemote(authUserId, routineId, {
      logged: session.logged,
      elapsedSec: session.elapsedSec,
      startedAt: session.startedAt,
      started: session.started,
    });
  };

  const clearPausedSession: AppState["clearPausedSession"] = (routineId) => {
    setPausedSessions((prev) => {
      if (!(routineId in prev)) return prev;
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
    // Cleared remotely even when it was not in local state: finishing a
    // workout on another device must not leave a resume prompt here.
    if (!authUserId || !isPausableRoutineId(routineId)) return;
    void clearPausedSessionRemote(authUserId, routineId);
  };

  const [routineFolders, setRoutineFolders] = usePersistentState<RoutineFolder[]>(
    "routineFolders",
    defaultRoutineFolders
  );
  const [routines, setRoutines] = usePersistentState<Routine[]>("routines", seedRoutines());

  const [waterGoalMl, setWaterGoalState] = usePersistentState<number>("waterGoalMl", 2500);
  const [habits, setHabits] = usePersistentState<HabitItem[]>("habits", defaultHabits);
  const [streaks, setStreaks] = usePersistentState<Streak[]>("streaks", seedStreaks);

  // Iteration 6 "Team" §8, Home streak board: the plant's growth is a
  // running high-water mark, not something re-derived from the current
  // week alone — "a missed week leaves the plant where it stopped; it
  // resumes rather than resetting" (README → Interactions). StreaksBar
  // reads this alongside the current week's real earned-day count and
  // takes whichever is higher; it never writes a value that would move
  // this backward. Species choice is purely cosmetic and independent of
  // growth stage.
  const [plantStage, setPlantStage] = usePersistentState<number>("plantStage", 1);
  const [plantSpecies, setPlantSpecies] = usePersistentState<PlantSpecies>("plantSpecies", "tulip");
  const cyclePlantSpecies = () => {
    const order: PlantSpecies[] = ["tulip", "rose", "sunflower", "daisy", "lily"];
    setPlantSpecies((s) => order[(order.indexOf(s) + 1) % order.length]);
  };

  const [metricValues, setMetricValues] = usePersistentState("metricValues", {
    weight: 106.4,
    heartRate: 68,
    steps: 8421,
    sleepHours: 7.7,
    caloriesBurned: 2340,
  });

  const [widgets, setWidgets] = usePersistentState<WidgetConfig[]>("widgets", defaultWidgets);

  const [nutritionGoal, setNutritionGoalState] = usePersistentState<NutritionGoal>(
    "nutritionGoal",
    suggestNutritionGoal(defaultUser, "maintain", 0)
  );

  const [dietaryRestriction, setDietaryRestriction] = usePersistentState<DietaryRestriction | null>(
    "dietaryRestriction",
    null
  );

  const [recoverySensitive, setRecoverySensitive] = usePersistentState<boolean>("recoverySensitive", false);
  const [voiceDisclosureSeen, setVoiceDisclosureSeen] = usePersistentState<boolean>(
    "voiceDisclosureSeen",
    false
  );
  const [recoverySensitiveIntroSeen, setRecoverySensitiveIntroSeen] = usePersistentState<boolean>(
    "recoverySensitiveIntroSeen",
    false
  );
  const [twoFactorNudgeDismissed, setTwoFactorNudgeDismissed] = usePersistentState<boolean>(
    "twoFactorNudgeDismissed",
    false
  );
  const [remindersPaused, setRemindersPaused] = usePersistentState<boolean>("remindersPaused", false);

  const [customMeals, setCustomMeals] = usePersistentState<CustomMeal[]>("customMeals", []);
  const [recipes, setRecipes] = usePersistentState<Recipe[]>("recipes", []);

  const [journalFolders, setJournalFolders] = usePersistentState<JournalFolder[]>(
    "journalFolders",
    defaultJournalFolders
  );
  const [journalEntries, setJournalEntries] = usePersistentState<JournalEntry[]>(
    "journalEntries",
    []
  );

  // NO LONGER SEEDED FROM THE MOCK PANEL. Those five markers carried invented
  // values, ranges, statuses and three-point histories that the server has
  // never held, and hydration would overwrite them on the first read anyway.
  // The Biomarkers tab is empty until a real capture, which is the honest
  // state for an account that has never uploaded blood work.
  const [bloodMarkers, setBloodMarkers] = usePersistentState<BloodMarker[]>("bloodMarkers", []);
  // Not persisted: these are just paths into a private bucket, and the list is
  // cheap to re-read. Caching object paths locally would also outlive the
  // objects themselves, since Storage does not cascade on row deletion.
  const [labReports, setLabReports] = useState<LabReport[]>([]);

  // Lab results, hydrated from blood_panels + blood_markers and inverted back
  // into the name-keyed shape the UI consumes. A PLAIN REPLACE, like the other
  // remote-required lists; left alone on failure rather than emptied, since an
  // empty lab history and an unreadable one are opposite claims.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getBloodMarkers(authUserId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLabsError(result.message);
        return;
      }
      setLabsError(null);
      setBloodMarkers(result.markers);
    });
    // Reports are their own read: grouped by panel rather than by marker name,
    // so they cannot ride along on a query shaped for the other question.
    void getLabReports(authUserId).then((result) => {
      if (cancelled) return;
      if (result.ok) setLabReports(result.reports);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  const [imagingRecords, setImagingRecords] = usePersistentState<ImagingRecord[]>("imagingRecords", []);

  // Hydrated from imaging_records. A PLAIN REPLACE, like the other
  // remote-required lists: every entry came from the server, so the server's
  // answer is the truth. Left alone on failure rather than emptied — an empty
  // imaging history and an unreadable one are different claims.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getImagingRecords(authUserId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setImagingError(result.message);
        return;
      }
      setImagingError(null);
      setImagingRecords(result.records);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  const addImagingRecord = async (
    r: Omit<ImagingRecord, "id" | "filePath">,
    file?: File
  ): Promise<{ ok: boolean; message?: string }> => {
    if (!authUserId) return { ok: false, message: "You need to be signed in to save this." };
    const result = await addImagingRecordRemote(authUserId, r, file);
    if (!result.ok) return { ok: false, message: result.message };
    setImagingRecords((prev) => [
      ...prev,
      { ...r, id: result.id!, ...(result.filePath ? { filePath: result.filePath } : {}) },
    ]);
    return { ok: true };
  };

  const removeImagingRecord = async (id: string): Promise<{ ok: boolean; message?: string }> => {
    // The path has to be read BEFORE the row goes: it is the only handle on
    // the object, and Storage does not cascade.
    const existing = imagingRecords.find((r) => r.id === id);
    const result = await deleteImagingRecordRemote(id, existing?.filePath);
    if (!result.ok) return result;
    setImagingRecords((prev) => prev.filter((r) => r.id !== id));
    return { ok: true };
  };

  const [comorbidities, setComorbidities_] = usePersistentState<string[]>("comorbidities", []);
  const [surgeries, setSurgeries] = usePersistentState<Surgery[]>("surgeries", []);
  const [medications, setMedications] = usePersistentState<Medication[]>("medications", []);

  // --- medical history: remote-first ---------------------------------------
  //
  // Local ids are gone from all three. Every row here carries the id Postgres
  // minted, because nothing is added to these lists until the insert has
  // landed — which is what keeps deletes addressable and stops a second id
  // space forming the way it did in the food diary.

  const requireSession = () => (authUserId ? null : "You need to be signed in to save this.");

  /**
   * Diffs the requested list against what is held, then applies the
   * difference one row at a time.
   *
   * A LIST SETTER OVER A ROW TABLE. The UI toggles chips and hands back a
   * whole array, while the database holds one row per condition, so this has
   * to work out what actually changed. Removals delete every row carrying
   * that condition, not one — the table has no unique index, deliberately, so
   * a condition can be present twice and deleting a single row would leave
   * the chip to reappear on the next read.
   *
   * The local list is only updated for the writes that succeeded, so a
   * half-failed batch leaves the UI showing exactly what the server holds.
   */
  const setComorbidities: AppState["setComorbidities"] = async (list) => {
    const missing = requireSession();
    if (missing) return { ok: false, message: missing };

    const wanted = [...new Set(list)];
    const added = wanted.filter((c) => !comorbidities.includes(c));
    const removed = comorbidities.filter((c) => !wanted.includes(c));

    const applied = new Set(comorbidities);
    let failure: string | undefined;

    for (const condition of added) {
      const result = await addComorbidityRemote(authUserId!, condition);
      if (result.ok) applied.add(condition);
      else failure ??= result.message;
    }
    for (const condition of removed) {
      const result = await removeComorbidityRemote(authUserId!, condition);
      if (result.ok) applied.delete(condition);
      else failure ??= result.message;
    }

    // Preserve the requested order for what survived, so chips do not jump.
    setComorbidities_([...wanted.filter((c) => applied.has(c)), ...[...applied].filter((c) => !wanted.includes(c))]);
    return failure ? { ok: false, message: failure } : { ok: true };
  };

  const addSurgery: AppState["addSurgery"] = async (s) => {
    const missing = requireSession();
    if (missing) return { ok: false, message: missing };
    const result = await addSurgeryRemote(authUserId!, s);
    if (!result.ok) return { ok: false, message: result.message };
    setSurgeries((prev) => [...prev, { ...s, id: result.id! }]);
    return { ok: true };
  };

  const removeSurgery: AppState["removeSurgery"] = async (id) => {
    const result = await deleteSurgeryRemote(id);
    if (!result.ok) return result;
    setSurgeries((prev) => prev.filter((s) => s.id !== id));
    return { ok: true };
  };

  const addMedication: AppState["addMedication"] = async (m) => {
    const missing = requireSession();
    if (missing) return { ok: false, message: missing };
    const result = await addMedicationRemote(authUserId!, m);
    if (!result.ok) return { ok: false, message: result.message };
    setMedications((prev) => [...prev, { ...m, id: result.id! }]);
    return { ok: true };
  };

  const updateMedication: AppState["updateMedication"] = async (id, patch) => {
    const result = await updateMedicationRemote(id, patch);
    if (!result.ok) return result;
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    return { ok: true };
  };

  const removeMedication: AppState["removeMedication"] = async (id) => {
    const result = await deleteMedicationRemote(id);
    if (!result.ok) return result;
    setMedications((prev) => prev.filter((m) => m.id !== id));
    return { ok: true };
  };

  // Medical history, hydrated from its three tables.
  //
  // A PLAIN REPLACE, like the workout and metric histories: these lists are
  // remote-required, so every entry came from the server and the server's
  // answer is the truth. On failure the existing lists are left alone rather
  // than emptied — showing someone an empty medication list because a request
  // failed is a clinical claim nobody made.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getMedicalHistory(authUserId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setMedicalError(result.message);
        return;
      }
      setMedicalError(null);
      setComorbidities_(result.history.comorbidities);
      setSurgeries(result.history.surgeries);
      setMedications(result.history.medications);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  // NOT PERSISTED, unlike nearly everything else here. Which day you are
  // looking at is view state, not a preference: restoring it meant leaving
  // the app on Tuesday and opening it on Wednesday put you on Tuesday's
  // diary, labelled as though nothing were stale. It also means the
  // "2026-08-20" the old constant left in every existing browser simply stops
  // being read.
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Someone sitting on Today when the day turns should stay on today rather
  // than silently start viewing yesterday. Anyone who has navigated
  // elsewhere is left where they are.
  const dayShownAsToday = useRef(today);
  useEffect(() => {
    const was = dayShownAsToday.current;
    if (was === today) return;
    dayShownAsToday.current = today;
    setSelectedDate((current) => (current === was ? today : current));
  }, [today]);

  // --- diary hydration -----------------------------------------------------
  //
  // Until this existed the diary was localStorage that also happened to write
  // to Supabase: entries survived a reload because the browser remembered
  // them, not because anything read them back, so the same account on another
  // device showed nothing.
  //
  // The window always covers today and, if the user has navigated outside it,
  // selectedDate — so these two strings only change when someone actually
  // leaves the loaded range, and the effect below does not refetch on ordinary
  // day-to-day navigation.
  const diaryWindowStart = shiftDate(today, -(DIARY_WINDOW_DAYS - 1));
  const diaryStart = selectedDate < diaryWindowStart ? selectedDate : diaryWindowStart;
  const diaryEnd = selectedDate > today ? selectedDate : today;

  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    setDiaryLoading(true);

    void getDiaryEntries(authUserId, diaryStart, diaryEnd).then((result) => {
      if (cancelled) return;
      setDiaryLoading(false);

      // A failed read is NOT an empty diary. Keep showing whatever is already
      // there rather than blanking the screen on a dropped connection — which
      // is why getDiaryEntries reports `ok` separately from `entries`.
      if (!result.ok) {
        setDiaryError(result.message ?? "Could not load your diary.");
        return;
      }
      setDiaryError(null);

      setFoodLog((prev) => {
        const inRange = (d: string) => d >= diaryStart && d <= diaryEnd;
        // Replace, don't merge: these rows carry their real database ids, and
        // merging would show an entry twice once it exists under both a local
        // and a remote id.
        //
        // Two things are deliberately preserved.
        //
        // Entries carrying a local id would otherwise vanish on every
        // hydration. NOT because anything still creates them: AI Voice
        // resolves each parsed item and calls logFoodEntry, logCustomMeal
        // calls it per item, and copy-yesterday goes through copyDiaryEntry,
        // so every path has written real rows with real uuids for a while
        // now. The reason is the ones already out there — entries logged
        // before those writes existed are still sitting in real browsers'
        // localStorage, and this filter is what stops a hydration deleting
        // someone's older diary from under them. It stays until those are
        // gone; see the isRemoteEntryId follow-up in the README.
        //
        // And remote-sourced entries outside the fetched range are kept,
        // because this read says nothing about them.
        const kept = prev.filter((e) => !isRemoteEntryId(e.id) || !inRange(e.date));
        return [...kept, ...result.entries];
      });
    });

    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, diaryStart, diaryEnd, setFoodLog]);

  // --- custom meal hydration ----------------------------------------------
  //
  // Same reliability shape as the diary above: a failed read keeps whatever is
  // already on screen, because an empty list and a broken connection mean
  // opposite things and one of them must not delete a user's saved meals.
  const [customMealsError, setCustomMealsError] = useState<string | null>(null);
  // One attempt per signed-in account per page load. A ref, not state, so
  // starting the upload cannot itself re-run the effect that started it.
  const mealUploadAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void getCustomMeals(authUserId).then(async (result) => {
      if (cancelled) return;
      if (!result.ok) {
        setCustomMealsError(result.message ?? "Could not load your meals.");
        return;
      }
      setCustomMealsError(null);

      // MEALS SAVED BEFORE THIS EXISTED ARE UPLOADED ONCE, then live remotely
      // like any other. Without this they would sit in localStorage forever,
      // invisible on every other device, and the replace below would make them
      // look deleted the first time it ran.
      //
      // Identified by their local id, so a meal that has ever reached the
      // server is never a candidate and this cannot duplicate one. Failures
      // are kept rather than retried in a loop: the meal stays local, stays
      // visible, and the attempt is not repeated until the next load.
      const pending = mealUploadAttempted.current !== authUserId && isAdminRef.current !== true
        ? customMeals.filter((m) => !isRemoteMealId(m.id))
        : [];
      mealUploadAttempted.current = authUserId;

      const uploaded: CustomMeal[] = [];
      const keptLocal: CustomMeal[] = [];
      for (const meal of pending) {
        const written = await createCustomMealRemote(authUserId, meal.title, meal.items, meal.mealType);
        if (written.ok && written.meal) uploaded.push(written.meal);
        else {
          console.error("[custom-meals] Could not upload a local meal:", written.message);
          keptLocal.push(meal);
        }
      }
      if (cancelled) return;

      // Replace rather than merge, for the reason the diary gives: these rows
      // carry real ids and merging would show one meal twice. Local meals that
      // could not be uploaded are preserved -- dropping them would delete the
      // very data this migration exists to rescue.
      setCustomMeals(() => [...result.meals, ...uploaded, ...keptLocal]);
    });

    return () => {
      cancelled = true;
    };
    // customMeals is read for the one-time upload and must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  // Recipes — same hydrate-then-upload-local-stragglers shape as customMeals
  // just above, for the same reason. See that block's comments; not repeated
  // here so the two do not drift into two different explanations.
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const recipeUploadAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void getRecipes(authUserId).then(async (result) => {
      if (cancelled) return;
      if (!result.ok) {
        setRecipesError(result.message ?? "Could not load your recipes.");
        return;
      }
      setRecipesError(null);

      const pending = recipeUploadAttempted.current !== authUserId && isAdminRef.current !== true
        ? recipes.filter((r) => !isRemoteRecipeId(r.id))
        : [];
      recipeUploadAttempted.current = authUserId;

      const uploaded: Recipe[] = [];
      const keptLocal: Recipe[] = [];
      for (const recipe of pending) {
        const written = await createRecipeRemote(authUserId, recipe.title, recipe.items, recipe.servings, recipe.steps);
        if (written.ok && written.recipe) uploaded.push(written.recipe);
        else {
          console.error("[recipes] Could not upload a local recipe:", written.message);
          keptLocal.push(recipe);
        }
      }
      if (cancelled) return;

      // Master handover item 11: recipes are newest first everywhere. The
      // server list already is (getRecipes orders created_at descending);
      // recipes created on this device before sign-in are newer still, so
      // they go in front, newest first.
      setRecipes(() => [...uploaded.reverse(), ...keptLocal.reverse(), ...result.recipes]);
    });

    return () => {
      cancelled = true;
    };
    // recipes is read for the one-time upload and must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  // Workout history, hydrated from workout_sessions.
  //
  // A PLAIN REPLACE, not the diary's merge. The diary has to preserve
  // local-only entries because logFoodEntry can fall back to local state;
  // saveWorkoutSession cannot — a session that failed to write was never
  // added — so every row in this list came from the server and the server's
  // answer is simply the truth. That is what keeps a second id space from
  // existing here.
  //
  // On failure the existing list is left alone rather than cleared: an empty
  // result and a failed request mean opposite things, and rendering "you have
  // never trained" over a dropped connection would be a fabrication.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getWorkoutSessions(authUserId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setWorkoutHistoryError(result.message);
        return;
      }
      setWorkoutHistoryError(null);
      setWorkoutSessions(result.sessions);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, setWorkoutSessions]);

  // V10 (QA 10.0): "logging... metrics in a day that is not today should
  // add and log values pertaining to that mentioned day" — water is now
  // keyed by date instead of a single running total, so viewing a past day
  // via the Home date selector shows (and logs to) that day's own amount.
  // NO LONGER SEEDED WITH 1,800 ml. That seed predated water being stored
  // anywhere: it put a day's hydration on screen that the user had not logged
  // and the server has never heard of, and hydration below would now overwrite
  // it on the first read anyway — so it would flash a number and then drop to
  // the truth.
  const [waterByDate, setWaterByDate] = usePersistentState<Record<string, number>>("waterByDate", {});
  const water = waterByDate[selectedDate] ?? 0;

  const [colorTheme, setColorThemeState] = usePersistentState<ColorTheme>("colorTheme", "centium");
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", colorTheme);
  }, [colorTheme]);

  const [customFoods, setCustomFoods] = usePersistentState<CustomFood[]>("customFoods", []);
  const [customExercises, setCustomExercises] = usePersistentState<CustomExerciseLibraryItem[]>(
    "customExercises",
    []
  );

  // --- the exercise catalog -----------------------------------------------
  //
  // NOT PERSISTED, deliberately, and this is the one behaviour the swap costs.
  // The 52 movements used to be a bundled module, so the library worked with
  // no network at all; read from public.exercises they do not. That follows
  // the food catalog exactly — listFoods caches nothing either — and the
  // alternative is a second copy of reference data that drifts from the table
  // silently. Offline, the surfaces say so rather than showing a stale list
  // they cannot date.
  const [exerciseCatalog, setExerciseCatalog] = useState<CatalogExercise[]>([]);
  const [exerciseCatalogError, setExerciseCatalogError] = useState<string | null>(null);

  // NO auth GATE. exercises is anon-readable (`exercises_select_public` is
  // `using (true)`, and the SELECT grant covers anon), so this runs once on
  // mount for signed-out visitors too — the library is public reference data
  // and browsing it has never needed an account.
  useEffect(() => {
    let cancelled = false;
    void listExercises().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setExerciseCatalogError(result.message ?? "Couldn't load the exercise library.");
        return;
      }
      setExerciseCatalogError(null);
      setExerciseCatalog(result.exercises);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- custom exercise hydration ------------------------------------------
  //
  // The shape custom meals established: a failed read keeps what is already on
  // screen, because an empty list and a broken connection mean opposite things
  // and one of them must not delete a user's own movements.
  const [customExercisesError, setCustomExercisesError] = useState<string | null>(null);
  // One attempt per signed-in account per page load. A ref, not state, so
  // starting the upload cannot re-run the effect that started it.
  const exerciseUploadAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void getCustomExercises(authUserId).then(async (result) => {
      if (cancelled) return;
      if (!result.ok) {
        setCustomExercisesError(result.message ?? "Couldn't load your custom exercises.");
        return;
      }
      setCustomExercisesError(null);

      // EXERCISES SAVED BEFORE THIS EXISTED ARE UPLOADED ONCE. Identified by
      // an id that is not a uuid — including no id at all, which is what every
      // copy written before today carries, since these were keyed by name
      // until they became rows.
      //
      // A NAME ALREADY ON THE SERVER IS NOT RE-UPLOADED, and this is the one
      // place the shape differs from custom meals. Two meals may legitimately
      // share a title; two exercises may not — addCustomExercise has always
      // refused a duplicate name, and the library renders one row per name. So
      // a local copy of something already up there is dropped as the same
      // movement rather than uploaded into a second row.
      const remoteNames = new Set(result.exercises.map((e) => e.name.trim().toLowerCase()));
      const pending =
        exerciseUploadAttempted.current !== authUserId && isAdminRef.current !== true
          ? customExercises.filter((e) => !isUuid(e.id ?? ""))
          : [];
      exerciseUploadAttempted.current = authUserId;

      const uploaded: CustomExerciseLibraryItem[] = [];
      const keptLocal: CustomExerciseLibraryItem[] = [];
      for (const item of pending) {
        if (remoteNames.has(item.name.trim().toLowerCase())) continue;
        const written = await createCustomExerciseRemote(authUserId, item);
        if (written.ok && written.exercise) {
          uploaded.push(written.exercise);
          remoteNames.add(written.exercise.name.trim().toLowerCase());
        } else {
          // Kept local, kept visible, not retried in a loop: the next page
          // load is the retry.
          console.error("[exercises] Could not upload a local exercise:", written.message);
          keptLocal.push(item);
        }
      }
      if (cancelled) return;

      setCustomExercises(() => [...result.exercises, ...uploaded, ...keptLocal]);
    });

    return () => {
      cancelled = true;
    };
    // customExercises is read for the one-time upload and must not re-trigger
    // this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  // --- routines and their folders -----------------------------------------
  //
  // WHAT A ROUTINE LOOKS UP. routine_exercises holds a reference and no name,
  // so both writing and reading a routine needs the two libraries. The catalog
  // and the user's own movements are hydrated above; this passes them down as
  // the lookup every write resolves names against.
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const routineUploadAttempted = useRef<string | null>(null);

  // A ref, not a dependency: every routine write needs the current libraries,
  // and threading them through the dependency array would rebuild each of
  // these callbacks whenever a custom exercise changed.
  const exerciseLookupRef = useRef<ExerciseLookup>({ catalog: [], custom: [] });
  exerciseLookupRef.current = { catalog: exerciseCatalog, custom: customExercises };

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void Promise.all([getRoutineFolders(authUserId), getRoutines(authUserId)]).then(
      async ([folderResult, routineResult]) => {
        if (cancelled) return;
        if (!folderResult.ok || !routineResult.ok) {
          setRoutinesError(
            folderResult.message ?? routineResult.message ?? "Couldn't load your routines."
          );
          return;
        }
        setRoutinesError(null);

        // ROUTINES SAVED BEFORE THIS EXISTED ARE UPLOADED ONCE, folders first
        // so the routines have somewhere to land. Identified by an id that is
        // not a uuid, the same test custom meals and custom exercises use.
        //
        // TEMPLATE MIRRORS ARE LEFT ALONE, and that is the one exclusion.
        // A routine carrying sourceTemplateId is a projection of a workout
        // template, which is still local state — syncTemplateToClientView
        // rewrites it whenever the template changes. Uploading it would create
        // a second copy that the next local edit silently diverges from, so it
        // stays local until templates themselves are real.
        // ONLY WHEN THE ACCOUNT HAS NOTHING HERE YET, and this guard is the
        // difference between routines and every other one-time upload in this
        // file. Custom meals and custom exercises default to an EMPTY list, so
        // a device with no local data has nothing to send. Routines default to
        // four seeded example programs in two example folders — prototype
        // content, not the user's work.
        //
        // Measured: clearing this browser's storage restored those defaults and
        // the upload sent them again, leaving a second "Strength", a second
        // "Hypertrophy" and four duplicate routines on an account that already
        // had them. A second device would have done the same thing. The seeds
        // are only worth keeping for the account that has never had a routine
        // row — which is exactly the migration this exists for.
        // PER COLLECTION, not one decision for both: an account that already
        // has folders but has never had a routine should still get its local
        // routines carried up, and those simply land unfiled because there are
        // no local folder ids left to map.
        // ...AND NOT FOR AN ADMINISTRATOR, who has no profiles row for any of
        // this to reference. See isAdminRef.
        const firstAttempt =
          routineUploadAttempted.current !== authUserId && isAdminRef.current !== true;
        const pendingFolders =
          firstAttempt && folderResult.folders.length === 0
            ? routineFolders.filter((f) => !isUuid(f.id))
            : [];
        const pendingRoutines =
          firstAttempt && routineResult.routines.length === 0
            ? routines.filter((r) => !isUuid(r.id) && !r.sourceTemplateId)
            : [];
        routineUploadAttempted.current = authUserId;

        // Local folder id -> real row id, so an uploaded routine keeps its
        // filing and a subfolder keeps its parent.
        const folderIdMap = new Map<string, string>();
        const uploadedFolders: RoutineFolder[] = [];
        const keptFolders: RoutineFolder[] = [];
        let position = folderResult.folders.length;

        // Parents before children: a subfolder's parent_id has to be a real
        // row by the time it is written, and the trigger checks it.
        const ordered = [
          ...pendingFolders.filter((f) => !f.parentId),
          ...pendingFolders.filter((f) => f.parentId),
        ];
        for (const folder of ordered) {
          const parentId = folder.parentId
            ? folderIdMap.get(folder.parentId) ?? (isUuid(folder.parentId) ? folder.parentId : null)
            : null;
          const written = await createRoutineFolderRemote(authUserId, {
            name: folder.name,
            parentId,
            color: folder.color,
            position: position++,
          });
          if (written.ok && written.folder) {
            folderIdMap.set(folder.id, written.folder.id);
            uploadedFolders.push(written.folder);
          } else {
            console.error("[routines] Could not upload a local folder:", written.message);
            keptFolders.push(folder);
          }
        }

        const uploadedRoutines: Routine[] = [];
        const keptRoutines: Routine[] = [];
        for (const routine of pendingRoutines) {
          const folderId = routine.folderId
            ? folderIdMap.get(routine.folderId) ??
              (isUuid(routine.folderId) ? routine.folderId : null)
            : null;
          const { id: _ignored, ...rest } = routine;
          const written = await createRoutineRemote(
            authUserId,
            { ...rest, folderId },
            exerciseLookupRef.current
          );
          if (written.ok && written.routine) uploadedRoutines.push(written.routine);
          else {
            // Kept local and kept visible, not retried in a loop. A seeded
            // routine naming a movement the catalog does not have lands here.
            console.error("[routines] Could not upload a local routine:", written.message);
            keptRoutines.push(routine);
          }
        }
        if (cancelled) return;

        setRoutineFolders(() => [...folderResult.folders, ...uploadedFolders, ...keptFolders]);
        // Template mirrors are preserved for the same reason they are not
        // uploaded: they are local state that nothing on the server knows
        // about, and dropping them here would delete a hired professional's
        // assigned work from the client's screen.
        setRoutines((prev) => [
          ...routineResult.routines,
          ...uploadedRoutines,
          ...keptRoutines,
          ...prev.filter((r) => r.sourceTemplateId),
        ]);
      }
    );

    return () => {
      cancelled = true;
    };
    // routines/routineFolders are read for the one-time upload and must not
    // re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady]);

  // --- personal records and paused sessions --------------------------------
  //
  // PRs come back NAME-KEYED, which is what every consumer on this side reads
  // — OneRepMaxesSheet, MetricsTab, the live-set comparison in the session
  // sheet. The NAME IS RESOLVED THROUGH THE REFERENCE server-side rather than
  // stored on the record, so renaming a custom movement renames its record
  // too, which is the whole argument for keying the table by id.
  //
  // The map is replaced, not merged: current_personal_records is the best per
  // movement and local values are what this migration is moving away from. A
  // failed read leaves the local map alone, as everywhere else.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void Promise.all([getPersonalRecords(authUserId), getPausedSessions(authUserId)]).then(
      ([recordResult, pausedResult]) => {
        if (cancelled) return;
        if (recordResult.ok) {
          const byName: Record<string, number> = {};
          for (const r of recordResult.records) byName[r.name] = r.estimatedOneRepMaxKg;

          // WHAT THE SERVER DOES NOT HAVE IS WHAT THE REVIEW IS FOR, worked
          // out here because this is the last moment the local map still holds
          // it. Decided once per device: if there is nothing left over, the
          // review is finished before it is ever shown.
          if (!personalRecordsReviewDone) {
            const known = new Set(recordResult.records.map((r) => r.name.trim().toLowerCase()));
            const leftovers = Object.entries(personalRecords).filter(
              ([name]) => !known.has(name.trim().toLowerCase())
            );
            if (leftovers.length === 0) setPersonalRecordsReviewDone(true);
            else setPersonalRecordsReviewItems(Object.fromEntries(leftovers));
          }

          setPersonalRecords(byName);
        }
        if (pausedResult.ok) {
          const next: Record<string, PausedWorkoutSession> = {};
          for (const [routineId, state] of Object.entries(pausedResult.byRoutineId)) {
            next[routineId] = {
              logged: state.logged as PausedWorkoutSession["logged"],
              elapsedSec: state.elapsedSec,
              startedAt: state.startedAt,
              started: state.started,
            };
          }
          setPausedSessions(next);
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // personalRecords is read to work out what the server has never seen, and
    // must not re-trigger this — the read replaces it, which would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady, setPersonalRecords, setPausedSessions]);

  // THE QUEUE DRAINS WHEN THE MOVEMENT ARRIVES. A record waiting on a custom
  // exercise that had no row is written as soon as one exists — which is what
  // the custom-exercise hydration above produces — and stays queued otherwise.
  // Runs on every change to that list rather than once, because the id can
  // appear at any point after this account signed in.
  useEffect(() => {
    if (!profileReady || !authUserId || pendingPersonalRecords.length === 0) return;
    let cancelled = false;

    void (async () => {
      const stillPending: typeof pendingPersonalRecords = [];
      for (const entry of pendingPersonalRecords) {
        const match = customExercises.find(
          (e) => e.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
        );
        if (!match?.id || !isUuid(match.id)) {
          stillPending.push(entry);
          continue;
        }
        const written = await recordPersonalRecord(
          authUserId,
          { exercise_id: null, custom_exercise_id: match.id },
          entry.kg,
          entry.achievedAt
        );
        if (!written.ok) stillPending.push(entry);
      }
      if (cancelled || stillPending.length === pendingPersonalRecords.length) return;
      setPendingPersonalRecords(stillPending);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authUserId,
    profileReady,
    customExercises,
    pendingPersonalRecords,
    setPendingPersonalRecords,
  ]);

  // A NEW KEY, NOT A MIGRATION OF THE OLD ONE. The previous
  // "connectedProfessionalIds" key held the opposite meaning, so carrying its
  // contents over would mark exactly the wrong entries as dismissed. Anything
  // still in the old key is abandoned, which costs nothing: its only writer
  // was the mock hire flow, and the ids in it were never accounts.
  const [dismissedMockProfessionalIds, setDismissedMockProfessionalIds] = usePersistentState<
    string[]
  >("dismissedMockProfessionalIds", []);
  // V10 (QA 10.0): "a hired professional should have a remove professional
  // button... should prompt you to make sure you want to remove."
  const dismissMockProfessional: AppState["dismissMockProfessional"] = (id) =>
    setDismissedMockProfessionalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const [businessDirectory, setBusinessDirectory] = usePersistentState<BusinessDirectoryEntry[]>(
    "businessDirectory",
    []
  );
  // affiliateWithBusiness() and removeAffiliation() USED TO LIVE HERE, and
  // they were a fabricated capability rather than an unfinished one.
  //
  // affiliateWithBusiness matched a typed id against `businessDirectory` --
  // itself localStorage -- and on a hit set a local flag plus a local
  // employee row. Nothing reached the database. Meanwhile PublicListingSheet
  // read the real `professional_profiles.affiliated_business_id`, so the two
  // surfaces disagreed and the authoritative one was the one the professional
  // could not see: affiliation is what gates `listed_publicly`.
  //
  // THE WRITE THEY IMPLIED CANNOT EXIST FROM THIS SIDE.
  // business_employees_insert_business_owner requires auth.uid() to be the
  // BUSINESS's profile_id, so a professional cannot add themselves to a team
  // however the id is collected. Leaving is the half that is permitted --
  // business_employees_delete_professional is auth.uid() = professional_id --
  // and now lives in services/professional-profile as leaveAffiliation(),
  // reading and writing the real rows.
  const updateMyBusinessTier: AppState["updateMyBusinessTier"] = (tier) => {
    if (!user.businessId) return;
    setBusinessDirectory((prev) => prev.map((b) => (b.id === user.businessId ? { ...b, tier } : b)));
  };

  const [bonusPoints, setBonusPoints] = usePersistentState<number>("bonusPoints", 0);
  const addBonusPoints: AppState["addBonusPoints"] = (amount) => setBonusPoints((prev) => prev + amount);

  const [referralRedeemed, setReferralRedeemed] = usePersistentState<boolean>("referralRedeemed", false);
  const [referralDiscountPct, setReferralDiscountPct] = usePersistentState<number>("referralDiscountPct", 0);
  const [referralNextMonthDiscountPct, setReferralNextMonthDiscountPct] = usePersistentState<number>(
    "referralNextMonthDiscountPct",
    0
  );
  // The code itself now comes from the `referrals` table via
  // getOrCreateMyReferralCode(), and every validation the mock did here
  // (empty, already redeemed, own code) is enforced by redeem_referral()
  // server-side. All that's left locally is recording the outcome.
  const applyReferralReward: AppState["applyReferralReward"] = (discountPct) => {
    setReferralRedeemed(true);
    setReferralDiscountPct(discountPct);
  };

  // The referrer-side reward is earned by someone ELSE redeeming this
  // user's code, so it can't come from any response this client sees —
  // it's read back from their own referral rows once a session exists.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void getMyReferrerReward(authUserId).then((reward) => {
      if (cancelled) return;
      setReferralNextMonthDiscountPct(reward.discountPct);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const [premiumPlan, setPremiumPlan] = usePersistentState<"monthly" | "yearly" | null>("premiumPlan", null);

  const [gymPurchases, setGymPurchases] = usePersistentState<Record<string, GymPurchase[]>>(
    "gymPurchases",
    {}
  );
  const purchaseGymPlan: AppState["purchaseGymPlan"] = (gymId, plan, oneTime) =>
    setGymPurchases((prev) => {
      const existing = (prev[gymId] ?? []).filter((p) => p.plan !== plan);
      return { ...prev, [gymId]: [...existing, { plan, purchasedAt: Date.now(), oneTime }] };
    });
  const cancelGymPlan: AppState["cancelGymPlan"] = (gymId, plan) =>
    setGymPurchases((prev) => ({
      ...prev,
      [gymId]: (prev[gymId] ?? []).filter((p) => p.plan !== plan),
    }));

  const [cart, setCart] = usePersistentState<CartItem[]>("cart", []);
  const addToCart: AppState["addToCart"] = (item, quantity) =>
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.itemId);
      if (existing) {
        return prev.map((c) => (c.itemId === item.itemId ? { ...c, quantity: c.quantity + quantity } : c));
      }
      return [...prev, { ...item, quantity }];
    });
  const updateCartQuantity: AppState["updateCartQuantity"] = (itemId, quantity) =>
    setCart((prev) =>
      quantity <= 0 ? prev.filter((c) => c.itemId !== itemId) : prev.map((c) => (c.itemId === itemId ? { ...c, quantity } : c))
    );
  const removeFromCart: AppState["removeFromCart"] = (itemId) =>
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  const clearCart: AppState["clearCart"] = () => setCart([]);
  // `membershipPlans` and `discounts` are gone from here — real
  // membership_plans and business_discounts rows now. The plans in particular
  // were not merely unpersisted but INVENTED: two seeded entries every business
  // account has been shown as its own since onboarding.
  const [businessListing, setBusinessListing] = usePersistentState("businessListing", {
    perk: "10% off with Centium",
    active: true,
    membersReached: 34,
    bio: "",
    location: "",
  });
  // Real roster. Deliberately NOT persisted: it is server state, and caching
  // it in localStorage is how the old mock ended up showing demo clients to
  // a professional who had none.
  const [professionalClients, setProfessionalClients] = useState<ProfessionalClient[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const refreshRoster = React.useCallback(async () => {
    if (!authUserId || user.accountType !== "professional") {
      setProfessionalClients([]);
      return;
    }
    setRosterLoading(true);
    const result = await fetchRoster(authUserId);
    setRosterLoading(false);
    if (result.status === "error") {
      setRosterError(result.message);
      return;
    }
    setRosterError(null);
    const mapped: ProfessionalClient[] = result.clients.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      name: c.name,
      avatarUrl: c.avatarUrl,
      prefix: c.prefix ?? undefined,
      joinedAt: c.joinedAt,
      pronouns: c.pronouns ?? undefined,
      contactStyle: c.contactStyle ?? undefined,
      reminderPreference: c.reminderPreference ?? undefined,
      communicationBoundaries: c.communicationBoundaries ?? undefined,
      access: c.access,
      // Every data field stays undefined here and is filled in below, so an
      // unanswered read renders as loading rather than as an absence.
    }));
    setProfessionalClients(mapped);

    // Nutrition is a second, dependent read: it needs the consent flags the
    // roster just resolved. Only clients who have actually granted
    // `food_diary` are asked about — querying the rest would return zero rows
    // whether they had logged nothing or simply not shared, and those two must
    // never be conflated. See services/professional-client.
    const consentedIds = mapped
      .filter((c) => c.access.foodDiary && c.clientId)
      .map((c) => c.clientId!);
    // Gated separately: the two categories are granted independently, and a
    // client sharing one but not the other must not be queried for both.
    const workoutIds = mapped
      .filter((c) => c.access.workoutActivity && c.clientId)
      .map((c) => c.clientId!);
    // Weight has its OWN consent category, separate from the health_metrics
    // one covering the rest of the table — the RLS policies split on
    // metric_type. A client sharing vitals but not weight, or the reverse, is
    // an ordinary state, so this list is built independently of the others.
    const weightIds = mapped
      .filter((c) => c.access.weight && c.clientId)
      .map((c) => c.clientId!);
    // The most sensitive grant in the app, and gated entirely on its own.
    // medical_history was split out of health_metrics precisely so that
    // sharing step counts would stop implying sharing a medication list, so
    // nothing about this list is derived from any other consent.
    const medicalIds = mapped
      .filter((c) => c.access.medicalHistory && c.clientId)
      .map((c) => c.clientId!);
    // Imaging rides on medical_history, the same grant as medications and
    // surgeries. Blood work does NOT -- lab_results is its own category, so a
    // client can share their medication list while withholding their bloods,
    // or the reverse, and each list is built from its own flag.
    const imagingIds = medicalIds;
    const labIds = mapped
      .filter((c) => c.access.labResults && c.clientId)
      .map((c) => c.clientId!);

    // Both reads are issued together rather than in sequence — they are
    // independent, and a professional opening the dashboard should not wait
    // for one before the other starts.
    const [nutrition, workouts, weights, medical, labs, imaging] = await Promise.all([
      consentedIds.length > 0 ? fetchClientNutrition(consentedIds) : null,
      workoutIds.length > 0 ? fetchClientWorkoutActivity(workoutIds) : null,
      weightIds.length > 0 ? fetchClientWeight(weightIds) : null,
      medicalIds.length > 0 ? fetchClientMedicalHistory(medicalIds) : null,
      labIds.length > 0 ? fetchClientLabs(labIds) : null,
      imagingIds.length > 0 ? fetchClientImaging(imagingIds) : null,
    ]);

    // On failure each field is left undefined, which renders as "loading"
    // rather than as an absence. Showing "no meals logged" or "no sessions"
    // because a request failed would be a fabricated clinical observation.
    setProfessionalClients((prev) =>
      prev.map((c) => {
        if (!c.clientId) return c;
        let next = c;
        if (nutrition?.ok && c.clientId in nutrition.byClient) {
          next = { ...next, nutrition: nutrition.byClient[c.clientId] };
        }
        if (workouts?.ok && c.clientId in workouts.byClient) {
          next = { ...next, workout: workouts.byClient[c.clientId] };
        }
        if (weights?.ok && c.clientId in weights.byClient) {
          // Left undefined when the client has a grant but no readings, which
          // is what the tiles already treat as "nothing to show". Unlike the
          // workout badge, no surface here states an absence as a finding —
          // they render a number or nothing at all — so there is no verdict to
          // guard against and no four-state encoding to carry.
          const w = weights.byClient[c.clientId];
          if (w) next = { ...next, lastWeightKg: w.lastWeightKg, weightTrend: w.weightTrend };
        }
        if (labs?.ok && c.clientId in labs.byClient) {
          next = { ...next, labs: labs.byClient[c.clientId] };
        }
        if (imaging?.ok && c.clientId in imaging.byClient) {
          next = { ...next, imaging: imaging.byClient[c.clientId] };
        }
        if (medical?.ok && c.clientId in medical.byClient) {
          const h = medical.byClient[c.clientId];
          // Assigned even when all three lists are empty. Both surfaces
          // reading this already branch on the lists being non-empty, so an
          // empty object renders as "nothing recorded" while undefined keeps
          // meaning "not shared, or not loaded" — which are different answers.
          if (h) next = { ...next, medicalHistory: h };
        }
        return next;
      })
    );
  }, [authUserId, user.accountType]);

  useEffect(() => {
    void refreshRoster();
  }, [refreshRoster]);
  const [calendarEvents, setCalendarEvents] = usePersistentState<CalendarEvent[]>("calendarEvents", []);
  const addCalendarEvent: AppState["addCalendarEvent"] = (event) =>
    setCalendarEvents((prev) => [...prev, { ...event, id: `cal-${Date.now()}-${prev.length}` }]);
  const updateCalendarEvent: AppState["updateCalendarEvent"] = (id, patch) =>
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeCalendarEvent: AppState["removeCalendarEvent"] = (id) =>
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));

  const [workoutTemplates, setWorkoutTemplates] = usePersistentState<WorkoutTemplate[]>(
    "workoutTemplates",
    []
  );
  const [templateAssignments, setTemplateAssignments] = usePersistentState<
    WorkoutTemplateAssignment[]
  >("templateAssignments", []);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // THE LOCAL MIRROR IS GONE. What used to live here — syncTemplateToClientView
  // — wrote a fake Routine and a fake calendar event into THIS account's state
  // whenever a template was "assigned", because the prototype had one real
  // account standing behind every mock client. assign_template_to_client does
  // all of that for real now, in the client's own account: it creates or
  // refreshes their routine, copies the prescription, re-points a private
  // custom movement at a copy they can read, records the assignment and writes
  // their calendar event. None of it is reachable from this side, and none of
  // it should be.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;

    void Promise.all([getTemplates(authUserId), getTemplateAssignments()]).then(
      ([templateResult, assignmentResult]) => {
        if (cancelled) return;
        if (!templateResult.ok) {
          setTemplatesError(templateResult.message ?? "Couldn't load your templates.");
          return;
        }
        setTemplatesError(null);
        setWorkoutTemplates(templateResult.templates);
        // A client sees the rows naming them and a professional sees the rows
        // for templates they own; both come from the same query and the same
        // two policies, so neither side asks for the other's.
        if (assignmentResult.ok) setTemplateAssignments(assignmentResult.assignments);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, setWorkoutTemplates, setTemplateAssignments]);

  const addWorkoutTemplate: AppState["addWorkoutTemplate"] = async (t) => {
    if (!authUserId) return "You need to be signed in to save a template.";
    const result = await createTemplateRemote(authUserId, t, exerciseLookupRef.current);
    if (!result.ok || !result.template) return result.message ?? "Could not save that template.";
    setWorkoutTemplates((prev) => [...prev, result.template!]);
    return undefined;
  };

  const updateWorkoutTemplate: AppState["updateWorkoutTemplate"] = async (id, patch) => {
    // A curated template belongs to nobody and is writable by no client role.
    // Refused here with a sentence rather than sent to be refused with a 42501.
    const existing = workoutTemplates.find((t) => t.id === id);
    if (existing?.isPublic) return "Starter programs can't be edited.";
    if (!authUserId) return "You need to be signed in to edit a template.";

    const result = await updateTemplateRemote(
      id,
      patch,
      patch.exercises,
      exerciseLookupRef.current
    );
    if (!result.ok) return result.message ?? "Could not save that template.";
    // The blocks come back with the ids they were saved under — see the same
    // note on updateRoutine. Without this the next save would ungroup them.
    setWorkoutTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? result.saved
            ? { ...t, ...patch, blocks: result.saved.blocks, exercises: result.saved.exercises }
            : { ...t, ...patch }
          : t
      )
    );
    return undefined;
  };

  const removeWorkoutTemplate: AppState["removeWorkoutTemplate"] = async (id) => {
    const existing = workoutTemplates.find((t) => t.id === id);
    if (existing?.isPublic) return "Starter programs can't be deleted.";
    if (!authUserId) return "You need to be signed in to delete a template.";

    const result = await deleteTemplateRemote(id);
    if (!result.ok) return result.message ?? "Could not delete that template.";
    setWorkoutTemplates((prev) => prev.filter((t) => t.id !== id));
    // The assignment rows went with it (ON DELETE CASCADE). The clients'
    // ROUTINES did not, and must not: source_template_id is provenance, and
    // someone who was given a plan keeps it.
    setTemplateAssignments((prev) => prev.filter((a) => a.templateId !== id));
    return undefined;
  };

  /**
   * Pushes a template to one client, and refreshes what came back.
   *
   * THE REFUSAL IS NOT A FAILURE. ATX18 means the client has edited the
   * routine since the last push; the caller shows them what would change and
   * calls again with confirmOverwrite. Nothing is written on a refusal —
   * not the routine, not the assignment, not the calendar event.
   */
  const assignTemplate: AppState["assignTemplate"] = async (
    templateId,
    clientId,
    assignedDay,
    confirmOverwrite = false
  ) => {
    const result = await assignTemplateRemote(
      templateId,
      clientId,
      assignedDay,
      confirmOverwrite
    );
    if (!result.ok) return result;

    // Re-read rather than patch: the function decides the routine id, the
    // assigned_at stamp and whether a row was created or refreshed.
    const refreshed = await getTemplateAssignments();
    if (refreshed.ok) setTemplateAssignments(refreshed.assignments);
    return result;
  };

  const unassignTemplate: AppState["unassignTemplate"] = async (assignmentId) => {
    const result = await unassignTemplateRemote(assignmentId);
    if (!result.ok) return result.message ?? "Could not remove that assignment.";
    setTemplateAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    return undefined;
  };

  const adoptTemplate: AppState["adoptTemplate"] = async (templateId) => {
    if (!authUserId) return "You need to be signed in to add a program.";
    const result = await adoptTemplateRemote(templateId);
    if (!result.ok) return result.message ?? "Could not add that program.";

    // RE-READ RATHER THAN BUILD THE ROUTINE HERE. The function decides the id,
    // the colour, the provenance columns and the prescription rows, and it
    // re-reads the routine itself because the touch trigger restamps
    // updated_at during the copy. Reconstructing that on this side would be
    // guessing at values the database just settled.
    const refreshed = await getRoutines(authUserId);
    if (refreshed.ok) {
      // Merged rather than replaced, for the reason the hydration gives:
      // routines this device holds that the server does not — a template
      // mirror, an unsynced local one — must survive a refresh.
      setRoutines((prev) => [
        ...refreshed.routines,
        ...prev.filter((r) => !refreshed.routines.some((s) => s.id === r.id) && !isUuid(r.id)),
      ]);
    }
    return undefined;
  };

  const [workoutTemplateFolders, setWorkoutTemplateFolders] = usePersistentState<WorkoutTemplateFolder[]>(
    "workoutTemplateFolders",
    []
  );
  // Template folders hydrate and write through the SAME service the routine
  // folders use, pointed at the other table — see services/folders. The two
  // tables share folder_validate_parent, so ATX16 and ATX17 already apply here
  // with no new code and no second wording of either.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getTemplateFolders(authUserId).then((result) => {
      if (cancelled || !result.ok) return;
      setWorkoutTemplateFolders(result.folders);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, setWorkoutTemplateFolders]);

  const addWorkoutTemplateFolder: AppState["addWorkoutTemplateFolder"] = async (
    name,
    parentId = null,
    color
  ) => {
    const position = workoutTemplateFolders.filter(
      (f) => (f.parentId ?? null) === (parentId ?? null)
    ).length;
    if (!authUserId) return "You need to be signed in to create a folder.";
    const result = await createTemplateFolder(authUserId, { name, parentId, color, position });
    if (!result.ok || !result.folder) return result.message ?? "Could not create that folder.";
    setWorkoutTemplateFolders((prev) => [...prev, result.folder!]);
    return undefined;
  };

  const renameWorkoutTemplateFolder: AppState["renameWorkoutTemplateFolder"] = async (id, name) => {
    const applyLocal = () =>
      setWorkoutTemplateFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    if (!authUserId || !isUuid(id)) {
      applyLocal();
      return undefined;
    }
    const result = await updateTemplateFolder(id, { name });
    if (!result.ok) return result.message ?? "Could not rename that folder.";
    applyLocal();
    return undefined;
  };

  const deleteWorkoutTemplateFolder: AppState["deleteWorkoutTemplateFolder"] = async (id) => {
    // Subfolders are promoted rather than destroyed and the templates inside
    // are unfiled — the same promise routine folders keep, against a parent_id
    // that cascades. The service does the re-parenting; folder_id on
    // workout_templates is ON DELETE SET NULL, so the database unfiles.
    const applyLocal = () => {
      setWorkoutTemplateFolders((prev) =>
        prev
          .filter((f) => f.id !== id)
          .map((f) => (f.parentId === id ? { ...f, parentId: null } : f))
      );
      setWorkoutTemplates((prev) =>
        prev.map((t) => (t.folderId === id ? { ...t, folderId: null } : t))
      );
    };
    if (!authUserId || !isUuid(id)) {
      applyLocal();
      return undefined;
    }
    const result = await deleteTemplateFolder(id);
    if (!result.ok) return result.message ?? "Could not delete that folder.";
    applyLocal();
    return undefined;
  };

  const [clientHealthNotes, setClientHealthNotes] = usePersistentState<Record<string, ClientHealthNote>>(
    "clientHealthNotes",
    {}
  );
  const updateClientHealthNote: AppState["updateClientHealthNote"] = (clientId, patch) =>
    setClientHealthNotes((prev) => ({ ...prev, [clientId]: { ...prev[clientId], ...patch } }));

  const [professionalMessages, setProfessionalMessages] = usePersistentState<ProfessionalMessage[]>(
    "professionalMessages",
    []
  );
  const sendProfessionalMessage: AppState["sendProfessionalMessage"] = (clientId, from, text, extra) =>
    setProfessionalMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${prev.length}`, clientId, from, text, at: new Date().toISOString(), ...extra },
    ]);

  const completeOnboarding = (profile: Partial<UserProfile>) => {
    // V7 (QA 7.0): a business account gets its own unique ID at signup, so
    // a professional can later affiliate with it from their Explore tab.
    let businessId: string | undefined;
    if (profile.accountType === "business") {
      do {
        businessId = `BIZ-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      } while (businessDirectory.some((b) => b.id === businessId));
      setBusinessDirectory((prev) => [
        ...prev,
        { id: businessId!, businessName: profile.businessName || "Business", tier: "starter" },
      ]);
    }
    setUser((prev) => {
      const next = { ...prev, ...profile, businessId, onboarded: true };
      setWidgets(widgetsForGoals(next.goals, next.tracking));
      return next;
    });
    // Health's Weight card reads metricValues.weight, not user.weightKg
    // directly — seed it from what was actually entered at sign-up instead
    // of leaving the hardcoded prototype default in place.
    if (profile.weightKg !== undefined) {
      setMetricValues((m) => ({ ...m, weight: profile.weightKg! }));
    }
  };

  const updateProfile = (patch: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...patch }));
    if (patch.weightKg !== undefined) {
      setMetricValues((m) => ({ ...m, weight: patch.weightKg! }));
    }
  };

  const addFoodEntry: AppState["addFoodEntry"] = (entry) => {
    setFoodLog((prev) => [
      ...prev,
      { ...entry, id: `f${Date.now()}${Math.random().toString(16).slice(2)}`, date: selectedDate },
    ]);
  };
  // Already written to food_log_entries by the food service, so this keeps
  // the row's real id. Idempotent by id, so a re-render or a retry cannot
  // double-insert the same row.
  const addFoodEntryRecord: AppState["addFoodEntryRecord"] = (entry) =>
    setFoodLog((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]));

  // Editing quantity or unit has to rescale the snapshot, because an entry
  // carries totals rather than per-serving values. The ratio of the new
  // multiplier to the old one is enough; no per-serving base is stored.
  const updateFoodEntry: AppState["updateFoodEntry"] = (id, patch) =>
    setFoodLog((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if (patch.quantity === undefined && patch.unit === undefined) return next;
        return { ...next, ...rescaleEntry(e, next.quantity, next.unit) };
      })
    );
  const removeFoodEntry = (id: string) => setFoodLog((prev) => prev.filter((e) => e.id !== id));

  const logWorkout: AppState["logWorkout"] = (entry) => {
    // V10 (QA 10.0): "logging... workout... in a day that is not today
    // should add and log values pertaining to that mentioned day" — was
    // hardcoded to a fixed date regardless of the Home date selector.
    setWorkoutLog((prev) => [
      ...prev,
      { ...entry, id: `w${Date.now()}${Math.random().toString(16).slice(2)}`, date: selectedDate },
    ]);
  };

  // REMOTE-REQUIRED, with no local fallback. Deliberately unlike the food
  // diary, which keeps local-only entries and reconciles them.
  //
  // Two reasons. The session guard now redirects any unauthenticated render,
  // so a workout cannot be completed without a session — the case the food
  // fallback existed for cannot arise here. And a fallback would mean a second
  // id space alongside the remote one, which is exactly the `isRemoteEntryId`
  // shim the diary carries and has an open follow-up to remove; adding a
  // second instance of it to a domain that does not need one is backwards.
  //
  // So a failed save is reported, not silently absorbed. The caller shows it
  // and offers a retry; nothing is added to history until the write lands.
  const saveWorkoutSession: AppState["saveWorkoutSession"] = async (session) => {
    if (!authUserId) {
      return { ok: false, message: "You need to be signed in to save a workout." };
    }

    const result = await saveWorkoutSessionRemote(authUserId, session);
    if (!result.ok) return { ok: false, message: result.message };

    setWorkoutSessions((prev) => [...prev, { ...session, id: result.id! }]);

    // Auto-update estimated 1RMs for barbell/dumbbell/weighted-bodyweight
    // exercises from this session's heaviest completed set.
    //
    // THE DERIVATION AND THE GATE ARE UNCHANGED — Epley, and only the
    // classifications in ONE_RM_CLASSIFICATIONS. What changed is where the
    // result goes and what it can be derived FROM: the user's own movements
    // carry a classification too, and personal_records can finally reference
    // one, so a custom barbell lift is now eligible on exactly the same test
    // the catalog has always been judged by.
    for (const ex of session.exercises) {
      const definition =
        exerciseCatalog.find((l) => l.name === ex.name) ??
        customExercises.find((l) => l.name === ex.name);
      if (!definition || !ONE_RM_CLASSIFICATIONS.includes(definition.classification)) continue;
      const best = ex.sets
        .filter((s) => s.completed && s.weightKg > 0)
        .reduce((max, s) => Math.max(max, estimate1RM(s.weightKg, s.reps)), 0);
      if (best > 0 && best > (personalRecords[ex.name] ?? 0)) {
        // Through the one write path, so the queueing of an unsynced custom
        // movement happens here too rather than only on the live-set path.
        setPersonalRecord(ex.name, best, {
          catalogExerciseId: ex.catalogExerciseId,
          customExerciseId: ex.customExerciseId,
        });
      }
    }

    return { ok: true };
  };
  /**
   * WHICH MOVEMENT A RECORD BELONGS TO, resolved in the one order that is
   * safe: the explicit reference the caller already holds, then the catalog by
   * name, then the user's own movements by name.
   *
   * The name lookups exist for the two callers that have nothing else — the
   * manual 1RM correction in OneRepMaxesSheet, and the one-time review of PRs
   * that were only ever name-keyed. Explicit ids come first because a custom
   * movement may legitimately share a name with a catalog one, and guessing
   * that wrong is the mistake custom meals already paid for.
   *
   * `null` means the name resolves to nothing at all; `"pending"` means it
   * resolves to one of the user's own movements that has not been uploaded
   * yet, which is the case personal_records cannot store.
   */
  const resolveRecordRef = (
    exerciseName: string,
    ref?: { catalogExerciseId?: string; customExerciseId?: string }
  ): RecordRef | "pending" | null => {
    if (ref?.catalogExerciseId && isUuid(ref.catalogExerciseId)) {
      return { exercise_id: ref.catalogExerciseId, custom_exercise_id: null };
    }
    if (ref?.customExerciseId && isUuid(ref.customExerciseId)) {
      return { exercise_id: null, custom_exercise_id: ref.customExerciseId };
    }
    const wanted = exerciseName.trim().toLowerCase();
    const catalogMatch = exerciseCatalog.find((e) => e.name.trim().toLowerCase() === wanted);
    if (catalogMatch) return { exercise_id: catalogMatch.id, custom_exercise_id: null };

    const customMatch = customExercises.find((e) => e.name.trim().toLowerCase() === wanted);
    if (customMatch) {
      return customMatch.id && isUuid(customMatch.id)
        ? { exercise_id: null, custom_exercise_id: customMatch.id }
        : "pending";
    }
    return null;
  };

  const setPersonalRecord: AppState["setPersonalRecord"] = (exerciseName, kg, ref) => {
    setPersonalRecords((prev) => ({ ...prev, [exerciseName]: kg }));
    if (!authUserId) return;

    const resolved = resolveRecordRef(exerciseName, ref);
    const achievedAt = new Date().toISOString();

    // QUEUED, NOT DROPPED. The movement exists, it simply has no row yet; the
    // flush below writes this the moment it does.
    if (resolved === "pending") {
      setPendingPersonalRecords((prev) => [
        ...prev.filter((p) => p.name.trim().toLowerCase() !== exerciseName.trim().toLowerCase()),
        { name: exerciseName, kg, achievedAt },
      ]);
      return;
    }
    // A name in neither library — an old local record for something since
    // deleted. Nothing can reference it, so it stays the local number it has
    // always been rather than being queued forever.
    if (!resolved) return;

    void recordPersonalRecord(authUserId, resolved, kg, achievedAt);
  };

  /**
   * Writes the records the user ticked in the one-time review, and closes it.
   *
   * ONLY WHAT WAS CONFIRMED. Anything the user skipped is not written and not
   * queued — it simply stays the local number it already was, which is what
   * "skipped" has to mean for a migration prompt nobody asked for.
   *
   * The flag is set whatever the outcome, including when nothing was
   * confirmed: this is a one-time screen and re-showing it would make it a
   * recurring one.
   */
  const completePersonalRecordsReview: AppState["completePersonalRecordsReview"] = async (
    confirmed
  ) => {
    let written = 0;
    let queued = 0;
    const unresolved: string[] = [];
    const achievedAt = new Date().toISOString();
    const stillPending: typeof pendingPersonalRecords = [];

    if (authUserId) {
      for (const entry of confirmed) {
        const resolved = resolveRecordRef(entry.name);
        if (resolved === "pending") {
          // Same rule as a live PR for an unsynced movement, and the screen
          // says so rather than implying it was saved.
          stillPending.push({ name: entry.name, kg: entry.kg, achievedAt });
          queued += 1;
          continue;
        }
        if (!resolved) {
          unresolved.push(entry.name);
          continue;
        }
        const result = await recordPersonalRecord(authUserId, resolved, entry.kg, achievedAt);
        if (result.ok) written += 1;
        else unresolved.push(entry.name);
      }
    }

    // The confirmed values are kept on screen either way: they are what the
    // user just told us their records are.
    setPersonalRecords((prev) => {
      const next = { ...prev };
      for (const entry of confirmed) next[entry.name] = entry.kg;
      return next;
    });
    if (stillPending.length > 0) {
      setPendingPersonalRecords((prev) => [...prev, ...stillPending]);
    }
    setPersonalRecordsReviewItems({});
    setPersonalRecordsReviewDone(true);
    return { written, queued, unresolved };
  };

  // A LOCAL ID MEANS NEVER SYNCED, the same test isRemoteMealId gives meals.
  // Folders and routines written before this reached Supabase carry `rf…` and
  // `routine…`; one created while signed out carries the same shape.
  const isRemoteRoutineId = (id: string) => isUuid(id);

  const addRoutineFolder: AppState["addRoutineFolder"] = async (
    name,
    parentId = null,
    color
  ) => {
    // Position is the count of existing siblings, which is where the UI
    // appends it. The column is NOT NULL and has no default.
    const position = routineFolders.filter((f) => (f.parentId ?? null) === (parentId ?? null)).length;

    if (!authUserId) {
      setRoutineFolders((prev) => [...prev, { id: `rf${Date.now()}`, name, parentId, color }]);
      return undefined;
    }
    const result = await createRoutineFolderRemote(authUserId, { name, parentId, color, position });
    if (!result.ok || !result.folder) return result.message ?? "Could not create that folder.";
    setRoutineFolders((prev) => [...prev, result.folder!]);
    return undefined;
  };

  const renameRoutineFolder: AppState["renameRoutineFolder"] = async (id, name) => {
    const applyLocal = () =>
      setRoutineFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    if (!authUserId || !isRemoteRoutineId(id)) {
      applyLocal();
      return undefined;
    }
    const result = await updateRoutineFolderRemote(id, { name });
    if (!result.ok) return result.message ?? "Could not rename that folder.";
    applyLocal();
    return undefined;
  };

  const deleteRoutineFolder: AppState["deleteRoutineFolder"] = async (id) => {
    // Subfolders of a deleted folder become top-level, and any routines
    // directly in it are unfiled — never silently deleting a routine, which is
    // what this has always promised. The service keeps that promise against a
    // parent_id that is ON DELETE CASCADE by re-parenting the children first;
    // the routines are unfiled by the database itself (ON DELETE SET NULL).
    const applyLocal = () => {
      setRoutineFolders((prev) =>
        prev
          .filter((f) => f.id !== id)
          .map((f) => (f.parentId === id ? { ...f, parentId: null } : f))
      );
      setRoutines((prev) => prev.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)));
    };
    if (!authUserId || !isRemoteRoutineId(id)) {
      applyLocal();
      return undefined;
    }
    const result = await deleteRoutineFolderRemote(id);
    if (!result.ok) return result.message ?? "Could not delete that folder.";
    applyLocal();
    return undefined;
  };

  const updateRoutineFolder: AppState["updateRoutineFolder"] = async (id, patch) => {
    const applyLocal = () =>
      setRoutineFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    if (!authUserId || !isRemoteRoutineId(id)) {
      applyLocal();
      return undefined;
    }
    // parentId is the one that can come back ATX16 or ATX17. Local state is
    // left untouched when it does, so the tree on screen still matches the
    // tree in the database.
    const result = await updateRoutineFolderRemote(id, {
      name: patch.name,
      color: patch.color,
      parentId: patch.parentId,
    });
    if (!result.ok) return result.message ?? "Could not update that folder.";
    applyLocal();
    return undefined;
  };
  // Reorders among siblings sharing the same parentId — top-level folders
  // and each folder's own subfolders each keep their own independent order.
  const moveRoutineFolder: AppState["moveRoutineFolder"] = async (id, direction) => {
    const folder = routineFolders.find((f) => f.id === id);
    if (!folder) return undefined;
    const siblings = routineFolders.filter((f) => f.parentId === folder.parentId);
    const siblingIds = siblings.map((f) => f.id);
    const from = siblingIds.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= siblingIds.length) return undefined;

    const reorderedSiblingIds = [...siblingIds];
    [reorderedSiblingIds[from], reorderedSiblingIds[to]] = [
      reorderedSiblingIds[to],
      reorderedSiblingIds[from],
    ];

    const applyLocal = () =>
      setRoutineFolders((prev) => {
        // Rebuild the full array in the new sibling order, preserving the
        // relative position of every other (non-sibling) folder. A lookup
        // map (not a nested `.find` re-run per outer iteration, which was
        // the original bug here — `.find`'s own internal iteration bumped a
        // shared `cursor` far past where the outer `.map` intended) makes
        // each slot resolve independently and correctly.
        const byId = new Map(prev.map((f) => [f.id, f]));
        let cursor = 0;
        return prev.map((f) => {
          if (f.parentId !== folder.parentId) return f;
          const nextId = reorderedSiblingIds[cursor];
          cursor += 1;
          return byId.get(nextId) ?? f;
        });
      });

    // ORDER IS A COLUMN NOW, not just an array index, and THE WHOLE SIBLING
    // GROUP IS REWRITTEN rather than just the two that swapped.
    //
    // Writing only the pair leaves the others holding whatever position they
    // were created with, which is not a dense 0..n-1 sequence — a folder
    // created as a subfolder and later moved to the root keeps a position its
    // new siblings already use. Measured: one "move up" produced two folders
    // both at position 2, and the order the user had just arranged came back
    // differently on the next load, because ties break by created_at. Renumber
    // the group and there are no ties to break.
    const renumbered = reorderedSiblingIds
      .map((sid, index) => ({ id: sid, position: index }))
      .filter((s) => isRemoteRoutineId(s.id));

    if (!authUserId || renumbered.length === 0) {
      applyLocal();
      return undefined;
    }
    const result = await setFolderPositions(renumbered);
    if (!result.ok) return result.message ?? "Could not reorder those folders.";
    applyLocal();
    return undefined;
  };

  const addRoutine: AppState["addRoutine"] = async (routine) => {
    if (!authUserId) {
      const id = `routine${Date.now()}${Math.random().toString(16).slice(2)}`;
      setRoutines((prev) => [...prev, { ...routine, id }]);
      return id;
    }
    const result = await createRoutineRemote(authUserId, routine, exerciseLookupRef.current);
    // Null rather than a local id: a routine that failed to save must not sit
    // in the list looking saved, the same call saveWorkoutSession makes.
    if (!result.ok || !result.routine) return null;
    setRoutines((prev) => [...prev, result.routine!]);
    return result.routine.id;
  };

  const updateRoutine: AppState["updateRoutine"] = async (id, patch) => {
    const applyLocal = () =>
      setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    // A template mirror has no row of its own — see the hydration — and an
    // unsynced routine has nothing to update remotely.
    const routine = routines.find((r) => r.id === id);
    if (!authUserId || !isRemoteRoutineId(id) || routine?.sourceTemplateId) {
      applyLocal();
      return undefined;
    }
    const result = await updateRoutineRemote(id, patch, patch.exercises, exerciseLookupRef.current);
    if (!result.ok) return result.message ?? "Could not save that routine.";
    // THE SAVE ANSWERS WITH THE BLOCKS IT WROTE, and that answer replaces the
    // patch rather than merging behind it: writeBlocks re-inserts every block,
    // so the ids the editor was holding are gone and its members now point at
    // new ones. Applying the patch alone would leave state describing a
    // grouping the database no longer has.
    if (result.saved) {
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, ...patch, blocks: result.saved!.blocks, exercises: result.saved!.exercises }
            : r
        )
      );
      return undefined;
    }
    applyLocal();
    return undefined;
  };

  const deleteRoutine: AppState["deleteRoutine"] = async (id) => {
    const routine = routines.find((r) => r.id === id);
    if (authUserId && isRemoteRoutineId(id) && !routine?.sourceTemplateId) {
      const result = await deleteRoutineRemote(id);
      if (!result.ok) return result.message ?? "Could not delete that routine.";
    }
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    return undefined;
  };

  // Both water setters funnel through one write. A water row is the day's
  // running total AS OF that moment, not an increment, so a delta has to be
  // resolved against the current total before it is sent — see the header of
  // services/health-metrics for why the table cannot hold increments.
  const writeWater = async (ml: number) => {
    if (!authUserId) return { ok: false, message: "You need to be signed in to log water." };
    const clamped = Math.max(0, Math.min(ml, 5000));
    const result = await logHealthMetric({
      userId: authUserId,
      kind: "water",
      value: clamped,
      day: selectedDate,
      today,
    });
    if (!result.ok) return result;
    setWaterByDate((prev) => ({ ...prev, [selectedDate]: clamped }));
    return { ok: true };
  };
  const addWater: AppState["addWater"] = (ml) => writeWater((waterByDate[selectedDate] ?? 0) + ml);
  const setWaterAmount: AppState["setWaterAmount"] = (ml) => writeWater(ml);
  const setWaterGoal = (ml: number) => setWaterGoalState(Math.max(500, Math.min(ml, 6000)));

  const toggleHabit = (id: string) =>
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              done: !h.done,
              streakDays: !h.done ? h.streakDays + 1 : Math.max(0, h.streakDays - 1),
            }
          : h
      )
    );
  const addHabit = (label: string, icon: HabitIconKey) =>
    setHabits((prev) => [...prev, { id: `h${Date.now()}`, label, icon, done: false, streakDays: 0 }]);
  const removeHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id));
  const renameHabit = (id: string, label: string) =>
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, label } : h)));

  const updateStreak = (id: string, patch: Partial<Streak>) =>
    setStreaks((prev) => prev.map((s) => (s.id === id && !s.auto ? { ...s, ...patch } : s)));
  const addStreak = (habitId: string, goalDays: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    setStreaks((prev) => [
      ...prev,
      { id: `s${Date.now()}`, label: habit.label, days: habit.streakDays, goalDays, habitId },
    ]);
  };
  const removeStreak = (id: string) => setStreaks((prev) => prev.filter((s) => s.id !== id));

  // V4 (QA 4.0): a streak linked to a habit tracks that habit's own
  // streakDays automatically — including its label, if the habit gets
  // renamed — instead of drifting out of sync as a separate counter.
  useEffect(() => {
    setStreaks((prev) =>
      prev.map((s) => {
        if (!s.habitId) return s;
        const habit = habits.find((h) => h.id === s.habitId);
        if (!habit) return s;
        return { ...s, days: habit.streakDays, label: habit.label };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  // --- auto streak hydration ---------------------------------------------
  //
  // THE FOUR COUNTS COME FROM THE DATABASE NOW. They used to be recomputed
  // here from whatever the client happened to hold, and that derivation was
  // wrong in ways worth recording, because the numbers it produced are the
  // ones users have been looking at:
  //
  //   workout   was `workoutSessions.length` — a LIFETIME COUNT wearing the
  //             word "streak". Train twice a year and it said 2.
  //   movement  counted workout days. The sweep counts steps and calories
  //             burned; those are different questions and only one of them is
  //             what "movement" means.
  //   logging   counted food or workouts. The server's umbrella also includes
  //             health metrics and habit completions, so a day spent logging
  //             steps counted for nothing here.
  //   all four  anchored on TODAY, while the sweep measures the run ending
  //             YESTERDAY — so the client's number jumped the moment you
  //             logged and the server's never agreed with it.
  //
  // WHICH MEANS THIS IS NOT A REFACTOR. The displayed numbers change, and the
  // new ones are the ones the database will keep.
  //
  // THEY ALSO STOP MOVING THE INSTANT YOU LOG, which is the real trade. The
  // sweep runs nightly, so today's food does not bump the counter until it
  // does. That is the honest behaviour: a streak is a claim about days, and
  // the old liveliness was bought by computing a different thing.
  const [streaksError, setStreaksError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId || isAdmin !== false) return;
    let cancelled = false;

    // SEEDS FIRST, THEN READS. An account created before the rows existed has
    // none, and reading before seeding would show four zeroes on this visit
    // and only self-heal on the next one. ensureAutoStreaks is memoised, so
    // sharing it with the auth listener costs one call, not two.
    //
    // Never for an administrator: streaks.owner_id references profiles(id)
    // and they have no row there, so this is the second half of the skip the
    // auth listener already makes. `isAdmin !== false` rather than `=== true`
    // waits for the answer instead of guessing while it is still null.
    void ensureAutoStreaks(authUserId)
      .then(() => getAutoStreaks(authUserId))
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          // A failed read is not an empty account. Keep whatever is on screen,
          // the same rule the diary and custom meals follow.
          setStreaksError(result.message ?? "Couldn't load your streaks.");
          return;
        }
        setStreaksError(null);

        const byCategory = new Map(result.streaks.map((r) => [r.category, r]));
        setStreaks((prev) => {
          // User-created streaks are untouched: they live in local state, are
          // linked to a habit, and the sweep knows nothing about them.
          const own = prev.filter((s) => !s.auto);
          const auto = AUTO_STREAK_CATEGORIES.map((category) => {
            const row = byCategory.get(category);
            return {
              // A category with no row shows zero rather than disappearing.
              // Seeding above makes that nearly unreachable, but "nearly" is
              // not a reason to render four tiles as three.
              id: row?.id ?? `auto-${category}`,
              label: AUTO_STREAK_LABEL_BY_CATEGORY[category],
              days: row?.days ?? 0,
              auto: true as const,
              category,
            };
          });
          return [...auto, ...own];
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, isAdmin, setStreaks]);

  const updateMetricValue: AppState["updateMetricValue"] = (type, value) => {
    setMetricValues((prev) => ({ ...prev, [type]: value }));
    if (type === "weight") setUser((prev) => ({ ...prev, weightKg: value }));
  };

  const [weightLoggedDate, setWeightLoggedDate] = usePersistentState<string | null>(
    "weightLoggedDate",
    null
  );
  // V10 (QA 10.0): "logging... metrics in a day that is not today should
  // add and log values pertaining to that mentioned day" — logs against
  // whatever day is currently selected on Home, not always today. The
  // live "current weight" (used for BMI, widgets, etc.) still only updates
  // when logging for today, same as before.
  const [weightByDate, setWeightByDate] = usePersistentState<Record<string, number>>(
    "weightByDate",
    {}
  );

  // Weight and water history, hydrated from health_metrics.
  //
  // A PLAIN REPLACE, like the workout history and for the same reason: both
  // series are remote-required, so every value in them came from the server
  // and the server's answer is simply the truth. There are no local-only
  // entries to preserve the way the diary has.
  //
  // On failure the existing maps are left alone rather than cleared: an empty
  // result and a failed request mean opposite things, and blanking someone's
  // weight history over a dropped connection would read as data loss.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void getHealthMetrics(authUserId, diaryWindowStart).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setMetricsError(result.message);
        return;
      }
      setMetricsError(null);
      setWeightByDate(result.history.weightByDate);
      setWaterByDate(result.history.waterByDate);
      setWeightLoggedDate(result.history.weightLoggedDate);
      // The live "current weight" that BMI, the Home widget and user.weightKg
      // all read is the latest reading, not a separately stored number.
      const latest = result.history.weightLoggedDate;
      if (latest !== null) {
        const kg = result.history.weightByDate[latest];
        if (kg !== undefined) {
          setMetricValues((prev) => ({ ...prev, weight: kg }));
          setUser((prev) => ({ ...prev, weightKg: kg }));
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, profileReady, diaryWindowStart]);

  const logWeightForToday: AppState["logWeightForToday"] = async (value) => {
    if (!authUserId) return { ok: false, message: "You need to be signed in to log your weight." };
    const result = await logHealthMetric({
      userId: authUserId,
      kind: "weight",
      value,
      day: selectedDate,
      today,
    });
    if (!result.ok) return result;
    setWeightByDate((prev) => ({ ...prev, [selectedDate]: value }));
    // The live current weight still only moves when logging for today —
    // backfilling last Tuesday should not rewrite what the user weighs now.
    if (selectedDate === today) updateMetricValue("weight", value);
    setWeightLoggedDate(selectedDate);
    return { ok: true };
  };

  const [stepsGoal, setStepsGoal] = usePersistentState<number>("stepsGoal", 10000);

  const [healthIntegrationConnected, setHealthIntegrationConnected] = usePersistentState<boolean>(
    "healthIntegrationConnected",
    false
  );

  const addWidget: AppState["addWidget"] = (type, size = "small") =>
    setWidgets((prev) => [
      ...prev,
      { id: `widget${Date.now()}${Math.random().toString(16).slice(2)}`, type, size, visible: true },
    ]);
  const removeWidget = (id: string) => setWidgets((prev) => prev.filter((w) => w.id !== id));
  const reorderWidgets = (fromIndex: number, toIndex: number) =>
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  const resizeWidget = (id: string, size: WidgetSize) =>
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)));

  const setNutritionGoal = (goal: NutritionGoal) => setNutritionGoalState(goal);
  const setWeightGoal = (weightGoal: WeightGoalType, weeklyRateKg: number) =>
    setNutritionGoalState((prev) => {
      const suggested = suggestNutritionGoal(user, weightGoal, weeklyRateKg);
      // V7 (QA 7.0): "Switching Weight goal resets the desired weight box
      // and would need to reinput the value" — a desired weight picked for
      // one direction (e.g. losing) isn't valid for the other.
      const directionChanged = prev.weightGoal !== weightGoal;
      return {
        ...prev,
        weightGoal,
        weeklyRateKg,
        targetCalories: suggested.targetCalories,
        desiredWeightKg: directionChanged ? undefined : prev.desiredWeightKg,
        desiredWeightConfirmed: directionChanged ? false : prev.desiredWeightConfirmed,
      };
    });
  const setMacroSplit = (split: MacroSplit) =>
    setNutritionGoalState((prev) => ({ ...prev, macroSplit: normalizeMacroSplit(split) }));

  // A LOCAL ID MEANS NEVER SYNCED, the same shape isRemoteEntryId gives the
  // diary. Meals written before this reached Supabase carry `cm<timestamp>`;
  // every meal the server knows about carries a uuid.
  const isRemoteMealId = (id: string) => isUuid(id);

  // Meal Prep's pull-to-refresh. The same reads the hydration effects above
  // make, without their one-time upload of local stragglers; a failed read
  // keeps what is on screen and sets the error, exactly as those do.
  // Local-only items (never synced) stay: custom meals after the server's
  // list (ascending), recipes in front of it (newest first, item 11).
  const reloadMealPrep: AppState["reloadMealPrep"] = async () => {
    if (!authUserId) return;
    const [meals, recipeRead] = await Promise.all([getCustomMeals(authUserId), getRecipes(authUserId)]);
    if (meals.ok) {
      setCustomMealsError(null);
      setCustomMeals((prev) => [...meals.meals, ...prev.filter((m) => !isUuid(m.id))]);
    } else {
      setCustomMealsError(meals.message ?? "Could not load your meals.");
    }
    if (recipeRead.ok) {
      setRecipesError(null);
      setRecipes((prev) => [...prev.filter((r) => !isUuid(r.id)), ...recipeRead.recipes]);
    } else {
      setRecipesError(recipeRead.message ?? "Could not load your recipes.");
    }
  };

  const addCustomMeal: AppState["addCustomMeal"] = async (title, items, mealType) => {
    // Signed out, behave exactly as before rather than refusing: the meal is
    // still useful locally and the upload below will take it on next sign-in.
    if (!authUserId) {
      setCustomMeals((prev) => [...prev, { id: `cm${Date.now()}`, title: title.trim(), items, mealType }]);
      return undefined;
    }
    const result = await createCustomMealRemote(authUserId, title, items, mealType);
    if (!result.ok || !result.meal) return result.message ?? "Could not save that meal.";
    setCustomMeals((prev) => [...prev, result.meal!]);
    return undefined;
  };

  // V10 (QA 10.0): "Creating a meal prep should also allow you to edit and delete it."
  const updateCustomMeal: AppState["updateCustomMeal"] = async (id, title, items, mealType) => {
    const applyLocal = () =>
      setCustomMeals((prev) => prev.map((m) => (m.id === id ? { ...m, title: title.trim(), items, mealType } : m)));

    // An unsynced meal has nothing to update remotely; editing it keeps it
    // local, and the upload below will carry the edited version up.
    if (!authUserId || !isRemoteMealId(id)) {
      applyLocal();
      return undefined;
    }
    const result = await updateCustomMealRemote(id, title, items, mealType);
    if (!result.ok) return result.message ?? "Could not save that meal.";
    applyLocal();
    return undefined;
  };

  const removeCustomMeal: AppState["removeCustomMeal"] = async (id) => {
    // Removed locally either way: a delete the server refused should not leave
    // the row on screen pretending the tap did nothing, and the next hydration
    // will bring it back if it really survived.
    if (authUserId && isRemoteMealId(id)) await deleteCustomMealRemote(id);
    setCustomMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const addClientCustomMeal: AppState["addClientCustomMeal"] = (clientId, title, items, mealType) =>
    setClientCustomMeals((prev) => ({
      ...prev,
      [clientId]: [...(prev[clientId] ?? []), { id: `ccm${Date.now()}`, title: title.trim(), items, mealType }],
    }));
  const updateClientCustomMeal: AppState["updateClientCustomMeal"] = (clientId, id, title, items, mealType) =>
    setClientCustomMeals((prev) => ({
      ...prev,
      [clientId]: (prev[clientId] ?? []).map((m) =>
        m.id === id ? { ...m, title: title.trim(), items, mealType } : m
      ),
    }));
  const removeClientCustomMeal: AppState["removeClientCustomMeal"] = (clientId, id) =>
    setClientCustomMeals((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? []).filter((m) => m.id !== id) }));
  // Written with NULL provenance. A custom meal's items may reference foods
  // that only exist in localStorage and were never written to custom_foods, so
  // there is often no id to point at -- see the README follow-up on custom-food
  // writes. The snapshot is what matters, and the schema permits both
  // provenance columns being null precisely for this case.
  const logCustomMeal: AppState["logCustomMeal"] = async (mealId, meal, date) => {
    const custom = customMeals.find((m) => m.id === mealId);
    if (!custom || !authUserId) return;

    for (const item of custom.items) {
      // WHICH TABLE, NOT MERELY WHETHER IT IS A UUID. A hydrated meal carries
      // real ids for BOTH kinds of food, so the old isUuid test would send a
      // catalog id to custom_food_id and fail the foreign key. getCustomMeals
      // marks custom-sourced items with isCustom; isUuid still answers for
      // items that never went through it -- a locally built meal, where a uuid
      // can only have come from the user's own foods.
      const base = manualFood(item.food);
      const fromCustom = (item.food as Partial<CustomFood>).isCustom === true;
      const food =
        fromCustom || (!("isCustom" in item.food) && isUuid(item.food.id))
          ? { ...base, source: "custom" as const }
          : isUuid(item.food.id)
            ? { ...base, source: "catalog" as const }
            : base;

      const result = await logFoodEntry({
        userId: authUserId,
        food,
        quantity: item.quantity,
        unit: item.unit ?? "serving",
        meal,
        date,
        loggedVia: "quick",
      });
      if (result.ok && result.entry) addFoodEntryRecord(result.entry);
      else console.error("[diary] custom meal item failed:", result.message);
    }
  };

  // A LOCAL ID MEANS NEVER SYNCED, same shape as isRemoteMealId above.
  const isRemoteRecipeId = (id: string) => isUuid(id);

  const addRecipe: AppState["addRecipe"] = async (title, items, servings, steps) => {
    if (!authUserId) {
      setRecipes((prev) => [
        { id: `rc${Date.now()}`, title: title.trim(), items, servings, steps },
        ...prev,
      ]);
      return undefined;
    }
    const result = await createRecipeRemote(authUserId, title, items, servings, steps);
    if (!result.ok || !result.recipe) return result.message ?? "Could not save that recipe.";
    setRecipes((prev) => [result.recipe!, ...prev]);
    return undefined;
  };

  const updateRecipe: AppState["updateRecipe"] = async (id, title, items, servings, steps) => {
    const applyLocal = () =>
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: title.trim(), items, servings, steps } : r))
      );

    if (!authUserId || !isRemoteRecipeId(id)) {
      applyLocal();
      return undefined;
    }
    const result = await updateRecipeRemote(id, title, items, servings, steps);
    if (!result.ok) return result.message ?? "Could not save that recipe.";
    applyLocal();
    return undefined;
  };

  const removeRecipe: AppState["removeRecipe"] = async (id) => {
    if (authUserId && isRemoteRecipeId(id)) await deleteRecipeRemote(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const addClientRecipe: AppState["addClientRecipe"] = (clientId, title, items, servings, steps) =>
    setClientRecipes((prev) => ({
      ...prev,
      [clientId]: [...(prev[clientId] ?? []), { id: `crc${Date.now()}`, title: title.trim(), items, servings, steps }],
    }));
  const updateClientRecipe: AppState["updateClientRecipe"] = (clientId, id, title, items, servings, steps) =>
    setClientRecipes((prev) => ({
      ...prev,
      [clientId]: (prev[clientId] ?? []).map((r) =>
        r.id === id ? { ...r, title: title.trim(), items, servings, steps } : r
      ),
    }));
  const removeClientRecipe: AppState["removeClientRecipe"] = (clientId, id) =>
    setClientRecipes((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? []).filter((r) => r.id !== id) }));

  // Per-serving arithmetic: `ingredient total / recipe.servings`, computed
  // here and never stored as a second figure (handoff: "Lentil Mujaddara
  // totals 2,120 kcal over 4 servings and reads exactly 530 per serving").
  // Logging N servings multiplies every ingredient's own quantity by
  // N / recipe.servings before handing it to logFoodEntry, so the diary
  // entry's snapshot is already the right size — the same "multiply once,
  // at the write path" rule services/food's header documents.
  const logRecipe: AppState["logRecipe"] = async (recipeId, servingsToLog, meal, date) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe || !authUserId) return;
    const scale = servingsToLog / recipe.servings;

    for (const item of recipe.items) {
      const base = manualFood(item.food);
      const fromCustom = (item.food as Partial<CustomFood>).isCustom === true;
      const food =
        fromCustom || (!("isCustom" in item.food) && isUuid(item.food.id))
          ? { ...base, source: "custom" as const }
          : isUuid(item.food.id)
            ? { ...base, source: "catalog" as const }
            : base;

      const result = await logFoodEntry({
        userId: authUserId,
        food,
        quantity: item.quantity * scale,
        unit: item.unit ?? "serving",
        meal,
        date,
        loggedVia: "quick",
      });
      if (result.ok && result.entry) addFoodEntryRecord(result.entry);
      else console.error("[diary] recipe item failed:", result.message);
    }
  };

  const addJournalEntry = (folderId: string, title: string, text: string) => {
    const now = new Date();
    setJournalEntries((prev) => [
      ...prev,
      {
        id: `j${Date.now()}${Math.random().toString(16).slice(2)}`,
        folderId,
        title,
        text,
        date: today,
        createdAt: now.toISOString(),
      },
    ]);
  };
  const updateJournalEntry = (id: string, patch: Partial<Pick<JournalEntry, "title" | "text">>) =>
    setJournalEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeJournalEntry = (id: string) =>
    setJournalEntries((prev) => prev.filter((e) => e.id !== id));
  const addJournalFolder = (name: string) =>
    setJournalFolders((prev) => [...prev, { id: `jf${Date.now()}`, name }]);

  const recordBiomarkers: AppState["recordBiomarkers"] = async (entries, file) => {
    if (!authUserId) return { ok: false, message: "You need to be signed in to save results." };

    const result = await recordPanel(authUserId, {
      markers: entries.map((e) => ({ name: e.name, value: e.value, unit: e.unit })),
      file,
    });
    if (!result.ok) return { ok: false, message: result.message };

    // RE-READ RATHER THAN MERGE LOCALLY. The list the UI wants is grouped by
    // marker name across every panel, so appending this panel's markers by
    // hand would mean reimplementing the inversion in a second place and
    // getting "newest wins" right twice. One extra round trip buys a single
    // definition of that shape, in the service that owns it.
    const refreshed = await getBloodMarkers(authUserId);
    if (refreshed.ok) {
      setLabsError(null);
      setBloodMarkers(refreshed.markers);
    }
    const reports = await getLabReports(authUserId);
    if (reports.ok) setLabReports(reports.reports);
    return { ok: true };
  };

  const removeLabReport = async (id: string): Promise<{ ok: boolean; message?: string }> => {
    if (!authUserId) return { ok: false, message: "You need to be signed in to remove this." };
    // The path has to be read BEFORE the row goes: it is the only handle on
    // the object, and Storage does not cascade.
    const existing = labReports.find((r) => r.id === id);
    const result = await deleteLabPanel(id, existing?.filePath);
    if (!result.ok) return result;

    // RE-READ RATHER THAN FILTER, for the reason recordBiomarkers re-reads and
    // then one more: the marker list is grouped by name across every panel, so
    // the cascade changes it in ways no local filter can reproduce. A marker
    // only this panel measured disappears entirely; one measured by several
    // reverts to the previous panel's value, unit, range and status. Dropping
    // the panel's id from a list would leave its readings on screen as current.
    const refreshed = await getBloodMarkers(authUserId);
    if (refreshed.ok) {
      setLabsError(null);
      setBloodMarkers(refreshed.markers);
    }
    const reports = await getLabReports(authUserId);
    if (reports.ok) setLabReports(reports.reports);
    return { ok: true };
  };

  const goToPrevDate = () => setSelectedDate((d) => shiftDate(d, -1));
  const goToNextDate = () => setSelectedDate((d) => shiftDate(d, 1));
  const goToToday = () => setSelectedDate(today);
  const goToDate = (date: string) => setSelectedDate(date);

  // Copies rather than re-logs. An existing entry holds TOTALS, so putting it
  // back through logFoodEntry would multiply by quantity a second time; see
  // copyDiaryEntry for the full reasoning.
  const copyYesterdayFood = async () => {
    if (!authUserId) return;
    const yesterday = shiftDate(selectedDate, -1);
    const yesterdaysEntries = foodLog.filter((e) => e.date === yesterday);

    for (const entry of yesterdaysEntries) {
      const result = await copyDiaryEntry(authUserId, entry, selectedDate);
      if (result.ok && result.entry) addFoodEntryRecord(result.entry);
      else console.error("[diary] copy failed:", result.message);
    }
  };

  // Returns the ids actually written, which is what the 15-second Undo pill
  // removes. Only successful copies are returned, so Undo can never try to
  // delete a row that was never created.
  const copyYesterdayMeal = async (meal: MealType): Promise<string[]> => {
    if (!authUserId) return [];
    const yesterday = shiftDate(selectedDate, -1);
    const yesterdaysEntries = foodLog.filter((e) => e.date === yesterday && e.meal === meal);

    const written: string[] = [];
    for (const entry of yesterdaysEntries) {
      const result = await copyDiaryEntry(authUserId, entry, selectedDate);
      if (result.ok && result.entry) {
        addFoodEntryRecord(result.entry);
        written.push(result.entry.id);
      } else {
        console.error("[diary] copy failed:", result.message);
      }
    }
    return written;
  };

  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  // Written to custom_foods on create, not on first use. A food defined once
  // and logged next week is exactly the case worth persisting -- deferring the
  // write would leave it invisible on every other device until it happened to
  // be used, which is the same bug in a smaller box. It also makes the sheet's
  // own promise (saved foods "show up in search alongside the database") true,
  // since searchFoods already queries this table.
  //
  // A failed write does NOT lose what the user typed. The food falls back to a
  // local-only entry with a minted id, stays usable and loggable immediately,
  // and simply has no provenance to point at -- the same state every custom
  // food was in before this existed.
  const addCustomFood: AppState["addCustomFood"] = async (food) => {
    const localOnly = (): CustomFood => ({
      ...food,
      id: `custom${Date.now()}${Math.random().toString(16).slice(2)}`,
      isCustom: true,
    });

    let custom: CustomFood;
    if (!authUserId) {
      custom = localOnly();
    } else {
      const result = await createCustomFood(authUserId, food);
      if (result.ok && result.food) {
        custom = { ...food, id: result.food.id, isCustom: true };
      } else {
        console.error("[food] custom food kept local only:", result.message);
        custom = localOnly();
      }
    }

    setCustomFoods((prev) => [...prev, custom]);
    return custom;
  };

  const [clientCustomFoods, setClientCustomFoods] = usePersistentState<Record<string, CustomFood[]>>(
    "clientCustomFoods",
    {}
  );
  const [clientCustomMeals, setClientCustomMeals] = usePersistentState<Record<string, CustomMeal[]>>(
    "clientCustomMeals",
    {}
  );
  const [clientRecipes, setClientRecipes] = usePersistentState<Record<string, Recipe[]>>("clientRecipes", {});
  const addClientCustomFood: AppState["addClientCustomFood"] = (clientId, food) => {
    const custom: CustomFood = {
      ...food,
      id: `custom${Date.now()}${Math.random().toString(16).slice(2)}`,
      isCustom: true,
    };
    setClientCustomFoods((prev) => ({ ...prev, [clientId]: [...(prev[clientId] ?? []), custom] }));
    return custom;
  };

  // A LOCAL ID MEANS NEVER SYNCED, the same shape isRemoteMealId gives meals.
  // An exercise saved before this reached Supabase carries no id at all; one
  // saved while signed out carries `cx<timestamp>`.
  const isRemoteExerciseId = (id: string | undefined) => isUuid(id ?? "");

  const addCustomExercise: AppState["addCustomExercise"] = async (item) => {
    // THE DUPLICATE-NAME RULE IS UNCHANGED and is checked before the write, so
    // a second "Bungees" never reaches the table in the first place.
    const clash = customExercises.some(
      (e) => e.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
    if (clash) return undefined;

    // Signed out, behave exactly as before rather than refusing: the movement
    // is still useful locally and the hydration above will carry it up on the
    // next sign-in.
    if (!authUserId) {
      setCustomExercises((prev) => [...prev, { ...item, id: `cx${Date.now()}` }]);
      return undefined;
    }

    const result = await createCustomExerciseRemote(authUserId, item);
    if (!result.ok || !result.exercise) return result.message ?? "Could not save that exercise.";
    setCustomExercises((prev) => [...prev, result.exercise!]);
    return undefined;
  };

  const updateCustomExercise: AppState["updateCustomExercise"] = async (id, item) => {
    const applyLocal = () =>
      setCustomExercises((prev) => prev.map((e) => (e.id === id ? { ...item, id } : e)));

    // An unsynced movement has nothing to update remotely; editing it keeps it
    // local, and the upload carries the edited version up.
    if (!authUserId || !isRemoteExerciseId(id)) {
      applyLocal();
      return undefined;
    }
    const result = await updateCustomExerciseRemote(id, item);
    if (!result.ok) return result.message ?? "Could not save that exercise.";
    applyLocal();
    return undefined;
  };

  const removeCustomExercise: AppState["removeCustomExercise"] = async (id) => {
    // Removed locally either way, for the reason removeCustomMeal gives: a
    // delete the server refused should not leave the row on screen pretending
    // the tap did nothing, and the next hydration brings it back if it really
    // survived.
    if (authUserId && isRemoteExerciseId(id)) await deleteCustomExerciseRemote(id);
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const [forumPosts, setForumPosts] = usePersistentState<ForumPost[]>("forumPosts", mockForumPosts);
  const addForumPost: AppState["addForumPost"] = (category, title, body) =>
    setForumPosts((prev) => [
      {
        id: `fp-${Date.now()}`,
        authorName: user.firstName,
        category,
        title,
        body,
        likes: 0,
        likedByMe: false,
        comments: [],
        at: new Date().toISOString(),
        mine: true,
      },
      ...prev,
    ]);
  const toggleForumLike: AppState["toggleForumLike"] = (postId) =>
    setForumPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p))
    );
  const addForumComment: AppState["addForumComment"] = (postId, text) =>
    setForumPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { id: `fc-${Date.now()}`, authorName: user.firstName, text, at: new Date().toISOString() }] }
          : p
      )
    );


  const generateClientCode: AppState["generateClientCode"] = async () => {
    const result = await createClientCode();
    if (result.status === "error") return { ok: false, message: result.message };
    return { ok: true, code: result.code };
  };

  const removeProfessionalClient: AppState["removeProfessionalClient"] = async (id) => {
    const result = await disconnectClient(id);
    if (result.status === "permission_denied") {
      // Should be unreachable: the roster only lists this professional's own
      // relationships. Said plainly rather than swallowed, because reaching it
      // means the list is showing something it should not.
      return { ok: false, message: "You don't have permission to end this relationship." };
    }
    if (result.status === "error") return { ok: false, message: result.message };
    // "ok", "not_found" and "already_ended" are one outcome here: the
    // relationship is over. Reporting a failure for a row that is already gone
    // would be telling someone their action failed for having already worked.
    // The view filters on disconnected_at, so a refetch drops the row.
    await refreshRoster();
    return { ok: true };
  };

  const updateProfessionalClientAccess = (id: string, access: Partial<ProfessionalClient["access"]>) =>
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, access: { ...c.access, ...access } } : c))
    );
  const updateProfessionalClient: AppState["updateProfessionalClient"] = (id, patch) =>
    setProfessionalClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // V6 (QA 6.0) asked that "the calendar app should update automatically when
  // the professional assigns a workout and/or food template for the client on
  // a specific day", and both assign actions used to drop a same-day event
  // titled `Assigned "X" to Y` onto the PROFESSIONAL's own calendar.
  //
  // RETIRED IN CALENDAR PHASE 2, because it was never the thing V6 asked for
  // and it is now actively wrong in three ways:
  //
  //   1. IT IS A LOG ENTRY, NOT AN EVENT. It was dated the day the assignment
  //      was made rather than the day of the session, so it never moved when
  //      the session did and accumulated one permanent row per assignment.
  //   2. THE REAL THING NOW EXISTS. assign_template_to_client writes a real
  //      calendar_events row onto the CLIENT's calendar, on the assigned day,
  //      which the professional reads through
  //      calendar_events_select_assigning_professional. That is what V6
  //      described; this was a stand-in from before it was built.
  //   3. ITS invitees: [client.name] WAS THE LEAK. Under the old name-matching
  //      filter, a professional's private note about assigning a program
  //      appeared on the client's own calendar — and on the calendar of every
  //      other client sharing that first name.
  //
  // The underlying record is not lost: workout_template_assignments.assigned_at
  // already holds exactly "who was assigned what, when". If a professional
  // activity feed is wanted, that is its source, and a feed is a different
  // surface from a calendar.
  const assignProgramToClient = (clientId: string, programName: string) => {
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedProgramName: programName } : c))
    );
  };
  const assignFoodTemplateToClient = (clientId: string, templateName: string) => {
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedFoodTemplateName: templateName } : c))
    );
  };

  const updateBusinessListing = (patch: Partial<AppState["businessListing"]>) =>
    setBusinessListing((prev) => ({ ...prev, ...patch }));

  // `businessEmployees` and `removeBusinessEmployee` used to live here: a
  // Record<businessId, BusinessEmployee[]> in localStorage that nothing in
  // the app ever wrote to, so every screen reading it showed an empty team,
  // and the remove action filtered a map no row had ever entered. All five
  // consumers now read business_employees through services/business-team, so
  // this is gone rather than left as state nobody can fill.
  //
  // `businessOfferings` and `businessClasses` went the same way, for the same
  // reason stated differently: they WERE written, but only ever to the writing
  // device. A business's offerings were read by the client-facing Explore page
  // from the client's own empty array; a class scheduled for an affiliated
  // professional was read from the professional's own empty array. Both are
  // real tables now, through hooks/useBusinessCatalog.

  const [businessMessages, setBusinessMessages] = usePersistentState<BusinessMessage[]>("businessMessages", []);
  const sendBusinessMessage: AppState["sendBusinessMessage"] = (customerId, from, text) =>
    setBusinessMessages((prev) => [
      ...prev,
      { id: `bmsg-${Date.now()}-${prev.length}`, customerId, from, text, at: new Date().toISOString() },
    ]);

  const signOut = async () => {
    // Local cache is cleared FIRST and unconditionally. On a shared device
    // the cached profile/health data is the thing that actually matters, so
    // it must not be left behind by a network failure on the way to
    // Supabase — clearing it synchronously guarantees that even if the
    // remote call below hangs or throws.
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_KEY))
      .forEach((k) => localStorage.removeItem(k));

    // The administrator escape hatch goes with it, and the boundary is the
    // sign-out rather than the tab. Keyed by account id, it was never
    // readable by the next person to sign in — but the same admin signing
    // back in on this tab would have sailed past the notice without ever
    // asking to, and a suppression nobody chose is the thing this key exists
    // not to become.
    try {
      window.sessionStorage.removeItem(ADMIN_CONSUMER_KEY);
    } catch {
      // Storage can be refused outright (private mode), exactly as on the
      // write side. Nothing to recover: the state reset below still stands,
      // and a key that cannot be removed could not have been written either.
    }

    setUser({ ...defaultUser });
    setSession(null);

    // BEFORE signOutRemote(), and the order is the whole point.
    // push_subscriptions_delete_own is an own-row policy, so once the session
    // is gone the row is unreachable and would sit there forever — holding the
    // globally-unique endpoint and locking the next account on this browser out
    // of notifications entirely. This is the documented resolution to that
    // collision, not tidying up.
    //
    // setSession(null) above is React state; the supabase client keeps its own
    // session until signOutRemote() takes it, so this call is still authorised.
    //
    // BEST EFFORT, NEVER BLOCKING. unsubscribeFromPush returns a Result and
    // does not throw, and its failure is logged rather than surfaced: a user
    // who has asked to sign out must always end up signed out. The cost of a
    // failure is a stale row, which the next sign-in on this browser reports
    // honestly as a claimed endpoint rather than silently ignoring.
    const removal = await unsubscribeFromPush();
    if (removal.status === "error") {
      console.error("[auth] Could not remove this device's push subscription:", removal.message);
    }

    await signOutRemote();
  };

  // QA 12.0: "put the ability to delete account". This schedules a real
  // server-side deletion; nothing about it is local-only.
  //
  // Previously this cleared localStorage, reset the in-memory user, and told
  // the user their account was permanently deleted. It made no network call at
  // all -- not even a sign-out -- so the account, and every row of health data
  // attached to it, remained entirely intact. For an app holding PHI-tier data
  // behind a screen promising permanent erasure, that was a compliance problem
  // rather than a rough edge.
  //
  // The real work is server-side and already existed: request_account_deletion()
  // stamps profiles.deletion_requested_at, and a pg_cron sweep deletes the
  // auth.users row once 30 days elapse, cascading through every table that
  // references profiles. Nothing here needs elevated privileges.
  const deleteAccount: AppState["deleteAccount"] = async () => {
    const result = await requestAccountDeletion();
    if (!result.ok) {
      // Nothing is cleared and the session is untouched: claiming success on a
      // failed request is the exact bug being fixed.
      return { ok: false, message: result.message ?? "Could not schedule deletion." };
    }

    setDeletionRequestedAt(result.deletionRequestedAt ?? null);
    await signOut();
    return { ok: true };
  };

  const cancelDeletion: AppState["cancelDeletion"] = async () => {
    const result = await cancelAccountDeletionRemote();
    if (!result.ok) return { ok: false, message: result.message ?? "Could not cancel." };
    setDeletionRequestedAt(result.deletionRequestedAt ?? null);
    return { ok: true };
  };

  const value = useMemo<AppState>(
    () => ({
      user,
      setUser,
      completeOnboarding,
      updateProfile,
      session,
      authUserId,
      recoveryPending,
      clearRecovery,
      diaryLoading,
      diaryError,
      workoutHistoryError,
      metricsError,
      medicalError,
      imagingError,
      labsError,
      authReady,
      profileReady,
      isAdmin,
      adminReady,
      continueAsConsumer,
      adminConsumerOptIn,
      mfaPending,
      mfaReady,
      refreshMfaState,
      theme,
      toggleTheme,
      language,
      setLanguage,
      t,
      notificationPrefs,
      updateNotificationPrefs,
      accessibility,
      updateAccessibility,
      foodLog,
      addFoodEntry,
      addFoodEntryRecord,
      updateFoodEntry,
      removeFoodEntry,
      workoutLog,
      logWorkout,
      workoutSessions,
      saveWorkoutSession,
      pausedSessions,
      savePausedSession,
      clearPausedSession,
      personalRecords,
      setPersonalRecord,
      pendingPersonalRecords,
      personalRecordsReviewItems,
      personalRecordsReviewDone,
      completePersonalRecordsReview,
      routinesError,
      routineFolders,
      addRoutineFolder,
      renameRoutineFolder,
      deleteRoutineFolder,
      updateRoutineFolder,
      moveRoutineFolder,
      routines,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      water,
      waterByDate,
      addWater,
      setWaterAmount,
      waterGoalMl,
      setWaterGoal,
      habits,
      toggleHabit,
      addHabit,
      removeHabit,
      renameHabit,
      streaks,
      updateStreak,
      addStreak,
      removeStreak,
      plantStage,
      setPlantStage,
      plantSpecies,
      cyclePlantSpecies,
      metricValues,
      updateMetricValue,
      weightLoggedDate,
      weightByDate,
      logWeightForToday,
      stepsGoal,
      setStepsGoal,
      healthIntegrationConnected,
      setHealthIntegrationConnected,
      widgets,
      addWidget,
      removeWidget,
      reorderWidgets,
      resizeWidget,
      nutritionGoal,
      setNutritionGoal,
      setWeightGoal,
      setMacroSplit,
      dietaryRestriction,
      setDietaryRestriction,
      recoverySensitive,
      setRecoverySensitive,
      streaksError,
      recoverySensitiveIntroSeen,
      voiceDisclosureSeen,
      twoFactorNudgeDismissed,
      setTwoFactorNudgeDismissed,
      setVoiceDisclosureSeen,
      setRecoverySensitiveIntroSeen,
      remindersPaused,
      setRemindersPaused,
      customMeals,
      customMealsError,
      addCustomMeal,
      updateCustomMeal,
      removeCustomMeal,
      clientCustomMeals,
      addClientCustomMeal,
      updateClientCustomMeal,
      removeClientCustomMeal,
      logCustomMeal,
      recipes,
      recipesError,
      reloadMealPrep,
      addRecipe,
      updateRecipe,
      removeRecipe,
      clientRecipes,
      addClientRecipe,
      updateClientRecipe,
      removeClientRecipe,
      logRecipe,
      journalFolders,
      journalEntries,
      addJournalEntry,
      updateJournalEntry,
      removeJournalEntry,
      addJournalFolder,
      bloodMarkers,
      labReports,
      recordBiomarkers,
      removeLabReport,
      imagingRecords,
      addImagingRecord,
      removeImagingRecord,
      comorbidities,
      setComorbidities,
      surgeries,
      addSurgery,
      removeSurgery,
      medications,
      addMedication,
      updateMedication,
      removeMedication,
      selectedDate,
      goToPrevDate,
      goToNextDate,
      goToToday,
      goToDate,
      copyYesterdayFood,
      copyYesterdayMeal,
      today,
      colorTheme,
      setColorTheme,
      customFoods,
      addCustomFood,
      clientCustomFoods,
      addClientCustomFood,
      exerciseCatalog,
      exerciseCatalogError,
      customExercises,
      addCustomExercise,
      updateCustomExercise,
      removeCustomExercise,
      customExercisesError,
      forumPosts,
      addForumPost,
      toggleForumLike,
      addForumComment,
      dismissedMockProfessionalIds,
      dismissMockProfessional,
      businessDirectory,
      updateMyBusinessTier,
      bonusPoints,
      addBonusPoints,
      referralRedeemed,
      referralDiscountPct,
      referralNextMonthDiscountPct,
      applyReferralReward,
      premiumPlan,
      setPremiumPlan,
      gymPurchases,
      purchaseGymPlan,
      cancelGymPlan,
      cart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      generateClientCode,
      rosterLoading,
      rosterError,
      refreshRoster,
      professionalClients,
      removeProfessionalClient,
      updateProfessionalClientAccess,
      updateProfessionalClient,
      assignProgramToClient,
      assignFoodTemplateToClient,
      calendarEvents,
      addCalendarEvent,
      updateCalendarEvent,
      removeCalendarEvent,
      workoutTemplates,
      addWorkoutTemplate,
      updateWorkoutTemplate,
      removeWorkoutTemplate,
      templateAssignments,
      assignTemplate,
      unassignTemplate,
      adoptTemplate,
      templatesError,
      workoutTemplateFolders,
      addWorkoutTemplateFolder,
      renameWorkoutTemplateFolder,
      deleteWorkoutTemplateFolder,
      clientHealthNotes,
      updateClientHealthNote,
      professionalMessages,
      sendProfessionalMessage,
      signOut,
      deleteAccount,
      cancelDeletion,
      deletionRequestedAt,
      businessListing,
      updateBusinessListing,
      businessMessages,
      sendBusinessMessage,
    }),
    [
      user,
      session,
      authUserId,
      recoveryPending,
      clearRecovery,
      diaryLoading,
      diaryError,
      workoutHistoryError,
      metricsError,
      medicalError,
      imagingError,
      labsError,
      deletionRequestedAt,
      authReady,
      profileReady,
      isAdmin,
      adminReady,
      continueAsConsumer,
      adminConsumerOptIn,
      mfaPending,
      mfaReady,
      refreshMfaState,
      theme,
      language,
      notificationPrefs,
      accessibility,
      foodLog,
      workoutLog,
      workoutSessions,
      personalRecords,
      pendingPersonalRecords,
      personalRecordsReviewItems,
      personalRecordsReviewDone,
      pausedSessions,
      routineFolders,
      routinesError,
      routines,
      water,
      waterByDate,
      waterGoalMl,
      habits,
      streaks,
      plantStage,
      plantSpecies,
      metricValues,
      weightLoggedDate,
      weightByDate,
      stepsGoal,
      healthIntegrationConnected,
      widgets,
      nutritionGoal,
      customMeals,
      customMealsError,
      clientCustomMeals,
      dietaryRestriction,
      recoverySensitive,
      streaksError,
      recoverySensitiveIntroSeen,
      voiceDisclosureSeen,
      twoFactorNudgeDismissed,
      setTwoFactorNudgeDismissed,
      setVoiceDisclosureSeen,
      remindersPaused,
      referralRedeemed,
      referralDiscountPct,
      referralNextMonthDiscountPct,
      journalFolders,
      journalEntries,
      bloodMarkers,
      // Was missing since labReports was added to the context, which made the
      // Lab reports list update only on hydration: both writers set it AFTER
      // an await, so the memo had already recomputed on the bloodMarkers
      // change and cached a value still holding the previous list. Adding a
      // report never showed one; removing a report left a chip pointing at a
      // panel that no longer existed.
      labReports,
      imagingRecords,
      comorbidities,
      surgeries,
      medications,
      selectedDate,
      colorTheme,
      customFoods,
      clientCustomFoods,
      exerciseCatalog,
      exerciseCatalogError,
      customExercises,
      customExercisesError,
      forumPosts,
      dismissedMockProfessionalIds,
      businessDirectory,
      bonusPoints,
      premiumPlan,
      gymPurchases,
      cart,
      professionalClients,
      calendarEvents,
      workoutTemplates,
      templateAssignments,
      templatesError,
      workoutTemplateFolders,
      clientHealthNotes,
      professionalMessages,
      businessListing,
      businessMessages,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
