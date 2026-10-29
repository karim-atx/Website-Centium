import React, { useEffect, useState } from "react";
import { CentiumMark } from "../../icons/CentiumMark";
import { MusicTile, PlayInLink } from "../../music/PlaylistCard";
import { ServiceIcon } from "../../music/ServiceIcon";
import { lookupPlaylist, type PlaylistMeta } from "../../../services/music/lookup";
import { isAlbum, playlistServiceOf, SERVICE_LABEL } from "../../../services/music/playlistLink";
import type { ShareCard } from "../../../services/messaging/shareCards";
import { daysLabel } from "../../../services/messaging/groupCardsModel";
import { clock12 } from "../../../utils/time12";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/**
 * Release 3 · MO27 group chat: a programme (programme_share), a session
 * (session_share) or, from Round D, a meal plan (meal_plan_share) the
 * professional shared, as the frame draws it: ChatCard's frame (r18, 1.5
 * primary.dark border, #FBFAFE / card), the Centium mark, the kind 11 / 800
 * caps 0.12em primary.deep and the time 10 / 600 text.faint; inside, a card
 * r14 with a 1px 10% border, pad 12: the name 13.5 / 700 primary.deep and the
 * facts 12 text.soft.
 *
 * A meal plan shows its name, its length and the note only: the card never
 * carries calories or macros (D-S13), so it reads the same in recovery mode.
 *
 * `footer` (Round D, GroupShareCard): the places line and the member's
 * booking button under the inner card, or "Open plan" for the professional.
 *
 * Round E: a PLAYLIST (playlist_share) in the same frame, kind "Playlist":
 * inside, the cover (the service's public lookup, or the Centium music tile),
 * the title the professional gave it (else the playlist's own name), the
 * service with its icon, the note; then "Play in {Service}". A programme,
 * session or meal-plan card whose parent had a playlist adds the same
 * "Play in {Service}" under its inner card.
 */
export const ShareChatCard: React.FC<{ card: ShareCard; time: string; footer?: React.ReactNode }> = ({ card, time, footer }) => {
  if (card.kind === "playlist_share") return <PlaylistShareCard card={card} time={time} footer={footer} />;
  const kind = card.kind === "programme_share" ? "Programme" : card.kind === "meal_plan_share" ? "Meal plan" : "Group session";
  const title = card.kind === "session_share" ? card.title : card.name;
  const facts =
    card.kind === "programme_share"
      ? [card.durationWeeks ? `${card.durationWeeks} ${card.durationWeeks === 1 ? "week" : "weeks"}` : null, card.exerciseCount ? `${card.exerciseCount} ${card.exerciseCount === 1 ? "exercise" : "exercises"}` : null]
      : card.kind === "meal_plan_share"
        ? [daysLabel(card.days)]
        : [
            card.startsAt ? `${new Date(card.startsAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })} · ${clock12(card.startsAt)}` : null,
            card.durationMin ? `${card.durationMin} min` : null,
            card.location,
          ];
  const line = facts.filter(Boolean).join(" · ");
  return (
    <Frame kind={kind} cardKind={card.kind} time={time}>
      <div style={{ background: INK.card, border: `1px solid ${INK.b10}`, borderRadius: 14, padding: 12 }}>
        <p style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.prDeep, overflowWrap: "anywhere" }}>{title}</p>
        {line && <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4 }}>{line}</p>}
        {card.note && <p style={{ fontSize: textPx(12), color: INK.ch, marginTop: 6, whiteSpace: "pre-line" }}>{card.note}</p>}
      </div>
      {card.playlistUrl && <Play url={card.playlistUrl} />}
      {footer}
    </Frame>
  );
};

/** The card's frame: the Centium mark, the kind in caps and the time. */
const Frame: React.FC<{ kind: string; cardKind: ShareCard["kind"]; time: string; children: React.ReactNode }> = ({ kind, cardKind, time, children }) => (
  <div data-share-card={cardKind} className="w-full rounded-[18px] border-[1.5px] border-primary-dark bg-[#FBFAFE] dark:bg-cream-card flex flex-col p-3" style={{ gap: 10 }}>
    <div className="flex items-center" style={{ gap: 7, minHeight: 18 }}>
      <CentiumMark height={(16 * 713) / 648} framing="png" />
      <span className="flex-1 min-w-0 truncate uppercase" style={{ fontSize: textPx(11), fontWeight: 800, letterSpacing: "0.12em", color: INK.prDeep }}>
        {kind}
      </span>
      <span className="shrink-0" style={{ fontSize: textPx(10), fontWeight: 600, color: INK.chF }}>
        {time}
      </span>
    </div>
    {children}
  </div>
);

/**
 * "Play in {Service}". The bubble behind the card opens a menu on a long
 * press, so the link keeps its pointer and click events to itself.
 */
const Play: React.FC<{ url: string }> = ({ url }) => {
  const service = playlistServiceOf(url);
  if (!service) return null;
  return (
    <span className="block" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <PlayInLink url={url} service={service} />
    </span>
  );
};

function usePlaylistMeta(url: string): PlaylistMeta | null {
  const [meta, setMeta] = useState<{ url: string; meta: PlaylistMeta | null } | null>(null);
  useEffect(() => {
    let live = true;
    void lookupPlaylist(url).then((m) => live && setMeta({ url, meta: m }));
    return () => {
      live = false;
    };
  }, [url]);
  return meta?.url === url ? meta.meta : null;
}

const PlaylistShareCard: React.FC<{ card: Extract<ShareCard, { kind: "playlist_share" }>; time: string; footer?: React.ReactNode }> = ({ card, time, footer }) => {
  const meta = usePlaylistMeta(card.playlistUrl);
  const service = playlistServiceOf(card.playlistUrl);
  if (!service) return null;
  const album = isAlbum(card.playlistUrl);
  const name = card.title ?? meta?.title ?? `${SERVICE_LABEL[service]} ${album ? "album" : "playlist"}`;
  return (
    <Frame kind="Playlist" cardKind={card.kind} time={time}>
      <div style={{ background: INK.card, border: `1px solid ${INK.b10}`, borderRadius: 14, padding: 12 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <Cover src={meta?.cover ?? null} />
          <div className="flex-1 min-w-0">
            <p className="line-clamp-2" style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.prDeep, overflowWrap: "anywhere" }}>
              {name}
            </p>
            {/* The playlist's own name under the professional's title, when they differ. */}
            {card.title && meta?.title && meta.title !== card.title && (
              <p className="truncate" style={{ fontSize: textPx(12), color: INK.chS, marginTop: 2 }}>
                {meta.title}
              </p>
            )}
            <p className="flex items-center" style={{ gap: 5, fontSize: textPx(12), color: INK.chS, marginTop: 4 }}>
              <ServiceIcon service={service} size={13} />
              {`${SERVICE_LABEL[service]} · ${album ? "Album" : "Playlist"}`}
            </p>
          </div>
        </div>
        {card.note && <p style={{ fontSize: textPx(12), color: INK.ch, marginTop: 8, whiteSpace: "pre-line" }}>{card.note}</p>}
      </div>
      <Play url={card.playlistUrl} />
      {footer}
    </Frame>
  );
};

/** The playlist's cover, or the Centium music tile (no cover, or it failed to load). */
const Cover: React.FC<{ src: string | null }> = ({ src }) => {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <MusicTile size={52} />;
  return (
    <img
      src={src}
      alt=""
      width={52}
      height={52}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      className="shrink-0 object-cover"
      style={{ width: 52, height: 52, borderRadius: 10, background: INK.b10 }}
    />
  );
};
