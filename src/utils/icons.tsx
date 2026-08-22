// V4 (QA App 3.0): "customized and minimalistic icons instead of emojis
// ... they would follow the selected color theme". We use lucide-react
// (already a dependency, single-color line icons) instead of emoji
// everywhere, and let color come from `currentColor`/className so every
// icon automatically follows the active accent theme + light/dark mode —
// no hardcoded colors baked into an icon like an emoji glyph would have.
import type { LucideIcon } from "lucide-react";
import {
  Coffee,
  Soup,
  ChefHat,
  Cookie,
  CupSoda,
  Store,
  Home,
  Wheat,
  UtensilsCrossed,
  Dumbbell,
  Footprints,
  CircleDot,
  HeartPulse,
  Activity,
  Flame,
  Droplet,
  Shirt,
  Package,
  Pill,
  Leaf,
  UserRound,
  NotebookPen,
  Wind,
  Moon,
  Stethoscope,
  Users,
  BookOpen,
} from "lucide-react";
import type {
  HabitIconKey,
  MarketplaceCategoryId,
  ProfessionalType,
} from "../types";

// Food category -> icon. Deliberately per-category (not per-item) — a
// bespoke icon per unique dish would defeat "minimalistic".
export const foodCategoryIcon: Record<string, LucideIcon> = {
  lebanese: UtensilsCrossed,
  breakfast: Coffee,
  lunch: Soup,
  dinner: ChefHat,
  snacks: Cookie,
  drinks: CupSoda,
  restaurant: Store,
  homemade: Home,
  ingredients: Wheat,
};

// Exercise `category` -> icon (used by the exercise library + routine rows).
export const exerciseCategoryIcon: Record<string, LucideIcon> = {
  chest: Dumbbell,
  back: Dumbbell,
  shoulders: Dumbbell,
  arms: Dumbbell,
  legs: Footprints,
  core: CircleDot,
  full_body: Activity,
  cardio: HeartPulse,
};

export const professionalTypeIcon: Record<ProfessionalType, LucideIcon> = {
  trainer: Dumbbell,
  dietitian: UtensilsCrossed,
  physiotherapist: Activity,
  doctor: Stethoscope,
};

export const marketplaceCategoryIcon: Record<MarketplaceCategoryId, LucideIcon> = {
  gyms: Dumbbell,
  classes: Users,
  stores: Store,
  clothing: Shirt,
  equipment: Package,
  supplements: Pill,
  wellness: Leaf,
};

export const habitIcon: Record<HabitIconKey, LucideIcon> = {
  water: Droplet,
  steps: Footprints,
  workout: Dumbbell,
  journal: NotebookPen,
  meditation: Wind,
  sleep: Moon,
  book: BookOpen,
  custom: CircleDot,
};

export const habitIconOptions: { key: HabitIconKey; label: string }[] = [
  { key: "water", label: "Water" },
  { key: "steps", label: "Steps" },
  { key: "workout", label: "Workout" },
  { key: "journal", label: "Journal" },
  { key: "meditation", label: "Meditation" },
  { key: "sleep", label: "Sleep" },
  { key: "book", label: "Reading" },
  { key: "custom", label: "Other" },
];

// Every streak in this app is a "keep it going" style counter.
export const STREAK_ICON = Flame;
// Generic stand-in for any person (client, professional, gym-goer avatar).
export const PERSON_ICON = UserRound;
