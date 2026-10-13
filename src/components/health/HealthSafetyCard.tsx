import React from "react";
import { AlertCircle } from "lucide-react";
import { textPx, linePx } from "../../theme/textSize";
import { useHealthMode, hairline } from "./metric/MetricKit";

/**
 * OURS-health-he1-safety-card (KEEP-SAFETY K1-K3): the full-width card under
 * the Heart rate / Blood pressure widget row that carries what the old BP row
 * carried underneath it: the severe-reading alert, the pregnancy level and
 * the check flag on the latest reading. The text is passed in from its
 * constant (SEVERE_READING_MESSAGE, PREGNANCY_FLAG_COPY, BP_DISCUSS_TEXT /
 * FLAG_TEXT) and is never retyped or cut.
 *
 * - tone "alert" (severe, pregnancy Urgent): bg #FCEDEC (dark #3C2A30), r15
 *   (widget radius), pad 16, role="alert" (HE1#45, HE1.6.a#52);
 * - tone "note" (pregnancy Same day, check flag): white + 0.5px #241F1B@8%
 *   (dark #1C1F28, #F5F3FA@8%), r15, pad 16 (HE1.5.a#10).
 * Tile 28 r9 #FFFFFF@80% (dark @8%*) with AlertCircle 16 #A4231C (dark
 * #FF6B5E, R3); caps label 9/13.5 700 ls1.4 #7D3B62 (dark #B8B3C7) "Blood
 * pressure"; optional title 13.5/20.3 700 (pregnancy / check level); text
 * 12/18 400 #241F1B / #F5F3FA; action "See readings" 12/18 700 #7D6BB5 (dark
 * #C3B3FB), 44 hit area.
 */
export const HealthSafetyCard: React.FC<{
  tone: "alert" | "note";
  title?: string;
  text: string;
  onSeeReadings?: () => void;
}> = ({ tone, title, text, onSeeReadings }) => {
  const { dark, hc } = useHealthMode();
  const alert = tone === "alert";
  return (
    <div
      role={alert ? "alert" : undefined}
      className="col-span-2"
      style={{
        borderRadius: 15,
        padding: 16,
        background: alert ? (dark ? "#3C2A30" : "#FCEDEC") : dark ? "#1C1F28" : "#FFFFFF",
        border: alert ? undefined : `0.5px solid ${hairline(dark, hc)}`,
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <span className="shrink-0 grid place-items-center" style={{ width: 28, height: 28, borderRadius: 9, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" }} aria-hidden>
          <AlertCircle size={16} strokeWidth={1.5} style={{ color: dark ? "#FF6B5E" : "#A4231C" }} />
        </span>
        <span
          className="uppercase"
          style={{ fontSize: textPx(9), lineHeight: linePx(13.5), fontWeight: 700, letterSpacing: 1.4, color: dark ? "#B8B3C7" : "rgb(var(--metric-blood-pressure-ink))" }}
        >
          Blood pressure
        </span>
      </div>
      {title && (
        <p style={{ marginTop: 10, fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{title}</p>
      )}
      <p style={{ marginTop: title ? 2 : 10, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 400, color: "rgb(var(--c-charcoal))" }}>{text}</p>
      {onSeeReadings && (
        <button
          type="button"
          onClick={onSeeReadings}
          className="tap relative block before:absolute before:-inset-y-[13px] before:-inset-x-2 before:content-['']"
          style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))" }}
        >
          See readings
        </button>
      )}
    </div>
  );
};
