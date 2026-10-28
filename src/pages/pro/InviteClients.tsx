import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Info, Maximize2, Share, Tag, UserCheck, UserRound, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { PageHeader } from "../../components/ui/PageHeader";
import { CtaButton } from "../../components/ui/PinnedCta";
import { SettingsRow } from "../../components/ui/SettingsRows";
import { PassQr } from "../../components/marketplace/PassQr";
import { ComingSoonPill } from "../../components/pro/ComingSoon";
import { ProCardSkeleton, ProError, OfflineLine } from "../../components/pro/states";
import { Initials } from "../../components/pro/home/ProTrendRing";
import { initialsOf } from "../../components/pro/home/initials";
import { INK } from "../../components/pro/proInk";
import { textPx } from "../../theme/textSize";
import { SUBTYPE_SINGULAR } from "../../components/professionals/subtypeLabels";
import {
  createInviteLink,
  defaultInviteMessage,
  fetchCurrentInviteLink,
  fetchInviteJoins,
  fetchInvitesAllowed,
  fetchLicenceVerified,
  inviteHref,
  inviteUrl,
  INVITE_LOCKED_MESSAGE,
  type InviteJoin,
  type InviteLink,
} from "../../services/pro/invites";

/**
 * Release 3 · HO2 v6 "Invite clients" (/app/pro/invite; gen/r18.js invite18).
 * The professional's multi-use invite link (client_codes kind invite_link):
 * QR 164 (r18, border), Show full screen and Save image; the link field 48
 * with the copy square; Share invite; the message sent with the link (Edit
 * changes it for this share only); Settings; Joined with your invite
 * (my_invite_joins).
 * - No link yet: "Create invite link" (create_invite_link). Nothing is created
 *   just by opening the page.
 * - Karim's answer 1: a doctor, physiotherapist or dietitian sees
 *   "Invite links open once your licence is verified."; anyone else whose
 *   licence isn't verified yet sees that their invite page says so.
 * - Settings "Invite leads to" and "Accept each new client" have no backend
 *   yet: Coming soon.
 */
const JOINED_SHOWN = 3;

