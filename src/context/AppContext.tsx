import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  UserProfile,
  FoodLogEntry,
  WorkoutLogEntry,
  Food,
  MealType,
  HabitItem,
  Streak,
  WidgetConfig,
  WidgetType,
  WidgetSize,
  NutritionGoal,
  WeightGoalType,
  MacroSplit,
  CustomMeal,
  RoutineFolder,
  Routine,
  WorkoutSession,
  JournalFolder,
  JournalEntry,
  BloodMarker,
  ExtractedBiomarker,
  ClientCode,
  ProfessionalClient,
  ColorTheme,
  CustomFood,
  HabitIconKey,
  BusinessOffering,
} from "../types";
import { mockFoods } from "../data/mockFoods";
import { defaultHabits, streaks as seedStreaks, bloodPanel } from "../data/mockHealthData";
import { todaysWorkout, workoutPrograms, exerciseLibrary } from "../data/mockWorkouts";
import { estimate1RM } from "../services/workout";
import { ONE_RM_CLASSIFICATIONS } from "../types";
import { mockProfessionalClients } from "../data/mockProfessionalClients";
import { suggestNutritionGoal, normalizeMacroSplit } from "../services/nutrition";

const TODAY = "2026-08-20";

const defaultUser: UserProfile = {
  id: "u1",
  firstName: "Abdallah",
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

const defaultWidgets: WidgetConfig[] = [
  { id: "w-steps", type: "steps", size: "small", visible: true },
  { id: "w-weight", type: "weight", size: "small", visible: true },
  { id: "w-water", type: "water", size: "large", visible: true },
  { id: "w-sleep", type: "sleep", size: "small", visible: true },
  { id: "w-nutrition", type: "nutrition", size: "large", visible: true },
  { id: "w-workout", type: "workout", size: "small", visible: true },
];

/** Light goal-based reordering: nudge the widgets most relevant to the
 * user's selected goals toward the top of the board. Still fully editable
 * afterward — this only sets a sensible starting layout. */
function widgetsForGoals(goals: UserProfile["goals"]): WidgetConfig[] {
  const board = defaultWidgets.map((w) => ({ ...w }));
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
    color: ["#1B6B52", "#E97452", "#4C8FD1", "#9C4F7C"][i % 4],
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

  foodLog: FoodLogEntry[];
  addFoodEntry: (entry: Omit<FoodLogEntry, "id" | "date">) => void;
  // V4: logged foods are editable (quantity/unit) and removable.
  updateFoodEntry: (id: string, patch: Partial<Pick<FoodLogEntry, "quantity" | "unit" | "meal">>) => void;
  removeFoodEntry: (id: string) => void;

  workoutLog: WorkoutLogEntry[];
  logWorkout: (entry: Omit<WorkoutLogEntry, "id" | "date">) => void;

  workoutSessions: WorkoutSession[];
  saveWorkoutSession: (session: Omit<WorkoutSession, "id">) => void;
  updateWorkoutSessionNotes: (id: string, notes: string) => void;

  // V4: estimated 1RM per exercise name (barbell/dumbbell/weighted-bodyweight
  // only) — auto-updated from logged sets, editable from History/Metrics.
  personalRecords: Record<string, number>;
  setPersonalRecord: (exerciseName: string, kg: number) => void;

  routineFolders: RoutineFolder[];
  addRoutineFolder: (name: string, parentId?: string | null) => void;
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
  addStreak: (label: string, goalDays: number) => void;
  removeStreak: (id: string) => void;

  metricValues: { weight: number; bodyFat: number; steps: number; sleepHours: number; caloriesBurned: number };
  updateMetricValue: (
    type: "weight" | "bodyFat" | "steps" | "sleepHours" | "caloriesBurned",
    value: number
  ) => void;

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
  addCustomMeal: (title: string, items: CustomMeal["items"]) => void;
  removeCustomMeal: (id: string) => void;
  logCustomMeal: (mealId: string, meal: MealType, date: string) => void;

  journalFolders: JournalFolder[];
  journalEntries: JournalEntry[];
  addJournalEntry: (folderId: string, text: string) => void;
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

  clientCodes: ClientCode[];
  generateClientCode: (professionalId: string, professionalName: string) => string;
  redeemClientCode: (code: string) => boolean;

  professionalClients: ProfessionalClient[];
  addProfessionalClient: (name: string) => string;
  removeProfessionalClient: (id: string) => void;
  updateProfessionalClientAccess: (
    id: string,
    access: Partial<ProfessionalClient["access"]>
  ) => void;
  assignProgramToClient: (clientId: string, programName: string) => void;
  assignFoodTemplateToClient: (clientId: string, templateName: string) => void;

  signOut: () => void;

  businessListing: { perk: string; active: boolean; membersReached: number };
  updateBusinessListing: (patch: Partial<AppState["businessListing"]>) => void;

  // V4: businesses can list their own products/services in the marketplace.
  businessOfferings: BusinessOffering[];
  addBusinessOffering: (offering: Omit<BusinessOffering, "id">) => void;
  removeBusinessOffering: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = "sohati-v4-state";

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
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

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

  const [routineFolders, setRoutineFolders] = usePersistentState<RoutineFolder[]>(
    "routineFolders",
    defaultRoutineFolders
  );
  const [routines, setRoutines] = usePersistentState<Routine[]>("routines", seedRoutines());

  const [water, setWater] = usePersistentState<number>("water", 1800);
  const [waterGoalMl, setWaterGoalState] = usePersistentState<number>("waterGoalMl", 2500);
  const [habits, setHabits] = usePersistentState<HabitItem[]>("habits", defaultHabits);
  const [streaks, setStreaks] = usePersistentState<Streak[]>("streaks", seedStreaks);

  const [metricValues, setMetricValues] = usePersistentState("metricValues", {
    weight: 106.4,
    bodyFat: 27.4,
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

  const [colorTheme, setColorThemeState] = usePersistentState<ColorTheme>("colorTheme", "sohati");
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", colorTheme);
  }, [colorTheme]);

  const [customFoods, setCustomFoods] = usePersistentState<CustomFood[]>("customFoods", []);

  const [clientCodes, setClientCodes] = usePersistentState<ClientCode[]>("clientCodes", []);
  const [businessListing, setBusinessListing] = usePersistentState("businessListing", {
    perk: "10% off with Sohati",
    active: true,
    membersReached: 34,
  });
  const [businessOfferings, setBusinessOfferings] = usePersistentState<BusinessOffering[]>(
    "businessOfferings",
    []
  );
  const [professionalClients, setProfessionalClients] = usePersistentState<ProfessionalClient[]>(
    "professionalClients",
    mockProfessionalClients
  );

  const completeOnboarding = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...profile, onboarded: true };
      setWidgets(widgetsForGoals(next.goals));
      return next;
    });
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
    setWorkoutLog((prev) => [
      ...prev,
      { ...entry, id: `w${Date.now()}${Math.random().toString(16).slice(2)}`, date: TODAY },
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
  const updateWorkoutSessionNotes = (id: string, notes: string) =>
    setWorkoutSessions((prev) => prev.map((s) => (s.id === id ? { ...s, notes } : s)));

  const addRoutineFolder = (name: string, parentId: string | null = null) =>
    setRoutineFolders((prev) => [...prev, { id: `rf${Date.now()}`, name, parentId }]);
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

  const addWater = (ml: number) => setWater((prev) => Math.max(0, Math.min(prev + ml, 5000)));
  const setWaterAmount = (ml: number) => setWater(Math.max(0, Math.min(ml, 5000)));
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
  const addStreak = (label: string, goalDays: number) =>
    setStreaks((prev) => [...prev, { id: `s${Date.now()}`, label, days: 0, goalDays }]);
  const removeStreak = (id: string) => setStreaks((prev) => prev.filter((s) => s.id !== id));

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
      return { ...prev, weightGoal, weeklyRateKg, targetCalories: suggested.targetCalories };
    });
  const setMacroSplit = (split: MacroSplit) =>
    setNutritionGoalState((prev) => ({ ...prev, macroSplit: normalizeMacroSplit(split) }));

  const addCustomMeal: AppState["addCustomMeal"] = (title, items) =>
    setCustomMeals((prev) => [...prev, { id: `cm${Date.now()}`, title: title.trim(), items }]);
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

  const addJournalEntry = (folderId: string, text: string) => {
    const now = new Date();
    setJournalEntries((prev) => [
      ...prev,
      {
        id: `j${Date.now()}${Math.random().toString(16).slice(2)}`,
        folderId,
        text,
        date: TODAY,
        createdAt: now.toISOString(),
      },
    ]);
  };
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

  const generateClientCode: AppState["generateClientCode"] = (professionalId, professionalName) => {
    let code = "";
    do {
      code = `SOHA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    } while (clientCodes.some((c) => c.code === code));
    setClientCodes((prev) => [
      ...prev,
      { code, professionalId, professionalName, createdAt: TODAY, redeemed: false },
    ]);
    return code;
  };

  const redeemClientCode: AppState["redeemClientCode"] = (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    const match = clientCodes.find((c) => c.code.toUpperCase() === trimmed);
    if (match) {
      setClientCodes((prev) =>
        prev.map((c) => (c.code.toUpperCase() === trimmed ? { ...c, redeemed: true } : c))
      );
      setUser((prev) => ({
        ...prev,
        linkedProfessionalCode: match.code,
        linkedProfessionalName: match.professionalName,
      }));
      return true;
    }
    // Prototype fallback: no matching code was ever generated in this
    // session (there's no real second party to have generated one), so we
    // still accept a non-empty code the user entered rather than blocking
    // onboarding entirely.
    setUser((prev) => ({ ...prev, linkedProfessionalCode: trimmed }));
    return true;
  };

  const addProfessionalClient: AppState["addProfessionalClient"] = (name) => {
    const code = generateClientCode("me", "You");
    const id = `pc${Date.now()}${Math.random().toString(16).slice(2)}`;
    setProfessionalClients((prev) => [
      ...prev,
      {
        id,
        name,
        code,
        joinedAt: TODAY,
        activityLevel: "moderate",
        activityType: "both",
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
  const assignProgramToClient = (clientId: string, programName: string) =>
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedProgramName: programName } : c))
    );
  const assignFoodTemplateToClient = (clientId: string, templateName: string) =>
    setProfessionalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, assignedFoodTemplateName: templateName } : c))
    );

  const updateBusinessListing = (patch: Partial<AppState["businessListing"]>) =>
    setBusinessListing((prev) => ({ ...prev, ...patch }));

  const addBusinessOffering: AppState["addBusinessOffering"] = (offering) =>
    setBusinessOfferings((prev) => [...prev, { ...offering, id: `bo${Date.now()}` }]);
  const removeBusinessOffering = (id: string) =>
    setBusinessOfferings((prev) => prev.filter((o) => o.id !== id));

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
      foodLog,
      addFoodEntry,
      updateFoodEntry,
      removeFoodEntry,
      workoutLog,
      logWorkout,
      workoutSessions,
      saveWorkoutSession,
      updateWorkoutSessionNotes,
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
      removeCustomMeal,
      logCustomMeal,
      journalFolders,
      journalEntries,
      addJournalEntry,
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
      clientCodes,
      generateClientCode,
      redeemClientCode,
      professionalClients,
      addProfessionalClient,
      removeProfessionalClient,
      updateProfessionalClientAccess,
      assignProgramToClient,
      assignFoodTemplateToClient,
      signOut,
      businessListing,
      updateBusinessListing,
      businessOfferings,
      addBusinessOffering,
      removeBusinessOffering,
    }),
    [
      user,
      theme,
      foodLog,
      workoutLog,
      workoutSessions,
      personalRecords,
      routineFolders,
      routines,
      water,
      waterGoalMl,
      habits,
      streaks,
      metricValues,
      widgets,
      nutritionGoal,
      customMeals,
      journalFolders,
      journalEntries,
      bloodMarkers,
      selectedDate,
      colorTheme,
      customFoods,
      clientCodes,
      professionalClients,
      businessListing,
      businessOfferings,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
