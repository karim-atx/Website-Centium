import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useG3, useG3On } from "../../../components/premium/g3/useG3";
import { G3Caps } from "../../../components/premium/g3/parts";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { fetchMyCentiumProgrammes } from "../../../services/premium/g3Calls";
import { programmeProgressText } from "../../../services/premium/g3";
import { formatShortDate } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { coachColor } from "../coachColors";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · Workout › Routines: "Centium programmes", under the coach's
// programme card. The ones the member follows (my_centium_programmes: done of
// all, the next session and its day, locked past the free preview), and the
// way into the list. With the switch off, loading, or a Database without G3:
// nothing at all, so the tab is exactly as today.

const day = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { weekday: "short", day: "numeric", month: "short" });

export function CentiumProgrammesEntry() {
  const on = useG3On();
  const dark = useIsDark();
  const navigate = useNavigate();
  const { state } = useG3(fetchMyCentiumProgrammes, "mine");
  if (!on || state.kind === "hidden") return null;
  const mine = state.kind === "ready" ? state.value : [];

  return (
    <section aria-label={t("Centium programmes")} data-g3="centium-programmes" style={{ marginBottom: 22 }}>
      <G3Caps>{t("Centium programmes")}</G3Caps>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {mine.map((p) => (
          <button
            key={p.startId}
            type="button"
            onClick={() => navigate(`/app/workout/programmes/${encodeURIComponent(p.slug)}`)}
            className="tap w-full text-start bg-cream-card border border-charcoal/[0.08]"
            style={{ borderRadius: 16, padding: "14px 14px 12px" }}
          >
            <span className="flex items-center justify-between" style={{ gap: 8 }}>
              {/* Content: the programme's title is English data until the Database loads Karim's approved Arabic. */}
              <span className="min-w-0" style={{ fontSize: textPx(15), fontWeight: 700, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
                {p.title}
              </span>
              <ChevronRight size={16} aria-hidden className="shrink-0 rtl:-scale-x-100" style={{ color: coachColor("faint", dark) }} />
            </span>
            <span className="block" style={{ marginTop: 4, fontSize: textPx(12), color: coachColor("faint", dark) }}>
              {programmeProgressText(p.done, p.sessions)}
            </span>
            {p.nextSessionNumber !== null && (
              <span className="flex items-center" style={{ marginTop: 8, gap: 8, borderRadius: 12, background: coachColor("soft", dark), padding: "8px 10px", minHeight: 40 }}>
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                  {p.nextOn ? t("Next: session {n}, {day}", { n: p.nextSessionNumber, day: day(p.nextOn) }) : t("Next: session {n}", { n: p.nextSessionNumber })}
                </span>
                {p.nextLocked && <PremiumLabel className="shrink-0" />}
              </span>
            )}
            {p.nextSessionNumber === null && (
              <span className="block" style={{ marginTop: 8, fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-status-good))" }}>
                {t("Every session done")}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate("/app/workout/programmes")}
          className="tap w-full flex items-center justify-between bg-cream-card border border-charcoal/[0.08]"
          style={{ borderRadius: 16, padding: "12px 14px", minHeight: 48, fontSize: textPx(13), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
        >
          {mine.length ? t("See all Centium programmes") : t("Browse Centium programmes")}
          <ChevronRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
        </button>
      </div>
    </section>
  );
}
