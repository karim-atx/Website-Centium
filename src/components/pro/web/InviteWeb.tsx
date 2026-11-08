import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, Info, Maximize2, QrCode, Share, Tag, UserCheck, UserRound } from "lucide-react";
import { PassQr } from "../../marketplace/PassQr";
import { ProCardSkeleton, ProError, OfflineLine } from "../states";
import { useWebLayout, WEB_READING_MAX } from "../../web/useWebLayout";
import { inviteHref, inviteUrl, type InviteJoin } from "../../../services/pro/invites";
import { t } from "../../../i18n/core";

// Professional handover v1 · WP-HO.1 Invite clients (WP-HO Flows Web v2,
// screens invite / invite-empty / invite-edit): the 64 header with the bordered
// back and the line on the title's baseline; the QR card 5 (QR box 388, code
// 332, the link field and copy 44, Share invite 44) beside the message,
// Settings and Joined 7. The state and the actions are InviteClients'.

const SECTION: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC" };
const H2: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#71685E" };
const LINK: React.CSSProperties = { fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093" };
const PRIMARY: React.CSSProperties = { height: 44, borderRadius: 16, background: "#9A8CD6", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, lineHeight: "24px", fontWeight: 600 };

export const InviteWeb: React.FC<{
  state: "loading" | "ready" | "error" | "offline";
  code: string | null;
  locked: React.ReactNode | null;
  verifiedNote: boolean;
  creating: boolean;
  createError: string | null;
  onCreate: () => void;
  onRetry: () => void;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onFull: () => void;
  onSaveImage: () => void;
  qrRef: React.RefObject<HTMLDivElement | null>;
  text: string;
  editing: boolean;
  onEditToggle: () => void;
  onMessage: (s: string) => void;
  joins: InviteJoin[] | null;
  shownJoins: InviteJoin[];
  seeAll?: string;
  onSeeAll: () => void;
  emptyJoins: string;
  joinedLine: (iso: string) => string;
  children?: React.ReactNode;
}> = ({ qrRef, ...p }) => {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const pad = rail ? 24 : 32;

  const header = (
    <header className="flex items-center" style={{ height: 64, flex: "none", boxSizing: "border-box", gap: 16, padding: `0 ${pad}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <button
        type="button"
        aria-label={t("Back")}
        title={t("Back")}
        onClick={() => navigate(-1)}
        className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)" }}
      >
        <ArrowLeft size={20} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
      </button>
      <div className="flex-1 min-w-0 flex items-baseline" style={{ gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap", color: "#241F1B" }}>{t("Invite clients")}</h1>
        <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>{t("Share your link or QR code")}</p>
      </div>
    </header>
  );

  const grid: React.CSSProperties = { maxWidth: WEB_READING_MAX, width: "100%", boxSizing: "border-box", padding: pad, display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", columnGap: 24, rowGap: 24 };

  let body: React.ReactNode;
  if (p.locked) {
    body = <div style={{ gridColumn: "1 / -1" }}>{p.locked}</div>;
  } else if (p.state === "loading") {
    body = (
      <div style={{ gridColumn: "1 / -1" }}>
        <ProCardSkeleton lines={5} height={320} />
      </div>
    );
  } else if (p.state === "error" && !p.code) {
    body = (
      <div style={{ gridColumn: "1 / -1" }}>
        <ProError onRetry={p.onRetry} />
      </div>
    );
  } else if (!p.code) {
    body = (
      <section
        aria-label={t("Create your invite link")}
        className="flex flex-col items-center justify-center text-center"
        style={{ gridColumn: "1 / -1", minHeight: 480, boxSizing: "border-box", borderRadius: 24, border: "1px solid rgba(36,31,27,0.08)", gap: 20, padding: 32 }}
      >
        <span className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: 20, background: "#F0EDF9" }}>
          <QrCode size={28} strokeWidth={1.5} aria-hidden style={{ color: "#7D67D9" }} />
        </span>
        <p style={{ margin: 0, maxWidth: 480, fontSize: 17, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" }}>{t("Create your invite link. Anyone who opens it can see your page and ask to work with you.")}</p>
        {p.createError && (
          <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#B3261E" }}>
            {p.createError}
          </p>
        )}
        <button type="button" onClick={p.onCreate} disabled={p.creating} className="hover:bg-[#8E7FD0] disabled:opacity-60" style={{ ...PRIMARY, width: 320 }}>
          {t("Create invite link")}
        </button>
      </section>
    );
  } else {
    const code = p.code;
    body = (
      <>
        <section aria-label={t("Invite link")} className="flex flex-col" style={{ gridColumn: rail ? "span 6" : "span 5", minWidth: 0, boxSizing: "border-box", borderRadius: 24, border: "1px solid rgba(36,31,27,0.08)", padding: rail ? 24 : 32 }}>
          <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 16 }}>
            <div
              ref={qrRef}
              className="flex items-center justify-center"
              style={{ width: "100%", maxWidth: 388, aspectRatio: "1 / 1", boxSizing: "border-box", borderRadius: 24, border: "1px solid rgba(36,31,27,0.1)", background: "#FFFFFF" }}
            >
              <PassQr value={inviteHref(code)} size={rail ? 260 : 332} label={t("Invite link QR code")} failedText={t("Couldn't draw the QR code. Try again.")} />
            </div>
            <div className="flex flex-wrap justify-center" style={{ gap: 24, ...LINK, whiteSpace: "nowrap" }}>
              <button type="button" onClick={p.onFull} className="inline-flex items-center hover:underline" style={{ gap: 6 }}>
                <Maximize2 size={16} strokeWidth={2} aria-hidden />
                {t("Show full screen")}
              </button>
              <button type="button" onClick={p.onSaveImage} className="inline-flex items-center hover:underline" style={{ gap: 6 }}>
                <Download size={16} strokeWidth={2} aria-hidden />
                {t("Save image")}
              </button>
            </div>
          </div>
          {p.verifiedNote && (
            <p className="flex items-start" style={{ gap: 8, borderRadius: 12, background: "#F5F5F6", padding: "10px 12px", marginTop: 24, marginBottom: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
              <Info size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
              <span>
                <b style={{ color: "#241F1B" }}>{t("Licence not verified yet.")}</b> {t("Until your licence is verified, your invite page says it's pending.")}
              </span>
            </p>
          )}
          <div className="flex" style={{ gap: 12, marginTop: 24 }}>
            <span className="flex-1 min-w-0 flex items-center" style={{ height: 44, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", padding: "0 16px", fontSize: 15, fontWeight: 700, color: "#241F1B" }}>
              <span className="truncate">{inviteUrl(code)}</span>
            </span>
            <button type="button" aria-label={t("Copy")} title={t("Copy")} onClick={p.onCopy} className="flex items-center justify-center shrink-0 hover:bg-[#8E7FD0]" style={{ width: 44, height: 44, borderRadius: 12, background: "#9A8CD6" }}>
              {p.copied ? <Check size={20} strokeWidth={1.75} aria-hidden style={{ color: "#FFFFFF" }} /> : <Copy size={20} strokeWidth={1.75} aria-hidden style={{ color: "#FFFFFF" }} />}
            </button>
          </div>
          <button type="button" onClick={p.onShare} className="hover:bg-[#8E7FD0]" style={{ ...PRIMARY, marginTop: 12, gap: 10, width: "100%" }}>
            <Share size={20} strokeWidth={2} aria-hidden />
            {p.copied ? t("Link copied") : t("Share invite")}
          </button>
        </section>

        <div className="flex flex-col" style={{ gridColumn: rail ? "span 6" : "span 7", minWidth: 0 }}>
          <div style={{ ...SECTION, marginBottom: 12 }}>
            <h2 style={H2}>{t("Message sent with the link")}</h2>
            <button type="button" onClick={p.onEditToggle} className="hover:underline" style={LINK}>
              {p.editing ? t("Done") : t("Edit")}
            </button>
          </div>
          {p.editing ? (
            <textarea
              value={p.text}
              onChange={(e) => p.onMessage(e.target.value)}
              aria-label={t("Message sent with the link")}
              autoFocus
              className="block w-full outline-none resize-none"
              style={{ boxSizing: "border-box", borderRadius: 16, background: "#F5F5F6", padding: "16px 20px", fontSize: 15, lineHeight: "24px", color: "#241F1B", minHeight: 96, border: "1px solid #AEA1DC" }}
            />
          ) : (
            <p style={{ margin: 0, boxSizing: "border-box", borderRadius: 16, background: "#F5F5F6", padding: "16px 20px", fontSize: 15, lineHeight: "24px", color: "#241F1B", border: "1px solid transparent", textWrap: "pretty" }}>{p.text}</p>
          )}

          <div style={{ ...SECTION, marginTop: 24 }}>
            <h2 style={H2}>{t("Settings")}</h2>
          </div>
          {[
            { icon: Tag, title: t("Invite leads to") },
            { icon: UserCheck, title: t("Accept each new client") },
          ].map((s, i) => (
            <div key={s.title} className="flex items-center" style={{ height: 64, gap: 14, borderBottom: i === 0 ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EDF9" }}>
                <s.icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
              </span>
              <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{s.title}</span>
              <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", padding: "2px 10px", borderRadius: 999, background: "#F5F5F6", color: "#71685E", whiteSpace: "nowrap" }}>{t("Coming soon")}</span>
            </div>
          ))}

          <div style={{ ...SECTION, margin: "24px 0 12px" }}>
            <h2 style={H2}>{t("Joined with your invite")}</h2>
            {p.seeAll && (
              <button type="button" onClick={p.onSeeAll} className="hover:underline" style={LINK}>
                {p.seeAll}
              </button>
            )}
          </div>
          {p.joins === null ? (
            <ProCardSkeleton lines={2} />
          ) : p.joins.length === 0 ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{p.emptyJoins}</p>
          ) : (
            <div className="flex flex-col" style={{ boxSizing: "border-box", borderRadius: 20, border: "1px solid rgba(36,31,27,0.08)", padding: "0 24px" }}>
              {p.shownJoins.map((j, i) => (
                <div key={j.clientId + j.joinedAt} className="flex items-center" style={{ minHeight: 72, gap: 16, borderBottom: i < p.shownJoins.length - 1 ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: 14, background: "#F0EDF9" }}>
                    <UserRound size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{j.firstName}</span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{p.joinedLine(j.joinedAt)}</span>
                  </span>
                  <span className="inline-flex items-center" style={{ gap: 6, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: "#1D744A" }} />
                    {t("Joined")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {header}
      {p.state === "offline" && (
        <div style={{ padding: `${pad}px ${pad}px 0` }}>
          <OfflineLine />
        </div>
      )}
      <div style={grid}>{body}</div>
      {p.children}
    </div>
  );
};
