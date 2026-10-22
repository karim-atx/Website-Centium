// Market + Share 3.0 · W5 · the class instructor rule (C-MO.4.3.1 listed /
// unlisted final, C-MO.4.3 cards; HANDOVER §4 "Class detail", §9: only Team
// professionals can be named as class instructors; a class with none shows
// "Instructor not listed", no photo, no link). Pure (no Supabase import).
//
// awaiting DB stage DB9: marketplace_classes gains instructor_is_team,
// instructor_specialty, instructor_rating, instructor_review_count and
// instructor_hire_count (PLAN §2.2 DB9). Until they land the row has none of
// them and the Release 1 interim stays (D-11): the view's own rule, which
// names a publicly listed instructor, and no "Hired via Centium". Once
// instructor_is_team is in the row it decides: false (or no instructor)
// means unlisted, whatever the view names.

import { bool, num, str } from "../market/parse";

export interface InstructorFacts {
  instructorId: string | null;
  instructorName: string | null;
  instructorAvatarUrl: string | null;
  /** null: DB9 hasn't landed (the column is absent), so the D-11 interim applies. */
  instructorIsTeam: boolean | null;
  instructorSpecialty: string | null;
  instructorRating: number | null;
  instructorReviewCount: number | null;
  /** Centium hires (roles) of this instructor: "Hired via Centium" when above 0. */
  instructorHireCount: number | null;
}

/** The instructor as clients may see it, from a marketplace_classes row (snake_case, read tolerantly). */
export function instructorFacts(r: Record<string, unknown>): InstructorFacts {
  const isTeam = "instructor_is_team" in r && r.instructor_is_team !== undefined ? bool(r.instructor_is_team) : null;
  const id = str(r.instructor_id);
  const name = (str(r.instructor_name) ?? "").trim() || null;
  const named = isTeam === false ? false : !!(id && name);
  return {
    instructorId: named ? id : null,
    instructorName: named ? name : null,
    instructorAvatarUrl: named ? str(r.instructor_avatar_url) : null,
    instructorIsTeam: isTeam,
    instructorSpecialty: named ? str(r.instructor_specialty) : null,
    instructorRating: named ? num(r.instructor_rating) : null,
    instructorReviewCount: named ? num(r.instructor_review_count) : null,
    instructorHireCount: named ? num(r.instructor_hire_count) : null,
  };
}

/** "Hired via Centium" on the listed card: a Team instructor with at least one Centium hire (never in the D-11 interim). */
export const hiredViaCentium = (f: { instructorIsTeam?: boolean | null; instructorHireCount?: number | null; instructorId?: string | null }): boolean =>
  !!f.instructorId && f.instructorIsTeam === true && (f.instructorHireCount ?? 0) > 0;
