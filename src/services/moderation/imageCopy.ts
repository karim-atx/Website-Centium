import { t, tk } from "../../i18n/core";
// Image approval in words (Round C Release 2, Database 20261221040000): what
// each surface's image is called, and what each rejection reason means. Pure.

export const IMAGE_SURFACES = [
  "avatar",
  "professional_cover",
  "business_logo",
  "business_cover",
  "gym_cover",
  "class_cover",
  "class_series_cover",
  "showcase_image",
  "plan_image",
  "service_image",
  "venue_photo",
  "forum_photo",
  // Round D (Database 20261223050000): a course's cover and an Image lesson's image.
  "course_cover",
  "course_image",
  // Round D (Database 20261223040000 / 050000): a group's photo, by its owner.
  "group_photo",
] as const;
export type ImageSurface = (typeof IMAGE_SURFACES)[number];

export const isImageSurface = (s: unknown): s is ImageSurface => typeof s === "string" && (IMAGE_SURFACES as readonly string[]).includes(s);

const SURFACE_WORD: Record<ImageSurface, string> = {
  avatar: tk("profile photo"),
  professional_cover: tk("cover photo"),
  business_logo: tk("logo"),
  business_cover: tk("cover photo"),
  gym_cover: tk("venue cover photo"),
  class_cover: tk("class photo"),
  class_series_cover: tk("class photo"),
  showcase_image: tk("showcase photo"),
  plan_image: tk("plan photo"),
  service_image: tk("service photo"),
  venue_photo: tk("venue photo"),
  forum_photo: tk("forum photo"),
  course_cover: tk("course cover"),
  course_image: tk("lesson image"),
  group_photo: tk("group photo"),
};

/** "profile photo", "logo"...; "photo" for a surface this build doesn't know. */
export const surfaceWord = (surface: unknown): string => (isImageSurface(surface) ? SURFACE_WORD[surface] : tk("photo"));

export const REJECT_REASONS = ["not_allowed_content", "contact_details", "not_relevant", "low_quality", "other"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

const REASON_TEXT: Record<RejectReason, string> = {
  not_allowed_content: tk("It shows something our community guidelines don't allow."),
  contact_details: tk("It shows contact details, which can't be shared in public places. Use messages for that."),
  not_relevant: tk("It doesn't match what it's for."),
  low_quality: tk("It's too hard to see clearly."),
  other: tk("It doesn't meet our community guidelines."),
};

/** The reason category in a sentence; the "other" sentence for anything unknown. */
export const reasonText = (reason: unknown): string =>
  typeof reason === "string" && (REJECT_REASONS as readonly string[]).includes(reason) ? REASON_TEXT[reason as RejectReason] : REASON_TEXT.other;

export const PENDING_BADGE = tk("Waiting for approval");
export const PENDING_LINE = tk("Only you can see this until our team approves it, usually within a day.");
export const REJECTED_BADGE = tk("Not approved");

/**
 * The notice lines (member inbox, business inbox, professional hub). With no
 * surface (and, rejected, no reason) the lines are fixed keys, because the
 * inboxes build their plain tables from this at import time and translate
 * where they show them; a line with a payload is built in the chosen language.
 */
export function imageNoticeCopy(approved: boolean, surface: unknown, reason: unknown): { title: string; body: string } {
  const known = isImageSurface(surface);
  if (approved) {
    const title = tk("Your photo is approved");
    if (!known) return { title, body: tk("Your photo is approved. Others will see it in a few minutes.") };
    return { title, body: t("Your {what} is approved. Others will see it in a few minutes.", { what: t(surfaceWord(surface)) }) };
  }
  const title = tk("Your photo wasn't approved");
  if (!known && reason == null) return { title, body: tk("Your photo can't be used. It doesn't meet our community guidelines. You can upload another.") };
  return { title, body: t("Your {what} can't be used. {reason} You can upload another.", { what: t(surfaceWord(surface)), reason: t(reasonText(reason)) }) };
}

export const SUPPORT_NOTICE = {
  title: tk("You're not alone"),
  body: tk("If something is hard right now, you can talk to someone today. Tap to see support lines."),
};

/**
 * Where an image's decision notice opens, by surface and by who is reading:
 * the screen where that image is changed. Null: the row only marks read.
 */
export function imageHome(surface: unknown, audience: "member" | "business" | "professional"): string | null {
  if (!isImageSurface(surface)) return null;
  return IMAGE_HOME[audience][surface] ?? null;
}

const IMAGE_HOME: Record<"member" | "business" | "professional", Partial<Record<ImageSurface, string>>> = {
  member: { avatar: "/app/profile" },
  business: {
    avatar: "/app/business/profile",
    business_logo: "/app/business/profile",
    business_cover: "/app/business/profile",
    gym_cover: "/app/business/venue#venue-photos",
    venue_photo: "/app/business/marketplace/photos",
    class_cover: "/app/business/classes",
    class_series_cover: "/app/business/classes",
    showcase_image: "/app/business/marketplace?tab=showcase",
  },
  professional: {
    avatar: "/app/more/edit-profile",
    professional_cover: "/app/more/edit-profile",
    showcase_image: "/app/pro/marketplace/showcase",
    plan_image: "/app/pro/marketplace/showcase",
    service_image: "/app/pro/marketplace/showcase",
    course_cover: "/app/forum/courses/mine",
    course_image: "/app/forum/courses/mine",
    group_photo: "/app/messages",
  },
};
