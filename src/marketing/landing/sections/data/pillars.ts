// Centium landing v29: section 03 (Pillars) demo content and computed values. These are
// the prototype's own data values (Centium Site v29.dc.html: data(), data7(),
// data9(), data12()), taken from its evaluated output so every string,
// colour, percentage and animation window ("a b", read by motion/anim.ts as
// data-w) is literal. The names and figures are approved demo data.

import { tk } from "../../../../i18n/core";

export { voice } from "./shared";

export const pls = [
  { n: "01", t: tk("Nutrition"), line: tk("Log meals by voice, barcode or recipe."), c: "#4E3894" },
  { n: "02", t: tk("Training"), line: tk("Routines in folders, every set tracked."), c: "#2F5F58" },
  { n: "03", t: tk("Health"), line: tk("Heart rate, labs and cycle in one record."), c: "#4E3894" },
  { n: "04", t: tk("Coaching"), line: tk("Hire a verified professional, then message or call."), c: "#2F5F58" },
  { n: "05", t: tk("Community"), line: tk("Ask the forum, learn from professionals."), c: "#4E3894" },
];

export const barcodeL = ["3px", "2px", "3px", "2px", "1px", "3px", "1px", "1px", "2px", "1px", "3px", "3px", "1px", "3px", "3px", "1px", "1px", "1px", "2px", "3px", "1px", "1px", "1px", "2px", "1px", "1px", "3px", "3px"];

export const calHead = ["M", "T", "W", "T", "F", "S", "S"];

export const coachChat = [
  { t: tk("Hi Lara, can we start this week?"), w: "0.68 0.74", side: "flex-end", bg: "#775FD7", ink: "#fff" },
  { t: tk("Yes. I shared your plan. Video call now?"), w: "0.74 0.8", side: "flex-start", bg: "#F3F9F7", ink: "#221E1A" },
  { t: tk("Joining."), w: "0.8 0.86", side: "flex-end", bg: "#775FD7", ink: "#fff" },
];

