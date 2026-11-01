// Round F (DW4), pure: the weekly nutrition check-in trend in CL11, from
// nutrition_check_in_trend(p_client_id, p_weeks) (Database
// 20261226010000_the_check_in_key_and_the_nutrition_trend). Tested in
// nutritionTrendModel.test.ts.
//
// The reader gives the form's professional one row per Monday-to-Sunday week
// on the client's local date, the last p_weeks up to this week, with no gaps:
// week_starts_on, due (still open), submitted, missed, and responses: each
// submitted check-in's SCALE answers as answered ({submitted_at, answers:
// [{position, prompt, value, scale_min, scale_max}]}). It only counts forms
// copied from the weekly_nutrition_check_in template since F2 (no backfill),
// so a professional without one gets weeks of zeroes: then the block doesn't
// show at all.
//
// Karim F17: due / submitted / missed per week, and each week's scale answers
// as dots, the client's own answers: never averaged, no score, no comparison,
// never the weight (the reader leaves it out; a number question is never a
// scale).

export interface TrendAnswer {
  position: number;
  prompt: string;
  value: number;
  min: number | null;
  max: number | null;
}

export interface TrendWeek {
  /** The Monday, YYYY-MM-DD. */
  weekStartsOn: string;
  due: number;
  submitted: number;
  missed: number;
  /** Each submitted check-in that week, oldest first, with its scale answers. */
  responses: { submittedAt: string | null; answers: TrendAnswer[] }[];
}

const n = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};

/** The reader's rows, oldest week first; rows that don't read are dropped. */
export function parseTrend(data: unknown): TrendWeek[] {
  if (!Array.isArray(data)) return [];
  return data
    .flatMap((raw): TrendWeek[] => {
      if (!raw || typeof raw !== "object") return [];
      const r = raw as Record<string, unknown>;
      const week = typeof r.week_starts_on === "string" ? r.week_starts_on.slice(0, 10) : null;
      if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return [];
      const responses = (Array.isArray(r.responses) ? r.responses : []).flatMap((x) => {
        if (!x || typeof x !== "object") return [];
        const resp = x as Record<string, unknown>;
        const answers = (Array.isArray(resp.answers) ? resp.answers : []).flatMap((a): TrendAnswer[] => {
          if (!a || typeof a !== "object") return [];
          const q = a as Record<string, unknown>;
          const position = n(q.position);
          const value = n(q.value);
          if (position === null || value === null) return [];
          return [{ position, prompt: typeof q.prompt === "string" ? q.prompt : "", value, min: n(q.scale_min), max: n(q.scale_max) }];
        });
        return [{ submittedAt: typeof resp.submitted_at === "string" ? resp.submitted_at : null, answers }];
      });
      return [{ weekStartsOn: week, due: n(r.due) ?? 0, submitted: n(r.submitted) ?? 0, missed: n(r.missed) ?? 0, responses }];
    })
    .sort((a, b) => a.weekStartsOn.localeCompare(b.weekStartsOn));
}

/** Whether any weekly nutrition check-in was sent to this client in the window (else the block stays away). */
export const hasNutritionCheckIns = (weeks: readonly TrendWeek[]): boolean => weeks.some((w) => w.due + w.submitted + w.missed > 0);

/** Submitted check-ins in the window: the dots start after two. */
export const submittedTotal = (weeks: readonly TrendWeek[]): number => weeks.reduce((s, w) => s + w.submitted, 0);

export interface ScaleTrack {
  position: number;
  /** The question as the latest check-in asked it. */
  prompt: string;
  min: number;
  max: number;
  /**
   * Layer k holds each week's k-th submitted answer (null where that week had
   * fewer), so two check-ins in one week are two dots, never an average.
   */
  layers: (number | null)[][];
}

/** One track per scale question (by position, in order), one dot per answer per week. */
export function scaleTracks(weeks: readonly TrendWeek[]): ScaleTrack[] {
  const byPos = new Map<number, { prompt: string; min: number | null; max: number | null; perWeek: number[][] }>();
  weeks.forEach((w, wi) => {
    for (const resp of w.responses) {
      for (const a of resp.answers) {
        let t = byPos.get(a.position);
        if (!t) {
          t = { prompt: a.prompt, min: a.min, max: a.max, perWeek: weeks.map(() => []) };
          byPos.set(a.position, t);
        }
        // Later weeks overwrite: the latest wording and range win.
        if (a.prompt) t.prompt = a.prompt;
        if (a.min !== null) t.min = a.min;
        if (a.max !== null) t.max = a.max;
        t.perWeek[wi].push(a.value);
      }
    }
  });
  return [...byPos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([position, t]) => {
      const depth = Math.max(1, ...t.perWeek.map((v) => v.length));
      const values = t.perWeek.flat();
      return {
        position,
        prompt: t.prompt,
        min: Math.min(t.min ?? 1, ...values),
        max: Math.max(t.max ?? 10, ...values),
        layers: Array.from({ length: depth }, (_, k) => t.perWeek.map((v) => (k < v.length ? v[k] : null))),
      };
    });
}
