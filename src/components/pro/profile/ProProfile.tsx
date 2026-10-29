import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Briefcase, Cake, Camera, ChevronLeft, Globe2, Info, KeyRound, LogOut, Mail, Phone, ShieldCheck, Smartphone, User } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton as AppCta } from "../../ui/PinnedCta";
import { ChangePasswordSheet } from "../../profile/ChangePasswordSheet";
import { CycleTrackingRow } from "../../profile/CycleTrackingRow";
import { DobInline } from "../../profile/DobInline";
import { SettingsRow, SettingsSection } from "../calendar/calendarFields";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { useMyCv } from "../../cv/useMyCv";
import { getMfaStatus } from "../../../services/mfa";
import { fetchPendingTypeChange } from "../../../services/pro/profile";
import { ageFromDateOfBirth, formatDisplayDate } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import type { ProfessionalSubtype } from "../../../types";
import { INK } from "../proInk";
import { FootNote, LockTile, VerifiedTag } from "./kit";
import { licenceFacts, shortDate } from "./profileModel";
import { NameSheet, PhoneSheet, PhotoSourceSheet, TypeChangeSheet, TypeLockedPopup, usePhotoPicker } from "./ProfileSheets";
import { ImageApprovalBadge, ImageApprovalNote } from "../../moderation/ImageApproval";
import { typeAndLane, typeLabel } from "./typeLabel";

/**
 * Release 3 · W6 MO26 v2 Profile, the professional branch of /app/profile
 * (r16 profile16, r15 profile15, cHead15):
 * - head: back 36 (-7 left), "Profile" 24 / 700 -0.03em line 1.25, 3 down, 16 under;
 * - hero (margin -4 0 18): an 88 avatar with a 32 camera badge (fill, 3 cream
 *   ring, Camera 14 / 2 on fill) opening the photo source sheet (MO26); name
 *   20 / 800 with BadgeCheck 17 good when verified, 10 above; "{type} · {lane}"
 *   13 text.faint;
 * - sections (padding 0 8): Personal (Name, Email, Phone, Date of birth),
 *   Professional (Professional type with the lock and its info line, Licence
 *   with Verified, Public profile "Preview and edit"), Health tracking (J9:
 *   the professional's own cycle switch, kept), Sign-in (Password, Two-factor);
 * - Sign out 13 / 700 status.high, centred, 26 above, with the existing
 *   confirmation.
 * The bio, reviews and certification that sat here moved to MO14, MO6 and MO4.
 */
