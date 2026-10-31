import { tk, tn } from "../../../../i18n/core";
import { appLocale } from "../../../../i18n/format";
// Centium landing v29: section 06's slides, a literal port of the
// prototype's data() eco block (Centium Site v29.dc.html: row, grid,
// proSlides, bizSlides, v11slide, MOBK, mobKey, ecoSets). Two sets of five
// slides, Professionals and Businesses (the business order is the
// prototype's [1, 3, 2, 4, 0] reshuffle, renumbered 01 to 05). On desktop each
// slide shows its app-window graphic; below 1024px the mobile copy and
// graphic of MOBK replace them. The Lebanese names, counts and places are
// approved demo data.
//
// Karim's decision (binding): the plan builder shows exercises on desktop
// too, not meals. The desktop PLAN BUILDER slide keeps the prototype's
// layout, colours and motion (library, four day columns, legend, the third
// column's first item dropped in), with Rami's exercises in place of the
// meals; its strings are new and listed in design-handover B2.md.

type Tone = { sb: string; sc: string };
const lav = { bg: "#DED4F4", ink: "#5C48A8" },
  tea = { bg: "#DAEAE7", ink: "#3D6E69" };
const okC: Tone = { sb: "#EDF4F3", sc: "#2F5F58" },
  warnC: Tone = { sb: "#FBF2E6", sc: "#91642C" },
  lavC: Tone = { sb: "#F4F1FB", sc: "#5C48A8" };

export interface Row {
  rad: string;
  abg: string;
  aink: string;
  w: string;
  bw: string;
  bc: string;
  ver: boolean;
  bar: string;
  sb: string;
  sc: string;
  av: string;
  a: string;
  m: string;
  s: string;
  ring?: number;
}

const row = (o: Partial<Row> & { av: string; a: string; m: string; s: string }, i: number): Row =>
  Object.assign(
    {
      rad: "99px",
      abg: i % 2 ? tea.bg : lav.bg,
      aink: i % 2 ? tea.ink : lav.ink,
      w: (0.05 + i * 0.12).toFixed(2) + " " + (0.3 + i * 0.12).toFixed(2),
      bw: (0.2 + i * 0.1).toFixed(2) + " " + (0.7 + i * 0.06).toFixed(2),
      bc: "#775FD7",
      ver: false,
      bar: "",
    },
    okC,
    o,
  );

export interface Cell {
  t: string;
  bg: string;
  on?: boolean;
  n?: string;
  c?: string;
  w?: string;
  ink?: string;
  op0?: string;
}

const grid = (sess: [number, number, string, string, number][]): Cell[] => {
  const cells: Cell[] = [];
  ["09", "12", "15", "18"].forEach((t, ri) => {
    cells.push({ t, bg: "transparent" });
    for (let d = 0; d < 5; d++) {
      const s = sess.find((x) => x[0] === ri && x[1] === d);
      cells.push(
        s
          ? { t: "", bg: "#F6F4FA", on: true, n: s[2], c: s[3], ink: s[3] === "#B9A9EE" ? "#3E2C80" : "#FFFFFF", w: (0.05 + s[4] * 0.1).toFixed(2) + " " + (0.2 + s[4] * 0.1).toFixed(2) }
          : { t: "", bg: "#F6F4FA" },
      );
    }
  });
  return cells;
};

