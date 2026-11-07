import React from "react";
import { Link } from "react-router-dom";
import { HandHeart, HeartHandshake, Phone } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { RECOVERY_LINK, RECOVERY_LINK_HINT, supportLines, type SupportPlace } from "../../services/moderation/support";
import { t } from "../../i18n/core";
import { useMarkSupportSurface } from "../../services/premium/support";
import { useIsWeb } from "../web/useWebLayout";

// "Get support" (Round C Release 2; PLAN S3, undrawn, on the Foundations
// centred popup in the "ours" geometry). Shown to the person themselves only:
// after a private message that matched the self-harm list on their own device,
// on their own held forum post, from the support_resources notice, and from
// Settings › Help. 20261222080000: the notice sent after a form's eating
// question also offers recovery-sensitive mode (onRecoveryMode), a link to
// the setting; the setting itself only changes on the person's tap there.
//
// NEVER "we've told someone": nobody is notified by this popup. A centred
// popup rather than a sheet, so it can't be swiped away by accident; "I'm OK"
// closes it and nothing is sent from here.

export const GetSupportPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Lebanon's lines, or the local emergency number and findahelpline.com. */
  place: SupportPlace;
  /** Shows "Turn on recovery-sensitive mode", which opens the setting. */
  onRecoveryMode?: () => void;
}> = ({ open, onClose, place, onRecoveryMode }) => {
  const lines = supportLines(place);
  // Round G1 (G6): no upgrade prompt ever opens while this is open.
  useMarkSupportSurface(open);
  const first = lines.numbers[0];
  const web = useIsWeb();
  const call = first
    ? { label: t("Call {number}", { number: first.number }), onClick: () => window.location.assign(`tel:${first.number}`) }
    : { label: t("Find a helpline"), onClick: () => window.open(lines.directory, "_blank", "noopener") };
  const guidelines = (cls: string, style?: React.CSSProperties) => (
    <p className={cls} style={style}>
      {t("Nobody is told about this. Read our {link}.")
        .split(/({link})/)
        .map((part, i) =>
          part === "{link}" ? (
            <Link key={i} to="/legal/community-guidelines" className="font-semibold underline" onClick={onClose}>
              {t("community guidelines")}
            </Link>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
    </p>
  );
  // Website viewport (WC-SE crisis, WC-SE Settings Web popup): the 440 card with the head in
  // one row and a close button, the lines (48 rows, 15/24) and the link, then Call (44 r14)
  // under the numbers, "I'm OK, continue" (40) and the 13/20 note. Every number, link and
  // the Call action are the same as on mobile; only the layout changes.
  if (web) {
    return (
      <CentredPopup open={open} onClose={onClose} webRowHead maxWidth={440} icon={<HeartHandshake size={22} strokeWidth={1.75} />} title={t("You're not alone")} body={t("If you're thinking about hurting yourself, you can talk to someone now. It's free and confidential.")}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <div className="flex flex-col overflow-hidden text-start" style={{ borderRadius: 16, border: "1px solid rgba(36,31,27,0.08)" }}>
            {lines.numbers.map((n, i) => (
              <a key={n.number} href={`tel:${n.number}`} className="flex items-center hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ gap: 12, minHeight: 48, padding: "0 14px", borderTop: i > 0 ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
                <Phone size={16} className="shrink-0" aria-hidden style={{ color: "#7D6BB5" }} />
                <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{t(n.name)}</span>
                <span className="tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{n.number}</span>
              </a>
            ))}
            {lines.local && <p style={{ margin: 0, padding: "12px 14px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{t("Call your local emergency number.")}</p>}
            <a href={lines.directory} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline" style={{ minHeight: 44, padding: "0 14px", borderTop: "1px solid rgba(36,31,27,0.06)", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5" }}>
              {place === "lebanon" ? t("Outside Lebanon? {site}", { site: "findahelpline.com" }) : t("Find a helpline near you: {site}", { site: "findahelpline.com" })}
            </a>
            {onRecoveryMode && (
              <button type="button" onClick={onRecoveryMode} className="flex items-center text-start hover:bg-[#FAFAFB]" style={{ gap: 12, minHeight: 48, padding: "0 14px", borderTop: "1px solid rgba(36,31,27,0.06)" }}>
                <HandHeart size={16} className="shrink-0" aria-hidden style={{ color: "#7D6BB5" }} />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{t(RECOVERY_LINK)}</span>
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t(RECOVERY_LINK_HINT)}</span>
                </span>
              </button>
            )}
          </div>
          <button type="button" onClick={call.onClick} className="w-full flex items-center justify-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]" style={{ height: 44, borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
            {call.label}
          </button>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <button type="button" onClick={onClose} className="w-full flex items-center justify-center hover:bg-[#F5F5F6] rounded-xl" style={{ height: 40, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349" }}>
              {t("I'm OK, continue")}
            </button>
            {guidelines("text-center", { margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" })}
          </div>
        </div>
      </CentredPopup>
    );
  }
  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      geometry="ours"
      icon={<HeartHandshake size={22} strokeWidth={1.75} />}
      title={t("You're not alone")}
      body={t("If you're thinking about hurting yourself, you can talk to someone now. It's free and confidential.")}
      cta={
        first
          ? { label: t("Call {number}", { number: first.number }), onClick: () => window.location.assign(`tel:${first.number}`) }
          : { label: t("Find a helpline"), onClick: () => window.open(lines.directory, "_blank", "noopener") }
      }
    >
      <div className="mt-4 flex flex-col rounded-2xl border border-charcoal/[0.08] overflow-hidden text-start">
        {lines.numbers.map((n, i) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className={`tap flex items-center gap-3 min-h-[48px] px-3.5 bg-cream-card ${i > 0 ? "border-t border-charcoal/[0.06]" : ""}`}
          >
            <Phone size={16} className="shrink-0 text-primary-dark" aria-hidden />
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-charcoal">{t(n.name)}</span>
            <span className="text-[14px] font-extrabold text-charcoal tabular-nums">{n.number}</span>
          </a>
        ))}
        {lines.local && (
          <p className="px-3.5 py-3 bg-cream-card text-[13px] font-semibold text-charcoal">{t("Call your local emergency number.")}</p>
        )}
        <a
          href={lines.directory}
          target="_blank"
          rel="noopener noreferrer"
          className="tap flex items-center min-h-[44px] px-3.5 bg-cream-card border-t border-charcoal/[0.06] text-[12.5px] font-bold text-primary-dark"
        >
          {place === "lebanon" ? t("Outside Lebanon? {site}", { site: "findahelpline.com" }) : t("Find a helpline near you: {site}", { site: "findahelpline.com" })}
        </a>
        {onRecoveryMode && (
          <button
            type="button"
            onClick={onRecoveryMode}
            className="tap flex items-center gap-3 min-h-[48px] px-3.5 bg-cream-card border-t border-charcoal/[0.06] text-start"
          >
            <HandHeart size={16} className="shrink-0 text-primary-dark" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-charcoal">{t(RECOVERY_LINK)}</span>
              <span className="block text-[11.5px] leading-[16px] text-charcoal-soft">{t(RECOVERY_LINK_HINT)}</span>
            </span>
          </button>
        )}
      </div>
      <button type="button" onClick={onClose} className="tap mt-2 w-full min-h-[44px] text-[13px] font-bold text-charcoal-soft">
        {t("I'm OK, continue")}
      </button>
      <p className="text-[11.5px] leading-[16px] text-charcoal-faint">
        {t("Nobody is told about this. Read our {link}.")
          .split(/(\{link\})/)
          .map((part, i) =>
            part === "{link}" ? (
              <Link key={i} to="/legal/community-guidelines" className="font-semibold underline" onClick={onClose}>
                {t("community guidelines")}
              </Link>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            )
          )}
      </p>
    </CentredPopup>
  );
};
