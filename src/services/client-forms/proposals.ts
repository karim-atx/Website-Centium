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

import { ALLERGENS, SEVERITIES, allergenLabel, severityLabel, type Allergen, type AllergySeverity } from "../nutrition/clientNutritionModel";
import { OTHER_LABEL_MAX, cleanLabel, isolate, labelProblem, otherProblemKey } from "../nutrition/otherAllergies";
import { dietLabel, dietaryRestrictionOptions, type DietaryRestriction } from "../../utils/dietaryRestrictions";
import type { MedicationRoute } from "../../types";
import { t, tk } from "../../i18n/core";

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
  allergies: tk("Allergy"),
  dietary_restrictions: tk("Diet"),
  medications: tk("Medication"),
  injuries: tk("Injury"),
  weight: tk("Weight"),
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
  { value: "oral", label: tk("Oral") },
  { value: "injectable", label: tk("Injectable") },
  { value: "topical", label: tk("Topical") },
  { value: "inhaled", label: tk("Inhaled") },
  { value: "other", label: tk("Other") },
];

export type DietKind = "restriction" | "preference";

export type ProposalDraft =
  | {
      field: "allergies";
      text: string;
      allergen: Allergen | null;
      severity: AllergySeverity;
      note: string;
      /**
       * FQ (decision 22): the suggestion named no standard allergen, so it can
       * be saved as an "Other" allergy in the member's words (`label`).
       * `asOther` is the path chosen; off, the card is today's "choose the
       * allergen".
       */
      otherOffered: boolean;
      asOther: boolean;
      label: string;
    }
  | { field: "dietary_restrictions"; text: string; restriction: DietaryRestriction | null; kind: DietKind }
  | { field: "medications"; name: string; dose: string; route: MedicationRoute; notes: string }
  | { field: "injuries"; description: string; bodyArea: string; since: string }
  | { field: "weight"; kg: string };

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const isAllergen = (v: unknown): v is Allergen => ALLERGENS.some((a) => a.value === v);
const isDiet = (v: unknown): v is DietaryRestriction => dietaryRestrictionOptions.some((d) => d.value === v);
const isSeverity = (v: unknown): v is AllergySeverity => SEVERITIES.some((s) => s.value === v);

/**
 * The draft a card starts from: the Database's suggestion, with the app's
 * defaults for what it leaves out. An allergy with no standard allergen
 * (the key missing or null) starts as an "Other" allergy: the label is the
 * answer's text, trimmed to 60, at Severe (the suggestion's severity is the
 * Database's placeholder, not the member's). `otherAvailable` false (the
 * Database refused a label with 22023: not live yet) keeps today's card.
 */
export function draftFrom(p: Pick<ProfileProposal, "field" | "suggested">, otherAvailable = true): ProposalDraft {
  const s = p.suggested;
  switch (p.field) {
    case "allergies": {
      const allergen = isAllergen(s.allergen) ? s.allergen : null;
      const otherOffered = !allergen && otherAvailable;
      const label = [...cleanLabel(str(s.text))].slice(0, OTHER_LABEL_MAX).join("").trim();
      return {
        field: "allergies",
        text: str(s.text),
        allergen,
        severity: otherOffered ? "severe" : isSeverity(s.severity) ? s.severity : "moderate",
        note: str(s.note),
        otherOffered,
        asOther: otherOffered,
        label,
      };
    }
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
      if (d.asOther) {
        // FQ: {label, severity, note}; severity always sent (the Database's default is moderate).
        const problem = labelProblem(d.label, []);
        if (problem) return { ok: false, problem: otherProblemKey(problem) };
        if (d.note.trim().length > 200) return { ok: false, problem: tk("Keep the note under 200 characters.") };
        return { ok: true, value: { label: cleanLabel(d.label), severity: d.severity, note: d.note.trim() } };
      }
      if (!d.allergen) return { ok: false, problem: tk("Choose the allergen.") };
      if (d.note.trim().length > 200) return { ok: false, problem: tk("Keep the note under 200 characters.") };
      return { ok: true, value: { allergen: d.allergen, severity: d.severity, note: d.note.trim() } };
    }
    case "dietary_restrictions":
      if (!d.restriction) return { ok: false, problem: tk("Choose the diet.") };
      return { ok: true, value: { restriction: d.restriction, kind: d.kind } };
    case "medications": {
      const name = d.name.trim();
      if (!name) return { ok: false, problem: tk("Add the medication's name.") };
      if (name.length > 120) return { ok: false, problem: tk("Keep the name under 120 characters.") };
      if (d.dose.trim().length > 120) return { ok: false, problem: tk("Keep the dose under 120 characters.") };
      if (d.notes.trim().length > 500) return { ok: false, problem: tk("Keep the notes under 500 characters.") };
      return { ok: true, value: { name, dose: d.dose.trim(), route: d.route, notes: d.notes.trim() } };
    }
    case "injuries": {
      const description = d.description.trim();
      if (!description) return { ok: false, problem: tk("Describe the injury.") };
      if (description.length > 300) return { ok: false, problem: tk("Keep the description under 300 characters.") };
      if (d.bodyArea.trim().length > 60) return { ok: false, problem: tk("Keep the body area under 60 characters.") };
      if (d.since && (!ISO_DATE.test(d.since) || d.since > today)) return { ok: false, problem: tk("Choose a date that isn't in the future.") };
      return { ok: true, value: { description, body_area: d.bodyArea.trim(), since: d.since } };
    }
    case "weight": {
      const kg = Number(d.kg.trim().replace(",", "."));
      if (!d.kg.trim() || !Number.isFinite(kg) || kg < 20 || kg > 500) return { ok: false, problem: tk("Enter a weight from 20 to 500 kg.") };
      return { ok: true, value: { kg: Math.round(kg * 10) / 10 } };
    }
  }
}

