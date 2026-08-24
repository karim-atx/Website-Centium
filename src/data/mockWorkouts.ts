import type { WorkoutTemplate, Exercise, ExerciseClassification, MuscleGroup } from "../types";

let exId = 0;
const ex = (partial: Omit<Exercise, "id">): Exercise => ({
  id: `ex${exId++}`,
  ...partial,
});

export const todaysWorkout: WorkoutTemplate = {
  id: "w-today",
  name: "Upper Body",
  category: "Strength",
  description: "Push-focused upper body session",
  durationMin: 52,
  level: "intermediate",
  exercises: [
    ex({ name: "Bench Press", sets: 4, reps: 8, weightKg: 80, category: "chest" }),
    ex({ name: "Lat Pulldown", sets: 3, reps: 10, weightKg: 65, category: "back" }),
    ex({ name: "Shoulder Press", sets: 3, reps: 10, weightKg: 22.5, category: "shoulders" }),
    ex({ name: "Bicep Curl", sets: 3, reps: 12, weightKg: 14, category: "arms" }),
  ],
};

export const workoutPrograms: WorkoutTemplate[] = [
  {
    id: "p1",
    name: "Beginner Full Body",
    category: "full_body",
    description: "3x/week, all major muscle groups, great starting point",
    durationMin: 45,
    level: "beginner",
    exercises: [
      ex({ name: "Goblet Squat", sets: 3, reps: 12, weightKg: 16, category: "legs" }),
      ex({ name: "Push Up", sets: 3, reps: 10, weightKg: 0, category: "chest" }),
      ex({ name: "Seated Row", sets: 3, reps: 12, weightKg: 30, category: "back" }),
    ],
  },
  {
    id: "p2",
    name: "Upper / Lower",
    category: "full_body",
    description: "4x/week split for steady strength gains",
    durationMin: 55,
    level: "intermediate",
    exercises: [
      ex({ name: "Deadlift", sets: 4, reps: 6, weightKg: 100, category: "back" }),
      ex({ name: "Overhead Press", sets: 3, reps: 8, weightKg: 35, category: "shoulders" }),
    ],
  },
  {
    id: "p3",
    name: "Push Pull Legs",
    category: "full_body",
    description: "6-day high-frequency split for experienced lifters",
    durationMin: 60,
    level: "advanced",
    exercises: [
      ex({ name: "Incline Bench", sets: 4, reps: 8, weightKg: 60, category: "chest" }),
      ex({ name: "Barbell Row", sets: 4, reps: 8, weightKg: 70, category: "back" }),
      ex({ name: "Leg Press", sets: 4, reps: 10, weightKg: 140, category: "legs" }),
    ],
  },
  {
    id: "p4",
    name: "Strength Foundations",
    category: "full_body",
    description: "Low reps, heavy compound lifts",
    durationMin: 50,
    level: "intermediate",
    exercises: [
      ex({ name: "Back Squat", sets: 5, reps: 5, weightKg: 90, category: "legs" }),
      ex({ name: "Bench Press", sets: 5, reps: 5, weightKg: 75, category: "chest" }),
    ],
  },
  {
    id: "p5",
    name: "Hypertrophy Builder",
    category: "full_body",
    description: "Higher volume for muscle growth",
    durationMin: 65,
    level: "intermediate",
    exercises: [
      ex({ name: "Dumbbell Fly", sets: 3, reps: 14, weightKg: 12, category: "chest" }),
      ex({ name: "Cable Row", sets: 4, reps: 12, weightKg: 45, category: "back" }),
    ],
  },
  {
    id: "p6",
    name: "Runner's Program",
    category: "cardio",
    description: "Base building + interval runs",
    durationMin: 40,
    level: "beginner",
    exercises: [
      ex({ name: "Easy Run", sets: 1, reps: 1, weightKg: 0, category: "cardio" }),
      ex({ name: "Interval Sprints", sets: 6, reps: 1, weightKg: 0, category: "cardio" }),
    ],
  },
];

export const previousWorkouts = [
  { id: "pw1", name: "Leg Day", date: "Aug 18", durationMin: 48, exerciseCount: 5 },
  { id: "pw2", name: "Push Day", date: "Aug 16", durationMin: 55, exerciseCount: 4 },
  { id: "pw3", name: "Pull Day", date: "Aug 14", durationMin: 50, exerciseCount: 5 },
  { id: "pw4", name: "Full Body", date: "Aug 12", durationMin: 40, exerciseCount: 6 },
];

