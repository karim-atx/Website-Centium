import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { appLocale } from "../../i18n/format";
import { t, tx } from "../../i18n/core";
import { useLinkOnce } from "../../hooks/useLinkOnce";
import { fetchMyReadiness, fetchReadinessForm, type MyReadiness } from "../../services/readiness";
import { memberHeadingKey, word } from "../../services/readiness/model";
import { ReadinessSheet } from "./ReadinessSheet";

/**
 * Round K · DW (decision 3): "Before you start" in Workout. Before the first
 * form it invites ("About a minute", Start); after, it shows the latest
 * outcome's heading and when, and opens it (with "Fill it in again" there).
 * The title is the form's own (intro.title). Nothing renders until both
 * reads succeed, so the card stays away while the Database's calls aren't
 * live, offline, or signed out.
 *
 * The member's push (form_due / readiness_request) is to open
 * /app/workout?tab=routines&readiness=start (Karim 2026-11-08; the push's
 * url is set by the Database's send-reminder-push): once the card has
 * loaded, the sheet opens on its intro, whatever the latest form, and the
 * parameter is taken off the address.
 */
export const ReadinessCard: React.FC<{ web?: boolean }> = ({ web }) => {
  const { authUserId } = useApp();
  const [state, setState] = useState<{ texts: Record<string, string>; latest: MyReadiness | null } | null>(null);
  // "latest" opens on the latest form's outcome (or the intro before one); "intro" always on the intro.
  const [open, setOpen] = useState<false | "latest" | "intro">(false);

  const [nonce, setNonce] = useState(0);
  const load = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void Promise.all([fetchReadinessForm(), fetchMyReadiness()]).then(([f, m]) => {
      if (live && f.ok && m.ok) setState({ texts: f.data.texts, latest: m.data });
    });
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  useLinkOnce("readiness", "start", () => setOpen("intro"), !!state && !!word(state.texts, "intro.title"));

  if (!state || !word(state.texts, "intro.title")) return null;
  const { texts, latest } = state;
  const when = latest?.completedAt ? new Date(latest.completedAt).toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "short", year: "numeric" }) : null;
  const line = latest ? [word(texts, memberHeadingKey(latest.label)), when ? t("Filled in {date}", { date: when }) : null].filter(Boolean).join(" · ") : t("About a minute");

  return (
    <section aria-label={word(texts, "intro.title")} data-readiness-card style={{ marginBottom: web ? 0 : 22 }}>
      <button
        type="button"
        onClick={() => setOpen("latest")}
        className="tap w-full flex items-center text-start bg-cream-card border border-charcoal/[0.08]"
        style={{ gap: 12, borderRadius: 16, padding: "12px 14px", minHeight: 56 }}
      >
        <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: INK.prPale, color: INK.prDeep }}>
          <ClipboardCheck size={18} strokeWidth={2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>
            {word(texts, "intro.title")}
          </span>
          <span className="block" style={{ marginTop: 2, fontSize: textPx(12), lineHeight: 1.45, color: INK.chF, overflowWrap: "anywhere" }}>
            {line}
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center" style={{ gap: 2, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
          {latest ? t("View") : tx("Start", "readiness")}
          <ChevronRight size={15} strokeWidth={2} aria-hidden />
        </span>
      </button>
      <ReadinessSheet
        open={open !== false}
        latest={open === "latest" ? latest : null}
        onClose={(changed) => {
          setOpen(false);
          if (changed) load();
        }}
      />
    </section>
  );
};