export const cycCal = [
  { d: "", bg: "transparent", ink: "transparent", fw: 700, ring: "none", w: "9 10" },
  { d: "", bg: "transparent", ink: "transparent", fw: 700, ring: "none", w: "9 10" },
  { d: "", bg: "transparent", ink: "transparent", fw: 700, ring: "none", w: "9 10" },
  { d: "1", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.112 0.212" },
  { d: "2", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.124 0.224" },
  { d: "3", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.136 0.236" },
  { d: "4", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.148 0.248" },
  { d: "5", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.160 0.260" },
  { d: "6", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.172 0.272" },
  { d: "7", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.184 0.284" },
  { d: "8", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.196 0.296" },
  { d: "9", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.208 0.308" },
  { d: "10", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.220 0.320" },
  { d: "11", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.232 0.332" },
  { d: "12", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.244 0.344" },
  { d: "13", bg: "#E7C9D699", ink: "#3B352D", fw: 700, ring: "none", w: "0.256 0.356" },
  { d: "14", bg: "#E7C9D699", ink: "#3B352D", fw: 700, ring: "none", w: "0.268 0.368" },
  { d: "15", bg: "#E7C9D699", ink: "#3B352D", fw: 700, ring: "none", w: "0.280 0.380" },
  { d: "16", bg: "#E7C9D699", ink: "#3B352D", fw: 700, ring: "none", w: "0.292 0.392" },
  { d: "17", bg: "#E7C9D699", ink: "#3B352D", fw: 700, ring: "none", w: "0.304 0.404" },
  { d: "18", bg: "#D9CFF599", ink: "#3B352D", fw: 700, ring: "none", w: "0.316 0.416" },
  { d: "19", bg: "#D9CFF599", ink: "#3B352D", fw: 700, ring: "none", w: "0.328 0.428" },
  { d: "20", bg: "#D9CFF599", ink: "#3B352D", fw: 700, ring: "none", w: "0.340 0.440" },
  { d: "21", bg: "#4E3894", ink: "#FFFFFF", fw: 800, ring: "none", w: "0.352 0.452" },
  { d: "22", bg: "#D9CFF599", ink: "#3B352D", fw: 700, ring: "none", w: "0.364 0.464" },
  { d: "23", bg: "#D9CFF5", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.376 0.476" },
  { d: "24", bg: "#D9CFF5", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.388 0.488" },
  { d: "25", bg: "#D9CFF5", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.400 0.500" },
  { d: "26", bg: "#BFDCD6", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.412 0.512" },
  { d: "27", bg: "#BFDCD6", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.424 0.524" },
  { d: "28", bg: "#BFDCD6", ink: "#3B352D", fw: 700, ring: "inset 0 0 0 1px #5D9C93", w: "0.436 0.536" },
  { d: "29", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.448 0.548" },
  { d: "30", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.460 0.560" },
  { d: "31", bg: "#EDE3CF99", ink: "#3B352D", fw: 700, ring: "none", w: "0.472 0.572" },
];

export const cycLenDots = [
  { x: "5%", y: "25%", w: "0.60 0.70" },
  { x: "23%", y: "75%", w: "0.65 0.75" },
  { x: "41%", y: "50%", w: "0.70 0.80" },
  { x: "59%", y: "0%", w: "0.75 0.85" },
  { x: "77%", y: "50%", w: "0.80 0.90" },
  { x: "95%", y: "75%", w: "0.85 0.95" },
];

export const cycLenLab = [
  { t: tk("May"), x: "5%" },
  { t: tk("Jun"), x: "23%" },
  { t: tk("Jul"), x: "41%" },
  { t: tk("Aug"), x: "59%" },
  { t: tk("Sep"), x: "77%" },
  { t: tk("Oct"), x: "95%" },
];

export const cycLenPts = "10.0,25.0 46.0,75.0 82.0,50.0 118.0,0.0 154.0,50.0 190.0,75.0";

export const cycLogs = [
  { t: tk("Mild cramps"), bg: "#F4F1FB", ink: "#5C48A8", w: "0.50 0.62" },
  { t: tk("Mood: calm"), bg: "#EDF4F3", ink: "#2F5F58", w: "0.57 0.69" },
  { t: tk("Energy: good"), bg: "#EDF4F3", ink: "#2F5F58", w: "0.64 0.76" },
  { t: tk("Slept 7 h 40"), bg: "#F4F1FB", ink: "#5C48A8", w: "0.71 0.83" },
];

export const cycPhases = [
  { t: tk("Period"), d: tk("Days 1 to 5"), c: "#E7C9D6", bg: "transparent", fw: 700 },
  { t: tk("Follicular"), d: tk("Days 6 to 13"), c: "#D9CFF5", bg: "#F4F1FB", fw: 800 },
  { t: tk("Ovulation"), d: tk("Days 14 to 16"), c: "#BFDCD6", bg: "transparent", fw: 700 },
  { t: tk("Luteal"), d: tk("Days 17 to 28"), c: "#EDE3CF", bg: "transparent", fw: 700 },
];

export const cycSeg = [
  { d: "M 61.38 14.02 A 46 46 0 0 1 68.89 14.87", c: "#E7C9D6", w: "0.050 0.150" },
  { d: "M 71.58 15.48 A 46 46 0 0 1 78.71 17.98", c: "#E7C9D6", w: "0.060 0.160" },
  { d: "M 81.19 19.17 A 46 46 0 0 1 87.59 23.19", c: "#E7C9D6", w: "0.070 0.170" },
  { d: "M 89.75 24.91 A 46 46 0 0 1 95.09 30.25", c: "#E7C9D6", w: "0.080 0.180" },
  { d: "M 96.81 32.41 A 46 46 0 0 1 100.83 38.81", c: "#E7C9D6", w: "0.090 0.190" },
  { d: "M 102.02 41.29 A 46 46 0 0 1 104.52 48.42", c: "#D9CFF5", w: "0.100 0.200" },
  { d: "M 105.13 51.11 A 46 46 0 0 1 105.98 58.62", c: "#D9CFF5", w: "0.110 0.210" },
  { d: "M 105.98 61.38 A 46 46 0 0 1 105.13 68.89", c: "#D9CFF5", w: "0.120 0.220" },
  { d: "M 104.52 71.58 A 46 46 0 0 1 102.02 78.71", c: "#D9CFF5", w: "0.130 0.230" },
  { d: "M 100.83 81.19 A 46 46 0 0 1 96.81 87.59", c: "#D9CFF5", w: "0.140 0.240" },
  { d: "M 95.09 89.75 A 46 46 0 0 1 89.75 95.09", c: "#D9CFF5", w: "0.150 0.250" },
  { d: "M 87.59 96.81 A 46 46 0 0 1 81.19 100.83", c: "#D9CFF5", w: "0.160 0.260" },
  { d: "M 78.71 102.02 A 46 46 0 0 1 71.58 104.52", c: "#D9CFF5", w: "0.170 0.270" },
  { d: "M 68.89 105.13 A 46 46 0 0 1 61.38 105.98", c: "#BFDCD6", w: "0.180 0.280" },
  { d: "M 58.62 105.98 A 46 46 0 0 1 51.11 105.13", c: "#BFDCD6", w: "0.190 0.290" },
  { d: "M 48.42 104.52 A 46 46 0 0 1 41.29 102.02", c: "#BFDCD6", w: "0.200 0.300" },
  { d: "M 38.81 100.83 A 46 46 0 0 1 32.41 96.81", c: "#EDE3CF", w: "0.210 0.310" },
  { d: "M 30.25 95.09 A 46 46 0 0 1 24.91 89.75", c: "#EDE3CF", w: "0.220 0.320" },
  { d: "M 23.19 87.59 A 46 46 0 0 1 19.17 81.19", c: "#EDE3CF", w: "0.230 0.330" },
  { d: "M 17.98 78.71 A 46 46 0 0 1 15.48 71.58", c: "#EDE3CF", w: "0.240 0.340" },
  { d: "M 14.87 68.89 A 46 46 0 0 1 14.02 61.38", c: "#EDE3CF", w: "0.250 0.350" },
  { d: "M 14.02 58.62 A 46 46 0 0 1 14.87 51.11", c: "#EDE3CF", w: "0.260 0.360" },
  { d: "M 15.48 48.42 A 46 46 0 0 1 17.98 41.29", c: "#EDE3CF", w: "0.270 0.370" },
  { d: "M 19.17 38.81 A 46 46 0 0 1 23.19 32.41", c: "#EDE3CF", w: "0.280 0.380" },
  { d: "M 24.91 30.25 A 46 46 0 0 1 30.25 24.91", c: "#EDE3CF", w: "0.290 0.390" },
  { d: "M 32.41 23.19 A 46 46 0 0 1 38.81 19.17", c: "#EDE3CF", w: "0.300 0.400" },
  { d: "M 41.29 17.98 A 46 46 0 0 1 48.42 15.48", c: "#EDE3CF", w: "0.310 0.410" },
  { d: "M 51.11 14.87 A 46 46 0 0 1 58.62 14.02", c: "#EDE3CF", w: "0.320 0.420" },
];

export const cycTodayDeg = "109.3";

export const facts = [
  { k: tk("Energy"), v: tk("310 kcal") },
  { k: tk("Protein"), v: tk("20 g") },
  { k: tk("Fat"), v: tk("22 g") },
  { k: tk("Carbs"), v: tk("8 g") },
];

export const feedPosts = [
  {
    i: "RH",
    t: tk("Best pre-run breakfast?"),
    m: tk("Rami Haddad · Running · 2 h"),
    pro: false,
    likes: "64",
    from: "12",
    r: tk("4 replies"),
    w: "0.05 0.20",
    lw: "0.1 0.9",
    bg: "#F4F1FB",
    bd: "rgba(125,103,217,.4)",
    abg: "#EDEAE4",
    aink: "#5B5349",
  },
  {
    i: "MA",
    t: tk("Protein timing for runners"),
    m: tk("Maya Aoun · Nutrition"),
    pro: true,
    likes: "128",
    from: "96",
    r: tk("18 replies"),
    w: "0.13 0.28",
    lw: "0.1 0.9",
    bg: "#FFFFFF",
    bd: "#F0EDE8",
    abg: "#DED4F4",
    aink: "#5C48A8",
  },
  {
    i: "NS",
    t: tk("First 10 km, done"),
    m: tk("Nour Saab · Running · 5 h"),
    pro: false,
    likes: "41",
    from: "20",
    r: tk("9 replies"),
    w: "0.21 0.36",
    lw: "0.1 0.9",
    bg: "#FFFFFF",
    bd: "#F0EDE8",
    abg: "#EDEAE4",
    aink: "#5B5349",
  },
];

export const forumCats = [
  { t: tk("All"), bg: "#F4F1FB", ink: "#5C48A8" },
  { t: tk("Nutrition"), bg: "#F4F1FB", ink: "#5C48A8" },
  { t: tk("Running"), bg: "#775FD7", ink: "#fff" },
  { t: tk("Strength"), bg: "#F4F1FB", ink: "#5C48A8" },
];

export const hrCurve = "0.0,56.3 3.8,52.7 7.7,48.9 11.5,44.5 15.4,39.9 19.2,35.7 23.1,33.0 26.9,28.5 30.8,27.4 34.6,26.9 38.5,27.0 42.3,26.8 46.2,29.3 50.0,32.5 53.8,31.2 57.7,31.2 61.5,27.7 65.4,27.0 69.2,22.5 73.1,19.7 76.9,18.1 80.8,16.4 84.6,12.0 88.5,11.7 92.3,15.6 96.2,16.2 100.0,16.9 103.8,22.7 107.7,24.9 111.5,27.3 115.4,29.0 119.2,31.7 123.1,32.4 126.9,28.7 130.8,28.9 134.6,27.1 138.5,23.0 142.3,20.7 146.2,18.5 150.0,14.1 153.8,14.2 157.7,13.9 161.5,15.5 165.4,14.2 169.2,19.1 173.1,19.7 176.9,24.3 180.8,28.0 184.6,29.9 188.5,38.3 192.3,43.6 196.2,49.5 200.0,55.9";

export const labPanels = [
  {
    t: tk("LIPIDS"),
    rows: [
      {
        k: "LDL",
        v: "138 mg/dL",
        st: tk("High"),
        icon: "↑",
        sc: "#5C48A8",
        sbg: "#F4F1FB",
        lo: 0,
        mid: 52,
        hi: 48,
        x: "69",
        prev: ["58%", "62%"],
        w: "0.3 0.55",
        track: true,
        open: true,
      },
      {
        k: "HDL",
        v: "52 mg/dL",
        st: tk("In range"),
        icon: "✓",
        sc: "#2F5F58",
        sbg: "#EDF4F3",
        lo: 20,
        mid: 60,
        hi: 20,
        x: "46",
        prev: ["44%"],
        w: "0.34 0.59",
        track: true,
        open: false,
      },
    ],
  },
  {
    t: tk("BLOOD COUNT"),
    rows: [
      {
        k: tk("Haemoglobin"),
        v: "14.6 g/dL",
        st: tk("In range"),
        icon: "✓",
        sc: "#2F5F58",
        sbg: "#EDF4F3",
        lo: 25,
        mid: 50,
        hi: 25,
        x: "55",
        prev: ["52%"],
        w: "0.38 0.63",
        track: true,
        open: false,
      },
      {
        k: tk("Ferritin"),
        v: "86 ng/mL",
        st: tk("In range"),
        icon: "✓",
        sc: "#2F5F58",
        sbg: "#EDF4F3",
        lo: 10,
        mid: 70,
        hi: 20,
        x: "30",
        prev: ["24%"],
        w: "0.42 0.67",
        track: true,
        open: false,
      },
    ],
  },
  {
    t: tk("VITAMINS"),
    rows: [
      {
        k: tk("Vitamin D"),
        v: "32 ng/mL",
        st: tk("In range"),
        icon: "✓",
        sc: "#2F5F58",
        sbg: "#EDF4F3",
        lo: 25,
        mid: 58,
        hi: 17,
        x: "32",
        prev: ["18%"],
        w: "0.46 0.71",
        track: true,
        open: false,
      },
      {
        k: tk("Omega-3 index"),
        v: "5.1 %",
        st: "",
        icon: "·",
        sc: "#5B5349",
        sbg: "#F1EEEA",
        lo: 0,
        mid: 0,
        hi: 0,
        x: "0",
        prev: [],
        w: "0.5 0.75",
        track: false,
        open: false,
      },
    ],
  },
];

export const laraPlan = [
  { n: "1", t: tk("Goblet squat"), sr: "3 × 10", w: "0.72 0.82" },
  { n: "2", t: tk("Romanian deadlift"), sr: "3 × 8", w: "0.79 0.89" },
  { n: "3", t: tk("Dead bug"), sr: "3 × 12", w: "0.86 0.96" },
];

export const lessons = [
  { t: tk("1 · Hips and ankles"), d: "08:12", done: true, w: "0.15 0.28", bg: "transparent", bd: "#D9D2EE" },
  { t: tk("2 · Thoracic spine"), d: "06:40", done: true, w: "0.25 0.38", bg: "transparent", bd: "#D9D2EE" },
  { t: tk("3 · Shoulders"), d: "09:05", done: true, w: "0.35 0.48", bg: "transparent", bd: "#D9D2EE" },
  { t: tk("4 · Daily flow"), d: "12:30", done: false, w: "0.45 0.58", bg: "#F4F1FB", bd: "#775FD7" },
  { t: tk("5 · Desk reset"), d: "05:20", done: false, w: "0.55 0.68", bg: "transparent", bd: "#D9D2EE" },
  { t: tk("6 · Full routine"), d: "14:10", done: false, w: "0.65 0.78", bg: "transparent", bd: "#D9D2EE" },
];

export const macroLegend = [
  { k: tk("Protein"), v: tk("128 / 165 g"), c: "#775FD7" },
  { k: tk("Carbs"), v: tk("196 / 260 g"), c: "#B9A9EE" },
  { k: tk("Fat"), v: tk("48 / 65 g"), c: "#5D9C93" },
];

export const mealLine = [
  { t: tk("Labneh breakfast"), m: tk("08:10 · labneh, zaatar, cucumber"), k: "410", c: "#775FD7", w: "0.1 0.3" },
  { t: tk("Fattoush lunch"), m: tk("13:00 · with grilled halloumi"), k: "480", c: "#B9A9EE", w: "0.3 0.5" },
  { t: tk("Mujaddara dinner"), m: tk("19:30 · lentils, rice, onions"), k: "520", c: "#5D9C93", w: "0.5 0.7" },
];

export const ormBand = { l: "77.06%", t: "10.00%", h: "10.00%", lt: "calc(20.00% + 3px)" };

export const ormDots = [
  { x: "0.00%", y: "93.33%", w: "0.100 0.140" },
  { x: "3.67%", y: "83.33%", w: "0.125 0.165" },
  { x: "6.42%", y: "86.67%", w: "0.150 0.190" },
  { x: "10.09%", y: "86.67%", w: "0.175 0.215" },
  { x: "12.84%", y: "80.00%", w: "0.200 0.240" },
  { x: "16.51%", y: "70.00%", w: "0.225 0.265" },
  { x: "19.27%", y: "73.33%", w: "0.250 0.290" },
  { x: "22.94%", y: "70.00%", w: "0.275 0.315" },
  { x: "25.69%", y: "60.00%", w: "0.300 0.340" },
  { x: "29.36%", y: "60.00%", w: "0.325 0.365" },
  { x: "32.11%", y: "56.67%", w: "0.350 0.390" },
  { x: "35.78%", y: "46.67%", w: "0.375 0.415" },
  { x: "38.53%", y: "43.33%", w: "0.400 0.440" },
  { x: "42.20%", y: "46.67%", w: "0.425 0.465" },
  { x: "44.95%", y: "46.67%", w: "0.450 0.490" },
  { x: "48.62%", y: "40.00%", w: "0.475 0.515" },
  { x: "51.38%", y: "40.00%", w: "0.500 0.540" },
  { x: "55.05%", y: "33.33%", w: "0.525 0.565" },
  { x: "57.80%", y: "36.67%", w: "0.550 0.590" },
  { x: "61.47%", y: "26.67%", w: "0.575 0.615" },
  { x: "64.22%", y: "33.33%", w: "0.600 0.640" },
  { x: "67.89%", y: "20.00%", w: "0.625 0.665" },
  { x: "70.64%", y: "30.00%", w: "0.650 0.690" },
  { x: "74.31%", y: "23.33%", w: "0.675 0.715" },
  { x: "77.06%", y: "20.00%", w: "0.700 0.740" },
  { x: "80.73%", y: "16.67%", w: "0.725 0.765" },
  { x: "83.49%", y: "13.33%", w: "0.750 0.790" },
  { x: "87.16%", y: "13.33%", w: "0.775 0.815" },
  { x: "89.91%", y: "13.33%", w: "0.800 0.840" },
  { x: "93.58%", y: "13.33%", w: "0.825 0.865" },
  { x: "96.33%", y: "13.33%", w: "0.850 0.890" },
  { x: "100.00%", y: "10.00%", w: "0.875 0.915" },
];

export const ormGrid = ["0", "33.33", "66.67"];

export const ormLifts = [
  { t: tk("Bench press"), on: "true", bg: "#2F5F58", ink: "#FFFFFF" },
  { t: tk("Back squat"), on: "false", bg: "transparent", ink: "#3D6E69" },
  { t: tk("Deadlift"), on: "false", bg: "transparent", ink: "#3D6E69" },
];

export const ormPRs = [
  { x: "32.11%", y: "56.67%", kg: "81.5", d: tk("6 Aug"), lx: "6px", w: "0.350 0.450" },
  { x: "67.89%", y: "20.00%", kg: "87.0", d: tk("14 Sep"), lx: "-136px", w: "0.625 0.725" },
  { x: "100.00%", y: "10.00%", kg: "88.5", d: tk("19 Oct"), lx: "-136px", w: "0.875 0.975" },
];

export const ormTrend = "0.0,87.78 11.0,87.50 19.3,86.00 30.3,81.33 38.5,79.33 49.5,76.00 57.8,70.67 68.8,66.67 77.1,64.00 88.1,58.67 96.3,53.33 107.3,50.67 115.6,48.00 126.6,44.67 134.9,43.33 145.9,41.33 154.1,39.33 165.1,35.33 173.4,34.00 184.4,30.00 192.7,29.33 203.7,26.67 211.9,25.33 222.9,22.00 231.2,20.67 242.2,17.33 250.5,15.33 261.5,14.00 269.7,13.33 280.7,12.67 289.0,12.50 300.0,11.11";

export const ormX = [
  { t: tk("Jul"), x: "0.00%", tx: "0%" },
  { t: tk("Aug"), x: "27.52%", tx: "-50%" },
  { t: tk("Sep"), x: "55.96%", tx: "-50%" },
  { t: tk("Oct"), x: "83.49%", tx: "-50%" },
];

export const plSets = [
  { n: 1, kg: "50", reps: 10, mark: "W", mb: "#F4F1FB", mc: "#5C48A8", bg: "transparent", w: "0.05 0.20", mw: "0.20 0.30" },
  { n: 2, kg: "65", reps: 8, mark: "", mb: "", mc: "", bg: "transparent", w: "0.15 0.30", mw: "5 6" },
  { n: 3, kg: "70", reps: 8, mark: "PR", mb: "#2F5F58", mc: "#fff", bg: "#EDF4F3", w: "0.25 0.40", mw: "0.5 0.62" },
  { n: 4, kg: "70", reps: 6, mark: "F", mb: "#F6F3EE", mc: "#756D63", bg: "transparent", w: "0.35 0.50", mw: "0.50 0.60" },
];

export const proFilters = [
  { t: tk("All"), bg: "#FFFFFF", ink: "#5B5349", bd: "#E0DDD6" },
  { t: tk("Dietitian"), bg: "#2F5F58", ink: "#fff", bd: "#2F5F58" },
  { t: tk("Trainer"), bg: "#FFFFFF", ink: "#5B5349", bd: "#E0DDD6" },
  { t: tk("Physio"), bg: "#FFFFFF", ink: "#5B5349", bd: "#E0DDD6" },
];

export const proList = [
  {
    i: "LK",
    n: tk("Lara Khoury"),
    m: tk("Dietitian · Beirut · online"),
    w: "0.02 0.14",
    bd: "rgba(94,158,149,.45)",
    bg: "#F3F9F7",
    abg: "#DAEAE7",
    aink: "#3D6E69",
  },
  { i: "HS", n: tk("Hadi Saleh"), m: tk("Dietitian · Jounieh"), w: "0.08 0.20", bd: "#F0EDE8", bg: "#FFFFFF", abg: "#DED4F4", aink: "#5C48A8" },
];

export const recTimeline = [
  { d: tk("12 Mar"), t: tk("GP visit notes"), m: tk("Dr. Rami Nassar"), w: "0.05 0.20", dot: "#D9D2EE", bd: "#F0EDE8", bg: "#FFFFFF" },
  { d: tk("2 Jun"), t: tk("Vitamin D retest"), m: tk("Hayek Lab"), w: "0.13 0.28", dot: "#D9D2EE", bd: "#F0EDE8", bg: "#FFFFFF" },
  { d: tk("18 Jul"), t: tk("Knee X-ray"), m: tk("Clemenceau MC"), w: "0.21 0.36", dot: "#D9D2EE", bd: "#F0EDE8", bg: "#FFFFFF" },
  { d: tk("9 Sep"), t: tk("Physio summary"), m: tk("Dana Azar"), w: "0.29 0.44", dot: "#D9D2EE", bd: "#F0EDE8", bg: "#FFFFFF" },
  { d: tk("14 Oct"), t: tk("Blood panel"), m: tk("Hayek Lab · 20 markers"), w: "0.37 0.52", dot: "#775FD7", bd: "rgba(125,103,217,.45)", bg: "#FAF9FE" },
];

export const replies = [
  {
    n: tk("Maya Aoun"),
    pro: true,
    t: tk("Oats with labneh and honey, about 90 minutes before."),
    likes: "48",
    bg: "#FAF9FE",
    bd: "rgba(125,103,217,.22)",
    w: "0.10 0.28",
    lw: "0.20 0.95",
  },
  {
    n: tk("Lara Khoury"),
    pro: true,
    t: tk("Keep it under 400 kcal and finish eating 90 minutes before you start."),
    likes: "36",
    bg: "#FAF9FE",
    bd: "rgba(125,103,217,.22)",
    w: "0.28 0.46",
    lw: "0.38 0.95",
  },
  { n: tk("Nour Saab"), pro: false, t: tk("Banana and dates if I run early."), likes: "21", bg: "#FFFFFF", bd: "#F0EDE8", w: "0.46 0.64", lw: "0.56 0.95" },
  { n: tk("Georges Karam"), pro: false, t: tk("Same here, plus a small coffee."), likes: "9", bg: "#FFFFFF", bd: "#F0EDE8", w: "0.64 0.82", lw: "0.74 0.95" },
];

export const worked = [
  { t: tk("Chest"), w: "0.15 0.3" },
  { t: tk("Shoulders"), w: "0.3 0.45" },
  { t: tk("Triceps"), w: "0.42 0.57" },
  { t: tk("Core"), w: "0.6 0.75" },
];

export const zoneTime = [
  { z: "Z1", m: tk("6 min") },
  { z: "Z2", m: tk("14 min") },
  { z: "Z3", m: tk("18 min") },
  { z: "Z4", m: tk("11 min") },
  { z: "Z5", m: tk("3 min") },
];
