import type { ProfessionalClient } from "../types";

// Seed roster for the Professional dashboard prototype — stands in for real
// clients who have shared access with their trainer/dietitian.
export const mockProfessionalClients: ProfessionalClient[] = [
  {
    id: "pc1",
    name: "Nadine Khalil",
    code: "SOHA-4F2K",
    joinedAt: "2026-06-02",
    activityLevel: "moderate",
    activityType: "strength",
    access: { foodDiary: true, workoutActivity: true, weight: true, progress: true, healthMetrics: false },
    lastWeightKg: 64.2,
    weightTrend: -0.8,
    lastCaloriesKcal: 1840,
    workoutLoggedToday: true,
  },
  {
    id: "pc2",
    name: "Sami Rahal",
    code: "SOHA-8Q1Z",
    joinedAt: "2026-05-14",
    activityLevel: "very_active",
    activityType: "both",
    access: { foodDiary: true, workoutActivity: true, weight: true, progress: true, healthMetrics: true },
    lastWeightKg: 81.6,
    weightTrend: 0.3,
    lastCaloriesKcal: 2650,
    healthSummary: { bodyFatPct: 18.4, sleepHours: 7.2, stepsAvg: 9100 },
    workoutLoggedToday: true,
  },
  {
    id: "pc3",
    name: "Yara Bou Saab",
    code: "SOHA-2N9X",
    joinedAt: "2026-07-20",
    activityLevel: "light",
    activityType: "cardio",
    access: { foodDiary: true, workoutActivity: false, weight: true, progress: true, healthMetrics: false },
    lastWeightKg: 58.9,
    weightTrend: -0.2,
    lastCaloriesKcal: 1620,
    workoutLoggedToday: false,
  },
];
