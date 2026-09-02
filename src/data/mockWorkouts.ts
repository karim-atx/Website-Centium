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

// V8 (QA 8.0): "Have Previous workouts expandable/collapsible" — each entry
// now carries its exercise names so expanding actually reveals something.
export const previousWorkouts = [
  {
    id: "pw1",
    name: "Leg Day",
    date: "Aug 18",
    durationMin: 48,
    exerciseCount: 5,
    exercises: ["Back Squat", "Romanian Deadlift", "Leg Press", "Walking Lunges", "Calf Raise"],
  },
  {
    id: "pw2",
    name: "Push Day",
    date: "Aug 16",
    durationMin: 55,
    exerciseCount: 4,
    exercises: ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Tricep Pushdown"],
  },
  {
    id: "pw3",
    name: "Pull Day",
    date: "Aug 14",
    durationMin: 50,
    exerciseCount: 5,
    exercises: ["Deadlift", "Pull-Up", "Barbell Row", "Face Pull", "Barbell Curl"],
  },
  {
    id: "pw4",
    name: "Full Body",
    date: "Aug 12",
    durationMin: 40,
    exerciseCount: 6,
    exercises: ["Goblet Squat", "Push-Up", "Dumbbell Row", "Plank", "Lunges", "Shoulder Press"],
  },
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
// V10 (QA 10.0): "reanalyze all preinserted exercises to include multiple
// muscle groups if the exercise is know to involve multiple muscle groups"
// — `muscleGroups` stays the primary mover(s) (used for filtering, per QA:
// "when filtering by muscle group, only go with the main muscle group
// selection"), `secondaryMuscleGroups` records real secondary movers.
// Also: "Populate some exercises for glutes" — new glutes-primary entries
// below, plus glutes added as a secondary mover on the relevant lower-body
// lifts that already existed.
export const exerciseLibrary: {
  name: string;
  category: ExerciseCategory;
  classification: ExerciseClassification;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups?: MuscleGroup[];
}[] = [
  { name: "Bench Press", category: "chest", classification: "barbell", muscleGroups: ["chest"], secondaryMuscleGroups: ["shoulders", "tricep"] },
  { name: "Incline Bench", category: "chest", classification: "barbell", muscleGroups: ["chest"], secondaryMuscleGroups: ["shoulders", "tricep"] },
  { name: "Push Up", category: "chest", classification: "reps_only", muscleGroups: ["chest"], secondaryMuscleGroups: ["shoulders", "tricep"] },
  { name: "Dumbbell Fly", category: "chest", classification: "dumbbell", muscleGroups: ["chest"], secondaryMuscleGroups: ["shoulders"] },
  { name: "Cable Crossover", category: "chest", classification: "machine_other", muscleGroups: ["chest"], secondaryMuscleGroups: ["shoulders"] },
  { name: "Dips", category: "chest", classification: "weighted_bodyweight", muscleGroups: ["chest"], secondaryMuscleGroups: ["tricep", "shoulders"] },

  { name: "Deadlift", category: "back", classification: "barbell", muscleGroups: ["back"], secondaryMuscleGroups: ["hamstrings", "glutes", "forearms"] },
  { name: "Barbell Row", category: "back", classification: "barbell", muscleGroups: ["back"], secondaryMuscleGroups: ["bicep", "forearms"] },
  { name: "Lat Pulldown", category: "back", classification: "machine_other", muscleGroups: ["back"], secondaryMuscleGroups: ["bicep"] },
  { name: "Seated Row", category: "back", classification: "machine_other", muscleGroups: ["back"], secondaryMuscleGroups: ["bicep"] },
  { name: "Cable Row", category: "back", classification: "machine_other", muscleGroups: ["back"], secondaryMuscleGroups: ["bicep"] },
  { name: "Pull Up", category: "back", classification: "weighted_bodyweight", muscleGroups: ["back"], secondaryMuscleGroups: ["bicep", "forearms"] },

  { name: "Overhead Press", category: "shoulders", classification: "barbell", muscleGroups: ["shoulders"], secondaryMuscleGroups: ["tricep"] },
  { name: "Shoulder Press", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"], secondaryMuscleGroups: ["tricep"] },
  { name: "Lateral Raise", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"] },
  { name: "Front Raise", category: "shoulders", classification: "dumbbell", muscleGroups: ["shoulders"] },
  { name: "Face Pull", category: "shoulders", classification: "machine_other", muscleGroups: ["shoulders"], secondaryMuscleGroups: ["back"] },

  { name: "Bicep Curl", category: "arms", classification: "dumbbell", muscleGroups: ["bicep"] },
  { name: "Hammer Curl", category: "arms", classification: "dumbbell", muscleGroups: ["bicep"] },
  { name: "Tricep Pushdown", category: "arms", classification: "machine_other", muscleGroups: ["tricep"] },
  { name: "Skull Crusher", category: "arms", classification: "barbell", muscleGroups: ["tricep"] },
  { name: "Preacher Curl", category: "arms", classification: "barbell", muscleGroups: ["bicep"] },

  { name: "Back Squat", category: "legs", classification: "barbell", muscleGroups: ["quads"], secondaryMuscleGroups: ["glutes", "hamstrings", "calves"] },
  { name: "Goblet Squat", category: "legs", classification: "dumbbell", muscleGroups: ["quads"], secondaryMuscleGroups: ["glutes"] },
  { name: "Leg Press", category: "legs", classification: "machine_other", muscleGroups: ["quads"], secondaryMuscleGroups: ["glutes"] },
  { name: "Romanian Deadlift", category: "legs", classification: "barbell", muscleGroups: ["hamstrings"], secondaryMuscleGroups: ["glutes", "back"] },
  { name: "Walking Lunge", category: "legs", classification: "dumbbell", muscleGroups: ["quads"], secondaryMuscleGroups: ["glutes"] },
  // Design refinement §6.5: "Calf Raise moves from quads to calves — it is
  // the one calf movement currently filed under quads."
  { name: "Calf Raise", category: "legs", classification: "machine_other", muscleGroups: ["calves"] },

  // V10 (QA 10.0): new glutes-primary exercises.
  { name: "Hip Thrust", category: "legs", classification: "barbell", muscleGroups: ["glutes"], secondaryMuscleGroups: ["hamstrings"] },
  { name: "Glute Bridge", category: "legs", classification: "weighted_bodyweight", muscleGroups: ["glutes"], secondaryMuscleGroups: ["hamstrings"] },
  { name: "Cable Kickback", category: "legs", classification: "machine_other", muscleGroups: ["glutes"] },
  { name: "Hip Abduction Machine", category: "legs", classification: "machine_other", muscleGroups: ["glutes"] },
  { name: "Bulgarian Split Squat", category: "legs", classification: "dumbbell", muscleGroups: ["glutes"], secondaryMuscleGroups: ["quads", "hamstrings"] },

  // Design refinement §6.5: new calves/forearms entries — two of the
  // most-trained groups had nowhere to live.
  { name: "Standing Calf Raise", category: "legs", classification: "machine_other", muscleGroups: ["calves"] },
  { name: "Seated Calf Raise", category: "legs", classification: "machine_other", muscleGroups: ["calves"] },
  { name: "Jump Rope", category: "cardio", classification: "cardio", muscleGroups: ["calves"] },
  { name: "Wrist Curl", category: "arms", classification: "dumbbell", muscleGroups: ["forearms"] },
  { name: "Reverse Wrist Curl", category: "arms", classification: "dumbbell", muscleGroups: ["forearms"] },
  { name: "Farmer's Carry", category: "full_body", classification: "dumbbell", muscleGroups: ["forearms"], secondaryMuscleGroups: ["back", "core"] },
  { name: "Dead Hang", category: "arms", classification: "weighted_bodyweight", muscleGroups: ["forearms"], secondaryMuscleGroups: ["back"] },

  { name: "Plank", category: "core", classification: "duration", muscleGroups: ["core"] },
  { name: "Hanging Leg Raise", category: "core", classification: "reps_only", muscleGroups: ["core"] },
  { name: "Cable Woodchop", category: "core", classification: "machine_other", muscleGroups: ["core"] },
  { name: "Ab Wheel Rollout", category: "core", classification: "reps_only", muscleGroups: ["core"], secondaryMuscleGroups: ["shoulders"] },

  // QA 11.0: "full_body" removed as a muscle-group classification — each
  // gets a real primary mover instead of the old catch-all.
  { name: "Kettlebell Swing", category: "full_body", classification: "dumbbell", muscleGroups: ["glutes"], secondaryMuscleGroups: ["hamstrings", "back"] },
  { name: "Clean and Press", category: "full_body", classification: "barbell", muscleGroups: ["olympic"], secondaryMuscleGroups: ["shoulders", "back"] },
  { name: "Burpee", category: "full_body", classification: "reps_only", muscleGroups: ["cardio"], secondaryMuscleGroups: ["core", "shoulders"] },

  { name: "Easy Run", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Interval Sprints", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
  { name: "Rowing Machine", category: "cardio", classification: "cardio", muscleGroups: ["cardio"], secondaryMuscleGroups: ["back"] },
  { name: "Stair Climber", category: "cardio", classification: "cardio", muscleGroups: ["cardio"], secondaryMuscleGroups: ["glutes", "calves"] },
  { name: "Cycling", category: "cardio", classification: "cardio", muscleGroups: ["cardio"] },
];
