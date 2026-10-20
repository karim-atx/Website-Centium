import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { ProCardSkeleton, ProError, OfflineLine } from "../pro/states";
import { Toast } from "../ui/Toast";
import { shiftIso } from "../../services/pro/home";
import type { ProLane } from "../pro/subtypeLanes";
import { SHARE_ICONS, ShareIconButton, SharePill, ToneTile } from "./shareKit";
import { canAskToShare, shareDate, winCard, winRowText, winsShieldLine, type CardSpec, type ClientWin, type WinIcon, type WinSharingSetting, type WinTone } from "./shareCardModel";
import { AskPermissionSheet } from "./AskPermissionSheet";
import { ShareFlow } from "./ShareFlow";
import { useSharePro } from "./useSharePro";
import { fetchClientWins, fetchMyShareRequests, fetchMySharedItemsFor, type MySharedItem, type ShareRequest } from "../../services/share";

/** "Yesterday", "Today" or "Oct 12" ("Oct 12, 2025" in another year; the app's short date, shareDate). */
function whenWord(iso: string, today: string): string {
  const day = iso.slice(0, 10);
  if (day === today) return "Today";
  if (day === shiftIso(today, -1)) return "Yesterday";
  return shareDate(iso);
}

/** The local calendar month of `today` ("Wins this month"). */
const inMonth = (iso: string, today: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const t = new Date(`${today}T00:00:00`);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
};

interface Row {
  win: ClientWin;
  spec: CardSpec;
  title: string;
  icon: WinIcon;
  tone: WinTone;
  request: ShareRequest | null;
  removal: boolean;
}

/**
 * Release 3 · W8 SH4 "Client page · win with Share" and the SH5 states
 * (source/gen/r31.js winsCard31 / winRow31 / clientFC31 / clientNT31), at the
 * top of the client page's Progress tab for Full coaching and Nutrition:
 * - card r18, "Wins this month" 11 / 700 0.12em capitals text.faint (padding
 *   12 14 10); rows padding 12 14 under a rule: 36 r11 tinted tile (17 /
 *   1.75), title 13.5 / 700 / 18, line 11.5 / 16 text.faint, then the right
 *   side; a note line 11.5 / 1.45 text.soft 8 below, 48 in;
 * - right side by the ask's state: the share icon (ask); "Waiting for {first}"
 *   (gold); "Allowed" (teal) + the filled share icon (share); "Declined"
 *   with "{first} declined. You can't ask again for this win."; "Allowed"
 *   without the name adds "{first} allowed it without their name.";
 * - the shield line under the card (11.5 / 1.45 text.faint, shield-check 12).
 *
 * Only the wins client_wins() returns (DB-8; Karim's answer 4: no adherence
 * percentage, no weight change), so the frame's "87% of the meal plan
 * followed", "94% of sessions done" and "4.1 kg down since August" rows are
 * not drawn. A Clinical overview client page never mounts this.
 *
 * The client's win-sharing setting (my_client_stages().win_sharing, 815efc5
 * W8-2) decides the controls: Never allow hides every share and ask button
 * (SH4 "Share icons hidden for Never allow"; the state pills stay) and the
 * shield line says "{first} doesn't want wins shared."; otherwise the line
 * carries the setting where SH4 draws it (winsShieldLine).
 */
