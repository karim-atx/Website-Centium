import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  UserProfile,
  FoodLogEntry,
  WorkoutLogEntry,
  Food,
  MealType,
  HabitItem,
} from "../types";
import { mockFoods } from "../data/mockFoods";
import { defaultHabits } from "../data/mockHealthData";
import { todaysWorkout } from "../data/mockWorkouts";

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
};

function seedFoodLog(): FoodLogEntry[] {
  const byName = (name: string) => mockFoods.find((f) => f.name === name)!;
  const entry = (
    food: Food,
    quantity: number,
    meal: MealType,
    id: string
  ): FoodLogEntry => ({ id, foodId: food.id, food, quantity, meal, date: TODAY });

  return [
    entry(byName("Manoushe Zaatar"), 1, "breakfast", "seed1"),
    entry(byName("Labneh"), 1, "breakfast", "seed2"),
    entry(byName("Coffee"), 1, "breakfast", "seed3"),
    entry(byName("Chicken Shawarma"), 1, "lunch", "seed4"),
    entry(byName("Banana"), 1, "snack", "seed5"),
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

interface AppState {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  foodLog: FoodLogEntry[];
  addFoodEntry: (entry: Omit<FoodLogEntry, "id" | "date">) => void;
  workoutLog: WorkoutLogEntry[];
  logWorkout: (entry: Omit<WorkoutLogEntry, "id" | "date">) => void;
  water: number;
  addWater: (ml: number) => void;
  habits: HabitItem[];
  toggleHabit: (id: string) => void;
  today: string;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = "sohati-prototype-state-v1";

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => loadPersisted(key, initial));
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(state));
  }, [key, state]);
  return [state, setState] as const;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = usePersistentState<UserProfile>("user", defaultUser);
  const [foodLog, setFoodLog] = usePersistentState<FoodLogEntry[]>("foodLog", seedFoodLog());
  const [workoutLog, setWorkoutLog] = usePersistentState<WorkoutLogEntry[]>(
    "workoutLog",
    seedWorkoutLog()
  );
  const [water, setWater] = usePersistentState<number>("water", 1800);
  const [habits, setHabits] = usePersistentState<HabitItem[]>("habits", defaultHabits);

  const completeOnboarding = (profile: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...profile, onboarded: true }));
  };

  const addFoodEntry: AppState["addFoodEntry"] = (entry) => {
    setFoodLog((prev) => [
      ...prev,
      { ...entry, id: `f${Date.now()}${Math.random().toString(16).slice(2)}`, date: TODAY },
    ]);
  };

  const logWorkout: AppState["logWorkout"] = (entry) => {
    setWorkoutLog((prev) => [
      ...prev,
      { ...entry, id: `w${Date.now()}${Math.random().toString(16).slice(2)}`, date: TODAY },
    ]);
  };

  const addWater = (ml: number) => setWater((prev) => Math.min(prev + ml, 4000));

  const toggleHabit = (id: string) =>
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h)));

  const value = useMemo<AppState>(
    () => ({
      user,
      setUser,
      completeOnboarding,
      foodLog,
      addFoodEntry,
      workoutLog,
      logWorkout,
      water,
      addWater,
      habits,
      toggleHabit,
      today: TODAY,
    }),
    [user, foodLog, workoutLog, water, habits]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
