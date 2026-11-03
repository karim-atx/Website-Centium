import { useRef } from "react";

// Website viewport v1 · WC-FO (Segmented Tabs v8, the web tabs at every
// level): the #F3F3FD track, padding 5, r14, 40 tall; equal segments 30 tall,
// r10, 15/24 600; the selected one #A79AD5 with white text, the others #F5F4FE
// with #6D50D3 text and a #EDEAFE hover. Arrow keys move between the tabs.

export function FoodWebTabs<K extends string>({
  items,
  active,
  onChange,
  label,
}: {
  items: { key: K; label: string }[];
  active: K;
  onChange: (k: K) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className="flex items-center w-full" style={{ background: "#F3F3FD", borderRadius: 14, padding: 5, gap: 5, boxSizing: "border-box" }}>
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
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => {
              const rtl = document.documentElement.dir === "rtl";
              const fwd = rtl ? "ArrowLeft" : "ArrowRight";
              const back = rtl ? "ArrowRight" : "ArrowLeft";
              if (e.key !== fwd && e.key !== back) return;
              e.preventDefault();
              const j = (i + (e.key === fwd ? 1 : -1) + items.length) % items.length;
              onChange(items[j].key);
              refs.current[j]?.focus();
            }}
            className={`flex-1 min-w-0 flex items-center justify-center whitespace-nowrap active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2 ${on ? "" : "hover:!bg-[#EDEAFE]"}`}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 10,
              fontSize: 15,
              lineHeight: "24px",
              fontWeight: 600,
              background: on ? "#A79AD5" : "#F5F4FE",
              color: on ? "#FFFFFF" : "#6D50D3",
              transition: "transform .15s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
