import React from "react";

// Website viewport v1 · WC-WO Workout (WC-WO Workout Web v13): the pieces the
// four web tabs share. Values are the reference file's own.

/**
 * Segmented Tabs v8 (handover section 2): a #F3F3FD track, padding 5, gap 5,
 * r14, 40 tall; equal pills 30 tall r10, 15/24 600; selected #A79AD5 with
 * white, idle #F5F4FE with #5B5349 (hover #EDEAFE).
 */
export function WebTabs<K extends string>({ items, active, onChange, label }: { items: { key: K; label: string }[]; active: K; onChange: (key: K) => void; label: string }) {
  const refs = React.useRef(new Map<K, HTMLButtonElement>());
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const next = items[(i + (rtl ? -step : step) + items.length) % items.length];
    onChange(next.key);
    refs.current.get(next.key)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex items-center" style={{ height: 40, boxSizing: "border-box", background: "#F3F3FD", borderRadius: 14, padding: 5, gap: 5, flex: "none" }}>
      {items.map((it, i) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            ref={(el) => {
              if (el) refs.current.set(it.key, el);
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-w-0 flex items-center justify-center whitespace-nowrap active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC] ${on ? "" : "hover:!bg-[#EDEAFE]"}`}
            style={{ flex: 1, height: 30, padding: "0 12px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#5B5349", transition: "transform .15s cubic-bezier(0.22,1,0.36,1)" }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** The grey empty card ("No routines yet", "No logged workouts yet"): #F5F5F6, r20, 40 24. */
export const EmptyCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ flex: "none", borderRadius: 20, background: "#F5F5F6", padding: "40px 24px", ...style }}>
    {children}
  </div>
);