export default function InviteClients() {
  const { authUserId, user } = useApp();
  const dark = useIsDark();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [link, setLink] = useState<{ state: "loading" | "ready" | "error" | "offline"; data: InviteLink | null }>({ state: "loading", data: null });
  const [verified, setVerified] = useState<boolean | null>(null);
  const [joins, setJoins] = useState<InviteJoin[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void (async () => {
      const a = await fetchInvitesAllowed(authUserId);
      if (!live) return;
      if (a.ok) setAllowed(a.data);
      const [l, j] = await Promise.all([fetchCurrentInviteLink(), fetchInviteJoins()]);
      if (!live) return;
      setLink(l.ok ? { state: "ready", data: l.data } : (prev) => ({ state: l.offline ? "offline" : "error", data: prev.data }));
      if (j.ok) setJoins(j.data);
      if (l.ok && l.data) {
        const v = await fetchLicenceVerified(l.data.code);
        if (live) setVerified(v);
      }
    })();
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  const first = user.firstName?.trim() || "your professional";
  const code = link.data?.code ?? null;
  const text = message ?? (code ? defaultInviteMessage(first, code) : "");

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    const r = await createInviteLink();
    setCreating(false);
    if (!r.ok) return setCreateError(r.message);
    setLink({ state: "ready", data: r.data });
    setVerified(await fetchLicenceVerified(r.data.code));
  };

  const copy = () => {
    if (!code) return;
    navigator.clipboard?.writeText(inviteHref(code)).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (!code) return;
    const data = { text };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return;
      }
    }
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const saveImage = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !code) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const pad = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `centium-invite-${code}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };

  const header = <PageHeader title="Invite clients" subtitle="Share your link or QR code" showBack sub tightBack bottomGap={16} />;

  if (allowed === false) {
    return (
      <div>
        {header}
        <p className="flex items-start" style={{ gap: 10, borderRadius: 14, background: INK.soft, padding: "12px 14px", fontSize: textPx(13), color: INK.chS, lineHeight: 1.5 }}>
          <Info size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 1 }} />
          {INVITE_LOCKED_MESSAGE}
        </p>
      </div>
    );
  }

  const list = joins ?? [];
  const shownJoins = showAll ? list : list.slice(0, JOINED_SHOWN);

  return (
    <div>
      {header}
      {link.state === "offline" && <OfflineLine />}
      {link.state === "loading" ? (
        <ProCardSkeleton lines={5} height={320} />
      ) : link.state === "error" && !link.data ? (
        <ProError onRetry={() => setNonce((n) => n + 1)} />
      ) : !code ? (
        <div className="flex flex-col items-center text-center" style={{ gap: 12, padding: "12px 0 20px" }}>
          <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.55, maxWidth: 300 }}>Create your invite link. Anyone who opens it can see your page and ask to work with you.</p>
          {createError && (
            <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
              {createError}
            </p>
          )}
          <CtaButton size="page" label="Create invite link" loading={creating} onClick={() => void create()} />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center" style={{ gap: 10, marginBottom: 14 }}>
            <div
              ref={qrRef}
              className="flex items-center justify-center"
              style={{ width: 164, height: 164, borderRadius: 18, border: `1px solid ${INK.b10}`, background: "#FFFFFF" }}
            >
              <PassQr value={inviteHref(code)} size={136} label="Invite link QR code" failedText="Couldn't draw the QR code. Try again." />
            </div>
            <span className="flex" style={{ gap: 14, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, whiteSpace: "nowrap" }}>
              <button type="button" onClick={() => setFull(true)} className="tap inline-flex items-center" style={{ gap: 4 }}>
                <Maximize2 size={13} strokeWidth={2} aria-hidden />
                Show full screen
              </button>
              <button type="button" onClick={saveImage} className="tap inline-flex items-center" style={{ gap: 4 }}>
                <Download size={13} strokeWidth={2} aria-hidden />
                Save image
              </button>
            </span>
          </div>
          {verified === false && (
            <p className="flex items-start" style={{ gap: 8, borderRadius: 12, background: INK.soft, padding: "10px 12px", marginBottom: 12, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
              <Info size={14} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 1 }} />
              <span>
                <b style={{ color: INK.ch }}>Licence not verified yet.</b> Your invite page says so until your licence is verified.
              </span>
            </p>
          )}
          <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
            <span
              className="flex-1 min-w-0 flex items-center"
              style={{ height: 48, borderRadius: 12, background: INK.card, border: `1px solid rgb(var(--c-charcoal) / 0.11)`, padding: "0 12px", fontSize: textPx(14), fontWeight: 700, color: INK.ch }}
            >
              <span className="truncate">{inviteUrl(code)}</span>
            </span>
            <button
              type="button"
              aria-label="Copy"
              onClick={copy}
              className="tap flex items-center justify-center shrink-0"
              style={{ width: 48, height: 48, borderRadius: 12, background: dark ? INK.fill : "#9A8CD6" }}
            >
              {copied ? (
                <Check size={18} strokeWidth={1.75} aria-hidden style={{ color: dark ? INK.onFill : "#FFFFFF" }} />
              ) : (
                <Copy size={18} strokeWidth={1.75} aria-hidden style={{ color: dark ? INK.onFill : "#FFFFFF" }} />
              )}
            </button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <CtaButton size="page" label={copied ? "Link copied" : "Share invite"} icon={<Share size={15} aria-hidden />} onClick={() => void share()} />
          </div>

          <SectionHead label="Message sent with the link" right={editing ? "Done" : "Edit"} onRight={() => setEditing((e) => !e)} />
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Message sent with the link"
              className="block w-full outline-none resize-none"
              style={{ borderRadius: 16, background: INK.soft, padding: "12px 14px", fontSize: textPx(13), color: INK.ch, lineHeight: 1.5, minHeight: 96, marginBottom: 14, border: `1px solid ${INK.pr}` }}
            />
          ) : (
            <p style={{ borderRadius: 16, background: INK.soft, padding: "12px 14px", fontSize: textPx(13), color: INK.ch, lineHeight: 1.5, marginBottom: 14 }}>{text}</p>
          )}

          <SectionHead label="Settings" />
          <div style={{ padding: "0 4px" }}>
            <SettingsRow icon={Tag} title="Invite leads to" value={<ComingSoonPill />} />
            <SettingsRow icon={UserCheck} title="Accept each new client" value={<ComingSoonPill />} />
          </div>

          <div style={{ height: 10 }} />
          <SectionHead
            label="Joined with your invite"
            right={list.length > JOINED_SHOWN ? (showAll ? "Show less" : `See all ${list.length}`) : undefined}
            onRight={() => setShowAll((s) => !s)}
          />
          {joins === null ? (
            <ProCardSkeleton lines={2} />
          ) : list.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF, lineHeight: 1.5 }}>
              {/* W2-5c: opened_at is one stamp for the link (first open only), so it reads as the link's status, not a person's. */}
              {link.data?.openedAt
                ? `Opened ${shortDate(link.data.openedAt)}. Nobody has joined yet. People who join appear here with their status.`
                : "Nobody yet. People who open your link appear here with their status."}
            </p>
          ) : (
            <div style={{ borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}`, padding: "4px 14px" }}>
              {shownJoins.map((j, i) => (
                <div key={j.clientId + j.joinedAt} className="flex items-center" style={{ gap: 12, padding: "12px 0", borderBottom: i < shownJoins.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
                    <UserRound size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                      {j.firstName}
                    </span>
                    <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
                      {shortDate(j.joinedAt)} · joined
                    </span>
                  </span>
                  <span className="inline-flex items-center" style={{ gap: 5, fontSize: textPx(12), color: INK.chS }}>
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: INK.good }} />
                    Joined
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {full && code && <FullScreenQr code={code} name={(user.firstName ?? "").trim()} type={user.professionalSubtype ? upperFirst(SUBTYPE_SINGULAR[user.professionalSubtype]) : null} first={first} onClose={() => setFull(false)} />}
    </div>
  );
}

const SectionHead: React.FC<{ label: string; right?: string; onRight?: () => void }> = ({ label, right, onRight }) => (
  <div className="flex items-center justify-between" style={{ marginBottom: 10, paddingBottom: 7.5, borderBottom: `1.5px solid ${INK.pr}` }}>
    <p style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", color: INK.chF }}>{label}</p>
    {right && (
      <button type="button" onClick={onRight} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
        {right}
      </button>
    )}
  </div>
);

const FullScreenQr: React.FC<{ code: string; name: string; type: string | null; first: string; onClose: () => void }> = ({ code, name, type, first, onClose }) => {
  useBackCloses(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Invite QR code" className="fixed inset-0 z-[60] flex flex-col items-center justify-center" style={{ background: INK.cream, gap: 16, padding: 24 }}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        autoFocus
        className="tap absolute flex items-center justify-center"
        style={{ top: "calc(env(safe-area-inset-top) + 20px)", right: 20, width: 36, height: 36, borderRadius: 9999, background: INK.soft }}
      >
        <X size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
      </button>
      <Initials text={initialsOf(name || first)} size={64} tone="teal" />
      <p style={{ fontSize: textPx(20), fontWeight: 800, color: INK.ch }}>{name || first}</p>
      {type && <p style={{ fontSize: textPx(13), color: INK.chF, marginTop: -10 }}>{type}</p>}
      <div className="flex items-center justify-center" style={{ width: 250, height: 250, borderRadius: 18, border: `1px solid ${INK.b10}`, background: "#FFFFFF" }}>
        <PassQr value={inviteHref(code)} size={214} label="Invite link QR code" failedText="Couldn't draw the QR code. Try again." />
      </div>
      <p className="text-center" style={{ fontSize: textPx(13), color: INK.chS }}>
        Scan with a phone camera to open {first}'s page in Centium
      </p>
    </div>,
    document.body
  );
};

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`;
}
