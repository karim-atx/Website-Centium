import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { CentiumLockup } from "../../components/icons/CentiumMark";
import { VerifiedCheck } from "../../components/cv/CvBadges";
import { LicencePendingTag } from "../../components/professionals/LicencePendingTag";
import { initials, pinGround, typeColours } from "../../components/professionals/typeColour";
import { AvatarPlaceholder } from "../../components/icons/PartBIcons";
import { useIsDark } from "../../hooks/useIsDark";
import { professionalRole } from "../../services/connected-professional";
import { rememberPublicReturn } from "../../services/public-pro";
import { textPx } from "../../theme/textSize";
import type { Enums } from "../../../lib/supabase/database.types";
import { t } from "../../i18n/core";

// Release 3 · W7 the public professional pages' shared pieces. Standalone like
// the public certificate (no app chrome, no navbar), but in the app's tokens so
// they follow light, dark, high contrast and Larger text for a signed-in
// visitor (a signed-out one gets the device's theme).

/** The 430 column, centred, with the Centium lockup on top. */
export function PublicFrame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="min-h-[100dvh] bg-cream flex justify-center px-4 pt-8 pb-10">
      <main className="w-full max-w-[430px] flex flex-col gap-4" aria-label={label}>
        <div className="flex justify-center">
          <Link to="/" aria-label={t("Centium home")} className="tap inline-flex items-center min-h-11">
            <CentiumLockup width={(36 * 687) / 842} label="Centium" />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

/** A card in the client profile's own style (r20, card fill, 8% hairline). */
export function PublicCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4 ${className ?? ""}`}>{children}</section>;
}

/** The loading state: the hero and one card as skeletons. */
export function PublicSkeleton() {
  return (
    <div aria-busy="true" role="status" aria-label={t("Loading")} className="flex flex-col gap-4">
      <div aria-hidden className="flex flex-col items-center gap-2 pt-2">
        <span className="w-[72px] h-[72px] rounded-full bg-cream-soft animate-skeleton-pulse" />
        <span className="w-40 h-[22px] rounded-md bg-cream-soft animate-skeleton-pulse" />
        <span className="w-28 h-[14px] rounded-md bg-cream-soft animate-skeleton-pulse" />
      </div>
      <div aria-hidden className="h-[160px] rounded-[20px] bg-cream-soft animate-skeleton-pulse" />
    </div>
  );
}

/** Not found, an error with Retry, or offline: one centred card. */
export function PublicMessage({ title, line, onRetry, children }: { title: string; line?: string; onRetry?: () => void; children?: React.ReactNode }) {
  return (
    <PublicCard className="text-center !p-6">
      <p className="text-[15px] font-bold text-charcoal" role={onRetry ? "alert" : undefined}>
        {title}
      </p>
      {line && <p className="mt-1.5 text-[13px] leading-[1.6] text-charcoal-soft">{line}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="tap mt-3 min-h-11 px-4 text-[13px] font-bold text-primary-accent">
          {t("Retry")}
        </button>
      )}
      {children}
    </PublicCard>
  );
}

/**
 * The professional's centred hero, as the client profile draws it (MO1.2.1:
 * avatar in the type ground, name 22 / 700 in the deep ink, BadgeCheck when
 * verified, headline 15 / 700, role 14 / 500), at 72 for a public page; with
 * "Licence not verified yet" when licence_verified is false (Karim's answer 1).
 */
export function ProHero({
  name,
  avatarUrl,
  subtype,
  specialty,
  headline,
  licenceVerified,
  location,
}: {
  name: string;
  avatarUrl: string | null;
  subtype: Enums<"professional_subtype"> | null;
  specialty?: string | null;
  headline?: string | null;
  licenceVerified: boolean;
  location?: string | null;
}) {
  const dark = useIsDark();
  const tc = typeColours(subtype, dark);
  // The subtype label is an English key; a specialty is the professional's own text.
  const role = professionalRole({ specialty: specialty ?? null, subtype }) ? t(professionalRole({ specialty: specialty ?? null, subtype })!) : null;
  return (
    <div className="flex flex-col items-center text-center">
      <span
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden text-[22px] font-bold"
        style={{ background: pinGround(subtype, dark), color: tc.deep }}
        aria-hidden
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : name.trim() ? initials(name) : <AvatarPlaceholder size={72} />}
      </span>
      <h1 className="mt-3 flex items-center justify-center gap-1.5 font-bold tracking-[-0.4px]" style={{ color: tc.deep, fontSize: textPx(22), lineHeight: 1.27 }}>
        <span className="min-w-0 break-words">{name || t("A professional")}</span>
        {licenceVerified && <VerifiedCheck size={18} strokeWidth={1.75} />}
      </h1>
      {headline && (
        <p className="mt-[3px] font-bold break-words" style={{ color: tc.main, fontSize: textPx(15), lineHeight: 1.4 }}>
          {headline}
        </p>
      )}
      {(role || location) && (
        <p className="mt-[2px] font-medium text-charcoal-soft" style={{ fontSize: textPx(14) }}>
          {[role, location].filter(Boolean).join(" · ")}
        </p>
      )}
      {!licenceVerified && <LicencePendingTag className="mt-2" />}
    </div>
  );
}

/**
 * Signed out: Create an account / Sign in, remembering this page (and any
 * chosen slot, in `returnPath`) so the visitor lands back on it. Sign in opens
 * onboarding's Sign in screen (?auth=signin, as the reset page links it);
 * Create an account opens Welcome.
 */
export function SignInButtons({ returnPath, line }: { returnPath: string; line?: string }) {
  const navigate = useNavigate();
  const go = (to: string) => {
    rememberPublicReturn(returnPath);
    navigate(to);
  };
  return (
    <div className="flex flex-col gap-2">
      {line && <p className="text-[12.5px] leading-[1.5] text-charcoal-soft mb-1">{line}</p>}
      <button
        type="button"
        onClick={() => go("/app/onboarding")}
        className="tap w-full h-12 rounded-[14px] bg-primary-fill text-on-primary-fill inline-flex items-center justify-center gap-[7px] font-bold"
        style={{ fontSize: textPx(14) }}
      >
        <UserPlus size={15} strokeWidth={2} aria-hidden /> {t("Create an account")}
      </button>
      <button
        type="button"
        onClick={() => go("/app/onboarding?auth=signin")}
        className="tap w-full h-12 rounded-[14px] bg-primary-pale text-primary-deep-text inline-flex items-center justify-center gap-[7px] font-bold"
        style={{ fontSize: textPx(14) }}
      >
        <LogIn size={15} strokeWidth={2} aria-hidden /> {t("Sign in")}
      </button>
    </div>
  );
}
