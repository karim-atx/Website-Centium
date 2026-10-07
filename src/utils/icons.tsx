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
  Container,
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
  GlassWater,
  Sun,
  Bed,
  Apple,
  Salad,
  Bike,
  Heart,
  Smile,
  Music,
  PhoneOff,
  Timer,
} from "lucide-react";
import type {
  HabitIconKey,
  MarketplaceCategoryId,
  MuscleGroup,
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
  meal_prep: Container,
};

// Muscle group -> icon, for the exercise library's filter chips.
//
// KEYED BY MUSCLE GROUP, NOT BY THE OLD BROWSE CATEGORY. public.exercises
// types its category as muscle_group, and the prototype's chest/back/arms/
// legs/full_body grouping has no column to come from any more — `arms`,
// `legs` and `full_body` are not muscle_group members at all. The 14 below
// are the enum, so every catalog row's category has an icon.
export const muscleGroupIcon: Record<MuscleGroup, LucideIcon> = {
  back: Dumbbell,
  bicep: Dumbbell,
  calves: Footprints,
  cardio: HeartPulse,
  chest: Dumbbell,
  core: CircleDot,
  forearms: Dumbbell,
  glutes: Footprints,
  hamstrings: Footprints,
  olympic: Activity,
  other: Activity,
  quads: Footprints,
  shoulders: Dumbbell,
  tricep: Dumbbell,
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
  meal_prep: ChefHat,
};

// Habit icons: the one mapping every habit row renders from (Habits page,
// the Mind hub's Today list and hero, the add panel's picker).
//
// Stage A1 (HANDOVER_API.md "Habit icons"): habit_items.icon is the enum
// public.habit_icon, 20 values. The 8 kept keep their semantic names and the
// contract's board mapping (sleep -> Bed, no longer Moon); the 12 new are
// named after the Lucide icon MO1.1.1.1 draws. The key list itself lives in
// services/habits (HABIT_ICON_KEYS), which validates against it.
export const habitIcon: Record<HabitIconKey, LucideIcon> = {
  water: Droplet,
  steps: Footprints,
  workout: Dumbbell,
  journal: NotebookPen,
  meditation: Wind,
  sleep: Bed,
  book: BookOpen,
  custom: CircleDot,
  glass_water: GlassWater,
  moon: Moon,
  sun: Sun,
  apple: Apple,
  salad: Salad,
  coffee: Coffee,
  bike: Bike,
  heart: Heart,
  smile: Smile,
  music: Music,
  phone_off: PhoneOff,
  timer: Timer,
};

// The MO1.1.1.1 icon row, in the board's order (interactions rows 6-25:
// Droplet, Footprints, Dumbbell, NotebookPen, Wind, Moon, BookOpen,
// CircleDot, Sun, Bed, Apple, Salad, Coffee, Bike, Heart, Smile, Music,
// PhoneOff, Timer, GlassWater). Labels are the board's accessibility labels
// (02_Master_Handover.md, "Icon-only buttons and labels"), including
// Heart = "Like" as written there.
export const habitIconOptions: { key: HabitIconKey; label: string }[] = [
  { key: "water", label: "Droplet" },
  { key: "steps", label: "Footprints" },
  { key: "workout", label: "Dumbbell" },
  { key: "journal", label: "Notebook Pen" },
  { key: "meditation", label: "Wind" },
  { key: "moon", label: "Moon" },
  { key: "book", label: "Book Open" },
  { key: "custom", label: "Circle Dot" },
  { key: "sun", label: "Sun" },
  { key: "sleep", label: "Bed" },
  { key: "apple", label: "Apple" },
  { key: "salad", label: "Salad" },
  { key: "coffee", label: "Coffee" },
  { key: "bike", label: "Bike" },
  { key: "heart", label: "Like" },
  { key: "smile", label: "Smile" },
  { key: "music", label: "Music" },
  { key: "phone_off", label: "Phone Off" },
  { key: "timer", label: "Timer" },
  { key: "glass_water", label: "Glass Water" },
];

// Every streak in this app is a "keep it going" style counter.
export const STREAK_ICON = Flame;
// Generic stand-in for any person (client, professional, gym-goer avatar).
export const PERSON_ICON = UserRound;
