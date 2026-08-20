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
}

export interface HabitItem {
  id: string;
  label: string;
  emoji: string;
  done: boolean;
}

export interface Streak {
  id: string;
  label: string;
  emoji: string;
  days: number;
  goalDays: number;
}
