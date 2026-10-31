import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { SettingsBody, SettingsSection } from "../../components/ui/SettingsRows";
import { PlaylistField, playlistFieldValid } from "../../components/music/PlaylistField";
import { ServiceIcon } from "../../components/music/ServiceIcon";
import { useApp } from "../../context/AppContext";
import { SERVICES, SERVICE_LABEL, tidyPlaylistInput, type PlaylistService } from "../../services/music/playlistLink";
import { fetchMusicPrefs, MUSIC_MOMENTS, publishMusicPrefs, saveMusicPrefs } from "../../services/music/prefs";
import type { MusicMoment } from "../../services/music/whichMusic";
import { t } from "../../i18n/core";

// Round E · Settings › Your music (no handover frame: designed here in the
// Language page's layout). The member's music app, and an optional favourite
// playlist for Workout, Mind, Sleep and Cooking; each of those areas shows
// "Play your music", which opens the favourite, or the chosen app when there
// is none. Saved on app_preferences (services/music/prefs): the member's own,
// on every device, seen by nobody else. Centium never signs in to a music
// service and reads nothing from anyone's account.

type Favourites = Record<MusicMoment, string>;
const EMPTY: Favourites = { workout: "", mind: "", sleep: "", cooking: "" };

export default function YourMusicPage() {
  const { authUserId } = useApp();
  const [loaded, setLoaded] = useState<"loading" | "ok" | "error">("loading");
  const [service, setService] = useState<PlaylistService | null>(null);
  const [saved, setSaved] = useState<Favourites>(EMPTY);
  const [draft, setDraft] = useState<Favourites>(EMPTY);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void fetchMusicPrefs().then((p) => {
      if (!live) return;
      if (!p) return setLoaded("error");
      const f: Favourites = { workout: p.favourites.workout ?? "", mind: p.favourites.mind ?? "", sleep: p.favourites.sleep ?? "", cooking: p.favourites.cooking ?? "" };
      setService(p.service);
      setSaved(f);
      setDraft(f);
      setLoaded("ok");
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const chooseService = async (next: PlaylistService | null) => {
    if (!authUserId || next === service) return;
    const before = service;
    setService(next);
    setServiceError(null);
    const r = await saveMusicPrefs(authUserId, { service: next });
    if (!r.ok) {
      setService(before);
      setServiceError(r.message);
      return;
    }
    publishMusicPrefs(r.prefs);
  };

  const tidy = (f: Favourites): Favourites => ({ workout: tidyPlaylistInput(f.workout), mind: tidyPlaylistInput(f.mind), sleep: tidyPlaylistInput(f.sleep), cooking: tidyPlaylistInput(f.cooking) });
  const changed = MUSIC_MOMENTS.some((m) => tidyPlaylistInput(draft[m.key]) !== saved[m.key]);
  const valid = MUSIC_MOMENTS.every((m) => playlistFieldValid(tidyPlaylistInput(draft[m.key])));

  const saveFavourites = async () => {
    if (!authUserId || !changed || !valid) return;
    const next = tidy(draft);
    setSaving(true);
    setSaveNote(null);
    const r = await saveMusicPrefs(authUserId, { workout: next.workout, mind: next.mind, sleep: next.sleep, cooking: next.cooking });
    setSaving(false);
    if (!r.ok) return setSaveNote({ ok: false, text: r.message });
    setSaved(next);
    setDraft(next);
    publishMusicPrefs(r.prefs);
    setSaveNote({ ok: true, text: t("Saved.") });
  };

  return (
    <div>
      <PageHeader title={t("Your music")} showBack sub tightBack />
      <SettingsBody className="-mt-1">
        <p className="text-[13px] leading-[19px] text-charcoal-soft mb-5">
          {t("Workout, Mind, Sleep and Cooking each show Play your music. It opens your favourite playlist for that moment, or your music app when you haven't chosen one. Centium never signs in to your music service or reads your account, and only you see these.")}
        </p>

        {loaded === "loading" && <p className="text-[13px] text-charcoal-faint">{t("Loading…")}</p>}
        {loaded === "error" && (
          <div role="alert" className="flex items-center gap-3 text-[13px] text-charcoal-soft">
            <span>{t("Couldn't load your music settings.")}</span>
            <button type="button" onClick={() => { setLoaded("loading"); setAttempt((n) => n + 1); }} className="tap font-bold text-primary-deep-text min-h-[44px]">
              {t("Try again")}
            </button>
          </div>
        )}

        {loaded === "ok" && (
          <>
            <SettingsSection label={t("Music app")}>
              <div role="radiogroup" aria-label={t("Music app")}>
                {[...SERVICES, null].map((s) => {
                  const selected = service === s;
                  return (
                    <button
                      key={s ?? "none"}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => void chooseService(s)}
                      className="tap relative w-full flex items-center gap-3 text-start [padding-block:calc(13px_+_var(--row-extra,0px)_/_2)] before:content-[''] before:absolute before:bottom-0 before:start-[34px] before:end-0 before:h-px before:bg-charcoal/[0.06] before:pointer-events-none last:before:hidden"
                    >
                      <span className="w-[22px] grid place-items-center shrink-0">{s ? <ServiceIcon service={s} size={20} /> : null}</span>
                      <span className={`flex-1 text-[15px] leading-[19px] font-medium ${s ? "text-charcoal" : "text-charcoal-soft"}`}>{s ? SERVICE_LABEL[s] : t("None")}</span>
                      {selected && <Check size={18} strokeWidth={2.4} className="text-primary shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              {serviceError && (
                <p role="alert" className="mt-2 text-[12px] text-status-high">
                  {t(serviceError)}
                </p>
              )}
            </SettingsSection>

            <SettingsSection label={t("Favourite playlists")}>
              <div className="flex flex-col gap-4 pt-1 pb-2">
                {MUSIC_MOMENTS.map((m) => (
                  <PlaylistField
                    key={m.key}
                    label={t("{label} (optional)", { label: t(m.label) })}
                    value={draft[m.key]}
                    onChange={(v) => {
                      setSaveNote(null);
                      setDraft((d) => ({ ...d, [m.key]: v }));
                    }}
                  />
                ))}
                <Button onClick={() => void saveFavourites()} disabled={!changed || !valid || saving} fullWidth>
                  {saving ? t("Saving…") : t("Save favourites")}
                </Button>
                {saveNote && (
                  <p role={saveNote.ok ? "status" : "alert"} className={`text-[12px] ${saveNote.ok ? "text-charcoal-soft" : "text-status-high"}`}>
                    {t(saveNote.text)}
                  </p>
                )}
              </div>
            </SettingsSection>
          </>
        )}
      </SettingsBody>
    </div>
  );
}
