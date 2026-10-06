import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { KeyRound, Mail, Phone } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import { updatePhone } from "../../services/profile";
import { fetchMyNickname, fetchReservedNicknames, setNickname } from "../../services/forum";
import { forumAccess, NICKNAME_PROBLEM_TEXT, nicknameProblem } from "../../services/forum/rules";

// MO1.5.4 Credentials, as a centred popup (R15, batch C, C10). No ×: tapping
// outside or Escape closes it and discards the edits; Save saves.
//
// WHAT IS STORED WHERE, said on the popup itself:
// - Phone goes to profiles.phone on the server. It used to be typed into a
//   sheet and kept only in this browser.
// - Instagram and X stay on this device, as before: profiles has no column
//   for them yet (backlog, D24). Neutral icons until the brand marks arrive.
// - The forum nickname moved in here from its own row on Profile (adult
//   customers only, as before); it saves through set_forum_nickname with the
//   same checks as the nickname page.
//
// Handles are stored without "@". A malformed one turns its field and helper
// line red; Save stays available and refuses only that field (flow 4.3).

const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const bare = (handle: string) => handle.trim().replace(/^@+/, "");

// MO1.5.4: Instagram and X with their brand marks (Foundations 2.4 "Brand
// icons", fixed in every theme), copied from the handover's
// assets/icons/custom/MO1-5-4_03 and _04, 26 pt. The neutral glyphs that
// stood in for them doubled the "@" prefix (revision round, item 9). X's mark
// is drawn in the ink colour so it stays visible on the dark field.
const InstagramMark: React.FC = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
    <defs>
      <radialGradient id="cred-ig" cx="0.3" cy="1.07" r="1.3">
        <stop offset="0" stopColor="#FFDD55" />
        <stop offset="0.12" stopColor="#FFDD55" />
        <stop offset="0.45" stopColor="#FF543E" />
        <stop offset="0.75" stopColor="#C837AB" />
        <stop offset="1" stopColor="#6A35D9" />
      </radialGradient>
    </defs>
    <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#cred-ig)" />
    <rect x="5.6" y="5.6" width="12.8" height="12.8" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.1" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
    <circle cx="16.3" cy="7.7" r="1" fill="#FFFFFF" />
  </svg>
);
const XMark: React.FC = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", color: "rgb(var(--c-charcoal))" }} fill="currentColor">
    <path d="M17.75 2.5h3.07l-6.71 7.67L22 21.5h-6.18l-4.84-6.33-5.54 6.33H2.37l7.18-8.2L2 2.5h6.34l4.38 5.79zm-1.08 17.18h1.7L7.4 4.23H5.58z" />
  </svg>
);

