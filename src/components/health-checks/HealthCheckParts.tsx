import React from "react";
import { ClipboardCheck, Droplet, Droplets, HeartPulse, Stethoscope, TestTube } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";

// Shared pieces of the HE1.8 family (health-b-handover.md 79-521): the icon
// per check, the lavender tile, the info box, the Part B two-button row and
// the field box. Literal values from the HE1.8 / HE1.8.1 tables.

/** OURS-health-checks-edit-mode #8: the icon per check (BP, Cholesterol, Hep C from HE1.8 / HE1.8.1; the rest ours). */
export function CheckIcon({ id, size = 17 }: { id: string; size?: number }) {
  const props = { size, "aria-hidden": true as const, strokeWidth: 1.9 };
  switch (id) {
    case "bp":
      return <HeartPulse {...props} />;
    case "glucose":
      return <Droplets {...props} />;
    case "cholesterol":
      return <Droplet {...props} />;
    case "hepatitis_c":
    case "hiv":
    case "psa":
      return <TestTube {...props} />;
    case "bowel":
    case "mammogram":
    case "cervical":
      return <Stethoscope {...props} />;
    default:
      return <ClipboardCheck {...props} />;
  }
}

/** Tile 32 r10 #F0EDF9 (dark #303141) with a 17 glyph #7D6BB5 (dark #C3B3FB) (HE1.8 #11-#12). `onCard` = white tile (HE1.8.1 #43). */
export const CheckTile: React.FC<{ id: string; onCard?: boolean }> = ({ id, onCard }) => (
  <span
    className={`shrink-0 grid place-items-center text-th-7d6bb5 dark:text-primary-deep-text ${onCard ? "bg-cream-card" : "bg-th-f0edf9 dark:bg-th-303141"}`}
    style={{ width: 32, height: 32, borderRadius: 10 }}
  >
    <CheckIcon id={id} />
  </span>
);

/** Info box: #9A8CD6@12% (dark #A991FE@12%), r14 (HE1.8 #4, HE1.8.1 #42). */
export const InfoBox: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => {
  const dark = useIsDark();
  return (
    <div className={className} style={{ borderRadius: 14, padding: "12px 14px", background: dark ? "rgba(169,145,254,0.12)" : "rgb(var(--th-9a8cd6) / 0.12)", ...style }}>
      {children}
    </div>
  );
};

/**
 * Two buttons side by side (HE1.8.1 #52-#53): 46 tall, r14, gap 8, 14/21
 * 700; secondary outline 0.5px #241F1B@14% ink #5B5349 (dark #F5F3FA@14% /
 * #B8B3C7); primary #9A8CD6 white (dark #A991FE / #0D0B1A); destructive
 * #C0392B white (dark #F09A8E / #0D0B1A, V6-02).
 */
export const ButtonRow: React.FC<{
  secondary: { label: string; onClick: () => void; disabled?: boolean };
  primary: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; tone?: "primary" | "destructive" };
  style?: React.CSSProperties;
}> = ({ secondary, primary, style }) => {
  const dark = useIsDark();
  const base: React.CSSProperties = { height: 46, borderRadius: 14, fontSize: textPx(14), lineHeight: "21px", fontWeight: 700 };
  const destructive = primary.tone === "destructive";
  return (
    <div className="flex" style={{ gap: 8, ...style }}>
      <button
        type="button"
        onClick={secondary.onClick}
        disabled={secondary.disabled}
        className="tap flex-1 min-w-0 bg-cream-card text-charcoal-soft disabled:opacity-40"
        style={{ ...base, border: `0.5px solid ${dark ? "rgba(245,243,250,0.14)" : "rgba(36,31,27,0.14)"}` }}
      >
        {secondary.label}
      </button>
      <button
        type="button"
        onClick={primary.loading ? undefined : primary.onClick}
        disabled={primary.disabled}
        aria-busy={primary.loading || undefined}
        className={`tap flex-1 min-w-0 disabled:opacity-40 ${destructive ? "bg-status-high text-on-destructive" : "bg-fill-pinned"}`}
        style={{ ...base, color: destructive ? undefined : "rgb(var(--c-on-primary-fill))" }}
      >
        {primary.loading ? "Saving…" : primary.label}
      </button>
    </div>
  );
};

/** The status line under a popup's fields: error / offline (O2, O3), #C0392B (dark #F09A8E). */
export const PopupNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" className="text-status-high" style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: "17.4px", fontWeight: 600 }}>
    {children}
  </p>
);