export interface Slide {
  i: number;
  c: string;
  bg: string;
  k: string;
  t: string;
  d: string;
  url: string;
  head: string;
  sub: string;
  isRows?: boolean;
  isGrid?: boolean;
  isChat?: boolean;
  isPlan?: boolean;
  isWater?: boolean;
  isHeat?: boolean;
  isDesk?: boolean;
  isStack?: boolean;
  isGantt?: boolean;
  isGym?: boolean;
  rows?: Row[];
  days?: string[];
  cells?: Cell[];
  inbox?: { i: string; n: string; dot: boolean; bg: string }[];
  msgs?: { t: string; side: string; bg: string; ink: string; w: string }[];
  lib?: { t: string; c: string; bg: string; bd: string; ink: string }[];
  legend?: { t: string; c: string }[];
  cols?: { d: string; kc: string; ink: string; bg: string; bar: string; fill: string; bw: string; items: { t: string; m: string; w: string; tx: string; bg: string; bd: string; ink: string }[] }[];
  wf?: { t: string; v: string; c: string; ink: string; l: string; wd: string; mid: string; b: string; h: string; cl: string; cw: string; ct: string; w: string }[];
  ticks?: { t: string; y: string }[];
  seg?: { k: string; t: string; n: string; m: string; f: number; c: string; ink: string; w: string }[];
  hours?: string[];
  staff?: { i: string; n: string; r: string; s: string; c: string; ver: boolean; l: string; wd: string; w: string; abg: string; aink: string }[];
  feed?: { i: string; n: string; t: string; s: string; sc: string; bg: string; ink: string; w: string }[];
  next?: { t: string; n: string; s: string; c: string; w: string }[];
  info?: { k: string; v: string; w: string }[];
  // Mobile (MOBK) fields.
  mRoster?: boolean;
  mPlan?: boolean;
  mTimeline?: boolean;
  mChat?: boolean;
  mArea?: boolean;
  mClasses?: boolean;
  mDesk?: boolean;
  mBars?: boolean;
  mStaff?: boolean;
  mGym?: boolean;
  mh?: string;
  ms?: string;
  mx?: string;
  mxs?: string;
  mfoot?: string;
  mtop?: string;
  mline?: string;
  marea?: string;
  mca?: string;
  mcn?: string;
  mct?: string;
  mhrs?: string[];
  /** The months under the mobile earnings chart (the prototype keeps them in mb). */
  mMonths?: string[];
  mb?: MobItem[];
  mpts?: { x: string; y: string; s: string; m: string; w: string }[];
}

/** One row of a mobile graphic (MOBK mb): each graphic reads its own fields. */
export interface MobItem {
  a?: string;
  n?: string;
  t?: string;
  s?: string;
  c?: string;
  i?: string;
  r?: string;
  l?: string;
  w?: string;
  f?: string;
  bg?: string;
  bar?: string;
  ink?: string;
  side?: string;
  plan?: string;
  p?: string;
  pr?: string;
  on?: string;
  due?: boolean;
  nodue?: boolean;
  days?: { c: string; w: string }[];
}

type Draft = Omit<Slide, "i" | "c" | "bg">;

const st = (i: number, a: number, d: number) => (a + i * d).toFixed(2) + " " + (a + i * d + 0.18).toFixed(2);

/** The exercises of the desktop plan builder (Karim: exercises on desktop and mobile). */
const LIFT = {
  "Upper body": { c: "#775FD7", bg: "#F4F1FB", bd: "#D9CFF5", ink: "#4E3894" },
  "Lower body": { c: "#5D9C93", bg: "#EDF4F3", bd: "#BFDCD6", ink: "#2F5F58" },
  Core: { c: "#4E3894", bg: "#E9E3FA", bd: "#CBBDF3", ink: "#3E2C80" },
};
type Lift = keyof typeof LIFT;

