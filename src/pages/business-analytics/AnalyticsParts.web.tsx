import React, { useRef } from "react";

// Website viewport v1 · WB-AN (WB-AN Analytics Web v5): the segmented tabs at
// the web size (Segmented Tabs v8: track #F3F3FD, padding 5, radius 14, gap 5;
// pills 30 tall, radius 10, 15/24 600, equal width; the selected one #A79AD5
// with white text, the others #F5F4FE with #6D50D3, hover #EDEAFE), 40 tall in
// all. Arrow keys move along the tabs (mirrored in Arabic).

export function WebSegmented<K extends string>({
  items,
  active,
  onChange,
  label,
}: {
  items: { key: K; label: string }[];
  active: K;
  onChange: (k: K, el: HTMLElement) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} data-web-segmented style={{ display: "flex", alignItems: "center", background: "#F3F3FD", borderRadius: 14, padding: 5, gap: 5, width: "100%", boxSizing: "border-box" }}>
      {items.map((it, i) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={(e) => onChange(it.key, e.currentTarget)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!dir) return;
              e.preventDefault();
              const rtl = document.documentElement.dir === "rtl";
              const next = (i + (rtl ? -dir : dir) + items.length) % items.length;
              refs.current[next]?.focus();
            }}
            className={`${on ? "" : "hover:!bg-[#EDEAFE] "}active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]`}
            style={{ flex: 1, minWidth: 0, height: 30, padding: "0 12px", borderRadius: 10, border: "none", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", cursor: "pointer", fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#6D50D3", transition: "transform .15s cubic-bezier(0.22,1,0.36,1)", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** The caps section label (13/20 600, 0.08em, #8C8378). */
export const WebCapsLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <p className="rtl:tracking-normal" style={{ flex: "none", margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C8378", ...style }}>
    {children}
  </p>
);
