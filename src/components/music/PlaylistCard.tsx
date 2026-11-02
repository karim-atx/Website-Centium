import React, { useEffect, useState } from "react";
import { Music2, Play } from "lucide-react";
import { textPx, linePx } from "../../theme/textSize";
import { lookupPlaylist, type PlaylistMeta } from "../../services/music/lookup";
import { isAlbum, playlistServiceOf, SERVICE_LABEL, type PlaylistService } from "../../services/music/playlistLink";
import { ServiceIcon } from "./ServiceIcon";
import { t } from "../../i18n/core";

// Round E · THE playlist card, the same everywhere a playlist shows (workouts,
// routines, programmes, the active workout, classes, the gym's page, the
// professional's profile, calendar sessions, Mind, Sleep, recipes, meal plans,
// messages and groups). Designed here (no handover frame) in the app's own
// card language: the global cream-card surface and charcoal inks, which
// follow light, dark and high contrast.
//
// The cover and name come from the service's public lookup
// (services/music/lookup); without one, the Centium music tile and
// "{Service} playlist". "Play in {Service}" is a plain link to the playlist:
// on a phone with the app installed, the service's universal link opens the
// app; otherwise the browser. No sign-in and nothing read from any account.

const INK = "rgb(var(--c-charcoal))";
const INK_SOFT = "rgb(var(--c-charcoal-soft))";
const INK_FAINT = "rgb(var(--c-charcoal-faint))";
const HAIRLINE = "rgb(var(--c-charcoal) / 0.08)";

/** The Centium music tile: the cover when the service gives none. */
export const MusicTile: React.FC<{ size: number }> = ({ size }) => (
  <span
    aria-hidden
    className="grid place-items-center shrink-0"
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.2),
      background: "linear-gradient(135deg, rgb(var(--c-primary)) 0%, rgb(var(--c-primary-dark)) 100%)",
    }}
  >
    <Music2 size={Math.round(size * 0.44)} color="#FFFFFF" strokeWidth={2.2} />
  </span>
);

function usePlaylistMeta(url: string | null): PlaylistMeta | null {
  const [meta, setMeta] = useState<PlaylistMeta | null>(null);
  useEffect(() => {
    setMeta(null);
    if (!url) return;
    let live = true;
    void lookupPlaylist(url).then((m) => live && setMeta(m));
    return () => {
      live = false;
    };
  }, [url]);
  return meta;
}

const Cover: React.FC<{ src: string | null; size: number }> = ({ src, size }) => {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <MusicTile size={size} />;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.2), background: "rgb(var(--c-cream-soft))" }}
    />
  );
};

/** "Play in {Service}": the link itself, styled as the card's button. */
export const PlayInLink: React.FC<{ url: string; service: PlaylistService; label?: string }> = ({ url, service, label }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="tap flex items-center justify-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    style={{
      minHeight: 40,
      gap: 7,
      borderRadius: 11,
      border: `0.5px solid ${HAIRLINE}`,
      background: "rgb(var(--c-cream-soft))",
      fontSize: textPx(13),
      lineHeight: linePx(19.5),
      fontWeight: 700,
      color: INK,
    }}
  >
    <ServiceIcon service={service} size={16} />
    {label ?? t("Play in {service}", { service: SERVICE_LABEL[service] })}
  </a>
);

export const PlaylistCard: React.FC<{
  /** An acceptable playlist link (anything else renders nothing). */
  url: string;
  /** Whose or what it is: "Rana's playlist", "House playlist", "Cook-along", "Your music". */
  heading?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ url, heading, className, style }) => {
  const service = playlistServiceOf(url);
  const meta = usePlaylistMeta(service ? url : null);
  if (!service) return null;
  const kind = isAlbum(url) ? "album" : "playlist";
  const title = meta?.title ?? (kind === "album" ? t("{service} album", { service: SERVICE_LABEL[service] }) : t("{service} playlist", { service: SERVICE_LABEL[service] }));
  return (
    <section
      aria-label={heading ? `${heading}: ${title}` : title}
      className={className}
      style={{ borderRadius: 14, padding: 12, background: "rgb(var(--c-cream-card))", border: `0.5px solid ${HAIRLINE}`, ...style }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <Cover src={meta?.cover ?? null} size={56} />
        <div className="flex-1 min-w-0">
          {heading && (
            <p className="truncate" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 700, letterSpacing: 0.2, color: INK_FAINT }}>
              {heading}
            </p>
          )}
          <p className="line-clamp-2" style={{ fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 700, color: INK, overflowWrap: "anywhere" }}>
            {title}
          </p>
          <p className="flex items-center" style={{ marginTop: 2, gap: 5, fontSize: textPx(11.5), lineHeight: linePx(17), fontWeight: 600, color: INK_SOFT }}>
            <ServiceIcon service={service} size={13} />
            {`${SERVICE_LABEL[service]} · ${kind === "album" ? t("Album") : t("Playlist")}`}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <PlayInLink url={url} service={service} />
      </div>
    </section>
  );
};

/**
 * "Play your music" without a favourite: opens the chosen app's home, or (no
 * app chosen yet) offers Settings › Your music.
 */
export const PlayYourMusicRow: React.FC<{
  /** The member's chosen app, or null. */
  service: PlaylistService | null;
  homeUrl: string | null;
  onChooseApp?: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ service, homeUrl, onChooseApp, className, style }) => {
  const inner = (
    <>
      <MusicTile size={40} />
      <span className="flex-1 min-w-0 text-start">
        <span className="block" style={{ fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 700, color: INK }}>
          {t("Play your music")}
        </span>
        <span className="flex items-center" style={{ gap: 5, fontSize: textPx(11.5), lineHeight: linePx(17), color: INK_FAINT }}>
          {service ? (
            <>
              <ServiceIcon service={service} size={13} />
              {t("Opens {service}", { service: SERVICE_LABEL[service] })}
            </>
          ) : (
            t("Choose your music app in Settings")
          )}
        </span>
      </span>
      <Play size={16} style={{ color: INK_SOFT }} aria-hidden />
    </>
  );
  const box: React.CSSProperties = { minHeight: 64, gap: 12, padding: "12px 14px", borderRadius: 14, background: "rgb(var(--c-cream-card))", border: `0.5px solid ${HAIRLINE}`, ...style };
  return service && homeUrl ? (
    <a href={homeUrl} target="_blank" rel="noopener noreferrer" className={`tap flex items-center w-full ${className ?? ""}`} style={box}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onChooseApp} className={`tap flex items-center w-full ${className ?? ""}`} style={box}>
      {inner}
    </button>
  );
};
