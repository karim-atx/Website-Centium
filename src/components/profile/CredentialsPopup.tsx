import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { AtSign, KeyRound, Mail, Phone, XIcon } from "lucide-react";
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
    opts: { placeholder: string; label: string; prefix?: boolean; readOnly?: boolean; inputMode?: "tel" | "text" | "email" }
  ) => (
    <label className="block">
      <span className="sr-only">{opts.label}</span>
      <span
        className={clsx(
          "flex items-center gap-2.5 h-14 rounded-2xl bg-cream-soft border px-3.5",
          errors[key] ? "border-status-high" : "border-charcoal/10"
        )}
      >
        <span className="shrink-0 text-charcoal-faint" aria-hidden>
          {icon}
        </span>
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
      icon={<KeyRound size={22} />}
      cta={{ label: done ? "Saved" : busy ? "Saving…" : "Save", disabled: busy || done, onClick: () => void save() }}
    >
      <div className="space-y-2.5">
        {field("email", <Mail size={16} />, user.email, () => {}, { placeholder: "Email", label: "Email", readOnly: true })}
        {field("phone", <Phone size={16} />, phone, setPhone, { placeholder: "Phone number", label: "Phone number", inputMode: "tel" })}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Social</p>
      <div className="grid grid-cols-2 gap-2.5">
        {field("instagram", <AtSign size={16} />, instagram, setInstagram, {
          placeholder: "Instagram",
          label: "Instagram handle",
          prefix: false,
        })}
        {field("x", <XIcon size={16} />, x, setX, { placeholder: "X", label: "X handle", prefix: false })}
      </div>
      <p className="mt-2 text-[11px] text-charcoal-faint">
        Your phone number is saved to your account. Instagram and X stay on this device for now.
      </p>

      {showNickname && (
        <div className="mt-4 pt-4 border-t border-charcoal/[0.06]">
          {field("nickname", <AtSign size={16} />, nickname, setNicknameDraft, {
            placeholder: "Forum nickname",
            label: "Forum nickname",
          })}
          <p className="mt-1.5 text-[11px] text-charcoal-faint">Shown on your Community posts and replies.</p>
        </div>
      )}
    </CentredPopup>
  );
};
