import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  UserProfile,
  Sex,
  FoodLogEntry,
  WorkoutLogEntry,
  Food,
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
  RoutineFolder,
  Routine,
  WorkoutSession,
  PausedWorkoutSession,
  JournalFolder,
  JournalEntry,
  BloodMarker,
  ExtractedBiomarker,
  ClientCode,
  ProfessionalSubtype,
  WorkoutTemplateFolder,
  BusinessDirectoryEntry,
  ProfessionalClient,
  ColorTheme,
  CustomFood,
  HabitIconKey,
  BusinessOffering,
  MembershipPlan,
  CustomExerciseLibraryItem,
  ProfessionalReview,
  CalendarEvent,
  WorkoutTemplateAssignment,
  ClientHealthNote,
  ProfessionalMessage,
  BusinessEmployee,
  BusinessClass,
  BusinessMessage,
  GymPurchase,
  CartItem,
  ForumPost,
  ForumCategory,
} from "../types";
import { mockFoods } from "../data/mockFoods";
import { mockForumPosts } from "../data/mockForum";
import { defaultHabits, streaks as seedStreaks, bloodPanel } from "../data/mockHealthData";
import { todaysWorkout, workoutPrograms, exerciseLibrary } from "../data/mockWorkouts";
import { estimate1RM } from "../services/workout";
import { ONE_RM_CLASSIFICATIONS } from "../types";
import { mockProfessionalClients } from "../data/mockProfessionalClients";
import { suggestNutritionGoal, normalizeMacroSplit } from "../services/nutrition";
import { businessTiers } from "../data/businessTiers";
import { translations, type Language } from "../i18n/translations";

const TODAY = "2026-08-20";

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

const YESTERDAY = "2026-08-19";

function seedFoodLog(): FoodLogEntry[] {
  const byName = (name: string) => mockFoods.find((f) => f.name === name)!;
  const entry = (
    food: Food,
    quantity: number,
    meal: MealType,
    id: string,
    date = TODAY
  ): FoodLogEntry => ({ id, foodId: food.id, food, quantity, meal, date });

  return [
    entry(byName("Manoushe Zaatar"), 1, "breakfast", "seed1"),
    entry(byName("Labneh"), 1, "breakfast", "seed2"),
    entry(byName("Coffee"), 1, "breakfast", "seed3"),
    entry(byName("Chicken Shawarma"), 1, "lunch", "seed4"),
    entry(byName("Banana"), 1, "snack", "seed5"),
    // yesterday, so "copy yesterday's food" has something to demonstrate
    entry(byName("Oatmeal"), 1, "breakfast", "seedY1", YESTERDAY),
    entry(byName("Grilled Chicken Breast"), 1, "lunch", "seedY2", YESTERDAY),
    entry(byName("Rice"), 1, "lunch", "seedY3", YESTERDAY),
    entry(byName("Hummus"), 1, "dinner", "seedY4", YESTERDAY),
  ];
}