export const CredentialsPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, authUserId, updateProfile } = useApp();
  const showNickname = user.accountType === "customer" && forumAccess(user.dateOfBirth) === "adult" && !!authUserId;

  const [phone, setPhone] = useState(user.phone ?? "");
  const [instagram, setInstagram] = useState(user.instagramHandle ?? "");
  const [x, setX] = useState(user.xHandle ?? "");
  const [nickname, setNicknameDraft] = useState("");
  const [savedNickname, setSavedNickname] = useState<string | null>(null);
  const [reserved, setReserved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // The nickname as stored, and the reserved list the nickname page checks.
  useEffect(() => {
    if (!open || !showNickname || !authUserId) return;
    let cancelled = false;
    void fetchMyNickname(authUserId).then((r) => {
      if (cancelled || !r.ok) return;
      setSavedNickname(r.value);
      setNicknameDraft(r.value ?? "");
    });
    void fetchReservedNicknames().then((set) => {
      if (!cancelled) setReserved(set);
    });
    return () => {
      cancelled = true;
    };
  }, [open, showNickname, authUserId]);

  const save = async () => {
    if (busy || !authUserId) return;
    const next: Record<string, string> = {};
    const ig = bare(instagram);
    const xh = bare(x);
    if (ig && !INSTAGRAM.test(ig)) next.instagram = "Use up to 30 letters, numbers, dots or underscores.";
    if (xh && !X_HANDLE.test(xh)) next.x = "Use up to 15 letters, numbers or underscores.";
    const nick = nickname.trim();
    const nickChanged = showNickname && nick !== (savedNickname ?? "");
    if (nickChanged && nick) {
      const problem = nicknameProblem(nick, reserved, [user.firstName]);
      if (problem) next.nickname = NICKNAME_PROBLEM_TEXT[problem];
    }

    setBusy(true);
    // Each part saves on its own, so one refusal does not undo the others;
    // the popup stays open and says which part did not save.
    if ((phone.trim() || "") !== (user.phone ?? "")) {
      const r = await updatePhone(authUserId, phone);
      if (r.ok) updateProfile({ phone: phone.trim() || undefined });
      else next.phone = r.message ?? "Couldn't save your phone number.";
    }
    if (!next.instagram && !next.x) updateProfile({ instagramHandle: ig || undefined, xHandle: xh || undefined });
    if (nickChanged && nick && !next.nickname) {
      const r = await setNickname(nick);
      if (r.ok) setSavedNickname(nick);
      else next.nickname = r.message;
    }
    setBusy(false);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setDone(true);
      setTimeout(onClose, 700);
    }
  };

  const field = (
    key: string,
    icon: React.ReactNode,
    value: string,
    onChange: (v: string) => void,
    opts: {
      placeholder: string;
      label: string;
      prefix?: boolean;
      readOnly?: boolean;
      inputMode?: "tel" | "text" | "email";
      // MO1.5.4 draws "Email", "Phone" and "Forum nickname" as visible
      // 12/600 labels above their fields; the social pair has none.
      visibleLabel?: boolean;
    }
  ) => (
    <label className="block">
      <span className={opts.visibleLabel ? "block mb-2 text-xs font-semibold text-charcoal-faint" : "sr-only"}>
        {opts.label}
      </span>
      {/* MO1.5.4 (2x frame): 56 tall, radius 12, #F5F5F6 with no visible
          border (the field meets the white card directly, x 76 / y 946);
          the border shows only for an error (Foundations Inputs). */}
      <span
        className={clsx(
          "flex items-center gap-2.5 h-14 rounded-xl bg-cream-soft border px-3.5",
          errors[key] ? "border-status-high" : "border-transparent"
        )}
      >
        {icon && (
          <span className="shrink-0 text-charcoal-faint" aria-hidden>
            {icon}
          </span>
        )}
        {opts.prefix && <span className="text-sm text-charcoal-faint -me-1.5" aria-hidden>@</span>}
        <input
          value={value}
          readOnly={opts.readOnly}
          inputMode={opts.inputMode}
          onChange={(e) => {
            onChange(e.target.value);
            if (errors[key])
              setErrors((prev) => {
                const rest = { ...prev };
                delete rest[key];
                return rest;
              });
          }}
          placeholder={opts.placeholder}
          aria-invalid={!!errors[key] || undefined}
          className={clsx(
            "flex-1 min-w-0 bg-transparent text-sm placeholder:text-charcoal-faint focus:outline-none",
            opts.readOnly ? "text-charcoal-faint" : "text-charcoal"
          )}
        />
      </span>
      {errors[key] && <span className="block mt-1 text-[11px] font-semibold text-status-high">{errors[key]}</span>}
    </label>
  );

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Credentials"
      // MO1.5.4 (2x frame): the fields 18 in, the icon tile 22 under the top
      // (y 656 → 700) and Save 18 above the bottom (y 1893 → 1929); KeyRound
      // 22/1.75 in #7D6BB5 on the #F0EDF9 tile (new popup, decision 22).
      // Decision 23 (flag): the Foundations 342 width (16 side margins)
      // rather than the frame's 350.
      className="!px-[18px] !pt-[22px] !pb-[18px]"
      icon={<KeyRound size={22} strokeWidth={1.75} className="text-primary-dark" />}
      cta={{ label: done ? "Saved" : busy ? "Saving…" : "Save", disabled: busy || done, onClick: () => void save() }}
    >
      {/* Visible labels (MO1.5.4.email / .phone); about 16 between the
          email field and the Phone label, measured on the 2x frame. */}
      <div className="space-y-4">
        {/* MO1.5.4 icons: Mail 15/1.75, Phone 15/1.75. */}
        {field("email", <Mail size={15} strokeWidth={1.75} />, user.email, () => {}, {
          placeholder: "Email",
          label: "Email",
          readOnly: true,
          visibleLabel: true,
        })}
        {field("phone", <Phone size={15} strokeWidth={1.75} />, phone, setPhone, {
          placeholder: "Phone number",
          label: "Phone",
          inputMode: "tel",
          visibleLabel: true,
        })}
      </div>

      {/* MO1.5.4 row 10: "Social" 10.5/700 (cap height 7.5 on the 2x frame),
          16 under the Phone field and 14 above the pair (y 1241 / 1280–1295 /
          1330). */}
      <p className="mt-4 mb-3.5 text-[10.5px] leading-[14px] font-bold text-charcoal-faint uppercase tracking-wide">Social</p>
      <div className="grid grid-cols-2 gap-2.5">
        {/* MO1.5.4: a fixed "@" prefix and lowercase placeholders. */}
        {field("instagram", <InstagramMark />, instagram, setInstagram, {
          placeholder: "instagram",
          label: "Instagram handle",
          prefix: true,
        })}
        {field("x", <XMark />, x, setX, { placeholder: "x", label: "X handle", prefix: true })}
      </div>
      <p className="mt-2 text-[11px] text-charcoal-faint">
        Your phone number is saved to your account. Instagram and X stay on this device for now.
      </p>

      {showNickname && (
        <div className="mt-4 pt-4 border-t border-charcoal/[0.06]">
          {/* MO1.5.4: no icon, a fixed "@" prefix, placeholder "nickname". */}
          {field("nickname", null, nickname, setNicknameDraft, {
            placeholder: "nickname",
            label: "Forum nickname",
            prefix: true,
            visibleLabel: true,
          })}
          <p className="mt-1.5 text-[11px] text-charcoal-faint">Shown on your Community posts and replies.</p>
        </div>
      )}
    </CentredPopup>
  );
};
