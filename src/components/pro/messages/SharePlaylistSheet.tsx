import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PlaylistField, playlistFieldValid } from "../../music/PlaylistField";
import { INK } from "../proInk";
import { textPx } from "../../../theme/textSize";
import { sendPlaylistCard } from "../../../services/pro/messages";
import { t } from "../../../i18n/core";

/**
 * Round E · "Share a playlist": a professional sends a Spotify, Apple Music or
 * YouTube Music playlist or album as a card (send_playlist_card, Database
 * 20261224040000), in a client conversation (from the attach menu) or a group
 * (Share to the group › A playlist). The link (the shared field), an optional
 * title (≤ 120, else the playlist's own name shows) and an optional note
 * (≤ 300). Nothing is sent before Share. Designed here (no frame) on
 * ShareToGroupSheet's note step.
 */

export interface PlaylistShareDraft {
  url: string;
  title: string;
  note: string;
}

export const emptyPlaylistShare = (): PlaylistShareDraft => ({ url: "", title: "", note: "" });

/** Whether the draft can be sent: a link the shared rule accepts. */
export const playlistShareReady = (d: PlaylistShareDraft) => !!d.url && playlistFieldValid(d.url);

/** A refusal: on the link field when the link is what's wrong, else under the fields. */
export type PlaylistShareError = { message: string; field?: boolean } | null;

/** The fields, shared by this sheet and Share to the group's playlist step. */
export const PlaylistShareFields: React.FC<{ draft: PlaylistShareDraft; onChange: (d: PlaylistShareDraft) => void; error: PlaylistShareError }> = ({ draft, onChange, error }) => {
  const input = (label: string, key: "title" | "note", max: number) => (
    <label className="block">
      <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        {label}
      </span>
      {key === "note" ? (
        <textarea
          value={draft.note}
          maxLength={max}
          rows={3}
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
          className="w-full rounded-[12px] px-3 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ fontSize: textPx(14), background: INK.soft, border: `1px solid ${INK.b10}`, color: INK.ch }}
        />
      ) : (
        <input
          value={draft.title}
          maxLength={max}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder={t("e.g. Leg day")}
          className="w-full rounded-[12px] px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: 44, fontSize: textPx(14), background: INK.soft, border: `1px solid ${INK.b10}`, color: INK.ch }}
        />
      )}
    </label>
  );
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <PlaylistField
        label={t("Playlist")}
        value={draft.url}
        onChange={(url) => onChange({ ...draft, url })}
        error={error?.field ? error.message : null}
        labelStyle={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}
        inputStyle={{ background: INK.soft, borderRadius: 12, fontSize: textPx(14), fontWeight: 400 }}
      />
      {input(t("Title (optional)"), "title", 120)}
      {input(t("Note (optional)"), "note", 300)}
      {error && !error.field && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {error.message}
        </p>
      )}
      <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>{t("They open it in their own music app. Nobody signs in to anything through Centium.")}</p>
    </div>
  );
};

export const SharePlaylistSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  threadId: string;
  onShared: () => void;
}> = ({ open, onClose, threadId, onShared }) => {
  const [draft, setDraft] = useState<PlaylistShareDraft>(emptyPlaylistShare);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PlaylistShareError>(null);

  useEffect(() => {
    if (!open) {
      setDraft(emptyPlaylistShare());
      setError(null);
    }
  }, [open]);

  const share = async () => {
    if (busy || !playlistShareReady(draft)) return;
    setBusy(true);
    setError(null);
    const r = await sendPlaylistCard(threadId, draft.url, draft.title, draft.note);
    setBusy(false);
    if (!r.ok) return setError({ message: r.message, field: r.field });
    onShared();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Share a playlist")}
      footer={<CtaButton label={t("Share")} icon={<Send size={15} aria-hidden />} loading={busy} disabled={!playlistShareReady(draft)} onClick={() => void share()} />}
    >
      <PlaylistShareFields
        draft={draft}
        onChange={(d) => {
          setDraft(d);
          if (error) setError(null);
        }}
        error={error}
      />
    </BottomSheet>
  );
};
