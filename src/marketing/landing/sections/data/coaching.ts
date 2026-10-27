// Centium landing v29: section 04 (Coaching) demo content and computed values. These are
// the prototype's own data values (Centium Site v29.dc.html: data(), data7(),
// data9(), data12()), taken from its evaluated output so every string,
// colour, percentage and animation window ("a b", read by motion/anim.ts as
// data-w) is literal. The names and figures are approved demo data.

export { voice } from "./shared";

export const bookDays = [
  { d: "Mon", n: 19, on: false },
  { d: "Tue", n: 20, on: false },
  { d: "Wed", n: 21, on: false },
  { d: "Thu", n: 22, on: true },
  { d: "Fri", n: 23, on: false },
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
  { t: "Hi Lara, I hired you yesterday. Where do we start?", side: "flex-end", bg: "#775FD7", ink: "#fff" },
  { t: "Welcome Rami. I shared a plan: high protein, week 3.", side: "flex-start", bg: "#fff", ink: "#221E1A" },
  { t: "Can I swap dinner for mujaddara?", side: "flex-end", bg: "#775FD7", ink: "#fff" },
  { t: "Yes. Add grilled halloumi for protein.", side: "flex-start", bg: "#fff", ink: "#221E1A" },
  { t: "Perfect. Call on Thursday?", side: "flex-end", bg: "#775FD7", ink: "#fff" },
];

export const clientStats = [
  { k: "CALORIES", v: "1,410" },
  { k: "PROTEIN", v: "128 g" },
  { k: "STEPS", v: "8,420" },
];

export const clientsCo = [
  { i: "RH", n: "Rami Haddad", s: "New", w: "0.1 0.45", tx: "30", sb: "#F4F1FB", sc: "#5C48A8", bg: "#DED4F4", ink: "#5C48A8" },
  { i: "HM", n: "Hala Mansour", s: "Logged today", w: "-2 -1", tx: "0", sb: "#EDF4F3", sc: "#2F5F58", bg: "#DAEAE7", ink: "#3D6E69" },
  { i: "RS", n: "Rana Sleiman", s: "Check-in due", w: "-2 -1", tx: "0", sb: "#FBF2E6", sc: "#91642C", bg: "#DED4F4", ink: "#5C48A8" },
  { i: "JK", n: "Joseph Khalil", s: "Plan shared", w: "-2 -1", tx: "0", sb: "#EDF4F3", sc: "#2F5F58", bg: "#DAEAE7", ink: "#3D6E69" },
];

export const cvLines = ["MSc Clinical Nutrition,  credentials verified", "Sports nutrition,  8 years in clinic", "Mediterranean meal planning"];

export const diaryRows = [
  { k: "BREAKFAST", t: "Labneh and zaatar manousheh", v: "410", swap: false },
  { k: "LUNCH", t: "Fattoush", v: "480", swap: false },
  { k: "DINNER", t: "Mujaddara", v: "520", swap: true },
];

export const laraDay = [
  { t: "09:00", n: "Hala Mansour · in person", on: false },
  { t: "13:00", n: "Plan reviews", on: false },
  { t: "16:00", n: "Rana Sleiman · video", on: false },
  { t: "18:00", n: "Open slot", on: true },
];

export const notes = [
  { t: "Energy good, sleep 7h 20m", w: "0.1 0.3" },
  { t: "Keep the dinner swap, add 80 g halloumi", w: "0.35 0.55" },
  { t: "Next check-in Monday", w: "0.6 0.8" },
];

export const planMeals = [
  { k: "Breakfast", v: "Labneh and zaatar" },
  { k: "Lunch", v: "Fattoush with halloumi" },
  { k: "Dinner", v: "Lentil soup" },
];

export const planTargets = [
  { k: "Protein", v: "165 g", pct: "100%", c: "#775FD7", w: "0.1 0.5" },
  { k: "Carbs", v: "240 g", pct: "86%", c: "#B9A9EE", w: "0.2 0.6" },
  { k: "Fat", v: "70 g", pct: "64%", c: "#5D9C93", w: "0.3 0.7" },
];
