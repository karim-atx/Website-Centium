// Centium landing v29: section 01 (Your day) demo content and computed values. These are
// the prototype's own data values (Centium Site v29.dc.html: data(), data7(),
// data9(), data12()), taken from its evaluated output so every string,
// colour, percentage and animation window ("a b", read by motion/anim.ts as
// data-w) is literal. The names and figures are approved demo data.

export const clockCols = [
  { i: "0", digit: true },
  { i: "1", digit: true },
  { colon: true },
  { i: "2", digit: true },
  { i: "3", digit: true },
];

export const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export const moments = [
  { i: 0, l: "0.00%", t: "12:30", label: "Lunch logged" },
  { i: 1, l: "20.00%", t: "13:30", label: "Workout paused" },
  { i: 2, l: "40.00%", t: "14:30", label: "Day earned" },
  { i: 3, l: "60.00%", t: "17:30", label: "Session reminder" },
  { i: 4, l: "80.00%", t: "17:30", label: "Lara shares your PR" },
  { i: 5, l: "100.00%", t: "21:30", label: "Day closed" },
];

export const momentsH = [
  { i: 0, l: "0.00%" },
  { i: 1, l: "20.00%" },
  { i: 2, l: "40.00%" },
  { i: 3, l: "60.00%" },
  { i: 4, l: "80.00%" },
  { i: 5, l: "100.00%" },
];

export const dayStepsTxt = [
  { i: 0, t: "12:30", h: "Nutrition.", p: "Lunch added. Calories and macros grow on the Food card.", c: "#775FD7" },
  { i: 1, t: "13:30", h: "Training.", p: "Upper Body, three of six done. Paused for now.", c: "#2F5F58" },
  { i: 2, t: "14:30", h: "Health.", p: "Heart rate, steps and water update. Two of four goals, and the day is earned.", c: "#2F5F58" },
  { i: 3, t: "17:30", h: "Classes.", p: "Your session with Lara starts in 60 minutes.", c: "#775FD7" },
  { i: 4, t: "17:30", h: "Coaching.", p: "Lara would like to share your bench press PR.", c: "#2F5F58" },
  { i: 5, t: "21:30", h: "Day closed.", p: "Upper Body done, four of four goals. Good evening, Rami.", c: "#775FD7" },
];
