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
] as const;
export type ImageSurface = (typeof IMAGE_SURFACES)[number];

export const isImageSurface = (s: unknown): s is ImageSurface => typeof s === "string" && (IMAGE_SURFACES as readonly string[]).includes(s);

const SURFACE_WORD: Record<ImageSurface, string> = {
  avatar: "profile photo",
  professional_cover: "cover photo",
  business_logo: "logo",
  business_cover: "cover photo",
  gym_cover: "venue cover photo",
  class_cover: "class photo",
  class_series_cover: "class photo",
  showcase_image: "showcase photo",
  plan_image: "plan photo",
  service_image: "service photo",
  venue_photo: "venue photo",
  forum_photo: "forum photo",
};

/** "profile photo", "logo"...; "photo" for a surface this build doesn't know. */
export const surfaceWord = (surface: unknown): string => (isImageSurface(surface) ? SURFACE_WORD[surface] : "photo");

export const REJECT_REASONS = ["not_allowed_content", "contact_details", "not_relevant", "low_quality", "other"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

const REASON_TEXT: Record<RejectReason, string> = {
  not_allowed_content: "It shows something our community guidelines don't allow.",
  contact_details: "It shows contact details, which can't be shared in public places. Use messages for that.",
  not_relevant: "It doesn't match what it's for.",
  low_quality: "It's too hard to see clearly.",
  other: "It doesn't meet our community guidelines.",
};

/** The reason category in a sentence; the "other" sentence for anything unknown. */
export const reasonText = (reason: unknown): string =>
  typeof reason === "string" && (REJECT_REASONS as readonly string[]).includes(reason) ? REASON_TEXT[reason as RejectReason] : REASON_TEXT.other;

export const PENDING_BADGE = "Waiting for approval";
export const PENDING_LINE = "Only you can see this until our team approves it, usually within a day.";
export const REJECTED_BADGE = "Not approved";

/** The notice lines (member inbox, business inbox, professional hub). */
export function imageNoticeCopy(approved: boolean, surface: unknown, reason: unknown): { title: string; body: string } {
  const what = surfaceWord(surface);
  return approved
    ? { title: "Your photo is approved", body: `Your ${what} is approved. Others will see it in a few minutes.` }
    : { title: "Your photo wasn't approved", body: `Your ${what} can't be used. ${reasonText(reason)} You can upload another.` };
}

export const SUPPORT_NOTICE = {
  title: "You're not alone",
  body: "If something is hard right now, you can talk to someone today. Tap to see support lines.",
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
  },
};
