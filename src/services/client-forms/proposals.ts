// Round D · "Add these to your profile?" (D-S12, Karim's decisions: the client
// confirms each carried answer on its own; weight is never carried in
// recovery-sensitive mode). Pure: what the step lists, the editable draft
// per field, and the value confirm_form_profile_proposal(p_id, p_value)
// takes, shaped as the Database documents (20261222050000):
//   allergies {allergen, severity, note}, dietary restrictions
//   {restriction, kind}, medications {name, dose, route, notes}, injuries
//   {description, body_area, since}, weight {kg}.
// The suggestion my_form_profile_proposals returns is the starting point:
// allergies {text, allergen?, severity}, diets {text, restriction?},
// medications {name}, injuries {description}, weight {kg}.

import { ALLERGENS, SEVERITIES, allergenLabel, type Allergen, type AllergySeverity } from "../nutrition/clientNutritionModel";
import { dietLabel, dietaryRestrictionOptions, type DietaryRestriction } from "../../utils/dietaryRestrictions";
import type { MedicationRoute } from "../../types";

export type ProposalField = "allergies" | "dietary_restrictions" | "medications" | "injuries" | "weight";
export type ProposalStatus = "pending" | "confirmed" | "declined";

export interface ProfileProposal {
  id: string;
  responseId: string;
  prompt: string;
  field: ProposalField;
  suggested: Record<string, unknown>;
  status: ProposalStatus;
}

const FIELDS: ProposalField[] = ["allergies", "dietary_restrictions", "medications", "injuries", "weight"];
export const asProposalField = (v: unknown): ProposalField | null => (FIELDS.includes(v as ProposalField) ? (v as ProposalField) : null);

/** The card's small caps label. */
export const FIELD_LABEL: Record<ProposalField, string> = {
  allergies: "Allergy",
  dietary_restrictions: "Diet",
  medications: "Medication",
  injuries: "Injury",
  weight: "Weight",
};

/**
 * What the step offers: the pending proposals, in order. Weight is never
 * offered in recovery-sensitive mode (the server doesn't propose it there
 * either, and refuses it with ATXL2 if the mode was turned on since).
 */
export function offeredProposals(list: ProfileProposal[], hideNumbers: boolean): ProfileProposal[] {
  return list.filter((p) => p.status === "pending" && !(hideNumbers && p.field === "weight"));
}

// ---------------------------------------------------------------------------
// The editable draft, per field
// ---------------------------------------------------------------------------

export const MEDICATION_ROUTES: { value: MedicationRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "injectable", label: "Injectable" },
  { value: "topical", label: "Topical" },
  { value: "inhaled", label: "Inhaled" },
  { value: "other", label: "Other" },
];

export type DietKind = "restriction" | "preference";

export type ProposalDraft =
  | { field: "allergies"; text: string; allergen: Allergen | null; severity: AllergySeverity; note: string }
  | { field: "dietary_restrictions"; text: string; restriction: DietaryRestriction | null; kind: DietKind }
  | { field: "medications"; name: string; dose: string; route: MedicationRoute; notes: string }
  | { field: "injuries"; description: string; bodyArea: string; since: string }
  | { field: "weight"; kg: string };

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const isAllergen = (v: unknown): v is Allergen => ALLERGENS.some((a) => a.value === v);
const isDiet = (v: unknown): v is DietaryRestriction => dietaryRestrictionOptions.some((d) => d.value === v);
const isSeverity = (v: unknown): v is AllergySeverity => SEVERITIES.some((s) => s.value === v);

/** The draft a card starts from: the Database's suggestion, with the app's defaults for what it leaves out. */
export function draftFrom(p: Pick<ProfileProposal, "field" | "suggested">): ProposalDraft {
  const s = p.suggested;
  switch (p.field) {
    case "allergies":
      return { field: "allergies", text: str(s.text), allergen: isAllergen(s.allergen) ? s.allergen : null, severity: isSeverity(s.severity) ? s.severity : "moderate", note: str(s.note) };
    case "dietary_restrictions":
      return { field: "dietary_restrictions", text: str(s.text), restriction: isDiet(s.restriction) ? s.restriction : null, kind: s.kind === "preference" ? "preference" : "restriction" };
    case "medications":
      return { field: "medications", name: str(s.name), dose: str(s.dose), route: MEDICATION_ROUTES.some((r) => r.value === s.route) ? (s.route as MedicationRoute) : "oral", notes: str(s.notes) };
    case "injuries":
      return { field: "injuries", description: str(s.description), bodyArea: str(s.body_area), since: str(s.since) };
    case "weight":
      return { field: "weight", kg: str(s.kg) };
  }
}

