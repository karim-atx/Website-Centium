import type { Catalogue } from "../core";

// Website viewport v1, Arabic: Client · Workout at 1024px and wider (the web
// Workout page, its Routines, Library, History and Metrics tabs). Mobile
// copy is unchanged; web-only copy says "Click" where the handover lists it
// (7.3). Everything else reuses the Workout area's Arabic. Also the web
// Onboarding & auth (WC-OB), which reuses the onboarding Arabic.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/workout/Workout.web.tsx",
  "pages/workout/web/parts.tsx",
  "pages/workout/web/styles.ts",
  "pages/workout/web/RoutinesWeb.tsx",
  "pages/workout/web/LibraryWeb.tsx",
  "pages/workout/web/HistoryWeb.tsx",
  "pages/workout/web/MetricsWeb.tsx",
  "pages/onboarding/web/ObWeb.tsx",
];

const webclientworkout: Catalogue = {
  // == Routines (pages/workout/web/RoutinesWeb) ==
  // note: "Play" starts the routine (the play controls: Play · Pause + Stop · Resume + Stop), as "Start {name}" «بدء {name}».
  "Play": "بدء",
  "Stop {name}": "إيقاف {name}",
  "Drag folder": "سحب المجلد",
  // == The docked session logger's header (components/workout/WorkoutSessionSheet, web only) ==
  // note: the mobile status line "Started {time} · {elapsed} elapsed" «بدأ {time} · مضى {elapsed}», split over two lines.
  "Started {time}": "بدأ {time}",
  "{elapsed} elapsed": "مضى {elapsed}",
  // == Library · body view (pages/workout/web/LibraryWeb) ==
  "Select a muscle to see its exercises": "اختر عضلة لعرض تمارينها",
  "Click a muscle on the figure, or pick one from Muscle groups.": "انقر على عضلة في الشكل، أو اختر واحدة من المجموعات العضلية.",
  // == Onboarding & auth (WC-OB, moved from area 7; pages/onboarding web branches) ==
  "Click to choose, optional": "انقر للاختيار، اختياري", // note: web copy of «اضغط للاختيار، اختياري» (7.3); «انقر» as in workout
};

export default webclientworkout;
