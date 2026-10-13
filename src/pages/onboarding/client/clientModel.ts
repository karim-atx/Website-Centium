import {
  Armchair,
  Bike,
  Brain,
  CalendarHeart,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  GlassWater,
  HeartPulse,
  ListChecks,
  Moon,
  NotebookPen,
  Ruler,
  Scale,
  Smile,
  TestTube,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLevel, Goal, TrackPreference } from "../../../types";

// The client lane's content model, literal from BizOnboardingV10 (the second
// `if (CU)` block, which is the final design): goal areas and their
// sub-goals, the activity scale, activities, and what-to-track rows.
// Pure (no React), so it is tested in node.

export interface GentleFlags {
  /** Recovery-sensitive experience (A gentler start, toggle 1). */
  rs: boolean;
  /** Cycle tracking (A gentler start, toggle 2). */
  cy: boolean;
}

// ---- Goals --------------------------------------------------------------

export type GoalArea = "move" | "eat" | "sleep" | "mind" | "habits" | "health";
export const GOAL_AREA_KEYS: readonly GoalArea[] = ["move", "eat", "sleep", "mind", "habits", "health"];
export const MAX_GOAL_AREAS = 3;

/** Sub-goal label -> the value stored in profiles.goals. */
export const SUB_GOAL_VALUE: Record<string, Goal> = {
  "Get stronger": "get_stronger",
  "Improve my fitness": "improve_fitness",
  "Move every day": "move_every_day",
  "Run my first 5K": "first_5k",
  "Stretch more": "stretch_more",
  "Eat more balanced meals": "improve_nutrition",
  "Lose weight": "lose_weight",
  "Build muscle": "build_muscle",
  "Eat regularly and calmly": "eat_regularly",
  "Notice how food makes me feel": "notice_food_feelings",
  "Sleep better": "sleep_better",
  "Recover well": "recover_well",
  "Feel more energetic": "more_energy",
  "Feel less stressed": "less_stress",
  "Build a journaling habit": "journaling_habit",
  "Build consistent routines": "consistent_routines",
  "Drink more water": "drink_more_water",
  "Track my health metrics": "track_health",
  "Understand my cycle": "understand_cycle",
};

export interface AreaDef {
  key: GoalArea;
  icon: LucideIcon;
  title: string;
  /** Sub-goals offered on the tile's Refine sheet. */
  subs: string[];
}

/** AREAS, as drawn: titles and sub-goals follow A gentler start. */
export function goalAreas({ rs, cy }: GentleFlags): AreaDef[] {
  return [
    // The Refine sheet for Move more adds "Run my first 5K" and "Stretch more" (OB-098).
    { key: "move", icon: Footprints, title: "Move more", subs: ["Get stronger", "Improve my fitness", "Move every day", "Run my first 5K", "Stretch more"] },
    {
      key: "eat",
      icon: Utensils,
      title: rs ? "Eat with ease" : "Eat better",
      subs: rs ? ["Eat regularly and calmly", "Notice how food makes me feel"] : ["Eat more balanced meals", "Lose weight", "Build muscle"],
    },
    { key: "sleep", icon: Moon, title: "Sleep and recover", subs: ["Sleep better", "Recover well"] },
    {
      key: "mind",
      icon: Brain,
      title: "Mind and mood",
      subs: rs ? ["Feel more energetic", "Feel less stressed", "Build a journaling habit"] : ["Feel less stressed", "Build a journaling habit"],
    },
    { key: "habits", icon: ListChecks, title: "Build habits", subs: ["Build consistent routines", "Drink more water"] },
    { key: "health", icon: HeartPulse, title: "Health", subs: ["Track my health metrics", ...(cy ? ["Understand my cycle"] : [])] },
  ];
}

/**
 * The profiles.goals values for what was picked: each picked area's chosen
 * sub-goals that are still offered (a gentler start hides weight goals, a
 * cycle goal needs cycle tracking). Nothing picked keeps the old default.
 */
export function goalsToSave(areas: GoalArea[], subGoals: Partial<Record<GoalArea, string[]>>, flags: GentleFlags): Goal[] {
  const defs = goalAreas(flags);
  const out: Goal[] = [];
  for (const a of areas) {
    const def = defs.find((d) => d.key === a);
    if (!def) continue;
    const chosen = (subGoals[a] ?? []).filter((s) => def.subs.includes(s));
    const picks = chosen.length ? chosen : def.subs.slice(0, 1);
    for (const s of picks) {
      const v = SUB_GOAL_VALUE[s];
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out.length ? out : ["improve_health"];
}

// ---- How active you are (isScale) -----------------------------------------

export const ACTIVITY_SCALE: { value: ActivityLevel; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "sedentary", label: "Resting", desc: "Mostly sitting, little exercise", icon: Armchair },
  { value: "light", label: "Light", desc: "Walks and light movement", icon: Footprints },
  { value: "moderate", label: "Regular", desc: "A few workouts a week", icon: Bike },
  { value: "very_active", label: "Active", desc: "Training most days", icon: Flame },
  { value: "athlete", label: "Athlete", desc: "Hard training every day", icon: Trophy },
];

// ---- Activities you enjoy (hasMenu) -----------------------------------------

/**
 * The pop-up's nine, and the profiles.preferred_activities value each is
 * stored as (closed set, max 10, B5; hiit and team_sports added by the
 * Database session on 13 October).
 */
export const ACTIVITIES: { key: string; label: string; db: string }[] = [
  { key: "walking", label: "Walking", db: "walking" },
  { key: "running", label: "Running", db: "running" },
  { key: "strength", label: "Strength", db: "gym" },
  { key: "yoga", label: "Yoga", db: "yoga" },
  { key: "pilates", label: "Pilates", db: "pilates" },
  { key: "cycling", label: "Cycling", db: "cycling" },
  { key: "swimming", label: "Swimming", db: "swimming" },
  { key: "hiit", label: "HIIT", db: "hiit" },
  { key: "team_sports", label: "Team sports", db: "team_sports" },
];

export function activitiesToSave(keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const a = ACTIVITIES.find((x) => x.key === k);
    if (a && !out.includes(a.db)) out.push(a.db);
  }
  return out.slice(0, 10);
}

