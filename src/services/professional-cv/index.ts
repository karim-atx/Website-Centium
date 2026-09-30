import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums, Tables } from "../../../lib/supabase/database.types";
import { deletePrivateFile, uploadPrivateFile } from "../storage";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { toDbDate, toMonth, type MonthValue } from "./cvDates";
import { licenceStatus, type LicenceReviewRow, type LicenceStatus } from "./licenceStatus";

// A professional's CV: licences, experience, education and the rest.
//
// TWO READ PATHS, ON PURPOSE. The professional reads and writes their own rows
// in the professional_* tables, which RLS scopes to the owner and which carry
// the private columns (credential_id, document_path). Everybody else reads the
// public_professional_* views, which publish month/year text instead of dates,
// never carry those two columns, drop unnamed licences and expired ones the
// professional chose to hide, and are empty unless the professional is listed
// or the reader is their client. Nothing client-facing reads a table here.
//
// ORDER IS BY DATE WHERE A SECTION HAS DATES. Every row has a `position`
// (required by the schema); it is set to the end of the list on insert and
// used only to order sections without dates, and to break ties.
//
// LICENCE DOCUMENTS go in the same private certifications bucket as the
// onboarding certificate, under <uid>/. Opening a review, and keeping the
// legacy professional_profiles.certification_url in step with licence #1, are
// both done by triggers in the database — nothing here writes a review row.

export type Proficiency = Enums<"language_proficiency">;

export const PROFICIENCIES: { value: Proficiency; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "basic", label: "Basic" },
];

export const proficiencyLabel = (p: Proficiency) => PROFICIENCIES.find((x) => x.value === p)?.label ?? p;

const BUCKET = "certifications" as const;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface Licence {
  id: string;
  name: string | null;
  issuingBody: string | null;
  issued: MonthValue | null;
  expires: MonthValue | null;
  noExpiry: boolean;
  /** PRIVATE: never published by any view. */
  credentialId: string | null;
  credentialUrl: string | null;
  /** PRIVATE: <uid>/<uuid>.<ext> in the certifications bucket. */
  documentPath: string | null;
  showWhenExpired: boolean;
  position: number;
  /** The one licence kept in step with the legacy certification_url. */
  mirrorsCertification: boolean;
}

export interface Experience {
  id: string;
  title: string;
  organisation: string;
  location: string | null;
  start: MonthValue;
  /** Null means the role is current. */
  end: MonthValue | null;
  description: string | null;
  position: number;
}

export interface Education {
  id: string;
  institution: string;
  degree: string | null;
  field: string | null;
  start: MonthValue | null;
  end: MonthValue | null;
  description: string | null;
  position: number;
}

export interface Language {
  id: string;
  language: string;
  proficiency: Proficiency;
  position: number;
}

export interface Award {
  id: string;
  title: string;
  issuer: string | null;
  awarded: MonthValue | null;
  description: string | null;
  position: number;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string | null;
  published: MonthValue | null;
  url: string | null;
  description: string | null;
  position: number;
}

export interface Volunteering {
  id: string;
  role: string;
  organisation: string;
  start: MonthValue | null;
  end: MonthValue | null;
  description: string | null;
  position: number;
}

export interface CvLink {
  id: string;
  label: string;
  url: string;
  position: number;
}

export interface CvProfile {
  headline: string | null;
  skills: string[];
  showVolunteering: boolean;
}

export interface MyCv {
  profile: CvProfile;
  licences: Licence[];
  reviews: LicenceReviewRow[];
  experience: Experience[];
  education: Education[];
  languages: Language[];
  awards: Award[];
  publications: Publication[];
  volunteering: Volunteering[];
  links: CvLink[];
}

export const EMPTY_CV: MyCv = {
  profile: { headline: null, skills: [], showVolunteering: false },
  licences: [],
  reviews: [],
  experience: [],
  education: [],
  languages: [],
  awards: [],
  publications: [],
  volunteering: [],
  links: [],
};

// ---------------------------------------------------------------------------
// Row mapping. Each section: table, fromRow, toRow. toRow takes the entry
// without id/position and returns the columns a client may write.
// ---------------------------------------------------------------------------

const blank = (s: string | null | undefined) => {
  const t = s?.trim();
  return t ? t : null;
};