/** The prototype's v11slide: four slides get their round-11 graphic. */
function v11slide(x: Draft, lg: boolean): Draft {
  const k = (x.k || "").split(" · ")[1] || "";
  if (k === "SHARED PLAN") {
    const cols: [string, [string, Lift, number, string][]][] = [
      [tk("Mon"), [[tk("Bench press"), tk("Upper body"), 4, "4 x 8"], [tk("Seated row"), tk("Upper body"), 3, "3 x 10"], [tk("Shoulder press"), tk("Upper body"), 3, "3 x 10"]]],
      [tk("Tue"), [[tk("Back squat"), tk("Lower body"), 4, "4 x 6"], [tk("Romanian deadlift"), tk("Lower body"), 3, "3 x 8"]]],
      [tk("Thu"), [[tk("Pull-ups"), tk("Upper body"), 3, "3 x 8"], [tk("Plank"), tk("Core"), 3, "3 x 45 s"]]],
      [tk("Sat"), [[tk("Goblet squat"), tk("Lower body"), 3, "3 x 10"], [tk("Dead bug"), tk("Core"), 3, "3 x 12"]]],
    ];
    const lib: [string, Lift][] = [
      [tk("Bench press"), tk("Upper body")],
      [tk("Seated row"), tk("Upper body")],
      [tk("Back squat"), tk("Lower body")],
      [tk("Romanian deadlift"), tk("Lower body")],
      [tk("Plank"), tk("Core")],
      [tk("Dead bug"), tk("Core")],
    ];
    return Object.assign({}, x, {
      isRows: false,
      isPlan: true,
      k: x.k.replace(tk("SHARED PLAN"), tk("PLAN BUILDER")),
      t: tk("Drag a week together."),
      d: tk("Pick exercises from your library and drop them into days. Rami sees the plan the moment you save."),
      head: tk("Strength block · week 3"),
      sub: tk("For Rami Haddad"),
      lib: (lg ? lib : []).map(([t, m]) => Object.assign({ t }, LIFT[m])),
      legend: [...(Object.keys(LIFT) as Lift[]).map((t): { t: string; c: string } => ({ t, c: LIFT[t].c })), { t: tk("Day totals in sets"), c: "#FFFFFF" }],
      cols: cols.slice(0, lg ? 4 : 2).map(([d, items], ci) => {
        const sets = items.reduce((a, it) => a + it[2], 0);
        return {
          d,
          kc: tn(sets, "{n} set", "{n} sets"),
          ink: "#4E3894",
          bg: ci % 2 ? "#F6FAF9" : "#FAF9FE",
          bar: ci % 2 ? "#5D9C93" : "#775FD7",
          fill: ((items.length / 3) * 100).toFixed(1) + "%",
          bw: st(ci, 0.5, 0.1),
          items: items.map(([t, m, , sr], ii) => ({
            t,
            m: sr,
            w: st(ci * 2 + ii, 0.05, 0.09),
            tx: String(-60 - ci * 30),
            bg: LIFT[m].bg,
            bd: ci === 2 && ii === 0 ? LIFT[m].c : LIFT[m].bd,
            ink: LIFT[m].ink,
          })),
        };
      }),
    });
  }
  if (k === "EARNINGS") {
    const Y = (v: number) => ((v - 1500) / 1000) * 100,
      step = 19.5,
      wd = 15,
      l0 = 2.5;
    let run = 0;
    const B: [string, "total" | "up" | "down", number, string, string, string][] = [
      [tk("September"), "total", 1960, "#BFDCD6", "#2F5F58", "$1,960"],
      [tk("3 new clients"), "up", 260, "#5D9C93", "#2F5F58", "+$260"],
      [tk("Summer group program"), "up", 180, "#775FD7", "#4E3894", "+$180"],
      [tk("Fewer single sessions"), "down", 60, "#DED4F4", "#5C48A8", "−$60"],
      [tk("October"), "total", 2340, "#2F5F58", "#2F5F58", "$2,340"],
    ];
    const wf = B.map(([t, kind, v, c, ink, lab], i) => {
      let lo: number, hi: number;
      if (kind === "total") {
        lo = 1500;
        hi = v;
        run = v;
      } else if (kind === "up") {
        lo = run;
        hi = run + v;
        run = hi;
      } else {
        hi = run;
        lo = run - v;
        run = lo;
      }
      const l = l0 + i * step;
      return {
        t,
        v: lab,
        c,
        ink,
        l: l.toFixed(2) + "%",
        wd: wd + "%",
        mid: (l + wd / 2).toFixed(2) + "%",
        b: Y(lo).toFixed(2) + "%",
        h: (Y(hi) - Y(lo)).toFixed(2) + "%",
        cl: (l + wd).toFixed(2) + "%",
        cw: i < B.length - 1 ? (step - wd).toFixed(2) + "%" : "0%",
        ct: Y(run).toFixed(2) + "%",
        w: (0.1 + i * 0.16).toFixed(2) + " " + (0.28 + i * 0.16).toFixed(2),
      };
    });
    return Object.assign({}, x, {
      isWater: true,
      t: tk("See what changed your month."),
      d: tk("October against September, step by step: what added to your earnings and what took away."),
      head: tk("Earnings bridge"),
      sub: tk("September to October"),
      wf,
      ticks: [2500, 2250, 2000, 1750, 1500].map((v) => ({ t: "$" + v.toLocaleString(appLocale("en-US")), y: (100 - Y(v)).toFixed(2) + "%" })),
    });
  }
  if (k === "CLASSES") {
    const times = ["06:30", "09:00", "12:00", "17:30", "19:00"],
      days = [tk("Mon"), tk("Tue"), tk("Wed"), tk("Thu"), tk("Fri"), tk("Sat"), tk("Sun")];
    const cap = [
      [95, 60, 90, 100, 85, 40, 0],
      [40, 55, 35, 50, 45, 70, 30],
      [60, 0, 65, 0, 55, 0, 0],
      [80, 90, 75, 95, 70, 0, 0],
      [100, 85, 95, 100, 90, 60, 45],
    ];
    const cells: Cell[] = [];
    times.forEach((tm, r) => {
      cells.push({ t: tm, bg: "transparent", ink: "#756D63", op0: "1", w: "-2 -1" });
      cap[r].forEach((c, d) => {
        const a = c / 100;
        // WCAG AA (4.5:1 at 9px): the prototype's split (white above 55%,
        // #4E3894 below) left 35 to 75% at 3.0 to 4.4:1. Ink #221E1A up to 60%
        // (5.0:1 or more); white from 65% on a fill no lighter than 0.77
        // (4.9:1 or more), so 65 to 75% take the 80% shade.
        const light = a >= 0.65;
        cells.push({
          t: c ? (c >= 100 ? tk("Full") : c + "%") : "",
          bg: c ? "rgba(78,56,148," + (light ? Math.max(0.1 + a * 0.85, 0.77) : 0.1 + a * 0.85).toFixed(2) + ")" : "#FAF9F7",
          ink: light ? "#FFFFFF" : "#221E1A",
          op0: "0",
          w: st(r * 7 + d, 0.02, 0.018),
        });
      });
    });
    return Object.assign({}, x, {
      isRows: false,
      isHeat: true,
      t: tk("See every class at a glance."),
      d: tk("Capacity across the week as a heat map. Full classes open a waitlist on their own."),
      head: tk("Timetable · this week"),
      sub: tk("Atlas Fitness"),
      days,
      cells,
    });
  }
  if (k === "MEMBERSHIPS")
    return Object.assign({}, x, {
      isRows: false,
      isStack: true,
      head: tk("Membership mix"),
      sub: tk("Active members"),
      seg: (
        [
          [tk("Monthly"), "212", tk("Renews monthly"), 212, "#4E3894", "#FFFFFF"],
          [tk("Quarterly"), "98", tk("Every 3 months"), 98, "#775FD7", "#FFFFFF"],
          [tk("Annual"), "64", tk("Paid yearly"), 64, "#B9A9EE", "#221E1A"],
          [tk("Day pass"), "41", tk("This month, at the desk"), 41, "#DED4F4", "#221E1A"],
        ] as [string, string, string, number, string, string][]
      ).map(([kk, n, m, f, c, ink], i) => ({ k: kk.toUpperCase(), t: kk, n, m, f, c, ink, w: st(i, 0.1, 0.12) })),
    });
  if (k === "TEAM")
    return Object.assign({}, x, {
      isRows: false,
      isGantt: true,
      head: tk("Today's shifts"),
      sub: tk("Thursday"),
      hours: ["06", "09", "12", "15", "18", "21"],
      staff: (
        [
          ["KN", tk("Karim Nassar"), tk("Head coach"), 0, 8, tk("Floor 06:00"), "#4A7D76"],
          ["JD", tk("Joelle Daher"), tk("Coach"), 1, 6, tk("Spin, Pilates"), "#775FD7"],
          ["DA", tk("Dana Azar"), tk("Physio, linked"), 4, 5, tk("Sessions"), "#4A7D76", 1],
          ["ST", tk("Sami Tannous"), tk("Front desk"), 8, 9, tk("Desk 14:00"), "#91642C"],
          ["RH", tk("Rita Haddad"), tk("Owner"), 3, 6, tk("Floor"), "#4A7D76"],
        ] as [string, string, string, number, number, string, string, number?][]
      ).map(([i, n, r, from, len, sTxt, c, ver], j) => ({
        i,
        n,
        r,
        s: sTxt,
        c,
        ver: !!ver,
        l: ((from / 17) * 100).toFixed(1) + "%",
        wd: ((len / 17) * 100).toFixed(1) + "%",
        w: st(j, 0.1, 0.12),
        abg: j % 2 ? "#DAEAE7" : "#DED4F4",
        aink: j % 2 ? "#3D6E69" : "#5C48A8",
      })),
    });
  return x;
}