function seedWorkoutLog(): WorkoutLogEntry[] {
  return [
    {
      id: "wseed1",
      workoutId: todaysWorkout.id,
      workoutName: todaysWorkout.name,
      date: TODAY,
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

  theme: "light" | "dark";
  toggleTheme: () => void;

  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;

  // V7 (QA 7.0): granular per-category notification toggles (was one
  // all-or-nothing switch), and a couple of real accessibility settings.
  notificationPrefs: Record<
    "mealReminders" | "workoutReminders" | "streakAlerts" | "professionalMessages" | "weeklySummary",
    boolean
  >;
  updateNotificationPrefs: (patch: Partial<AppState["notificationPrefs"]>) => void;

  accessibility: { largerText: boolean; reduceMotion: boolean };
  updateAccessibility: (patch: Partial<AppState["accessibility"]>) => void;

  foodLog: FoodLogEntry[];
  addFoodEntry: (entry: Omit<FoodLogEntry, "id" | "date">) => void;
  // V4: logged foods are editable (quantity/unit) and removable.
  updateFoodEntry: (id: string, patch: Partial<Pick<FoodLogEntry, "quantity" | "unit" | "meal">>) => void;
  removeFoodEntry: (id: string) => void;

  workoutLog: WorkoutLogEntry[];
  logWorkout: (entry: Omit<WorkoutLogEntry, "id" | "date">) => void;

  workoutSessions: WorkoutSession[];
  saveWorkoutSession: (session: Omit<WorkoutSession, "id">) => void;

  // V6 (QA 6.0): quitting a started routine (instead of finishing it)
  // preserves logged sets + elapsed time, keyed by routine, so reopening it
  // resumes exactly where the user left off.
  pausedSessions: Record<string, PausedWorkoutSession>;
  savePausedSession: (routineId: string, session: PausedWorkoutSession) => void;
  clearPausedSession: (routineId: string) => void;

  // V4: estimated 1RM per exercise name (barbell/dumbbell/weighted-bodyweight
  // only) — auto-updated from logged sets, editable from History/Metrics.
  personalRecords: Record<string, number>;
  setPersonalRecord: (exerciseName: string, kg: number) => void;

  routineFolders: RoutineFolder[];
  addRoutineFolder: (name: string, parentId?: string | null, color?: string) => void;
  renameRoutineFolder: (id: string, name: string) => void;
  deleteRoutineFolder: (id: string) => void;
  routines: Routine[];
  addRoutine: (routine: Omit<Routine, "id">) => string;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;

  water: number;
  addWater: (ml: number) => void;
  setWaterAmount: (ml: number) => void;
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
  logWeightForToday: (value: number) => void;
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

  widgets: WidgetConfig[];
  addWidget: (type: WidgetType, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (id: string, size: WidgetSize) => void;

  nutritionGoal: NutritionGoal;
  setNutritionGoal: (goal: NutritionGoal) => void;
  setWeightGoal: (weightGoal: WeightGoalType, weeklyRateKg: number) => void;
  setMacroSplit: (split: MacroSplit) => void;

  // V4: Meal Prep reworked into "Create Meal" — group existing foods under
  // one title; logging the meal logs every item individually.
  customMeals: CustomMeal[];
  addCustomMeal: (title: string, items: CustomMeal["items"], mealType?: MealType) => void;
  updateCustomMeal: (id: string, title: string, items: CustomMeal["items"], mealType?: MealType) => void;
  removeCustomMeal: (id: string) => void;
  logCustomMeal: (mealId: string, meal: MealType, date: string) => void;

  journalFolders: JournalFolder[];
  journalEntries: JournalEntry[];
  addJournalEntry: (folderId: string, title: string, text: string) => void;
  updateJournalEntry: (id: string, patch: Partial<Pick<JournalEntry, "title" | "text">>) => void;
  removeJournalEntry: (id: string) => void;
  addJournalFolder: (name: string) => void;

  bloodMarkers: BloodMarker[];
  recordBiomarkers: (entries: ExtractedBiomarker[]) => void;

  selectedDate: string;
  goToPrevDate: () => void;
  goToNextDate: () => void;
  goToToday: () => void;
  goToDate: (date: string) => void;
  copyYesterdayFood: () => void;

  today: string;

  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;

  customFoods: CustomFood[];
  addCustomFood: (food: Omit<CustomFood, "id" | "isCustom">) => CustomFood;

  // V7 (QA 7.0): a food a professional creates while building a specific
  // client's meal plan goes only into that client's own food database, not
  // the professional's personal custom foods or any other client's.
  clientCustomFoods: Record<string, CustomFood[]>;
  addClientCustomFood: (clientId: string, food: Omit<CustomFood, "id" | "isCustom">) => CustomFood;

  // V4 (QA 4.0): custom exercises are saved to a searchable library, not
  // auto-added to whichever routine was open when they were created.
  customExercises: CustomExerciseLibraryItem[];
  addCustomExercise: (item: CustomExerciseLibraryItem) => void;
  // V8 (QA 8.0): "ability to edit each exercise if pressed on in the
  // library" — for a custom exercise, matched and replaced by its current
  // name (allows renaming too).
  updateCustomExercise: (originalName: string, item: CustomExerciseLibraryItem) => void;

  // V4 (QA 4.0): one review per professional, submitted from ProfessionalDetail.
  professionalReviews: ProfessionalReview[];
  submitProfessionalReview: (professionalId: string, rating: number, text: string) => void;

  // V9 (QA 9.0): "a hub for all clients to share information publicly."
  forumPosts: ForumPost[];
  addForumPost: (category: ForumCategory, title: string, body: string) => void;
  toggleForumLike: (postId: string) => void;
  addForumComment: (postId: string, text: string) => void;

  // V7 (QA 7.0): "When pressing connect on a professional, it becomes part
  // of the connected professionals with the same privileges" — mock
  // professionals are static seed data, so which ones the user has
  // connected to lives here instead.
  connectedProfessionalIds: string[];
  connectProfessional: (id: string) => void;
  disconnectProfessional: (id: string) => void;

  // V7 (QA 7.0): Professional UI — Explore reframes categories as job
  // postings for hiring the professional, gated by a unique-ID affiliation
  // with a business (mirrors the client<->professional code system).
  businessDirectory: BusinessDirectoryEntry[];
  affiliateWithBusiness: (id: string) => boolean;
  removeAffiliation: () => void;
  updateMyBusinessTier: (tier: string) => void;

  professionalTier: string;
  setProfessionalTier: (tier: string) => void;

  // V8 (QA 8.0): "as a place holder add a plus sign logo that increases the
  // tier by 1000 points" — added on top of the streak-derived total.
  bonusPoints: number;
  addBonusPoints: (amount: number) => void;

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

  clientCodes: ClientCode[];
  generateClientCode: (
    professionalId: string,
    professionalName: string,
    profile?: { clientName?: string; age?: number; sex?: Sex; heightCm?: number; weightKg?: number },
    professionalSubtype?: ProfessionalSubtype,
    professionalCertificationUrl?: string,
    professionalBio?: string,
    professionalPhone?: string,
    professionalWebsite?: string
  ) => string;
  redeemClientCode: (code: string) => boolean;

  professionalClients: ProfessionalClient[];
  addProfessionalClient: (
    name: string,
    profile?: { age?: number; sex?: Sex; heightCm?: number; weightKg?: number; prefix?: string }
  ) => string;
  removeProfessionalClient: (id: string) => void;
  updateProfessionalClientAccess: (
    id: string,
    access: Partial<ProfessionalClient["access"]>
  ) => void;
  assignProgramToClient: (clientId: string, programName: string) => void;
  assignFoodTemplateToClient: (clientId: string, templateName: string) => void;

  // V6 (QA 6.0): Professional UI — Calendar, Workout Template Builder,
  // per-client health notes, and a messaging board.
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeCalendarEvent: (id: string) => void;

  workoutTemplates: WorkoutTemplateAssignment[];
  addWorkoutTemplate: (t: Omit<WorkoutTemplateAssignment, "id" | "createdAt">) => void;
  updateWorkoutTemplate: (id: string, patch: Partial<Omit<WorkoutTemplateAssignment, "id" | "createdAt">>) => void;
  removeWorkoutTemplate: (id: string) => void;

  workoutTemplateFolders: WorkoutTemplateFolder[];
  addWorkoutTemplateFolder: (name: string, parentId?: string | null, color?: string) => void;
  renameWorkoutTemplateFolder: (id: string, name: string) => void;
  deleteWorkoutTemplateFolder: (id: string) => void;

  clientHealthNotes: Record<string, ClientHealthNote>;
  updateClientHealthNote: (clientId: string, patch: Partial<ClientHealthNote>) => void;

  professionalMessages: ProfessionalMessage[];
  sendProfessionalMessage: (
    clientId: string,
    from: "professional" | "client",
    text: string,
    extra?: { attachment?: string; voiceNoteSec?: number }
  ) => void;

  signOut: () => void;

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
    // V10 (QA 10.0): gym membership plans the business offers, editable
    // from Operations > Gym.
    membershipPlans: MembershipPlan[];
    // V10 (QA 10.0): "The ability to add/remove discounts in the market place."
    discounts: { id: string; label: string }[];
  };
  updateBusinessListing: (patch: Partial<AppState["businessListing"]>) => void;
  addMembershipPlan: (plan: Omit<MembershipPlan, "id">) => void;
  updateMembershipPlan: (id: string, patch: Partial<Omit<MembershipPlan, "id">>) => void;
  removeMembershipPlan: (id: string) => void;
  addDiscount: (label: string) => void;
  removeDiscount: (id: string) => void;

  // V4: businesses can list their own products/services in the marketplace.
  businessOfferings: BusinessOffering[];
  addBusinessOffering: (offering: Omit<BusinessOffering, "id">) => void;
  removeBusinessOffering: (id: string) => void;

  // V7 (QA 7.0): Business UI — Employees (affiliated professionals),
  // Classes (gym-type businesses) and a customer messaging board.
  businessEmployees: Record<string, BusinessEmployee[]>;
  removeBusinessEmployee: (businessId: string, professionalId: string) => void;

  businessClasses: BusinessClass[];
  addBusinessClass: (c: Omit<BusinessClass, "id">) => void;
  removeBusinessClass: (id: string) => void;

  businessMessages: BusinessMessage[];
  sendBusinessMessage: (customerId: string, from: "business" | "customer", text: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = "centium-state";

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
    localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(state));
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
  const [user, setUser] = usePersistentState<UserProfile>("user", defaultUser);

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

  const [foodLog, setFoodLog] = usePersistentState<FoodLogEntry[]>("foodLog", seedFoodLog());
  const [workoutLog, setWorkoutLog] = usePersistentState<WorkoutLogEntry[]>(
    "workoutLog",
    seedWorkoutLog()
  );
  const [workoutSessions, setWorkoutSessions] = usePersistentState<WorkoutSession[]>(
    "workoutSessions",
    []
  );
  const [personalRecords, setPersonalRecords] = usePersistentState<Record<string, number>>(
    "personalRecords",
    {}
  );

  const [pausedSessions, setPausedSessions] = usePersistentState<Record<string, PausedWorkoutSession>>(
    "pausedSessions",
    {}
  );
  const savePausedSession: AppState["savePausedSession"] = (routineId, session) =>
    setPausedSessions((prev) => ({ ...prev, [routineId]: session }));
  const clearPausedSession: AppState["clearPausedSession"] = (routineId) =>
    setPausedSessions((prev) => {
      if (!(routineId in prev)) return prev;
      const next = { ...prev };
      delete next[routineId];
      return next;
    });

  const [routineFolders, setRoutineFolders] = usePersistentState<RoutineFolder[]>(
    "routineFolders",
    defaultRoutineFolders
  );
  const [routines, setRoutines] = usePersistentState<Routine[]>("routines", seedRoutines());

  const [waterGoalMl, setWaterGoalState] = usePersistentState<number>("waterGoalMl", 2500);
  const [habits, setHabits] = usePersistentState<HabitItem[]>("habits", defaultHabits);
  const [streaks, setStreaks] = usePersistentState<Streak[]>("streaks", seedStreaks);

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

  const [customMeals, setCustomMeals] = usePersistentState<CustomMeal[]>("customMeals", []);

  const [journalFolders, setJournalFolders] = usePersistentState<JournalFolder[]>(
    "journalFolders",
    defaultJournalFolders
  );
  const [journalEntries, setJournalEntries] = usePersistentState<JournalEntry[]>(
    "journalEntries",
    []
  );

  const [bloodMarkers, setBloodMarkers] = usePersistentState<BloodMarker[]>(
    "bloodMarkers",
    bloodPanel.markers
  );

  const [selectedDate, setSelectedDate] = usePersistentState<string>("selectedDate", TODAY);

  // V10 (QA 10.0): "logging... metrics in a day that is not today should
  // add and log values pertaining to that mentioned day" — water is now
  // keyed by date instead of a single running total, so viewing a past day
  // via the Home date selector shows (and logs to) that day's own amount.
  const [waterByDate, setWaterByDate] = usePersistentState<Record<string, number>>("waterByDate", {
    [TODAY]: 1800,
  });
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
  const [professionalReviews, setProfessionalReviews] = usePersistentState<ProfessionalReview[]>(
    "professionalReviews",
    []
  );

  // V6 (QA 6.0): client signup now strictly requires a real, matching code —
  // seed one demo code so a fresh install is still testable without first
  // creating a professional account to generate one.
  const [clientCodes, setClientCodes] = usePersistentState<ClientCode[]>("clientCodes", [
    { code: "SOHA-DEMO", professionalId: "demo", professionalName: "Maya Haddad", createdAt: TODAY, redeemed: false },
  ]);

  const [connectedProfessionalIds, setConnectedProfessionalIds] = usePersistentState<string[]>(
    "connectedProfessionalIds",
    []
  );
  const connectProfessional: AppState["connectProfessional"] = (id) =>
    setConnectedProfessionalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  // V10 (QA 10.0): "a hired professional should have a remove professional
  // button... should prompt you to make sure you want to remove."
  const disconnectProfessional: AppState["disconnectProfessional"] = (id) =>
    setConnectedProfessionalIds((prev) => prev.filter((p) => p !== id));

  const [businessDirectory, setBusinessDirectory] = usePersistentState<BusinessDirectoryEntry[]>(
    "businessDirectory",
    []
  );
  const affiliateWithBusiness: AppState["affiliateWithBusiness"] = (id) => {
    const trimmed = id.trim().toUpperCase();
    const match = businessDirectory.find((b) => b.id.toUpperCase() === trimmed);
    if (!match) return false;
    // V7 (QA 7.0): a business's own tier caps how many professionals can
    // affiliate with it — same client-count-cap concept as the professional
    // tiers, just from the business's side.
    const tier = businessTiers.find((t) => t.id === match.tier) ?? businessTiers[0];
    const currentCount = businessEmployees[match.id]?.length ?? 0;
    if (tier.maxEmployees !== null && currentCount >= tier.maxEmployees && !businessEmployees[match.id]?.some((e) => e.professionalId === "me")) {
      return false;
    }
    setUser((prev) => ({ ...prev, affiliatedBusinessId: match.id, affiliatedBusinessName: match.businessName }));
    setBusinessEmployees((prev) => {
      const existing = prev[match.id] ?? [];
      if (existing.some((e) => e.professionalId === "me")) return prev;
      return {
        ...prev,
        [match.id]: [
          ...existing,
          { professionalId: "me", professionalName: user.firstName, professionalSubtype: user.professionalSubtype },
        ],
      };
    });
    return true;
  };
  const removeAffiliation: AppState["removeAffiliation"] = () => {
    if (user.affiliatedBusinessId) {
      const businessId = user.affiliatedBusinessId;
      setBusinessEmployees((prev) => ({
        ...prev,
        [businessId]: (prev[businessId] ?? []).filter((e) => e.professionalId !== "me"),
      }));
    }
    setUser((prev) => ({ ...prev, affiliatedBusinessId: undefined, affiliatedBusinessName: undefined }));
  };
  const updateMyBusinessTier: AppState["updateMyBusinessTier"] = (tier) => {
    if (!user.businessId) return;
    setBusinessDirectory((prev) => prev.map((b) => (b.id === user.businessId ? { ...b, tier } : b)));
  };

  const [professionalTier, setProfessionalTier] = usePersistentState<string>("professionalTier", "starter");

  const [bonusPoints, setBonusPoints] = usePersistentState<number>("bonusPoints", 0);
  const addBonusPoints: AppState["addBonusPoints"] = (amount) => setBonusPoints((prev) => prev + amount);

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
  const [businessListing, setBusinessListing] = usePersistentState("businessListing", {
    perk: "10% off with Centium",
    active: true,
    membersReached: 34,
    bio: "",
    location: "",
    membershipPlans: [
      { id: "mp1", name: "Monthly Membership", price: "$45", billing: "monthly", paymentType: "Card" },
      { id: "mp2", name: "Day Pass", price: "$8", billing: "daily", paymentType: "Cash" },
    ] as MembershipPlan[],
    discounts: [] as { id: string; label: string }[],
  });
  const addDiscount: AppState["addDiscount"] = (label) =>
    setBusinessListing((prev) => ({ ...prev, discounts: [...prev.discounts, { id: `disc${Date.now()}`, label }] }));
  const removeDiscount: AppState["removeDiscount"] = (id) =>
    setBusinessListing((prev) => ({ ...prev, discounts: prev.discounts.filter((d) => d.id !== id) }));
  const addMembershipPlan: AppState["addMembershipPlan"] = (plan) =>
    setBusinessListing((prev) => ({
      ...prev,
      membershipPlans: [...prev.membershipPlans, { ...plan, id: `mp${Date.now()}` }],
    }));
  const updateMembershipPlan: AppState["updateMembershipPlan"] = (id, patch) =>
    setBusinessListing((prev) => ({
      ...prev,
      membershipPlans: prev.membershipPlans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  const removeMembershipPlan: AppState["removeMembershipPlan"] = (id) =>
    setBusinessListing((prev) => ({ ...prev, membershipPlans: prev.membershipPlans.filter((p) => p.id !== id) }));
  const [businessOfferings, setBusinessOfferings] = usePersistentState<BusinessOffering[]>(
    "businessOfferings",
    []
  );
  const [professionalClients, setProfessionalClients] = usePersistentState<ProfessionalClient[]>(
    "professionalClients",
    mockProfessionalClients
  );

  const [calendarEvents, setCalendarEvents] = usePersistentState<CalendarEvent[]>("calendarEvents", []);
  const addCalendarEvent: AppState["addCalendarEvent"] = (event) =>
    setCalendarEvents((prev) => [...prev, { ...event, id: `cal-${Date.now()}-${prev.length}` }]);
  const updateCalendarEvent: AppState["updateCalendarEvent"] = (id, patch) =>
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeCalendarEvent: AppState["removeCalendarEvent"] = (id) =>
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));

  const [workoutTemplates, setWorkoutTemplates] = usePersistentState<WorkoutTemplateAssignment[]>(
    "workoutTemplates",
    []
  );
  // V10 (QA 10.0): "Templates Created for the assigned clients shows up in
  // their client UI in the routines tab. If professional add/removes
  // client from template, automatically do that as well in the client UI"
  // + "the ability to select a day to assign the workout to, it would also
  // appear at the assigned clients calendar."
  // This prototype has exactly one real account behind every mock
  // client/professional view (the "me" sentinel used elsewhere, e.g.
  // addProfessionalClient/businessEmployees) — so "the assigned client's"
  // Routines tab and Calendar are literally the current account's own
  // routines/calendarEvents. Assigning a template to any mock client
  // mirrors it into that one real Routine; unassigning removes it again.
  const syncTemplateToClientView = (template: WorkoutTemplateAssignment) => {
    setRoutines((prev) => {
      const existing = prev.find((r) => r.sourceTemplateId === template.id);
      if (template.assignedClientIds.length === 0) {
        return existing ? prev.filter((r) => r.sourceTemplateId !== template.id) : prev;
      }
      if (existing) {
        return prev.map((r) =>
          r.sourceTemplateId === template.id
            ? { ...r, name: template.name, exercises: template.exercises, coachNote: template.coachNote }
            : r
        );
      }
      return [
        ...prev,
        {
          id: `routine-${template.id}`,
          folderId: null,
          name: template.name,
          color: "#7D6BB5",
          estimatedDurationMin: 45,
          exercises: template.exercises,
          coachNote: template.coachNote,
          assignedByProfessional: true,
          sourceTemplateId: template.id,
        },
      ];
    });
    setCalendarEvents((prev) => {
      const withoutOld = prev.filter((e) => e.sourceTemplateId !== template.id);
      if (template.assignedClientIds.length === 0 || !template.assignedDay) return withoutOld;
      return [
        ...withoutOld,
        {
          id: `cal-tpl-${template.id}`,
          title: template.name,
          date: template.assignedDay,
          allDay: true,
          repeat: "none",
          sourceTemplateId: template.id,
        },
      ];
    });
  };

  const addWorkoutTemplate: AppState["addWorkoutTemplate"] = (t) => {
    const template: WorkoutTemplateAssignment = { ...t, id: `wt-${Date.now()}`, createdAt: TODAY };
    setWorkoutTemplates((prev) => [...prev, template]);
    syncTemplateToClientView(template);
  };
  const updateWorkoutTemplate: AppState["updateWorkoutTemplate"] = (id, patch) => {
    setWorkoutTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      const updated = next.find((t) => t.id === id);
      if (updated) syncTemplateToClientView(updated);
      return next;
    });
  };
  const removeWorkoutTemplate: AppState["removeWorkoutTemplate"] = (id) => {
    setWorkoutTemplates((prev) => prev.filter((t) => t.id !== id));
    setRoutines((prev) => prev.filter((r) => r.sourceTemplateId !== id));
    setCalendarEvents((prev) => prev.filter((e) => e.sourceTemplateId !== id));
  };

  const [workoutTemplateFolders, setWorkoutTemplateFolders] = usePersistentState<WorkoutTemplateFolder[]>(
    "workoutTemplateFolders",
    []
  );
  const addWorkoutTemplateFolder: AppState["addWorkoutTemplateFolder"] = (name, parentId = null, color) =>
    setWorkoutTemplateFolders((prev) => [...prev, { id: `wtf${Date.now()}`, name, parentId, color }]);
  const renameWorkoutTemplateFolder: AppState["renameWorkoutTemplateFolder"] = (id, name) =>
    setWorkoutTemplateFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  const deleteWorkoutTemplateFolder: AppState["deleteWorkoutTemplateFolder"] = (id) => {
    setWorkoutTemplateFolders((prev) =>
      prev.filter((f) => f.id !== id).map((f) => (f.parentId === id ? { ...f, parentId: null } : f))
    );
    setWorkoutTemplates((prev) => prev.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)));
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
  const updateFoodEntry: AppState["updateFoodEntry"] = (id, patch) =>
    setFoodLog((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeFoodEntry = (id: string) => setFoodLog((prev) => prev.filter((e) => e.id !== id));

  const logWorkout: AppState["logWorkout"] = (entry) => {
    // V10 (QA 10.0): "logging... workout... in a day that is not today
    // should add and log values pertaining to that mentioned day" — was
    // hardcoded to TODAY regardless of the Home date selector.
    setWorkoutLog((prev) => [
      ...prev,
      { ...entry, id: `w${Date.now()}${Math.random().toString(16).slice(2)}`, date: selectedDate },
    ]);
  };

  const saveWorkoutSession: AppState["saveWorkoutSession"] = (session) => {
    setWorkoutSessions((prev) => [
      ...prev,
      { ...session, id: `ws${Date.now()}${Math.random().toString(16).slice(2)}` },
    ]);

    // Auto-update estimated 1RMs for barbell/dumbbell/weighted-bodyweight
    // exercises from this session's heaviest completed set.
    setPersonalRecords((prev) => {
      const next = { ...prev };
      for (const ex of session.exercises) {
        const libEntry = exerciseLibrary.find((l) => l.name === ex.name);
        if (!libEntry || !ONE_RM_CLASSIFICATIONS.includes(libEntry.classification)) continue;
        const best = ex.sets
          .filter((s) => s.completed && s.weightKg > 0)
          .reduce((max, s) => Math.max(max, estimate1RM(s.weightKg, s.reps)), 0);
        if (best > 0 && best > (next[ex.name] ?? 0)) next[ex.name] = best;
      }
      return next;
    });
  };
  const setPersonalRecord = (exerciseName: string, kg: number) =>
    setPersonalRecords((prev) => ({ ...prev, [exerciseName]: kg }));

  const addRoutineFolder = (name: string, parentId: string | null = null, color?: string) =>
    setRoutineFolders((prev) => [...prev, { id: `rf${Date.now()}`, name, parentId, color }]);
  const renameRoutineFolder = (id: string, name: string) =>
    setRoutineFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  const deleteRoutineFolder = (id: string) => {
    // Cascade: subfolders of a deleted folder become top-level, and any
    // routines directly in it are unfiled — keeps things simple and never
    // silently deletes a routine.
    setRoutineFolders((prev) =>
      prev.filter((f) => f.id !== id).map((f) => (f.parentId === id ? { ...f, parentId: null } : f))
    );
    setRoutines((prev) => prev.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)));
  };

  const addRoutine: AppState["addRoutine"] = (routine) => {
    const id = `routine${Date.now()}${Math.random().toString(16).slice(2)}`;
    setRoutines((prev) => [...prev, { ...routine, id }]);
    return id;
  };
  const updateRoutine = (id: string, patch: Partial<Routine>) =>
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const deleteRoutine = (id: string) => setRoutines((prev) => prev.filter((r) => r.id !== id));

  const addWater = (ml: number) =>
    setWaterByDate((prev) => ({
      ...prev,
      [selectedDate]: Math.max(0, Math.min((prev[selectedDate] ?? 0) + ml, 5000)),
    }));
  const setWaterAmount = (ml: number) =>
    setWaterByDate((prev) => ({ ...prev, [selectedDate]: Math.max(0, Math.min(ml, 5000)) }));
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

  // V4: the four core streaks (logging/movement/workout/nutrition) are
  // derived from real activity instead of being manually incremented —
  // recomputed whenever the underlying logs change.
  const countConsecutiveDays = (dates: Set<string>, anchor: string): number => {
    let count = 0;
    let cursor = anchor;
    while (dates.has(cursor)) {
      count++;
      cursor = shiftDate(cursor, -1);
    }
    return count;
  };
  useEffect(() => {
    const foodDates = new Set(foodLog.map((e) => e.date));
    const workoutDates = new Set(workoutSessions.map((s) => s.date));
    const anyDates = new Set([...foodDates, ...workoutDates]);
    const loggingDays = countConsecutiveDays(anyDates, TODAY);
    const nutritionDays = countConsecutiveDays(foodDates, TODAY);
    const movementDays = countConsecutiveDays(workoutDates, TODAY);
    const workoutTotal = workoutSessions.length;
    setStreaks((prev) =>
      prev.map((s) => {
        if (!s.auto) return s;
        if (s.id === "s1") return { ...s, days: loggingDays };
        if (s.id === "s2") return { ...s, days: movementDays };
        if (s.id === "s3") return { ...s, days: workoutTotal };
        if (s.id === "s4") return { ...s, days: nutritionDays };
        return s;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodLog, workoutSessions]);

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
  // whatever day is currently selected on Home, not always TODAY. The
  // live "current weight" (used for BMI, widgets, etc.) still only updates
  // when logging for today, same as before.
  const [weightByDate, setWeightByDate] = usePersistentState<Record<string, number>>(
    "weightByDate",
    {}
  );
  const logWeightForToday: AppState["logWeightForToday"] = (value) => {
    setWeightByDate((prev) => ({ ...prev, [selectedDate]: value }));
    if (selectedDate === TODAY) updateMetricValue("weight", value);
    setWeightLoggedDate(selectedDate);
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

  const addCustomMeal: AppState["addCustomMeal"] = (title, items, mealType) =>
    setCustomMeals((prev) => [...prev, { id: `cm${Date.now()}`, title: title.trim(), items, mealType }]);
  // V10 (QA 10.0): "Creating a meal prep should also allow you to edit and delete it."
  const updateCustomMeal: AppState["updateCustomMeal"] = (id, title, items, mealType) =>
    setCustomMeals((prev) => prev.map((m) => (m.id === id ? { ...m, title: title.trim(), items, mealType } : m)));
  const removeCustomMeal = (id: string) => setCustomMeals((prev) => prev.filter((m) => m.id !== id));
  const logCustomMeal: AppState["logCustomMeal"] = (mealId, meal, date) => {
    const custom = customMeals.find((m) => m.id === mealId);
    if (!custom) return;
    setFoodLog((prev) => [
      ...prev,
      ...custom.items.map((item, i) => ({
        id: `f${Date.now()}${i}${Math.random().toString(16).slice(2)}`,
        foodId: item.food.id,
        food: item.food,
        quantity: item.quantity,
        unit: item.unit,
        meal,
        date,
        loggedVia: "quick" as const,
      })),
    ]);
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
        date: TODAY,
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

  const recordBiomarkers: AppState["recordBiomarkers"] = (entries) => {
    setBloodMarkers((prev) => {
      const next = [...prev];
      entries.forEach((entry) => {
        const idx = next.findIndex((m) => m.name.toLowerCase() === entry.name.toLowerCase());
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            value: entry.value,
            unit: entry.unit || next[idx].unit,
            history: [...next[idx].history, { date: TODAY, value: entry.value }],
          };
        } else {
          next.push({
            id: `bm${Date.now()}${Math.random().toString(16).slice(2)}`,
            name: entry.name,
            value: entry.value,
            unit: entry.unit,
            range: "—",
            status: "normal",
            history: [{ date: TODAY, value: entry.value }],
          });
        }
      });
      return next;
    });
  };

  const goToPrevDate = () => setSelectedDate((d) => shiftDate(d, -1));
  const goToNextDate = () => setSelectedDate((d) => shiftDate(d, 1));
  const goToToday = () => setSelectedDate(TODAY);
  const goToDate = (date: string) => setSelectedDate(date);

  const copyYesterdayFood = () => {
    const yesterday = shiftDate(selectedDate, -1);
    const yesterdaysEntries = foodLog.filter((e) => e.date === yesterday);
    if (yesterdaysEntries.length === 0) return;
    setFoodLog((prev) => [
      ...prev,
      ...yesterdaysEntries.map((e) => ({
        ...e,
        id: `f${Date.now()}${Math.random().toString(16).slice(2)}`,
        date: selectedDate,
      })),
    ]);
  };

  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  const addCustomFood: AppState["addCustomFood"] = (food) => {
    const custom: CustomFood = {
      ...food,
      id: `custom${Date.now()}${Math.random().toString(16).slice(2)}`,
      isCustom: true,
    };
    setCustomFoods((prev) => [...prev, custom]);
    return custom;
  };

  const [clientCustomFoods, setClientCustomFoods] = usePersistentState<Record<string, CustomFood[]>>(
    "clientCustomFoods",
    {}
  );
  const addClientCustomFood: AppState["addClientCustomFood"] = (clientId, food) => {
    const custom: CustomFood = {
      ...food,
      id: `custom${Date.now()}${Math.random().toString(16).slice(2)}`,
      isCustom: true,
    };
    setClientCustomFoods((prev) => ({ ...prev, [clientId]: [...(prev[clientId] ?? []), custom] }));
    return custom;
  };

  const addCustomExercise: AppState["addCustomExercise"] = (item) =>
    setCustomExercises((prev) =>
      prev.some((e) => e.name.toLowerCase() === item.name.toLowerCase()) ? prev : [...prev, item]
    );
  const updateCustomExercise: AppState["updateCustomExercise"] = (originalName, item) =>
    setCustomExercises((prev) =>
      prev.map((e) => (e.name.toLowerCase() === originalName.toLowerCase() ? item : e))
    );

  const submitProfessionalReview: AppState["submitProfessionalReview"] = (professionalId, rating, text) =>
    setProfessionalReviews((prev) => {
      const next = prev.filter((r) => r.professionalId !== professionalId);
      return [...next, { professionalId, rating, text, date: TODAY }];
    });

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

  const generateClientCode: AppState["generateClientCode"] = (
    professionalId,
    professionalName,
    profile,
    professionalSubtype,
    professionalCertificationUrl,
    professionalBio,
    professionalPhone,
    professionalWebsite
  ) => {
    let code = "";
    do {
      code = `SOHA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    } while (clientCodes.some((c) => c.code === code));
    setClientCodes((prev) => [
      ...prev,
      {
        code,
        professionalId,
        professionalName,
        professionalSubtype,
        professionalCertificationUrl,
        professionalBio,
        professionalPhone,
        professionalWebsite,
        createdAt: TODAY,
        redeemed: false,
        clientName: profile?.clientName,
        clientAge: profile?.age,
        clientSex: profile?.sex,
        clientHeightCm: profile?.heightCm,
        clientWeightKg: profile?.weightKg,
      },
    ]);
    return code;
  };

  const redeemClientCode: AppState["redeemClientCode"] = (code) => {
    // V6 (QA 6.0): onboarding can no longer continue on an unmatched code —
    // this must find a real match, not fall back to accepting anything typed.
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    const match = clientCodes.find((c) => c.code.toUpperCase() === trimmed);
    if (!match) return false;
    setClientCodes((prev) =>
      prev.map((c) => (c.code.toUpperCase() === trimmed ? { ...c, redeemed: true } : c))
    );
    setUser((prev) => ({
      ...prev,
      linkedProfessionalCode: match.code,
      linkedProfessionalName: match.professionalName,
      linkedProfessionalSubtype: match.professionalSubtype,
      linkedProfessionalCertificationUrl: match.professionalCertificationUrl,
      linkedProfessionalBio: match.professionalBio,
      linkedProfessionalPhone: match.professionalPhone,
      linkedProfessionalWebsite: match.professionalWebsite,
    }));
    return true;
  };

  const addProfessionalClient: AppState["addProfessionalClient"] = (name, profile) => {
    // V7 (QA 7.0): use the professional's real name/subtype so the client's
    // Professionals tab can show who they're actually linked to.
    const code = generateClientCode(
      "me",
      user.firstName || "Your professional",
      { ...profile, clientName: name },
      user.professionalSubtype,
      user.certificationUrl,
      user.professionalBio,
      user.professionalPhone,
      user.professionalWebsite
    );
    const id = `pc${Date.now()}${Math.random().toString(16).slice(2)}`;
    setProfessionalClients((prev) => [
      ...prev,
      {
        id,
        name,
        prefix: profile?.prefix,
        code,
        joinedAt: TODAY,
        activityLevel: "moderate",
        activityType: "both",
        age: profile?.age,
        sex: profile?.sex,
        heightCm: profile?.heightCm,
        weightKg: profile?.weightKg,
        access: {
          foodDiary: true,
          workoutActivity: true,
          weight: true,
          progress: true,
          healthMetrics: false,
        },
        lastWeightKg: 0,
        weightTrend: 0,
        lastCaloriesKcal: 0,
      },
    ]);
    return code;
  };
  const removeProfessionalClient = (id: string) =>
    setProfessionalClients((prev) => prev.filter((c) => c.id !== id));
  const updateProfessionalClientAccess = (id: string, access: Partial<ProfessionalClient["access"]>) =>
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, access: { ...c.access, ...access } } : c))
    );
  // V6 (QA 6.0): "The calendar app should update automatically when the
  // professional assigns a workout and/or food template for the client on
  // a specific day" — both assign actions also drop a same-day calendar
  // event.
  const assignProgramToClient = (clientId: string, programName: string) => {
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedProgramName: programName } : c))
    );
    const client = professionalClients.find((c) => c.id === clientId);
    addCalendarEvent({
      title: `Assigned "${programName}" to ${client?.name ?? "client"}`,
      date: TODAY,
      allDay: true,
      repeat: "none",
      invitees: client ? [client.name] : undefined,
    });
  };
  const assignFoodTemplateToClient = (clientId: string, templateName: string) => {
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedFoodTemplateName: templateName } : c))
    );
    const client = professionalClients.find((c) => c.id === clientId);
    addCalendarEvent({
      title: `Assigned "${templateName}" to ${client?.name ?? "client"}`,
      date: TODAY,
      allDay: true,
      repeat: "none",
      invitees: client ? [client.name] : undefined,
    });
  };

  const updateBusinessListing = (patch: Partial<AppState["businessListing"]>) =>
    setBusinessListing((prev) => ({ ...prev, ...patch }));

  const addBusinessOffering: AppState["addBusinessOffering"] = (offering) =>
    setBusinessOfferings((prev) => [...prev, { ...offering, id: `bo${Date.now()}` }]);
  const removeBusinessOffering = (id: string) =>
    setBusinessOfferings((prev) => prev.filter((o) => o.id !== id));

  const [businessEmployees, setBusinessEmployees] = usePersistentState<Record<string, BusinessEmployee[]>>(
    "businessEmployees",
    {}
  );
  const removeBusinessEmployee: AppState["removeBusinessEmployee"] = (businessId, professionalId) => {
    setBusinessEmployees((prev) => ({
      ...prev,
      [businessId]: (prev[businessId] ?? []).filter((e) => e.professionalId !== professionalId),
    }));
    // Same-session convenience: if the professional being removed is this
    // very session's own account, also clear its affiliation immediately.
    if (professionalId === "me" && user.affiliatedBusinessId === businessId) {
      setUser((prev) => ({ ...prev, affiliatedBusinessId: undefined, affiliatedBusinessName: undefined }));
    }
  };

  const [businessClasses, setBusinessClasses] = usePersistentState<BusinessClass[]>("businessClasses", []);
  const addBusinessClass: AppState["addBusinessClass"] = (c) =>
    setBusinessClasses((prev) => [...prev, { ...c, id: `bc${Date.now()}` }]);
  const removeBusinessClass = (id: string) => setBusinessClasses((prev) => prev.filter((c) => c.id !== id));

  const [businessMessages, setBusinessMessages] = usePersistentState<BusinessMessage[]>("businessMessages", []);
  const sendBusinessMessage: AppState["sendBusinessMessage"] = (customerId, from, text) =>
    setBusinessMessages((prev) => [
      ...prev,
      { id: `bmsg-${Date.now()}-${prev.length}`, customerId, from, text, at: new Date().toISOString() },
    ]);

  const signOut = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_KEY))
      .forEach((k) => localStorage.removeItem(k));
    setUser({ ...defaultUser });
  };

  const value = useMemo<AppState>(
    () => ({
      user,
      setUser,
      completeOnboarding,
      updateProfile,
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
      routineFolders,
      addRoutineFolder,
      renameRoutineFolder,
      deleteRoutineFolder,
      routines,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      water,
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
      customMeals,
      addCustomMeal,
      updateCustomMeal,
      removeCustomMeal,
      logCustomMeal,
      journalFolders,
      journalEntries,
      addJournalEntry,
      updateJournalEntry,
      removeJournalEntry,
      addJournalFolder,
      bloodMarkers,
      recordBiomarkers,
      selectedDate,
      goToPrevDate,
      goToNextDate,
      goToToday,
      goToDate,
      copyYesterdayFood,
      today: TODAY,
      colorTheme,
      setColorTheme,
      customFoods,
      addCustomFood,
      clientCustomFoods,
      addClientCustomFood,
      customExercises,
      addCustomExercise,
      updateCustomExercise,
      professionalReviews,
      submitProfessionalReview,
      forumPosts,
      addForumPost,
      toggleForumLike,
      addForumComment,
      connectedProfessionalIds,
      connectProfessional,
      disconnectProfessional,
      businessDirectory,
      affiliateWithBusiness,
      removeAffiliation,
      updateMyBusinessTier,
      professionalTier,
      setProfessionalTier,
      bonusPoints,
      addBonusPoints,
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
      clientCodes,
      generateClientCode,
      redeemClientCode,
      professionalClients,
      addProfessionalClient,
      removeProfessionalClient,
      updateProfessionalClientAccess,
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
      workoutTemplateFolders,
      addWorkoutTemplateFolder,
      renameWorkoutTemplateFolder,
      deleteWorkoutTemplateFolder,
      clientHealthNotes,
      updateClientHealthNote,
      professionalMessages,
      sendProfessionalMessage,
      signOut,
      businessListing,
      updateBusinessListing,
      addMembershipPlan,
      updateMembershipPlan,
      removeMembershipPlan,
      addDiscount,
      removeDiscount,
      businessOfferings,
      addBusinessOffering,
      removeBusinessOffering,
      businessEmployees,
      removeBusinessEmployee,
      businessClasses,
      addBusinessClass,
      removeBusinessClass,
      businessMessages,
      sendBusinessMessage,
    }),
    [
      user,
      theme,
      language,
      notificationPrefs,
      accessibility,
      foodLog,
      workoutLog,
      workoutSessions,
      personalRecords,
      pausedSessions,
      routineFolders,
      routines,
      water,
      waterGoalMl,
      habits,
      streaks,
      metricValues,
      weightLoggedDate,
      weightByDate,
      stepsGoal,
      healthIntegrationConnected,
      widgets,
      nutritionGoal,
      customMeals,
      journalFolders,
      journalEntries,
      bloodMarkers,
      selectedDate,
      colorTheme,
      customFoods,
      clientCustomFoods,
      customExercises,
      professionalReviews,
      forumPosts,
      connectedProfessionalIds,
      businessDirectory,
      professionalTier,
      bonusPoints,
      premiumPlan,
      gymPurchases,
      cart,
      clientCodes,
      professionalClients,
      calendarEvents,
      workoutTemplates,
      workoutTemplateFolders,
      clientHealthNotes,
      professionalMessages,
      businessListing,
      businessOfferings,
      businessEmployees,
      businessClasses,
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