const SECTIONS = {
  experience: {
    table: "professional_experience",
    from: (r: Tables<"professional_experience">): Experience => ({
      id: r.id,
      title: r.title,
      organisation: r.organisation,
      location: r.location,
      start: toMonth(r.start_on)!,
      end: toMonth(r.end_on),
      description: r.description,
      position: r.position,
    }),
    to: (e: Omit<Experience, "id" | "position">) => ({
      title: e.title.trim(),
      organisation: e.organisation.trim(),
      location: blank(e.location),
      start_on: toDbDate(e.start),
      end_on: toDbDate(e.end),
      description: blank(e.description),
    }),
  },
  education: {
    table: "professional_education",
    from: (r: Tables<"professional_education">): Education => ({
      id: r.id,
      institution: r.institution,
      degree: r.degree,
      field: r.field,
      start: toMonth(r.start_on),
      end: toMonth(r.end_on),
      description: r.description,
      position: r.position,
    }),
    to: (e: Omit<Education, "id" | "position">) => ({
      institution: e.institution.trim(),
      degree: blank(e.degree),
      field: blank(e.field),
      start_on: toDbDate(e.start),
      end_on: toDbDate(e.end),
      description: blank(e.description),
    }),
  },
  languages: {
    table: "professional_languages",
    from: (r: Tables<"professional_languages">): Language => ({
      id: r.id,
      language: r.language,
      proficiency: r.proficiency,
      position: r.position,
    }),
    to: (e: Omit<Language, "id" | "position">) => ({
      language: e.language.trim(),
      proficiency: e.proficiency,
    }),
  },
  awards: {
    table: "professional_awards",
    from: (r: Tables<"professional_awards">): Award => ({
      id: r.id,
      title: r.title,
      issuer: r.issuer,
      awarded: toMonth(r.awarded_on),
      description: r.description,
      position: r.position,
    }),
    to: (e: Omit<Award, "id" | "position">) => ({
      title: e.title.trim(),
      issuer: blank(e.issuer),
      awarded_on: toDbDate(e.awarded),
      description: blank(e.description),
    }),
  },
  publications: {
    table: "professional_publications",
    from: (r: Tables<"professional_publications">): Publication => ({
      id: r.id,
      title: r.title,
      publisher: r.publisher,
      published: toMonth(r.published_on),
      url: r.url,
      description: r.description,
      position: r.position,
    }),
    to: (e: Omit<Publication, "id" | "position">) => ({
      title: e.title.trim(),
      publisher: blank(e.publisher),
      published_on: toDbDate(e.published),
      url: blank(e.url),
      description: blank(e.description),
    }),
  },
  volunteering: {
    table: "professional_volunteering",
    from: (r: Tables<"professional_volunteering">): Volunteering => ({
      id: r.id,
      role: r.role,
      organisation: r.organisation,
      start: toMonth(r.start_on),
      end: toMonth(r.end_on),
      description: r.description,
      position: r.position,
    }),
    to: (e: Omit<Volunteering, "id" | "position">) => ({
      role: e.role.trim(),
      organisation: e.organisation.trim(),
      start_on: toDbDate(e.start),
      end_on: toDbDate(e.end),
      description: blank(e.description),
    }),
  },
  links: {
    table: "professional_links",
    from: (r: Tables<"professional_links">): CvLink => ({
      id: r.id,
      label: r.label,
      url: r.url,
      position: r.position,
    }),
    to: (e: Omit<CvLink, "id" | "position">) => ({
      label: e.label.trim(),
      url: e.url.trim(),
    }),
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export type SectionEntry<K extends SectionKey> = ReturnType<(typeof SECTIONS)[K]["from"]>;
export type SectionDraft<K extends SectionKey> = Omit<SectionEntry<K>, "id" | "position">;

const licenceFrom = (r: Tables<"professional_licences">): Licence => ({
  id: r.id,
  name: r.name,
  issuingBody: r.issuing_body,
  issued: toMonth(r.issued_on),
  expires: toMonth(r.expires_on),
  noExpiry: r.no_expiry,
  credentialId: r.credential_id,
  credentialUrl: r.credential_url,
  documentPath: r.document_path,
  showWhenExpired: r.show_when_expired,
  position: r.position,
  mirrorsCertification: r.mirrors_certification_url,
});

export type LicenceDraft = Omit<Licence, "id" | "position" | "documentPath" | "mirrorsCertification">;

const licenceTo = (d: LicenceDraft) => ({
  name: blank(d.name),
  issuing_body: blank(d.issuingBody),
  issued_on: toDbDate(d.issued),
  // "Doesn't expire" and an expiry month are contradictory; the table refuses
  // both at once, so the switch wins.
  expires_on: d.noExpiry ? null : toDbDate(d.expires),
  no_expiry: d.noExpiry,
  credential_id: blank(d.credentialId),
  credential_url: blank(d.credentialUrl),
  show_when_expired: d.showWhenExpired,
});

const reviewFrom = (r: Tables<"professional_licence_reviews">): LicenceReviewRow => ({
  id: r.id,
  licenceId: r.licence_id,
  documentPath: r.document_path,
  submittedAt: r.submitted_at,
  approvedAt: r.approved_at,
  rejectedAt: r.rejected_at,
  rejectionReason: r.rejection_reason,
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type Fail = { ok: false; message: string };

function describe(error: PostgrestError, what: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  const msg = error.message ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(msg)) return "Your session expired. Sign in again.";
  if (code === "23505" && /languages/.test(msg)) return "That language is already on your CV.";
  if (code === "23514") {
    if (/url/.test(msg)) return "Links must start with https://";
    if (/range|expiry_after_issue/.test(msg)) return "The end date can't be before the start date.";
    if (/skills/.test(msg)) return "That's more skills than a CV can hold (30 at most).";
    return "Check the details: each field has a length limit.";
  }
  return `Couldn't save ${what}. Try again.`;
}

// Each table name is cast to one member of the union so supabase-js types
// the builder; the row types differ, the call shape does not.
const cvTable = (table: (typeof SECTIONS)[SectionKey]["table"]) =>
  supabase.from(table as "professional_links");

// ---------------------------------------------------------------------------
// The professional's own CV
// ---------------------------------------------------------------------------

export async function fetchMyCv(userId: string): Promise<{ ok: true; cv: MyCv } | Fail> {
  const byOwner = <T extends (typeof SECTIONS)[SectionKey]["table"]>(table: T) =>
    cvTable(table).select("*").eq("professional_id", userId).order("position");

  const [profile, licences, reviews, experience, education, languages, awards, publications, volunteering, links] =
    await Promise.all([
      supabase
        .from("professional_profiles")
        .select("headline, skills, show_volunteering")
        .eq("profile_id", userId)
        .maybeSingle(),
      supabase.from("professional_licences").select("*").eq("professional_id", userId).order("position"),
      supabase.from("professional_licence_reviews").select("*").eq("professional_id", userId),
      byOwner(SECTIONS.experience.table),
      byOwner(SECTIONS.education.table),
      byOwner(SECTIONS.languages.table),
      byOwner(SECTIONS.awards.table),
      byOwner(SECTIONS.publications.table),
      byOwner(SECTIONS.volunteering.table),
      byOwner(SECTIONS.links.table),
    ]);

  const failed = [profile, licences, reviews, experience, education, languages, awards, publications, volunteering, links].find(
    (r) => r.error
  );
  if (failed?.error) {
    console.error("[professional-cv] Could not read the CV:", failed.error.message);
    return { ok: false, message: isOffline(failed.error) ? OFFLINE_MESSAGE : "Couldn't load your CV." };
  }

  const rows = <K extends SectionKey>(key: K, data: unknown) =>
    ((data ?? []) as Parameters<(typeof SECTIONS)[K]["from"]>[0][]).map(
      (r) => (SECTIONS[key].from as (x: typeof r) => SectionEntry<K>)(r)
    );

  return {
    ok: true,
    cv: {
      profile: {
        headline: profile.data?.headline ?? null,
        skills: profile.data?.skills ?? [],
        showVolunteering: profile.data?.show_volunteering ?? false,
      },
      licences: (licences.data ?? []).map(licenceFrom),
      reviews: (reviews.data ?? []).map(reviewFrom),
      experience: rows("experience", experience.data),
      education: rows("education", education.data),
      languages: rows("languages", languages.data),
      awards: rows("awards", awards.data),
      publications: rows("publications", publications.data),
      volunteering: rows("volunteering", volunteering.data),
      links: rows("links", links.data),
    },
  };
}

/**
 * Headline, skills and the volunteering switch, on professional_profiles.
 *
 * UPDATE THEN INSERT, never upsert: the same reason as saveMyProfile — the
 * UPDATE grant is column-scoped and excludes profile_id, so an upsert's
 * conflict path would be refused the moment a row existed.
 */
export async function saveCvProfile(
  userId: string,
  patch: Partial<CvProfile>
): Promise<{ ok: true } | Fail> {
  const row = {
    ...(patch.headline !== undefined && { headline: blank(patch.headline) }),
    ...(patch.skills !== undefined && { skills: patch.skills }),
    ...(patch.showVolunteering !== undefined && { show_volunteering: patch.showVolunteering }),
  };
  const updated = await supabase
    .from("professional_profiles")
    .update(row)
    .eq("profile_id", userId)
    .select("profile_id");
  if (updated.error) {
    console.error("[professional-cv] Could not update the profile:", updated.error.message);
    return { ok: false, message: describe(updated.error, "your CV") };
  }
  if (updated.data && updated.data.length > 0) return { ok: true };

  const inserted = await supabase.from("professional_profiles").insert({ profile_id: userId, ...row });
  if (inserted.error) {
    console.error("[professional-cv] Could not create the profile:", inserted.error.message);
    return { ok: false, message: describe(inserted.error, "your CV") };
  }
  return { ok: true };
}

/** Adds (no id) or edits (id) one entry in a text section. */
export async function saveEntry<K extends SectionKey>(
  userId: string,
  key: K,
  draft: SectionDraft<K>,
  target: { id: string } | { position: number }
): Promise<{ ok: true; entry: SectionEntry<K> } | Fail> {
  const section = SECTIONS[key];
  const row = (section.to as unknown as (d: SectionDraft<K>) => Record<string, unknown>)(draft);
  const result =
    "id" in target
      ? await cvTable(section.table).update(row as never).eq("id", target.id).select("*").single()
      : await cvTable(section.table)
          .insert({ ...row, professional_id: userId, position: target.position } as never)
          .select("*")
          .single();
  if (result.error || !result.data) {
    console.error(`[professional-cv] Could not save ${key}:`, result.error?.message);
    return { ok: false, message: result.error ? describe(result.error, "that") : "Couldn't save that. Try again." };
  }
  return { ok: true, entry: (section.from as (r: unknown) => SectionEntry<K>)(result.data) };
}

export async function deleteEntry(key: SectionKey, id: string): Promise<{ ok: true } | Fail> {
  const { error } = await cvTable(SECTIONS[key].table).delete().eq("id", id);
  if (error) {
    console.error(`[professional-cv] Could not delete ${key}:`, error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't delete that. Try again." };
  }
  return { ok: true };
}

/**
 * Adds or edits a licence, with an optional new document.
 *
 * ORDER: upload, then the row, then the old file — the certificate's order, and
 * for its reason: the row is what makes the document this licence's, so
 * nothing is deleted until it lands, and the new object is removed if it does
 * not. The review row is opened by a trigger on the same write.
 */
export async function saveLicence(
  userId: string,
  draft: LicenceDraft,
  existing: Licence | null,
  file: File | null,
  position: number
): Promise<{ ok: true; licence: Licence } | Fail> {
  let uploaded: string | null = null;
  if (file) {
    const up = await uploadPrivateFile({ bucket: BUCKET, userId, file });
    if (!up.ok || !up.path) return { ok: false, message: up.message ?? "That file couldn't be uploaded." };
    uploaded = up.path;
  }

  const row = { ...licenceTo(draft), ...(uploaded && { document_path: uploaded }) };
  const result = existing
    ? await supabase.from("professional_licences").update(row).eq("id", existing.id).select("*").single()
    : await supabase
        .from("professional_licences")
        .insert({ ...row, professional_id: userId, position })
        .select("*")
        .single();

  if (result.error || !result.data) {
    console.error("[professional-cv] Could not save the licence:", result.error?.message);
    if (uploaded) {
      const cleanup = await deletePrivateFile(BUCKET, uploaded);
      if (!cleanup.ok) console.error("[professional-cv] ORPHANED OBJECT after row write failure:", uploaded);
    }
    return {
      ok: false,
      message: result.error ? describe(result.error, "the licence") : "Couldn't save the licence. Try again.",
    };
  }

  if (uploaded && existing?.documentPath && existing.documentPath !== uploaded) {
    const removed = await deletePrivateFile(BUCKET, existing.documentPath);
    if (!removed.ok) console.warn("[professional-cv] Could not remove the previous document.");
  }
  return { ok: true, licence: licenceFrom(result.data) };
}

/** Detaches a licence's document: the row first, then the file. */
export async function removeLicenceDocument(licence: Licence): Promise<{ ok: true; licence: Licence } | Fail> {
  const result = await supabase
    .from("professional_licences")
    .update({ document_path: null })
    .eq("id", licence.id)
    .select("*")
    .single();
  if (result.error || !result.data) {
    return { ok: false, message: "Couldn't remove the document. Try again." };
  }
  if (licence.documentPath) {
    const removed = await deletePrivateFile(BUCKET, licence.documentPath);
    if (!removed.ok) console.warn("[professional-cv] Could not delete the stored document.");
  }
  return { ok: true, licence: licenceFrom(result.data) };
}

/**
 * Deletes a licence: the row, then (for licence #1) the legacy column, then
 * the file.
 *
 * THE LEGACY COLUMN IS CLEARED BY HAND. The database mirrors certification_url
 * and licence #1's document on insert and update, not on delete, so without
 * this the old column would go on pointing at a file that is about to be gone.
 */
export async function deleteLicence(userId: string, licence: Licence): Promise<{ ok: true } | Fail> {
  const { error } = await supabase.from("professional_licences").delete().eq("id", licence.id);
  if (error) {
    console.error("[professional-cv] Could not delete the licence:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't delete the licence. Try again." };
  }
  if (licence.mirrorsCertification && licence.documentPath) {
    const cleared = await supabase
      .from("professional_profiles")
      .update({ certification_url: null })
      .eq("profile_id", userId)
      .eq("certification_url", licence.documentPath);
    if (cleared.error) console.warn("[professional-cv] Could not clear the legacy certificate path.");
  }
  if (licence.documentPath) {
    const removed = await deletePrivateFile(BUCKET, licence.documentPath);
    if (!removed.ok) console.warn("[professional-cv] Could not delete the stored document.");
  }
  return { ok: true };
}

/** The review status of licence #1, the one the Certification sheet shows. */
export async function fetchCertificateStatus(userId: string): Promise<LicenceStatus | null> {
  const [licence, reviews] = await Promise.all([
    supabase
      .from("professional_licences")
      .select("*")
      .eq("professional_id", userId)
      .eq("mirrors_certification_url", true)
      .maybeSingle(),
    supabase.from("professional_licence_reviews").select("*").eq("professional_id", userId),
  ]);
  if (licence.error || reviews.error || !licence.data) return null;
  return licenceStatus(licenceFrom(licence.data), (reviews.data ?? []).map(reviewFrom));
}

// ---------------------------------------------------------------------------
// The public CV, as a client or a stranger reads it
// ---------------------------------------------------------------------------

export interface PublicLicence {
  id: string;
  name: string;
  issuingBody: string | null;
  issued: MonthValue | null;
  expires: MonthValue | null;
  noExpiry: boolean;
  credentialUrl: string | null;
  verified: boolean;
  expired: boolean;
}

export interface PublicCv {
  licences: PublicLicence[];
  experience: Experience[];
  education: Education[];
  languages: Language[];
  awards: Award[];
  publications: Publication[];
  volunteering: Volunteering[];
  links: CvLink[];
}

export const EMPTY_PUBLIC_CV: PublicCv = {
  licences: [],
  experience: [],
  education: [],
  languages: [],
  awards: [],
  publications: [],
  volunteering: [],
  links: [],
};

export async function fetchPublicCv(professionalId: string): Promise<{ ok: true; cv: PublicCv } | Fail> {
  const q = <T extends string>(view: T) =>
    supabase
      .from(view as "public_professional_links")
      .select("*")
      .eq("professional_id", professionalId)
      .order("position");

  const [licences, experience, education, languages, awards, publications, volunteering, links] = await Promise.all([
    q("public_professional_licences"),
    q("public_professional_experience"),
    q("public_professional_education"),
    q("public_professional_languages"),
    q("public_professional_awards"),
    q("public_professional_publications"),
    q("public_professional_volunteering"),
    q("public_professional_links"),
  ]);
  const failed = [licences, experience, education, languages, awards, publications, volunteering, links].find((r) => r.error);
  if (failed?.error) {
    console.error("[professional-cv] Could not read a public CV:", failed.error.message);
    return { ok: false, message: isOffline(failed.error) ? OFFLINE_MESSAGE : "Couldn't load their CV." };
  }

  // Every view column is nullable to the type generator; rows without the
  // fields a section cannot render without are dropped below.
  const L = (licences.data ?? []) as unknown as Tables<"public_professional_licences">[];
  const E = (experience.data ?? []) as unknown as Tables<"public_professional_experience">[];
  const Ed = (education.data ?? []) as unknown as Tables<"public_professional_education">[];
  const La = (languages.data ?? []) as unknown as Tables<"public_professional_languages">[];
  const A = (awards.data ?? []) as unknown as Tables<"public_professional_awards">[];
  const P = (publications.data ?? []) as unknown as Tables<"public_professional_publications">[];
  const V = (volunteering.data ?? []) as unknown as Tables<"public_professional_volunteering">[];
  const Li = (links.data ?? []) as unknown as Tables<"public_professional_links">[];

  return {
    ok: true,
    cv: {
      licences: L.filter((r) => r.id && r.name).map((r) => ({
        id: r.id!,
        name: r.name!,
        issuingBody: r.issuing_body,
        issued: toMonth(r.issued_month),
        expires: toMonth(r.expires_month),
        noExpiry: !!r.no_expiry,
        credentialUrl: r.credential_url,
        verified: !!r.verified,
        expired: !!r.expired,
      })),
      experience: E.filter((r) => r.id && r.title && r.organisation && r.start_month).map((r) => ({
        id: r.id!,
        title: r.title!,
        organisation: r.organisation!,
        location: r.location,
        start: toMonth(r.start_month)!,
        end: toMonth(r.end_month),
        description: r.description,
        position: r.position ?? 0,
      })),
      education: Ed.filter((r) => r.id && r.institution).map((r) => ({
        id: r.id!,
        institution: r.institution!,
        degree: r.degree,
        field: r.field,
        start: toMonth(r.start_month),
        end: toMonth(r.end_month),
        description: r.description,
        position: r.position ?? 0,
      })),
      languages: La.filter((r) => r.id && r.language && r.proficiency).map((r) => ({
        id: r.id!,
        language: r.language!,
        proficiency: r.proficiency!,
        position: r.position ?? 0,
      })),
      awards: A.filter((r) => r.id && r.title).map((r) => ({
        id: r.id!,
        title: r.title!,
        issuer: r.issuer,
        awarded: toMonth(r.awarded_month),
        description: r.description,
        position: r.position ?? 0,
      })),
      publications: P.filter((r) => r.id && r.title).map((r) => ({
        id: r.id!,
        title: r.title!,
        publisher: r.publisher,
        published: toMonth(r.published_month),
        url: r.url,
        description: r.description,
        position: r.position ?? 0,
      })),
      volunteering: V.filter((r) => r.id && r.role && r.organisation).map((r) => ({
        id: r.id!,
        role: r.role!,
        organisation: r.organisation!,
        start: toMonth(r.start_month),
        end: toMonth(r.end_month),
        description: r.description,
        position: r.position ?? 0,
      })),
      links: Li.filter((r) => r.id && r.label && r.url).map((r) => ({
        id: r.id!,
        label: r.label!,
        url: r.url!,
        position: r.position ?? 0,
      })),
    },
  };
}

/** Whether a public CV has nothing to show at all. */
export function cvIsEmpty(cv: PublicCv, skills: string[]) {
  return skills.length === 0 && Object.values(cv).every((rows) => (rows as unknown[]).length === 0);
}

/**
 * The professional's own CV as a client would see it, for "Preview as a
 * client". The SAME filters the public views apply: unnamed licences and
 * expired ones not opted in are dropped, verified follows the database's rule,
 * and volunteering appears only when switched on.
 */
export function previewAsClient(cv: MyCv, today: string): PublicCv {
  return {
    licences: cv.licences
      .filter((l) => l.name && (!l.expires || l.noExpiry || `${l.expires}-01` >= today || l.showWhenExpired))
      .map((l) => ({
        id: l.id,
        name: l.name!,
        issuingBody: l.issuingBody,
        issued: l.issued,
        expires: l.noExpiry ? null : l.expires,
        noExpiry: l.noExpiry,
        credentialUrl: l.credentialUrl,
        verified: licenceStatus(l, cv.reviews).kind === "verified",
        expired: !l.noExpiry && !!l.expires && `${l.expires}-01` < today,
      })),
    experience: cv.experience,
    education: cv.education,
    languages: cv.languages,
    awards: cv.awards,
    publications: cv.publications,
    volunteering: cv.profile.showVolunteering ? cv.volunteering : [],
    links: cv.links,
  };
}

export { licenceStatus };
export type { LicenceStatus, LicenceReviewRow };