function proDrafts(): Draft[] {
  return [
    {
      k: "01 · CLIENTS",
      t: tk("Your whole roster at a glance."),
      d: tk("See who logged, who needs a check-in and how each plan is going."),
      url: "app/pro/clients",
      head: tk("Clients"),
      sub: tk("Today"),
      isRows: true,
      rows: (
        [
          ["HM", tk("Hala Mansour"), tk("Active 12 min ago · 3 meals logged"), "86%", tk("Logged")],
          ["RH", tk("Rami Haddad"), tk("Active 1 h ago · PR yesterday"), "72%", tk("Logged")],
          ["RS", tk("Rana Sleiman"), tk("Last active Monday"), "40%", tk("Check-in due"), 1],
          ["JK", tk("Joseph Khalil"), tk("Active today · plan shared"), "64%", tk("New plan"), 2],
          ["KK", tk("Kimo Khaldi"), tk("Active today · breakfast logged"), "58%", tk("Logged")],
        ] as [string, string, string, string, string, number?][]
      ).map((x, i) => row({ av: x[0], a: x[1], m: x[2], ring: parseInt(x[3]) / 100, s: x[4], ...(x[5] === 1 ? warnC : x[5] === 2 ? lavC : {}) }, i)),
    },
    {
      k: "02 · SHARED PLAN",
      t: tk("Build once, share with every client."),
      d: tk("Edit a plan and it updates on your client side the moment you save."),
      url: "app/pro/plans",
      head: tk("High protein · week 3"),
      sub: tk("Shared with 4 clients"),
      isRows: true,
    },
    {
      k: "03 · SCHEDULE",
      t: tk("Sessions, calls and check-ins in one week."),
      d: tk("Clients book your free slots. You see every session in one calendar."),
      url: "app/pro/schedule",
      head: tk("This week"),
      sub: tk("9 sessions"),
      isGrid: true,
      days: [tk("Mon"), tk("Tue"), tk("Wed"), tk("Thu"), tk("Fri")],
      cells: grid([
        [0, 0, tk("Hala · consult"), "#775FD7", 0],
        [0, 2, tk("Rana · call"), "#4A7D76", 1],
        [1, 1, tk("Joseph · consult"), "#775FD7", 2],
        [1, 3, tk("Group talk"), "#4E3894", 3],
        [2, 0, tk("Kimo · call"), "#4A7D76", 4],
        [2, 4, tk("Hala · consult"), "#775FD7", 5],
        [3, 3, tk("Rami · video"), "#2F5F58", 6],
        [3, 1, tk("Rana · consult"), "#775FD7", 7],
        [3, 4, tk("Check-ins"), "#B9A9EE", 8],
      ]),
    },
    {
      k: "04 · MESSAGES AND CALLS",
      t: tk("Talk to clients where their data lives."),
      d: tk("Messages, voice and video calls sit next to the plan and the history."),
      url: "app/pro/messages",
      head: tk("Messages"),
      sub: tk("2 unread"),
      isChat: true,
      inbox: (
        [
          ["RH", tk("Rami Haddad"), 1],
          ["HM", tk("Hala Mansour"), 1],
          ["KK", tk("Kimo Khaldi"), 0],
          ["RS", tk("Rana Sleiman"), 0],
        ] as [string, string, number][]
      ).map(([i, n, dot], j) => ({ i, n, dot: !!dot, bg: j === 0 ? "#F4F1FB" : "transparent" })),
      msgs: (
        [
          [tk("Can we move Thursday to 18:00?"), 0],
          [tk("Done. See you then."), 1],
          [tk("Thank you! My log is up to date."), 0],
        ] as [string, number][]
      ).map(([t, me], i) => ({
        t,
        side: me ? "flex-end" : "flex-start",
        bg: me ? "#2F5F58" : "#FFFFFF",
        ink: me ? "#fff" : "#221E1A",
        w: (0.15 + i * 0.18).toFixed(2) + " " + (0.35 + i * 0.18).toFixed(2),
      })),
    },
    {
      k: "05 · EARNINGS",
      t: tk("See what your practice earns."),
      d: tk("Sessions and plans paid through Centium, month by month, with what is still to come."),
      url: "app/pro/earnings",
      head: tk("Earnings"),
      sub: tk("October"),
    },
  ];
}