// ---- What to track -------------------------------------------------------------

export interface TrackDef {
  key: TrackPreference;
  icon: LucideIcon;
  label: string;
  desc: string;
  /** Not built yet: shown, switch disabled (BACKEND, B5 open item "Hunger and fullness"). */
  soon?: boolean;
}

export function trackDef(key: TrackPreference, { rs }: GentleFlags): TrackDef {
  switch (key) {
    case "nutrition":
      return rs
        ? { key, icon: Utensils, label: "Meals and eating patterns", desc: "What you ate and how you felt" }
        : { key, icon: Utensils, label: "Nutrition", desc: "Meals, calories and macros" };
    case "water":
      return { key, icon: GlassWater, label: "Water", desc: "Glasses through the day" };
    case "hunger_fullness":
      return { key, icon: Gauge, label: "Hunger and fullness", desc: "A gentle check before and after meals", soon: true };
    case "workouts":
      return { key, icon: Dumbbell, label: "Workouts", desc: "Routines, sets and programmes" };
    case "steps":
      return { key, icon: Footprints, label: "Steps", desc: "From your phone or watch" };
    case "sleep":
      return { key, icon: Moon, label: "Sleep", desc: "Hours and how rested you feel" };
    case "mood":
      return { key, icon: Smile, label: "Mood", desc: "A quick check-in each day" };
    case "journal":
      return { key, icon: NotebookPen, label: "Journal", desc: "Private notes and reflections" };
    case "habits":
      return { key, icon: ListChecks, label: "Habits", desc: rs ? "Daily habits, without streaks" : "Daily habits and streaks" };
    case "weight":
      return { key, icon: Scale, label: "Weight", desc: "Weigh-ins and trends" };
    case "body_composition":
      return { key, icon: Ruler, label: "Body composition", desc: "Measurements over time" };
    case "bloodwork":
      return { key, icon: TestTube, label: "Blood work", desc: "Upload results and track markers" };
    case "cycle":
      return { key, icon: CalendarHeart, label: "Cycle", desc: "Periods and symptoms" };
  }
}

/** "Recommended for you" (REC). */
export function recommendedTracking({ rs, cy }: GentleFlags): TrackPreference[] {
  const rec: TrackPreference[] = rs ? ["nutrition", "sleep", "mood", "steps"] : ["nutrition", "workouts", "steps", "sleep"];
  return cy ? [...rec.slice(0, 3), "cycle"] : rec;
}

/** "More to track" groups (GROUPS). */
export function trackGroups({ rs, cy }: GentleFlags): { key: string; title: string; icon: LucideIcon; items: TrackPreference[] }[] {
  return [
    { key: "food", title: "Food", icon: Utensils, items: ["nutrition", "water", ...(rs ? (["hunger_fullness"] as TrackPreference[]) : [])] },
    { key: "move", title: "Move", icon: Dumbbell, items: ["workouts", "steps"] },
    { key: "sleep", title: "Sleep and recover", icon: Moon, items: ["sleep"] },
    { key: "mind", title: "Mind", icon: Brain, items: ["mood", "journal", "habits"] },
    {
      key: "body",
      title: "Body and health",
      icon: HeartPulse,
      items: [...(rs ? [] : (["weight", "body_composition"] as TrackPreference[])), "bloodwork", ...(cy ? (["cycle"] as TrackPreference[]) : [])],
    },
  ];
}

/** What is saved: only trackers still offered, never one that is not built yet. */
export function trackingToSave(tracking: TrackPreference[], flags: GentleFlags): TrackPreference[] {
  const offered = new Set(trackGroups(flags).flatMap((g) => g.items));
  const out = tracking.filter((t) => offered.has(t) && !trackDef(t, flags).soon);
  return out.length ? out : (["nutrition", "workouts"] as TrackPreference[]);
}

/** The You're all set summary line: "Tracking nutrition, workouts, sleep and steps. Moderately active." */
export function startingPointSummary(tracking: TrackPreference[], level: ActivityLevel | null, flags: GentleFlags): string {
  const names = tracking.map((t) => trackDef(t, flags).label.toLowerCase());
  const list = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const levelText: Record<ActivityLevel, string> = {
    sedentary: "Mostly resting.",
    light: "Lightly active.",
    moderate: "Moderately active.",
    very_active: "Very active.",
    athlete: "Training like an athlete.",
  };
  return `${list ? `Tracking ${list}.` : ""}${level ? `${list ? " " : ""}${levelText[level]}` : ""}`;
}