export const ProProfile: React.FC = () => {
  const { user, signOut } = useApp();
  const navigate = useNavigate();
  const back = useBack();
  const { cv } = useMyCv();
  const picker = usePhotoPicker();
  const [sheet, setSheet] = useState<null | "photo" | "name" | "phone" | "dob" | "locked" | "request" | "password">(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [mfaOn, setMfaOn] = useState<boolean | null>(null);
  const [pending, setPending] = useState<ProfessionalSubtype | null>(null);
  const { authUserId } = useApp();

  useEffect(() => {
    let live = true;
    void getMfaStatus().then((r) => live && r.ok && setMfaOn(r.data.factors.length > 0));
    if (authUserId) void fetchPendingTypeChange(authUserId).then((r) => live && r.ok && setPending(r.data?.requestedType ?? null));
    return () => {
      live = false;
    };
  }, [authUserId]);

  const lic = cv ? licenceFacts(cv.licences, cv.reviews) : null;
  const licenceSub = !lic
    ? undefined
    : lic.verified
      ? lic.verifiedAt
        ? `Verified ${shortDate(lic.verifiedAt)}`
        : "Verified"
      : !lic.primary
        ? "Not added yet"
        : lic.status?.kind === "rejected"
          ? "Needs changes"
          : lic.status?.kind === "pending"
            ? "We're checking it"
            : "No document yet";
  const name = user.firstName ?? "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div>
      <div className="flex items-start" style={{ gap: 6, marginBottom: 16 }}>
        <button type="button" onClick={back} aria-label="Back" className="tap flex items-center justify-center shrink-0" style={{ width: 36, height: 36, marginLeft: -7, borderRadius: 9999, color: INK.chS }}>
          <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        </button>
        <h1 style={{ marginTop: 3, fontSize: textPx(24), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, color: INK.ch }}>Profile</h1>
      </div>

      <div className="flex flex-col items-center text-center" style={{ margin: "-4px 0 18px" }}>
        <button type="button" onClick={() => setSheet("photo")} aria-label="Change profile photo" className="tap relative">
          <span className="flex items-center justify-center overflow-hidden" style={{ width: 88, height: 88, borderRadius: 9999, background: INK.tealPale, fontSize: 28, fontWeight: 800, color: INK.tealDark }}>
            {picker.url ? <img src={picker.url} alt="" className="w-full h-full object-cover" /> : initials}
          </span>
          <span className="absolute flex items-center justify-center" style={{ right: -2, bottom: -2, width: 32, height: 32, borderRadius: 9999, background: INK.fill, border: `3px solid ${INK.cream}` }}>
            <Camera size={14} strokeWidth={2} aria-hidden style={{ color: INK.onFill }} />
          </span>
        </button>
        <p className="flex items-center justify-center" style={{ gap: 6, fontSize: textPx(20), fontWeight: 800, color: INK.ch, marginTop: 10, overflowWrap: "anywhere" }}>
          {name}
          {lic?.verified && <BadgeCheck size={17} strokeWidth={2} aria-label="Verified" style={{ color: INK.good, flexShrink: 0 }} />}
        </p>
        <p style={{ fontSize: textPx(13), color: INK.chF }}>{typeAndLane(user.professionalSubtype)}</p>
        {picker.busy && (
          <p role="status" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.chF }}>
            Saving…
          </p>
        )}
        {picker.error && (
          <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
            {picker.error}
          </p>
        )}
        {/* Round C Release 2: a new photo waits for approval. */}
        <ImageApprovalBadge state={picker.image} className="mt-2" />
        <ImageApprovalNote state={picker.image} className="mt-1.5 max-w-[280px]" />
      </div>

      <div style={{ padding: "0 8px" }}>
        <SettingsSection label="Personal" first>
          <SettingsRow icon={User} title="Name" sub={name || "Add your name"} onClick={() => setSheet("name")} />
          <SettingsRow icon={Mail} title="Email" sub={user.email || "–"} />
          <SettingsRow icon={Phone} title="Phone" sub={user.phone || "Add your phone"} onClick={() => setSheet("phone")} />
          <SettingsRow icon={Cake} title="Date of birth" sub={user.dateOfBirth ? formatDisplayDate(user.dateOfBirth) : "Add your date of birth"} onClick={() => setSheet("dob")} last />
        </SettingsSection>

        <SettingsSection label="Professional">
          <SettingsRow icon={Briefcase} title="Professional type" sub={typeAndLane(user.professionalSubtype)} right={<LockTile />} onClick={() => setSheet("locked")} ariaLabel={`Professional type, ${typeLabel(user.professionalSubtype)}. Locked`} />
          <FootNote icon={Info} style={{ margin: "-4px 0 6px 50px" }}>
            {pending
              ? `Your request to change to ${typeLabel(pending)} is with our team.`
              : "Contact support to change your professional type. It sets your tools and how your licence is verified."}
          </FootNote>
          <SettingsRow icon={ShieldCheck} title="Licence" sub={licenceSub} right={lic?.verified ? <VerifiedTag /> : undefined} onClick={() => navigate("/app/more/credentials")} />
          <SettingsRow icon={Globe2} title="Public profile" sub="Preview and edit" onClick={() => navigate("/app/more/edit-profile")} last />
        </SettingsSection>

        {/* J9: the professional's own cycle tracking, kept on Profile. */}
        <SettingsSection label="Health tracking">
          <div style={{ padding: "13px 0" }}>
            <CycleTrackingRow />
          </div>
        </SettingsSection>

        <SettingsSection label="Sign-in">
          <SettingsRow icon={KeyRound} title="Password" sub="Change it any time" onClick={() => setSheet("password")} />
          <SettingsRow icon={Smartphone} title="Two-factor authentication" sub={mfaOn === null ? undefined : mfaOn ? "On" : "Off"} onClick={() => navigate("/app/settings/two-factor")} last />
        </SettingsSection>

        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className="tap block mx-auto"
          style={{ marginTop: 26, minHeight: 44, padding: "0 16px", fontSize: textPx(13), fontWeight: 700, color: INK.hi }}
        >
          Sign out
        </button>
      </div>

      {picker.inputs}
      <PhotoSourceSheet open={sheet === "photo"} onClose={() => setSheet(null)} picker={picker} />
      <NameSheet open={sheet === "name"} onClose={() => setSheet(null)} />
      <PhoneSheet open={sheet === "phone"} onClose={() => setSheet(null)} />
      <DobSheet open={sheet === "dob"} onClose={() => setSheet(null)} />
      <TypeLockedPopup open={sheet === "locked"} onClose={() => setSheet(null)} onContact={() => setSheet("request")} />
      <TypeChangeSheet open={sheet === "request"} onClose={() => setSheet(null)} current={user.professionalSubtype} pending={pending} onSent={setPending} />
      <ChangePasswordSheet key={sheet === "password" ? "pw-open" : "pw-closed"} open={sheet === "password"} onClose={() => setSheet(null)} />

      <CentredPopup open={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?" icon={<LogOut size={22} />} body="You can sign back in at any time.">
        <AppCta
          size="page"
          label="Sign Out"
          onClick={() => {
            setConfirmSignOut(false);
            signOut();
            navigate("/app/onboarding");
          }}
        />
        <button type="button" onClick={() => setConfirmSignOut(false)} className="tap mt-3 w-full min-h-11 text-center text-sm font-semibold text-charcoal-soft">
          Cancel
        </button>
      </CentredPopup>
    </div>
  );
};

/** Date of birth: shown locked once saved (ATX51), else asked for (the client Profile's rule and copy). */
const DobSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useApp();
  return (
    <BottomSheet open={open} onClose={onClose} title="Date of birth">
      {user.dateOfBirth ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-cream-soft px-4 py-3.5">
            <p className="text-base font-semibold text-charcoal tabular-nums">{formatDisplayDate(user.dateOfBirth)}</p>
            {ageFromDateOfBirth(user.dateOfBirth) !== undefined && <p className="text-xs text-charcoal-faint mt-0.5">{ageFromDateOfBirth(user.dateOfBirth)} years old</p>}
          </div>
          <p className="text-[11px] text-charcoal-faint">A date of birth can't be changed once it's saved.</p>
          <p className="text-sm text-charcoal-soft">
            Need to correct it?{" "}
            <Link to="/contact" className="font-semibold text-primary-deep-text underline">
              Contact support
            </Link>
          </p>
        </div>
      ) : (
        <DobInline title="Add your date of birth" body="It's kept private: clients never see it. Check it before saving: it can't be changed afterwards." onSaved={onClose} />
      )}
    </BottomSheet>
  );
};