export type ShapedValue = { ok: true; value: Record<string, string | number> } | { ok: false; problem: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The p_value for confirm_form_profile_proposal, or why it can't be saved
 * yet. The limits are the tables' own: an allergy needs one of the 14
 * allergens (note up to 200), a diet one of the seven, a medication a name of
 * 1 to 120 (dose up to 120, notes up to 500), an injury a description of 1 to
 * 300 (body area up to 60, since not in the future), a weight 20 to 500 kg.
 * `today` is the local yyyy-mm-dd.
 */
export function shapeValue(d: ProposalDraft, today: string): ShapedValue {
  switch (d.field) {
    case "allergies": {
      if (!d.allergen) return { ok: false, problem: "Choose the allergen." };
      if (d.note.trim().length > 200) return { ok: false, problem: "Keep the note under 200 characters." };
      return { ok: true, value: { allergen: d.allergen, severity: d.severity, note: d.note.trim() } };
    }
    case "dietary_restrictions":
      if (!d.restriction) return { ok: false, problem: "Choose the diet." };
      return { ok: true, value: { restriction: d.restriction, kind: d.kind } };
    case "medications": {
      const name = d.name.trim();
      if (!name) return { ok: false, problem: "Add the medication's name." };
      if (name.length > 120) return { ok: false, problem: "Keep the name under 120 characters." };
      if (d.dose.trim().length > 120) return { ok: false, problem: "Keep the dose under 120 characters." };
      if (d.notes.trim().length > 500) return { ok: false, problem: "Keep the notes under 500 characters." };
      return { ok: true, value: { name, dose: d.dose.trim(), route: d.route, notes: d.notes.trim() } };
    }
    case "injuries": {
      const description = d.description.trim();
      if (!description) return { ok: false, problem: "Describe the injury." };
      if (description.length > 300) return { ok: false, problem: "Keep the description under 300 characters." };
      if (d.bodyArea.trim().length > 60) return { ok: false, problem: "Keep the body area under 60 characters." };
      if (d.since && (!ISO_DATE.test(d.since) || d.since > today)) return { ok: false, problem: "Choose a date that isn't in the future." };
      return { ok: true, value: { description, body_area: d.bodyArea.trim(), since: d.since } };
    }
    case "weight": {
      const kg = Number(d.kg.trim().replace(",", "."));
      if (!d.kg.trim() || !Number.isFinite(kg) || kg < 20 || kg > 500) return { ok: false, problem: "Enter a weight from 20 to 500 kg." };
      return { ok: true, value: { kg: Math.round(kg * 10) / 10 } };
    }
  }
}

/** The card's title: "Peanuts allergy", "Vegetarian", "Metformin", the injury, "Weight 70 kg". */
export function proposalTitle(d: ProposalDraft): string {
  switch (d.field) {
    case "allergies":
      return d.allergen ? `${allergenLabel(d.allergen)} allergy` : d.text.trim() || "An allergy";
    case "dietary_restrictions":
      return dietaryRestrictionOptions.find((o) => o.value === d.restriction)?.label ?? (d.text.trim() || "A diet");
    case "medications":
      return d.name.trim() || "A medication";
    case "injuries":
      return d.description.trim() || "An injury";
    case "weight":
      return d.kg.trim() ? `Weight ${d.kg.trim()} kg` : "Weight";
  }
}

// ---------------------------------------------------------------------------
// The professional's side: the answers the client CONFIRMED
// (form_response_confirmed_answers, 20261222070000), for CL10's "Added to
// {first}'s profile" box. The value is as confirmed (edited or not).
// ---------------------------------------------------------------------------

export interface ConfirmedAnswer {
  proposalId: string;
  field: ProposalField;
  value: Record<string, unknown>;
}

/** The rows in question order; an unknown field is left out. */
export function parseConfirmedAnswers(rows: unknown): ConfirmedAnswer[] {
  if (!Array.isArray(rows)) return [];
  const out: ConfirmedAnswer[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const field = asProposalField(r?.field);
    if (!field || typeof r.proposal_id !== "string") continue;
    out.push({ proposalId: r.proposal_id, field, value: r.value && typeof r.value === "object" ? (r.value as Record<string, unknown>) : {} });
  }
  return out;
}

const SINCE_YEAR = /^(\d{4})-\d{2}(-\d{2})?$/;

/** One row of the box: "Peanuts allergy, severe" · "Dietary needs card", "Left knee: meniscus repair, 2024" · "Profile and programme notes". */
export function confirmedAnswerRow(a: Pick<ConfirmedAnswer, "field" | "value">): { title: string; where: string } {
  const v = a.value;
  switch (a.field) {
    case "allergies": {
      const name = isAllergen(v.allergen) ? `${allergenLabel(v.allergen)} allergy` : str(v.note).trim() || "An allergy";
      return { title: isSeverity(v.severity) ? `${name}, ${v.severity}` : name, where: "Dietary needs card" };
    }
    case "dietary_restrictions": {
      const label = dietLabel(str(v.restriction)) || "A diet";
      return { title: v.kind === "preference" ? `${label} (preference)` : label, where: "Dietary needs card" };
    }
    case "medications": {
      const name = str(v.name).trim() || "A medication";
      const dose = str(v.dose).trim();
      return { title: dose ? `${name}, ${dose}` : name, where: "Medications" };
    }
    case "injuries": {
      const area = str(v.body_area).trim();
      const what = str(v.description).trim() || "An injury";
      const since = str(v.since).trim();
      const year = SINCE_YEAR.exec(since)?.[1] ?? since;
      return { title: `${area ? `${area}: ` : ""}${what}${year ? `, ${year}` : ""}`, where: "Profile and programme notes" };
    }
    case "weight": {
      const kg = str(v.kg).trim();
      return { title: kg ? `${kg} kg` : "Weight", where: "Weight" };
    }
  }
}