function bizDrafts(): Draft[] {
  const x: Draft[] = [
    {
      k: "01 · GYM PAGE",
      t: tk("Put your gym on the map."),
      d: tk("A public page with your hours, classes and team, found inside Centium."),
      url: "app/biz/page",
      head: tk("Gym page"),
      sub: tk("Live"),
      isGym: true,
      next: (
        [
          ["06:30", tk("HIIT 45 · Karim Nassar"), tk("Full · 3 waitlist"), "#91642C"],
          ["09:00", tk("Spin · Joelle Daher"), "16 / 20", "#2F5F58"],
          ["12:00", tk("Pilates · Dana Azar"), "9 / 15", "#2F5F58"],
        ] as [string, string, string, string][]
      ).map(([t, n, s2, c], i) => ({ t, n, s: s2, c, w: (0.55 + i * 0.1).toFixed(2) + " " + (0.7 + i * 0.1).toFixed(2) })),
      info: (
        [
          [tk("HOURS"), tk("06:00 to 23:00")],
          [tk("CLASSES"), tk("28 a week")],
          [tk("TEAM"), tk("9 people")],
        ] as [string, string][]
      ).map(([k, v], i) => ({ k, v, w: (0.4 + i * 0.12).toFixed(2) + " " + (0.6 + i * 0.12).toFixed(2) })),
    },
    {
      k: "02 · CLASSES",
      t: tk("Bookings and waitlists that run themselves."),
      d: tk("Members book from their phone. When a class fills, the waitlist takes over."),
      url: "app/biz/classes",
      head: tk("Tomorrow"),
      sub: tk("4 classes"),
      isRows: true,
    },
    {
      k: "03 · MEMBERSHIPS",
      t: tk("Memberships, digitised."),
      d: tk("Plans, renewals and member cards live in the app, not in a drawer."),
      url: "app/biz/memberships",
      head: tk("Membership plans"),
      sub: tk("October"),
      isRows: true,
    },
    {
      k: "04 · FRONT DESK",
      t: tk("Check members in with one scan."),
      d: tk("Scan a member card at the desk. Renewals due show up right away."),
      url: "app/biz/desk",
      head: tk("Front desk"),
      sub: tk("Live"),
      isDesk: true,
      feed: (
        [
          ["NS", tk("Nour Saab"), "18:02", tk("In")],
          ["GK", tk("Georges Karam"), "18:04", tk("In")],
          ["YC", tk("Yasmina Chahine"), "18:05", tk("Renew"), 1],
          ["TM", tk("Tarek Mouawad"), "18:07", tk("In")],
        ] as [string, string, string, string, number?][]
      ).map((f, i) => ({
        i: f[0],
        n: f[1],
        t: f[2],
        s: f[3],
        sc: f[4] ? "#91642C" : "#2F5F58",
        bg: i % 2 ? tea.bg : lav.bg,
        ink: i % 2 ? tea.ink : lav.ink,
        w: (0.15 + i * 0.15).toFixed(2) + " " + (0.35 + i * 0.15).toFixed(2),
      })),
    },
    {
      k: "05 · TEAM",
      t: tk("Your team and linked professionals."),
      d: tk("Coaches, front desk and verified professionals working from one place."),
      url: "app/biz/team",
      head: tk("Team"),
      sub: tk("Today"),
      isRows: true,
    },
  ];
  return [x[1], x[3], x[2], x[4], x[0]];
}

