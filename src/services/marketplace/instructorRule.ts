// Market + Share 3.0 · W5 · the class instructor rule (C-MO.4.3.1 listed /
// unlisted final, C-MO.4.3 cards; HANDOVER §4 "Class detail", §9: only Team
// professionals can be named as class instructors; a class with none shows
// "Instructor not listed", no photo, no link). Pure (no Supabase import).
//
// marketplace_classes carries the five card columns (Database #38,
// 20261213200000): instructor_is_team (false when nobody is named, false once
// they leave), instructor_specialty, instructor_rating,
// instructor_review_count and instructor_hire_count. instructor_is_team
// decides: only true names the instructor (and only when the view names
// them: instructor_id / instructor_name are null for somebody not listed
// publicly). Anything else, a missing column included, is "Instructor not
// listed".

import { bool, num, str } from "../market/parse";

export interface InstructorFacts {
  instructorId: string | null;
  instructorName: string | null;
  instructorAvatarUrl: string | null;
  /** marketplace_classes.instructor_is_team: on the business's Team. */
  instructorIsTeam: boolean;
  instructorSpecialty: string | null;
  instructorRating: number | null;
  instructorReviewCount: number | null;
  /** Centium hires (roles) of this instructor: "Hired via Centium" when above 0. */
  instructorHireCount: number | null;
}

/** The instructor as clients may see it, from a marketplace_classes row (snake_case). */
export function instructorFacts(r: Record<string, unknown>): InstructorFacts {
  const isTeam = bool(r.instructor_is_team);
  const id = str(r.instructor_id);
  const name = (str(r.instructor_name) ?? "").trim() || null;
  const named = isTeam && !!(id && name);
  return {
    instructorId: named ? id : null,
    instructorName: named ? name : null,
    instructorAvatarUrl: named ? str(r.instructor_avatar_url) : null,
    instructorIsTeam: isTeam,
    instructorSpecialty: named ? (str(r.instructor_specialty) ?? "").trim() || null : null,
    instructorRating: named ? num(r.instructor_rating) : null,
    instructorReviewCount: named ? num(r.instructor_review_count) : null,
    instructorHireCount: named ? num(r.instructor_hire_count) : null,
  };
}

/** "Hired via Centium" on the listed card: a Team instructor with at least one Centium hire. */
export const hiredViaCentium = (f: { instructorIsTeam?: boolean | null; instructorHireCount?: number | null; instructorId?: string | null }): boolean =>
  !!f.instructorId && f.instructorIsTeam === true && (f.instructorHireCount ?? 0) > 0;
