import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, RotateCw, Trophy } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { INK } from "../../pro/proInk";
import { textPx } from "../../../theme/textSize";
import { ShareCard } from "../ShareCard";
import { specFromPayload, type Visibility } from "../shareCardModel";
import { fetchMyWinSharing, fetchSharedAboutMe, requestSharedItemRemoval, setMyWinSharing, type SharedAboutMe, type WinSharing } from "../../../services/share";
import { fetchProSummaries, fetchRequestVisibilities } from "../../../services/share/client";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { WIN_SHARING_LABEL, WIN_SHARING_OPTIONS, sharedSub, sharedTitle, visibilityFromPayload } from "./sharingText";
import { t } from "../../../i18n/core";

/**
 * Release 3 · W8 CU30 "Sharing your wins" (source/gen/r31.js clientSet31,
 * literal): the intro 12.5 / 1.5 text.soft; "When a professional wants to
 * share a win" (11 / 600, 0.14em, capitals, text.faint, 14 above, 2 below);
 * three radio rows (22 radio with a 2px border, a 10 dot in the primary fill;
 * title 14 / 600, the "Default" pill on Always ask; 11.5 / 1.45 text.faint
 * description) that save profiles.win_sharing at once; "Shared so far" (18
 * above) with each card about the client: a 40 wide thumbnail, title 13.5 /
 * 600, "{pro} · {date} · by your initials" 11 / 1.45 text.faint, and "Ask to
 * remove" (44 tall, 12.5 / 700 primary.deep) or the gold "Removal asked" pill;
 * then the footer line 11 / 1.5 text.faint.
 */

interface Row {
  item: SharedAboutMe;
  proName: string;
  visibility: Visibility;
}

type Status = "loading" | "ready" | "error" | "offline";

const sectionLabel: React.CSSProperties = { fontSize: textPx(11), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: INK.chF };

const Pill: React.FC<{ label: string; gold?: boolean }> = ({ label, gold }) => (
  <span
    className="inline-flex items-center shrink-0 whitespace-nowrap"
    style={{ height: 24, padding: "0 9px", borderRadius: 9999, fontSize: textPx(11), fontWeight: 700, background: gold ? INK.goldPale : INK.soft, color: gold ? INK.goldInk : INK.chS }}
  >
    {label}
  </span>
);

/** Every card about me, with the professional's first name and how I'm shown. */
async function loadShared(me: string): Promise<{ ok: true; rows: Row[] } | { ok: false; offline: boolean }> {
  const r = await fetchSharedAboutMe(me);
  if (!r.ok) return r;
  const [names, vis] = await Promise.all([fetchProSummaries(r.data.map((x) => x.professionalId)), fetchRequestVisibilities(r.data.map((x) => x.shareRequestId ?? "").filter(Boolean))]);
  return {
    ok: true,
    rows: r.data.map((item) => ({
      item,
      proName: names.get(item.professionalId)?.firstName ?? t("Your professional"),
      visibility: (item.shareRequestId && vis.get(item.shareRequestId)) || visibilityFromPayload(item.card),
    })),
  };
}