/** The card's title: "Peanuts allergy", "Vegetarian", "Metformin", the injury, "Weight 70 kg". */
export function proposalTitle(d: ProposalDraft): string {
  switch (d.field) {
    case "allergies":
      if (d.asOther) return cleanLabel(d.label) || d.text.trim() || t("An allergy");
      return d.allergen ? t("{allergen} allergy", { allergen: t(allergenLabel(d.allergen)) }) : d.text.trim() || t("An allergy");
    case "dietary_restrictions":
      return (d.restriction ? dietLabel(d.restriction) : "") || d.text.trim() || t("A diet");
    case "medications":
      return d.name.trim() || t("A medication");
    case "injuries":
      return d.description.trim() || t("An injury");
    case "weight":
      return d.kg.trim() ? t("Weight {kg} kg", { kg: d.kg.trim() }) : t("Weight");
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
      // FQ: an "Other" allergy confirmed as {label, severity, note}: the member's words, quoted.
      const label = str(v.label).trim();
      const name = isAllergen(v.allergen)
        ? t("{allergen} allergy", { allergen: t(allergenLabel(v.allergen)) })
        : label
          ? t("{allergen} allergy", { allergen: t("“{label}”", { label: isolate(label) }) })
          : str(v.note).trim() || t("An allergy");
      return { title: isSeverity(v.severity) ? t("{allergy}, {severity}", { allergy: name, severity: t(severityLabel(v.severity)).toLowerCase() }) : name, where: t("Dietary needs card") };
    }
    case "dietary_restrictions": {
      const label = dietLabel(str(v.restriction)) || t("A diet");
      return { title: v.kind === "preference" ? t("{diet} (preference)", { diet: label }) : label, where: t("Dietary needs card") };
    }
    case "medications": {
      const name = str(v.name).trim() || t("A medication");
      const dose = str(v.dose).trim();
      return { title: dose ? t("{name}, {dose}", { name, dose }) : name, where: t("Medications") };
    }
    case "injuries": {
      const area = str(v.body_area).trim();
      const what = str(v.description).trim() || t("An injury");
      const since = str(v.since).trim();
      const year = SINCE_YEAR.exec(since)?.[1] ?? since;
      const title = area ? (year ? t("{area}: {what}, {year}", { area, what, year }) : t("{area}: {what}", { area, what })) : year ? t("{what}, {year}", { what, year }) : what;
      return { title, where: t("Profile and programme notes") };
    }
    case "weight": {
      const kg = str(v.kg).trim();
      return { title: kg ? t("{kg} kg", { kg }) : t("Weight"), where: t("Weight") };
    }
  }
}

// FQ: once the Database refuses a label (22023: "Other" allergies aren't live
// yet), later cards open on today's "choose the allergen" too, for the rest of
// the visit.
let otherRefused = false;
export const otherAllergyRefused = (): boolean => otherRefused;
export const markOtherAllergyRefused = (): void => {
  otherRefused = true;
};