type MobK = Partial<Slide> & { t: string; d: string };

/** The mobile copy and graphics (prototype MOBK; 02_pages/13b). */
function mobk(twoBubbles: boolean): Record<string, MobK> {
  return {
    CLIENTS: {
      t: tk("Your whole roster at a glance."),
      d: tk("See who logged and who needs a check-in."),
      mRoster: true,
      mfoot: tk("Average adherence 66%"),
      mb: (
        [
          ["HM", tk("Hala Mansour"), tk("Upper / Lower"), 86, 1, 0, [1, 1, 1, 0, 1, 1, 0]],
          ["RH", tk("Rami Haddad"), tk("High protein"), 72, 0, 0, [1, 0, 1, 1, 0, 1, 0]],
          ["RS", tk("Rana Sleiman"), tk("Mobility"), 40, 0, 1, [1, 0, 0, 1, 0, 0, 0]],
        ] as [string, string, string, number, number, number, number[]][]
      ).map(([a, n, plan, p, on, due, days], i) => ({
        a,
        n,
        plan,
        p: p + "%",
        pr: String(p / 100),
        on: on ? tk("block") : "none",
        due: !!due,
        nodue: !due,
        w: (0.05 + i * 0.12).toFixed(2) + " " + (0.4 + i * 0.12).toFixed(2),
        days: days.map((d2, k) => ({ c: d2 ? "#5D9C93" : "#D9D2EE", w: (0.4 + k * 0.05).toFixed(2) + " " + (0.45 + k * 0.05).toFixed(2) })),
      })),
    },
    "PLAN BUILDER": {
      t: tk("Drag a week together."),
      d: tk("Build a plan once. Rami sees it when you save."),
      mPlan: true,
      mh: tk("Monday"),
      ms: tk("Upper body · Rami"),
      mb: (
        [
          [tk("Bench press"), "4 x 8"],
          [tk("Seated row"), "3 x 10"],
          [tk("Shoulder press"), "3 x 10"],
        ] as [string, string][]
      ).map(([n, s2]) => ({ n, s: s2 })),
      mx: tk("+ Pull-ups"),
      mxs: "3 x 8",
    },
    SCHEDULE: {
      t: tk("Your day in one timeline."),
      d: tk("Sessions and calls, booked into your free slots."),
      mTimeline: true,
      mb: (
        [
          ["09:00", tk("Hala Mansour"), tk("Consult"), "#775FD7", "#EDE8FB"],
          ["12:00", tk("Joseph Khalil"), tk("Consult"), "#775FD7", "#EDE8FB"],
          ["18:00", tk("Rami Haddad"), tk("Video call"), "#2F5F58", "#DDF0EC"],
        ] as [string, string, string, string, string][]
      ).map(([t, n, s2, c, bg]) => ({ t, n, s: s2, c, bg })),
    },
    "MESSAGES AND CALLS": {
      t: tk("Talk where the data lives."),
      d: tk("Messages and calls sit next to the plan."),
      mChat: true,
      mb: (
        [
          [tk("Can we move Thursday to 18:00?"), 0],
          [tk("Done. See you then."), 1],
          [tk("Thanks! My log is up to date."), 0],
        ] as [string, number][]
      )
        .slice(0, twoBubbles ? 2 : 3)
        .map(([t, me]) => ({ t, side: me ? "flex-end" : "flex-start", bg: me ? "#2F5F58" : "#FFFFFF", ink: me ? "#FFFFFF" : "#221E1A" })),
      mca: "RH",
      mcn: tk("Rami Haddad"),
      mct: tk("Video call · Thu 18:00"),
    },
    EARNINGS: {
      t: tk("See what your practice earns."),
      d: tk("Month by month, paid through Centium."),
      mArea: true,
      mh: "$2,340",
      ms: tk("October"),
      mtop: "$2,340",
      mfoot: tk("Next payout 1 Nov"),
      mMonths: [tk("Jul"), tk("Aug"), tk("Sep"), tk("Oct")],
      mline: "0,72 100,50 200,36 300,12",
      marea: "M0,120 L0,72 L100,50 L200,36 L300,12 L300,120 Z",
      mpts: (
        [
          [0, 72],
          [100, 50],
          [200, 36],
          [300, 12],
        ] as [number, number][]
      ).map(([x, y], k) => ({
        x: x / 3 + "%",
        y: y / 1.2 + "%",
        s: k === 3 ? "12px" : "8px",
        m: k === 3 ? "-6px 0 0 -6px" : "-4px 0 0 -4px",
        w: (0.2 + k * 0.15).toFixed(2) + " " + (0.3 + k * 0.15).toFixed(2),
      })),
    },
    CLASSES: {
      t: tk("Classes that fill themselves."),
      d: tk("Members book from their phone. Waitlists take over."),
      mClasses: true,
      mb: (
        [
          ["06:30", tk("HIIT 45"), tk("Karim Nassar"), tk("Waitlist"), "100%", "#91642C", "#C99A5B"],
          ["09:00", tk("Spin"), tk("Joelle Daher"), "16/20", "80%", "#4E3894", "#775FD7"],
          ["12:00", tk("Pilates"), tk("Dana Azar"), "9/15", "60%", "#4E3894", "#775FD7"],
        ] as [string, string, string, string, string, string, string][]
      ).map(([t, n, i, c, f, ink, bar]) => ({ t, n, i, c, f, ink, bar })),
    },
    "FRONT DESK": {
      t: tk("Check members in with one scan."),
      d: tk("Renewals due show up right away."),
      mDesk: true,
      mh: "86",
      mb: (
        [
          ["NS", tk("Nour Saab"), "18:02"],
          ["GK", tk("Georges Karam"), "18:04"],
          ["YC", tk("Yasmina Chahine"), "18:05"],
        ] as [string, string, string][]
      ).map(([a, n, t]) => ({ a, n, t })),
    },
    MEMBERSHIPS: {
      t: tk("Memberships, digitised."),
      d: tk("Plans, renewals and member cards in the app."),
      mBars: true,
      mb: (
        [
          [tk("Monthly"), 212, "#4E3894"],
          [tk("Quarterly"), 98, "#775FD7"],
          [tk("Annual"), 64, "#B9A9EE"],
        ] as [string, number, string][]
      ).map(([n, c, bar]) => ({ n, c: String(c), f: ((c / 212) * 100).toFixed(0) + "%", bar })),
    },
    TEAM: {
      t: tk("Your team, on one shift board."),
      d: tk("Coaches, front desk and linked professionals."),
      mStaff: true,
      mhrs: ["06", "12", "18", "23"],
      mb: (
        [
          ["KN", tk("Karim Nassar"), tk("Head coach"), 6, 14],
          ["JD", tk("Joelle Daher"), tk("Coach"), 9, 15],
          ["ST", tk("Sami Tannous"), tk("Front desk"), 14, 23],
        ] as [string, string, string, number, number][]
      ).map(([a, n, r2, f, t]) => ({ a, n, r: r2, l: (((f - 6) / 17) * 100).toFixed(1) + "%", w: (((t - f) / 17) * 100).toFixed(1) + "%" })),
    },
    "GYM PAGE": {
      t: tk("Put your gym on the map."),
      d: tk("Hours, classes and team, found in Centium."),
      mGym: true,
      mh: tk("Atlas Fitness"),
      ms: tk("Achrafieh, Beirut"),
      mb: (
        [
          ["06:30", tk("HIIT 45 · Karim Nassar")],
          ["09:00", tk("Spin · Joelle Daher")],
        ] as [string, string][]
      ).map(([t, n]) => ({ t, n })),
    },
  };
}