export const SharingYourWinsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  me: string;
  /** The setting changed (the Profile row's sub line follows). */
  onSettingChange?: (v: WinSharing) => void;
}> = ({ open, onClose, me, onSettingChange }) => {
  const [status, setStatus] = useState<Status>("loading");
  const [setting, setSetting] = useState<WinSharing>("always_ask");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  // Reopening refreshes in place; Retry shows the skeletons again.
  const load = useCallback(async () => {
    const [s, shared] = await Promise.all([fetchMyWinSharing(me), loadShared(me)]);
    if (!s.ok || !shared.ok) {
      setStatus((!s.ok && s.offline) || (!shared.ok && shared.offline) ? "offline" : "error");
      return;
    }
    setSetting(s.data);
    setRows(shared.rows);
    setStatus("ready");
  }, [me]);

  useEffect(() => {
    if (!open || !me) return;
    void load();
  }, [open, me, load]);

  const choose = async (v: WinSharing) => {
    if (saving || v === setting) return;
    const before = setting;
    setSetting(v);
    setSaving(true);
    setSettingError(null);
    const r = await setMyWinSharing(me, v);
    setSaving(false);
    if (r.ok) {
      onSettingChange?.(v);
      return;
    }
    setSetting(before);
    setSettingError(r.offline ? OFFLINE_MESSAGE : t("Couldn't save your choice. Try again."));
  };

  const askRemove = async (row: Row) => {
    if (busy) return;
    setBusy(row.item.id);
    setRowError(null);
    const r = await requestSharedItemRemoval(row.item.id);
    setBusy(null);
    if (r.ok) {
      setRows((list) => list.map((x) => (x.item.id === row.item.id ? { ...x, item: { ...x.item, removalRequestedAt: new Date().toISOString() } } : x)));
      return;
    }
    if (r.code === "ATX08") {
      setRows((list) => list.filter((x) => x.item.id !== row.item.id));
      return;
    }
    setRowError({ id: row.item.id, message: r.offline ? OFFLINE_MESSAGE : t("Couldn't ask for removal. Try again.") });
  };

  const onKeyRadios = (e: React.KeyboardEvent) => {
    const i = WIN_SHARING_OPTIONS.findIndex((o) => o.value === setting);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = WIN_SHARING_OPTIONS[(i + step + WIN_SHARING_OPTIONS.length) % WIN_SHARING_OPTIONS.length];
    void choose(next.value);
    (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setSettingError(null);
        setRowError(null);
        onClose();
      }}
      title={t("Sharing your wins")}
    >
      <div data-sharing-wins>
        <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginBottom: 6 }}>
          {t("Your professionals can turn your wins into a card for Instagram and other apps. Nothing about your health records is ever shared.")}
        </p>

        {status === "loading" && (
          <div aria-busy="true" role="status" aria-label={t("Loading")}>
            <span aria-hidden className="block h-[11px] w-56 rounded bg-cream-soft animate-skeleton-pulse" style={{ margin: "14px 0 8px" }} />
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden className="block h-[54px] rounded-xl bg-cream-soft animate-skeleton-pulse" style={{ marginTop: 8 }} />
            ))}
            <span aria-hidden className="block h-[11px] w-28 rounded bg-cream-soft animate-skeleton-pulse" style={{ margin: "18px 0 8px" }} />
            <span aria-hidden className="block h-[60px] rounded-xl bg-cream-soft animate-skeleton-pulse" />
          </div>
        )}

        {(status === "error" || status === "offline") && (
          <div className="flex items-center" style={{ gap: 10, borderRadius: 16, background: INK.soft, paddingBlock: "6px", paddingInline: "14px 6px", marginTop: 14 }}>
            <p role="alert" className="flex-1 min-w-0" style={{ fontSize: textPx(12), lineHeight: 1.45, color: INK.chS }}>
              {status === "offline" ? t("You're offline. Your sharing settings show when you're back online.") : t("Couldn't load your sharing settings.")}
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                void load();
              }} className="tap inline-flex items-center justify-center shrink-0" style={{ minHeight: 44, padding: "0 12px", gap: 5, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
              <RotateCw size={13} strokeWidth={2.2} aria-hidden />
              {t("Retry")}
            </button>
          </div>
        )}

        {status === "ready" && (
          <>
            <p id="win-sharing-label" style={{ ...sectionLabel, margin: "14px 0 2px" }}>
              {t("When a professional wants to share a win")}
            </p>
            <div role="radiogroup" aria-labelledby="win-sharing-label" onKeyDown={onKeyRadios}>
              {WIN_SHARING_OPTIONS.map((o) => {
                const on = setting === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-value={o.value}
                    tabIndex={on ? 0 : -1}
                    onClick={() => void choose(o.value)}
                    className="tap w-full flex items-start text-start"
                    style={{ gap: 12, padding: "12px 0", borderTop: `1px solid ${INK.b06}` }}
                  >
                    <span
                      aria-hidden
                      className="flex items-center justify-center shrink-0 rounded-full"
                      style={{ width: 22, height: 22, marginTop: 1, border: `2px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}` }}
                    >
                      {on && <span className="rounded-full" style={{ width: 10, height: 10, background: INK.fill }} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center flex-wrap" style={{ gap: 6, fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                        {t(o.title)}
                        {o.isDefault && <Pill label={t("Default")} />}
                      </span>
                      <span className="block" style={{ fontSize: textPx(11.5), lineHeight: 1.45, color: INK.chF, marginTop: 2 }}>
                        {t(o.desc)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {settingError && (
              <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: 1.45, color: INK.hi, marginTop: 4 }}>
                {settingError}
              </p>
            )}

            <p style={{ ...sectionLabel, margin: "18px 0 2px" }}>{t("Shared so far")}</p>
            {rows.length === 0 ? (
              <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chF, padding: "10px 0", borderTop: `1px solid ${INK.b06}` }}>{t("Nothing has been shared yet.")}</p>
            ) : (
              rows.map((row) => {
                const card = specFromPayload(row.item.card, row.proName);
                const shownAs = (row.item.card as { name_display?: unknown } | null)?.name_display;
                return (
                  <div key={row.item.id} data-shared-row style={{ borderTop: `1px solid ${INK.b06}`, padding: "10px 0" }}>
                    <div className="flex items-center" style={{ gap: 12 }}>
                      {card ? (
                        <ShareCard
                          spec={card.spec}
                          pro={{ name: row.proName, handle: null }}
                          format="post"
                          style={card.style}
                          width={40}
                          qr={false}
                          flat
                          client={typeof shownAs === "string" && shownAs.trim() ? shownAs : t("A client")}
                        />
                      ) : (
                        <span aria-hidden className="shrink-0 rounded-[10px]" style={{ width: 40, height: 50, background: INK.soft }} />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>
                          {card ? sharedTitle(card.spec) : t("Shared card")}
                        </span>
                        <span className="block" style={{ fontSize: textPx(11), lineHeight: 1.45, color: INK.chF }}>
                          {sharedSub(row.proName, row.item.createdAt, row.visibility)}
                        </span>
                      </span>
                      {row.item.removalRequestedAt ? (
                        <Pill label={t("Removal asked")} gold />
                      ) : (
                        <button
                          type="button"
                          onClick={() => void askRemove(row)}
                          disabled={busy === row.item.id}
                          aria-busy={busy === row.item.id || undefined}
                          className="tap flex items-center shrink-0 whitespace-nowrap disabled:opacity-60"
                          style={{ height: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}
                        >
                          {busy === row.item.id ? t("Asking…") : t("Ask to remove")}
                        </button>
                      )}
                    </div>
                    {rowError?.id === row.item.id && (
                      <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: 1.45, color: INK.hi, marginTop: 6 }}>
                        {rowError.message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
            <p style={{ fontSize: textPx(11), lineHeight: 1.5, color: INK.chF, marginTop: 12 }}>
              {t("Asking to remove stops new shares of that card straight away and asks the professional to delete their post.")}
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

/**
 * The Profile row that opens CU30, in the "My orders" row style (32 r10
 * primary-pale tile, 16 / 1.75 icon, 15 / 600 label, ChevronRight 15) with the
 * current setting as an 11.5 text.faint sub line. Shown when the customer has
 * a connected professional or anything shared about them.
 */
export const SharingYourWinsRow: React.FC<{ me: string | null; connectedCount: number; className?: string }> = ({ me, connectedCount, className }) => {
  const [setting, setSetting] = useState<WinSharing | null>(null);
  const [sharedCount, setSharedCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!me) return;
    let live = true;
    void Promise.all([fetchMyWinSharing(me), fetchSharedAboutMe(me)]).then(([s, shared]) => {
      if (!live) return;
      if (s.ok) setSetting(s.data);
      if (shared.ok) setSharedCount(shared.data.length);
    });
    return () => {
      live = false;
    };
  }, [me]);

  if (!me || (connectedCount === 0 && sharedCount === 0)) return null;

  return (
    <>
      <button
        type="button"
        data-sharing-wins-row
        onClick={() => setOpen(true)}
        className={`tap w-full flex items-center gap-3 rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-3.5 py-3 text-start ${className ?? ""}`}
      >
        <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
          <Trophy size={16} strokeWidth={1.75} className="text-primary-dark" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-charcoal">{t("Sharing your wins")}</span>
          {setting && <span className="block text-[11.5px] leading-tight text-charcoal-faint">{t(WIN_SHARING_LABEL[setting])}</span>}
        </span>
        <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" aria-hidden />
      </button>
      <SharingYourWinsSheet open={open} onClose={() => setOpen(false)} me={me} onSettingChange={setSetting} />
    </>
  );
};