export const ClientWinsCard: React.FC<{ clientId: string; name: string; firstName: string; today: string; lane: ProLane; winSharing?: WinSharingSetting }> = ({ clientId, name, firstName, today, lane, winSharing = "always_ask" }) => {
  const { authUserId } = useApp();
  const pro = useSharePro();
  const [wins, setWins] = useState<ClientWin[] | null>(null);
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [items, setItems] = useState<MySharedItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error" | "offline">("loading");
  const [asking, setAsking] = useState<Row | null>(null);
  const [sharing, setSharing] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const [w, r, i] = await Promise.all([fetchClientWins(clientId), fetchMyShareRequests(authUserId, clientId), fetchMySharedItemsFor(authUserId, clientId)]);
    if (!w.ok || !r.ok || !i.ok) {
      const offline = (!w.ok && w.offline) || (!r.ok && r.offline) || (!i.ok && i.offline);
      setState((prev) => (prev === "ready" ? (offline ? "offline" : prev) : offline ? "offline" : "error"));
      return;
    }
    setWins(w.data);
    setRequests(r.data);
    setItems(i.data);
    setState("ready");
  }, [authUserId, clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<Row[]>(() => {
    if (!wins) return [];
    return wins
      .filter((w) => inMonth(w.occurredAt, today))
      .map((w) => {
        const spec = winCard(w);
        const text = winRowText(w);
        if (!spec || !text) return null;
        const request = requests.find((q) => q.winId === w.winId) ?? null;
        const removal = !!request && items.some((it) => it.shareRequestId === request.id && it.removalRequestedAt && !it.removedAt);
        return { win: w, spec, title: text.title, icon: text.icon, tone: text.tone, request, removal };
      })
      .filter((x): x is Row => !!x);
  }, [wins, requests, items, today]);

  const mayAsk = canAskToShare(winSharing);
  const right = (r: Row) => {
    const s = r.request?.status;
    if (r.removal) return <SharePill tone="gold">Removal asked</SharePill>;
    if (s === "pending") return <SharePill tone="gold">{`Waiting for ${firstName}`}</SharePill>;
    if (s === "declined") return <SharePill>Declined</SharePill>;
    if (s === "withdrawn") return <SharePill>Withdrawn</SharePill>;
    if (s === "allowed" || s === "allowed_no_name")
      return (
        <span className="flex items-center shrink-0" style={{ gap: 6 }}>
          <SharePill tone="teal">Allowed</SharePill>
          {mayAsk && <ShareIconButton on label={`Share ${r.title}`} disabled={!pro} onClick={() => setSharing(r)} />}
        </span>
      );
    return mayAsk ? <ShareIconButton label={`Ask ${firstName} to share ${r.title}`} disabled={!pro} onClick={() => setAsking(r)} /> : null;
  };
  const note = (r: Row) => {
    const s = r.request?.status;
    if (r.removal) return `${firstName} asked you to remove this card.`;
    if (s === "declined") return `${firstName} declined. You can't ask again for this win.`;
    if (s === "allowed_no_name") return `${firstName} allowed it without their name.`;
    return null;
  };
  const sub = (r: Row) => {
    const when = whenWord(r.win.occurredAt, today);
    return r.win.kind === "pr" ? `${when} · estimated 1RM` : when;
  };

  if (state === "loading") return <div style={{ marginBottom: 12 }}><ProCardSkeleton lines={3} /></div>;
  if (state === "error" && !wins) return <div style={{ marginBottom: 12 }}><ProError onRetry={() => void load()} message="Couldn't load wins." /></div>;

  return (
    <div style={{ marginBottom: 12 }}>
      {state === "offline" && <OfflineLine />}
      <div style={{ borderRadius: 18, background: INK.card, border: `1px solid ${INK.bCard}`, overflow: "hidden" }}>
        <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: INK.chF, padding: "12px 14px 10px" }}>Wins this month</p>
        {rows.length === 0 ? (
          <p style={{ fontSize: textPx(12), color: INK.chF, padding: "12px 14px", borderTop: `1px solid ${INK.b06}` }}>{`No wins yet this month. ${firstName}'s wins show here from what they share with you.`}</p>
        ) : (
          rows.map((r) => {
            const n = note(r);
            return (
              <div key={r.win.winId} style={{ padding: "12px 14px", borderTop: `1px solid ${INK.b06}` }}>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <ToneTile icon={SHARE_ICONS[r.icon]} tone={r.tone} size={36} radius={11} iconSize={17} />
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, lineHeight: "18px", color: INK.ch }}>
                      {r.title}
                    </span>
                    <span className="block" style={{ fontSize: textPx(11.5), lineHeight: "16px", color: INK.chF, marginTop: 1 }}>
                      {sub(r)}
                    </span>
                  </span>
                  {right(r)}
                </div>
                {n && <p style={{ fontSize: textPx(11.5), lineHeight: 1.45, color: INK.chS, margin: "8px 0 0 48px" }}>{n}</p>}
              </div>
            );
          })
        )}
      </div>
      <p className="flex items-start" style={{ gap: 6, fontSize: textPx(11.5), lineHeight: 1.45, color: INK.chF, marginTop: 10, padding: "0 4px" }}>
        <ShieldCheck size={12} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
        <span data-win-sharing={winSharing}>{winsShieldLine(firstName, lane, winSharing)}</span>
      </p>

      {asking && pro && mayAsk && (
        <AskPermissionSheet
          open
          onClose={() => setAsking(null)}
          win={asking.win}
          spec={asking.spec}
          pro={pro}
          client={{ fullName: name, firstName }}
          onSent={(req) => {
            setAsking(null);
            setRequests((rs) => [...rs.filter((x) => x.id !== req.id), req]);
            setToast(req.status === "pending" ? `Request sent to ${firstName}. You'll be notified.` : `${firstName} lets professionals share wins by initials. You can share it now.`);
          }}
        />
      )}
      {sharing && pro && sharing.request && mayAsk && (
        <ShareFlow
          open
          onClose={() => setSharing(null)}
          spec={sharing.spec}
          pro={pro}
          kind="win"
          win={{ consent: { fullName: name, firstName, allowed: sharing.request.visibility }, requestId: sharing.request.id, label: sharing.title.replace(/^New PR · /, "") }}
          onShared={() => void load()}
        />
      )}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
};
