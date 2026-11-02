import React, { useEffect, useState } from "react";
import { Mail, Smartphone } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { SectionHead } from "../client/kit";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { fetchSentInvites, type SentInviteRow } from "../../../services/pro/invites";
import { SENT_INVITES_SHOWN, sentInviteView } from "./sentInvitesModel";
import { t } from "../../../i18n/core";

/**
 * Release 3 W9 post-review · Clients "Invites sent" (no frame draws it; Karim
 * placed it in Clients, not Home). Built from the Clients screen's own parts:
 * the board's SectionHead (11 / 600 caps, 1.5 primary rule, m-bottom 10) and
 * the Requests card (r20, card fill and border, pad 14, a 40 circle, the name
 * 14 / 700, lines 12 text.soft and 11 text.faint), rows gap 8 like the list.
 *
 * States: skeleton while the first read is out; nothing at all when there
 * are no invites; the inline Retry card on an error; offline keeps the last
 * rows under "Offline, showing last update", and reads again on reconnect.
 */
export const SentInvitesSection: React.FC<{ reloadKey?: string | number }> = ({ reloadKey }) => {
  const online = useOnline();
  const [state, setState] = useState<{ rows: SentInviteRow[] | null; error: boolean; offline: boolean }>({ rows: null, error: false, offline: false });
  const [nonce, setNonce] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchSentInvites().then((r) => {
      if (!live) return;
      setState((prev) => (r.ok ? { rows: r.data, error: false, offline: false } : { rows: prev.rows, error: true, offline: !!r.offline }));
    });
    return () => {
      live = false;
    };
  }, [reloadKey, nonce]);

  // Back online after a failed read: try again.
  useEffect(() => {
    if (online && state.error) setNonce((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const { rows, error } = state;
  if (rows && rows.length === 0 && !error) return null;

  const offline = !online || state.offline;
  const views = (rows ?? []).map((r) => sentInviteView(r));
  const shown = showAll ? views : views.slice(0, SENT_INVITES_SHOWN);
  const more = views.length > SENT_INVITES_SHOWN;

  return (
    <section aria-label={t("Invites sent")} style={{ marginTop: 20 }}>
      <SectionHead label={t("Invites sent")} right={more ? (showAll ? t("Show less") : t("See all {n}", { n: views.length })) : undefined} onRight={more ? () => setShowAll((v) => !v) : undefined} />
      {rows === null ? (
        error ? (
          <ProError onRetry={() => setNonce((n) => n + 1)} message={offline ? t("You're offline. Your invites load when you're connected.") : t("Couldn't load your invites. Check your connection and try again.")} />
        ) : (
          <div role="status" aria-label={t("Loading")}>
            <ProCardSkeleton lines={2} />
          </div>
        )
      ) : (
        <>
          {error && (offline ? <OfflineLine /> : <ProError onRetry={() => setNonce((n) => n + 1)} message={t("Couldn't refresh your invites. Check your connection and try again.")} />)}
          <div className="flex flex-col" style={{ gap: 8 }} role="list">
            {shown.map((v) => {
              const Icon = v.channel === "Phone" ? Smartphone : Mail;
              return (
                <div key={v.id} role="listitem" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 9999, background: INK.prPale, color: INK.prDeep }}>
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>{v.name}</p>
                      <p style={{ fontSize: textPx(11), color: INK.chF }}>{v.meta}</p>
                      {v.message && <p style={{ marginTop: 4, fontSize: textPx(12), color: INK.chS, lineHeight: 1.4, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{v.message}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
