// Centium landing v29: section 04 (Coaching) demo content and computed values. These are
// the prototype's own data values (Centium Site v29.dc.html: data(), data7(),
// data9(), data12()), taken from its evaluated output so every string,
// colour, percentage and animation window ("a b", read by motion/anim.ts as
// data-w) is literal. The names and figures are approved demo data.

import { tk } from "../../../../i18n/core";

export { voice } from "./shared";

export const bookDays = [
  { d: tk("Mon"), n: 19, on: false },
  { d: tk("Tue"), n: 20, on: false },
  { d: tk("Wed"), n: 21, on: false },
  { d: tk("Thu"), n: 22, on: true },
  { d: tk("Fri"), n: 23, on: false },
];

export const bookSlots = [
  { t: "09:00", on: false },
  { t: "12:00", on: false },
  { t: "15:00", on: false },
  { t: "17:00", on: false },
  { t: "18:00", on: true },
  { t: "19:00", on: false },
];

export const chat = [
  { t: tk("Hi Lara, I hired you yesterday. Where do we start?"), side: "flex-end", bg: "#775FD7", ink: "#fff" },
  { t: tk("Welcome Rami. I shared a plan: high protein, week 3."), side: "flex-start", bg: "#fff", ink: "#221E1A" },
  { t: tk("Can I swap dinner for mujaddara?"), side: "flex-end", bg: "#775FD7", ink: "#fff" },
  { t: tk("Yes. Add grilled halloumi for protein."), side: "flex-start", bg: "#fff", ink: "#221E1A" },
  { t: tk("Perfect. Call on Thursday?"), side: "flex-end", bg: "#775FD7", ink: "#fff" },
];

export const clientStats = [
  { k: tk("CALORIES"), v: "1,410" },
  { k: tk("PROTEIN"), v: tk("128 g") },
  { k: tk("STEPS"), v: "8,420" },
];

export const clientsCo = [
  { i: "RH", n: tk("Rami Haddad"), s: tk("New"), w: "0.1 0.45", tx: "30", sb: "#F4F1FB", sc: "#5C48A8", bg: "#DED4F4", ink: "#5C48A8" },
  { i: "HM", n: tk("Hala Mansour"), s: tk("Logged today"), w: "-2 -1", tx: "0", sb: "#EDF4F3", sc: "#2F5F58", bg: "#DAEAE7", ink: "#3D6E69" },
  { i: "RS", n: tk("Rana Sleiman"), s: tk("Check-in due"), w: "-2 -1", tx: "0", sb: "#FBF2E6", sc: "#91642C", bg: "#DED4F4", ink: "#5C48A8" },
  { i: "JK", n: tk("Joseph Khalil"), s: tk("Plan shared"), w: "-2 -1", tx: "0", sb: "#EDF4F3", sc: "#2F5F58", bg: "#DAEAE7", ink: "#3D6E69" },
];

export const cvLines = [tk("MSc Clinical Nutrition,  credentials verified"), tk("Sports nutrition,  8 years in clinic"), tk("Mediterranean meal planning")];

export const diaryRows = [
  { k: tk("BREAKFAST"), t: tk("Labneh and zaatar manousheh"), v: "410", swap: false },
  { k: tk("LUNCH"), t: tk("Fattoush"), v: "480", swap: false },
  { k: tk("DINNER"), t: tk("Mujaddara"), v: "520", swap: true },
];

export const laraDay = [
  { t: "09:00", n: tk("Hala Mansour · in person"), on: false },
  { t: "13:00", n: tk("Plan reviews"), on: false },
  { t: "16:00", n: tk("Rana Sleiman · video"), on: false },
  { t: "18:00", n: tk("Open slot"), on: true },
];

export const notes = [
  { t: tk("Energy good, sleep 7h 20m"), w: "0.1 0.3" },
  { t: tk("Keep the dinner swap, add 80 g halloumi"), w: "0.35 0.55" },
  { t: tk("Next check-in Monday"), w: "0.6 0.8" },
];

export const planMeals = [
  { k: tk("Breakfast"), v: tk("Labneh and zaatar") },
  { k: tk("Lunch"), v: tk("Fattoush with halloumi") },
  { k: tk("Dinner"), v: tk("Lentil soup") },
];

export const planTargets = [
  { k: tk("Protein"), v: tk("165 g"), pct: "100%", c: "#775FD7", w: "0.1 0.5" },
  { k: tk("Carbs"), v: tk("240 g"), pct: "86%", c: "#B9A9EE", w: "0.2 0.6" },
  { k: tk("Fat"), v: tk("70 g"), pct: "64%", c: "#5D9C93", w: "0.3 0.7" },
];