/** Section 06's two slide sets for a viewport (prototype ecoSets). Desktop
 *  (lg): the app-window graphics. Below 1024px: each slide's MOBK copy and
 *  graphic; `twoBubbles` drops Pro 04's third chat bubble (prototype: under
 *  380px; the page passes under 400px, see Ecosystem.tsx). */
export function ecoSets(lg: boolean, twoBubbles: boolean): Slide[][] {
  const pro = proDrafts()
    .map((x) => v11slide(x, lg))
    .map((s, i): Slide => Object.assign({ i, c: "#2F5F58", bg: "linear-gradient(160deg,#FFFFFF 0%,#F3F9F7 100%)" }, s));
  const biz = bizDrafts()
    .map((x) => v11slide(x, lg))
    .map((s, i): Slide => Object.assign({ i, c: "#4E3894", bg: "linear-gradient(160deg,#FFFFFF 0%,#F8F5FF 100%)" }, s, { k: String(i + 1).padStart(2, "0") + " · " + s.k.split(" · ")[1] }));
  if (lg) return [pro, biz];
  const M = mobk(twoBubbles);
  const key = (k: string) => {
    const x = String(k || "").split(" · ")[1] || "";
    return M[x] ? x : null;
  };
  return [pro, biz].map((ss) =>
    ss.map((sl) => {
      const mk = key(sl.k);
      return Object.assign({}, sl, mk ? M[mk] : {});
    }),
  );
}
