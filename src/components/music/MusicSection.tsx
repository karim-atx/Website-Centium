import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { textPx, linePx } from "../../theme/textSize";
import { loadMusicPrefs, subscribeMusicPrefs } from "../../services/music/prefs";
import { whichMusic, type MusicMoment, type MusicPrefs, type MusicSources } from "../../services/music/whichMusic";
import { PlaylistCard, PlayYourMusicRow } from "./PlaylistCard";

// Round E · the music a screen shows, in the agreed order (services/music/
// whichMusic): the professional's or gym's playlist, then the item's own,
// then the member's favourite for the moment, then "Play your music" (the
// chosen app, or the way to Settings › Your music). Both the provider's and
// the member's own when both exist.

/** The member's "Your music", read once per page load and kept in step after a save. */
export function useMusicPrefs(): { prefs: MusicPrefs | null; loaded: boolean } {
  const [state, setState] = useState<{ prefs: MusicPrefs | null; loaded: boolean }>({ prefs: null, loaded: false });
  useEffect(() => {
    let live = true;
    void loadMusicPrefs().then((p) => live && setState({ prefs: p, loaded: true }));
    const off = subscribeMusicPrefs((p) => live && setState({ prefs: p, loaded: true }));
    return () => {
      live = false;
      off();
    };
  }, []);
  return state;
}

export const MUSIC_SETTINGS_PATH = "/app/settings/music";

export const MusicSection: React.FC<{
  moment: MusicMoment;
  provider?: MusicSources["provider"];
  item?: MusicSources["item"];
  /** A small caps title above, e.g. "Music". Omitted: no title. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Only show something when there's a playlist (provider, item or
   * favourite): no "Play your music" row. For screens where that row would
   * repeat one shown elsewhere.
   */
  playlistsOnly?: boolean;
}> = ({ moment, provider, item, title, className, style, playlistsOnly }) => {
  const { prefs, loaded } = useMusicPrefs();
  const navigate = useNavigate();
  // Nothing until "Your music" has been read, so the row doesn't flicker
  // between "Choose your music app" and the member's favourite.
  const hasOwn = !!(provider?.url || item?.url);
  if (!loaded && !hasOwn) return null;
  const entries = whichMusic({ provider, item, moment, prefs }).filter((e) => !playlistsOnly || e.kind === "playlist");
  if (entries.length === 0) return null;
  return (
    <div className={className} style={style}>
      {title && (
        <p style={{ marginBottom: 8, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgb(var(--c-charcoal-faint))" }}>
          {title}
        </p>
      )}
      <div className="flex flex-col" style={{ gap: 10 }}>
        {entries.map((e, i) =>
          e.kind === "playlist" ? (
            <PlaylistCard key={i} url={e.url} heading={e.heading} />
          ) : e.kind === "open_app" ? (
            <PlayYourMusicRow key={i} service={e.service} homeUrl={e.url} />
          ) : (
            <PlayYourMusicRow key={i} service={null} homeUrl={null} onChooseApp={() => navigate(MUSIC_SETTINGS_PATH)} />
          )
        )}
      </div>
    </div>
  );
};
