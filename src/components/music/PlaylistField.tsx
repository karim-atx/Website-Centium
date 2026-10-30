import React, { useId } from "react";
import { X } from "lucide-react";
import { textPx, linePx } from "../../theme/textSize";
import { playlistFieldMessage, tidyPlaylistInput } from "../../services/music/playlistLink";
import { ServiceIcon } from "./ServiceIcon";
import { t } from "../../i18n/core";

// Round E · THE "Playlist (optional)" field, the same in every editor that
// takes one. Accepts Spotify, Apple Music and YouTube Music playlist or album
// links (services/music/playlistLink, the server's rule); says which service
// it recognised, or what's wrong, as the link is pasted. Designed here in the
// app's own field style (global tokens: light, dark, high contrast).
//
// The value is what is saved: tidied (spaces trimmed, a bare host given its
// https://), never otherwise rewritten. Use `playlistFieldValid` to block a
// save while the field holds something the server would refuse.

const INK = "rgb(var(--c-charcoal))";
const INK_FAINT = "rgb(var(--c-charcoal-faint))";
const RED = "rgb(var(--c-destructive-icon))";

/** The service line ("Spotify playlist") and the refusals as whole translatable sentences. */
function serviceLine(label: string): string {
  const m = /^(.+) (album|playlist)$/.exec(label);
  if (!m) return t(label);
  return m[2] === "album" ? t("{service} album", { service: m[1] }) : t("{service} playlist", { service: m[1] });
}
function problemLine(message: string): string {
  const m = /^That's a (.+) link, but not a playlist or an album.$/.exec(message);
  if (m && m[1] !== "music") return t("That's a {service} link, but not a playlist or an album.", { service: m[1] });
  return t(message);
}

/** Whether the field's value can be saved (empty is fine: it's optional). */
export function playlistFieldValid(value: string): boolean {
  const m = playlistFieldMessage(value);
  return m === null || m.ok;
}

export const PlaylistField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  /** Defaults to "Playlist (optional)". */
  label?: string;
  /** A line under the field, e.g. who sees it. */
  hint?: string;
  /** A refusal from the server on save (playlistSaveError). */
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
  /** The input's own look, to match the editor it sits in. */
  inputStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}> = ({ value, onChange, label, hint, error, className, style, inputStyle, labelStyle }) => {
  const id = useId();
  const msg = playlistFieldMessage(value);
  const problem = error ?? (msg && !msg.ok ? msg.message : null);
  return (
    <div className={className} style={style}>
      <label htmlFor={id} className="block" style={{ marginBottom: 6, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: "rgb(var(--c-charcoal-soft))", ...labelStyle }}>
        {label ? t(label) : t("Playlist (optional)")}
      </label>
      <div className="relative">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => value !== tidyPlaylistInput(value) && onChange(tidyPlaylistInput(value))}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!text) return;
            e.preventDefault();
            onChange(tidyPlaylistInput(text));
          }}
          placeholder={t("Paste a Spotify, Apple Music or YouTube Music link")}
          aria-invalid={!!problem}
          aria-describedby={`${id}-note`}
          className="w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          style={{
            minHeight: 48,
            padding: value ? "0 40px 0 14px" : "0 14px",
            borderRadius: 14,
            background: "rgb(var(--c-cream-soft))",
            border: `1px solid ${problem ? RED : "rgb(var(--c-charcoal) / 0.08)"}`,
            fontSize: textPx(14),
            lineHeight: linePx(20),
            fontWeight: 600,
            color: INK,
            ...inputStyle,
            // The error outline wins over an editor's own border.
            ...(problem ? { border: `1px solid ${RED}` } : null),
            // Room for the clear button whatever padding the editor uses.
            ...(value ? { paddingRight: 40 } : null),
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("Clear the playlist link")}
            className="tap absolute grid place-items-center rounded-full"
            style={{ insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, color: INK_FAINT }}
          >
            <X size={15} aria-hidden />
          </button>
        )}
      </div>
      <p id={`${id}-note`} role={problem ? "alert" : undefined} className="flex items-center" style={{ marginTop: 6, gap: 6, fontSize: textPx(11.5), lineHeight: linePx(17), fontWeight: problem || msg?.ok ? 600 : 400, color: problem ? RED : msg?.ok ? INK : INK_FAINT }}>
        {problem ? (
          problemLine(problem)
        ) : msg?.ok ? (
          <>
            <ServiceIcon service={msg.service} size={14} />
            {serviceLine(msg.label)}
          </>
        ) : (
          hint ? t(hint) : t("Spotify, Apple Music or YouTube Music: a playlist or an album.")
        )}
      </p>
    </div>
  );
};
