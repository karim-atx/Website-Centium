import { useState } from "react";
import { licenceHiddenByExpiry, setLicencePublished, type Licence } from "../../services/professional-cv";
import { todayLocal } from "../../utils/date";

// A licence is not public until its owner says so (20261120150000):
// professional_licences.published_at, null = not public. Saving a licence never
// publishes it (the INSERT grant refuses the column), so this switch is the one
// place a licence goes on, or comes off, the public profile. Used by My CV,
// the licence sheet and onboarding's Background step; onboarding's Credentials
// and Review steps and the verification screen draw the same choice in the
// onboarding look (pages/onboarding/pro/ProLicencePublish).

export const PUBLISH_STRINGS = {
  label: "Show on my profile",
  public: "Public",
  notPublic: "Not public",
  publicDesc:
    "Clients see its name, issuer and dates on your profile, with a Verified badge once it's approved. The document and credential ID stay private.",
  notPublicDesc: "Only you and our review team can see it. Clients don't see it on your profile.",
  unnamedDesc: "Add its name to show it on your profile.",
  expiredDesc: "It has expired, so clients don't see it. Turn on Show to clients after it expires to keep it on your profile.",
  onboardingIntro: "Licences start hidden. Switch one on and clients see it on your profile. You can change this any time in Edit public profile.",
  newLicence: "New licences start hidden from clients. Once it's saved, you choose whether to show it on your profile.",
} as const;

export type PublishState = "public" | "expired" | "not-public" | "unnamed";

export function publishState(l: Licence, today: string = todayLocal()): PublishState {
  if (!l.name) return "unnamed";
  if (!l.publishedAt) return "not-public";
  return licenceHiddenByExpiry(l, today) ? "expired" : "public";
}

export function publishDesc(state: PublishState): string {
  return state === "public"
    ? PUBLISH_STRINGS.publicDesc
    : state === "expired"
    ? PUBLISH_STRINGS.expiredDesc
    : state === "unnamed"
    ? PUBLISH_STRINGS.unnamedDesc
    : PUBLISH_STRINGS.notPublicDesc;
}

/** Saves the choice for one licence; the caller keeps the returned row. */
export function usePublishLicence(onChanged: (l: Licence) => void) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const toggle = async (l: Licence, on: boolean) => {
    if (busyId) return;
    setBusyId(l.id);
    setError(null);
    const r = await setLicencePublished(l, on);
    setBusyId(null);
    if (!r.ok) {
      setError({ id: l.id, message: r.message });
      return;
    }
    onChanged(r.licence);
  };
  return { busyId, error, toggle };
}