export const workoutCategories = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "full_body", label: "Full Body" },
  { id: "cardio", label: "Cardio" },
] as const;

export type ExerciseCategory = (typeof workoutCategories)[number]["id"];

// A searchable/browsable exercise library — the Create Routine flow's
// "search for exercise" input and library popup both read from this.
// `classification` drives which exercises track an estimated 1RM (barbell/
// dumbbell/weighted-bodyweight) per QA App 3.0.
// V6 (QA 6.0): `muscleGroups` added alongside the older `category` (kept
// for the exercise-library icon lookup, untouched) so the new Exercise
// Database tab can filter/highlight by the split bicep/tricep/quads/
// hamstrings taxonomy — arms/legs exercises reclassified per-movement.
export const exerciseLibrary: {
  name: string;
  category: ExerciseCategory;
  classification: ExerciseClassification;
  muscleGroups: MuscleGroup[];
}[] = [
  { name: "Bench Press", category: "chest", classification: "barbell", muscleGroups: ["chest"] },
  { name: "Incline Bench", category: "chest", classification: "barbell", muscleGroups: ["chest"] },
  { name: "Push Up", category: "chest", classification: "reps_only", muscleGroups: ["chest"] },
  { name: "Dumbbell Fly", category: "chest", classification: "dumbbell", muscleGroups: ["chest"] },
  { name: "Cable Crossover", category: "chest", classification: "machine_other", muscleGroups: ["chest"] },
  { name: "Dips", category: "chest", classification: "weighted_bodyweight", muscleGroups: ["chest"] },

  { name: "Deadlift", category: "back", classification: "barbell", muscleGroups: ["back"] },
  { name: "Barbell Row", category: "back", classification: "barbell", muscleGroups: ["back"] },
  { name: "Lat Pulldown", category: "back", classification: "machine_other", muscleGroups: ["back"] },
  { name: "Seated Row", category: "back", classification: "machine_other", muscleGroups: ["back"] },
  { name: "Cable Row", category: "back", classification: "machine_other", muscleGroups: ["back"] },
  { name: "Pull Up", category: "back", classification: "weighted_bodyweight", muscleGroups: ["back"] },

  { name: "Overhead Press", category: "shoulders", classification: "barbell", muscleGroups: ["shoulders"] },
  { name: "Shoulder Press", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"] },
  { name: "Lateral Raise", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"] },
  { name: "Front Raise", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"] },
  { name: "Face Pull", category: "shoulders", classification: "machine_other", muscleGroups: ["shoulders"] },

  { name: "Bicep Curl", category: "arms", classification: "dumbbell", muscleGroups: ["bicep"] },
  { name: "Hammer Curl", category: "arms", classification: "dumbbell", muscleGroups: ["bicep"] },
  { name: "Tricep Pushdown", category: "arms", classification: "machine_other", muscleGroups: ["tricep"] },
  { name: "Skull Crusher", category: "arms", classification: "barbell", muscleGroups: ["tricep"] },
  { name: "Preacher Curl", category: "arms", classification: "barbell", muscleGroups: ["bicep"] },

  { name: "Back Squat", category: "legs", classification: "barbell", muscleGroups: ["quads"] },
  { name: "Goblet Squat", category: "legs", classification: "dumbbell", muscleGroups: ["quads"] },
  { name: "Leg Press", category: "legs", classification: "machine_other", muscleGroups: ["quads"] },
  { name: "Romanian Deadlift", category: "legs", classification: "barbell", muscleGroups: ["hamstrings"] },
  { name: "Walking Lunge", category: "legs", classification: "dumbbell", muscleGroups: ["quads"] },
  { name: "Calf Raise", category: "legs", classification: "machine_other", muscleGroups: ["quads"] },

  { name: "Plank", category: "core", classification: "duration", muscleGroups: ["core"] },
  { name: "Hanging Leg Raise", category: "core", classification: "reps_only", muscleGroups: ["core"] },
  { name: "Cable Woodchop", category: "core", classification: "machine_other", muscleGroups: ["core"] },
  { name: "Ab Wheel Rollout", category: "core", classification: "reps_only", muscleGroups: ["core"] },

  { name: "Kettlebell Swing", category: "full_body", classification: "dumbbell", muscleGroups: ["full_body"] },
  { name: "Clean and Press", category: "full_body", classification: "barbell", muscleGroups: ["full_body"] },
  { name: "Burpee", category: "full_body", classification: "reps_only", muscleGroups: ["full_body"] },

  { name: "Easy Run", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Interval Sprints", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Rowing Machine", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Stair Climber", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Cycling", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
];
