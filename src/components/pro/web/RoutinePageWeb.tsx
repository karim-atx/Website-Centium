import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  GripVertical,
  Library,
  MessageSquarePlus,
  MessageSquareText,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useWebLayout } from "../../web/useWebLayout";
import { t } from "../../../i18n/core";
import { routineLabel } from "./routinePageStyles";

// Professional handover v1, WP-LI.4 "creating" (WP-LI Builders Web v2): the
// template editor as a page from 1024px, web only. The 64 header (the 40
// back r12 on #F5F5F6, the title 28/36 700, Save routine 40 r14 #9A8CD6),
// then a 12-column grid (padding 32, gap 24, 1280 cap): For your clients 3 |
// the routine 6 | the docked exercise search 3. The routine: Routine name and
// Estimated duration (min) side by side (1fr | 200, 16 apart, fields 52 r16,
// 17), the caps label, the rows (64 min, r14 #F5F5F6, padding 8 20, the grip,
// the name 17/24 500 and its line 13/20, the note, settings and remove icons
// 20, 14 apart; the row whose settings are open has the 1.5 #AEA1DC border),
// then Group into a superset (44, 15 700 #5F5093). The search (r20, the 8%
// border, padding 20): the 48 box with the focus ring, results 52 high r12
// (the active one #F0EDF9 with the 1.5 ring, 700, "+ Add" #5F5093; the rest
// 60% #F0EDF9, "+ Add" #AEA1DC), Browse exercise library 52 dashed. While an
// exercise's settings are open (WP-LI.4.1 / .4.2) the search is not drawn.
// The rail (1024) has no frame: padding 24, gap 16, the same 3 | 6 | 3.
// Mobile keeps the Create Routine sheet.

const INK = "#241F1B";
const INK2 = "#5B5349";
const FAINT = "#8C8378";
const FIELD = "#F5F5F6";
const LINE = "1px solid rgba(36,31,27,0.10)";

export const RoutinePageWeb: React.FC<{
  title: string;
  saveLabel: string;
  saveDisabled: boolean;
  onBack: () => void;
  onSave: () => void;
  left: React.ReactNode;
  routine: React.ReactNode;
  search: React.ReactNode | null;
}> = ({
  title,
  saveLabel,
  saveDisabled,
  onBack,
  onSave,
  left,
  routine,
  search,
}) => {
  const { sidebarW, wideWindow } = useWebLayout();
  const pad = wideWindow ? 32 : 24;
  const gap = wideWindow ? 24 : 16;
  return (
    <div
      role="region"
      aria-label={title}
      className="fixed top-0 bottom-0 end-0 z-40 flex flex-col"
      style={{ insetInlineStart: sidebarW, background: "#FFFFFF", color: INK }}
    >
      <header
        className="flex items-center"
        style={{
          height: 64,
          flex: "none",
          boxSizing: "border-box",
          gap: 16,
          padding: `0 ${pad}px`,
          borderBottom: "1px solid rgba(36,31,27,0.06)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={t("Back")}
          className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{
            width: 40,
            height: 40,
            boxSizing: "border-box",
            borderRadius: 12,
            background: FIELD,
            border: LINE,
          }}
        >
          <ChevronLeft
            size={20}
            strokeWidth={2}
            aria-hidden
            style={{ color: INK }}
          />
        </button>
        <h1
          className="flex-1 min-w-0 truncate"
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: "36px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h1>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="shrink-0 hover:bg-[#8E7FD0] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
          style={{
            height: 40,
            padding: "0 20px",
            borderRadius: 14,
            background: "#9A8CD6",
            color: "#FFFFFF",
            fontSize: 15,
            lineHeight: "24px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {saveLabel}
        </button>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          style={{
            maxWidth: 1280,
            height: "100%",
            margin: "0 auto",
            padding: pad,
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "repeat(12,minmax(0,1fr))",
            gap,
          }}
        >
          <section
            aria-label={t("For your clients")}
            className="overflow-y-auto"
            style={{
              gridColumn: "span 3",
              minHeight: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              borderRadius: 20,
              border: "1px solid rgba(36,31,27,0.08)",
              padding: 20,
            }}
          >
            {left}
          </section>
          <section
            aria-label={t("Routine")}
            style={{
              gridColumn: "span 6",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {routine}
          </section>
          {search && (
            <section
              aria-label={t("Add exercise")}
              style={{
                gridColumn: "span 3",
                minHeight: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                borderRadius: 20,
                border: "1px solid rgba(36,31,27,0.08)",
                padding: 20,
              }}
            >
              {search}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

/** Routine name | Estimated duration (min), 52 high, 17. */
export const RoutineFieldsWeb: React.FC<{
  name: string;
  onName: (v: string) => void;
  duration: string;
  onDuration: (v: string) => void;
}> = ({ name, onName, duration, onDuration }) => {
  const field: React.CSSProperties = {
    width: "100%",
    height: 52,
    boxSizing: "border-box",
    borderRadius: 16,
    background: FIELD,
    border: LINE,
    padding: "0 16px",
    fontSize: 17,
    color: INK,
  };
  return (
    <div
      style={{
        flex: "none",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 200px",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <label style={{ display: "block" }}>
        <span style={routineLabel}>{t("Routine name")}</span>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={t("Push Day")}
          className="placeholder:text-[#8C8378] focus:outline-none focus:border-[#AEA1DC] focus:shadow-[0_0_0_3px_rgba(174,161,220,0.25)]"
          style={{ ...field, fontWeight: 600 }}
        />
      </label>
      <label style={{ display: "block" }}>
        <span style={routineLabel}>{t("Estimated duration (min)")}</span>
        <input
          value={duration}
          onChange={(e) => onDuration(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="focus:outline-none focus:border-[#AEA1DC] focus:shadow-[0_0_0_3px_rgba(174,161,220,0.25)]"
          style={field}
        />
      </label>
    </div>
  );
};

/** One exercise row (64 min, r14, padding 8 20, icons 20, 14 apart). */
export const ExerciseRowWeb: React.FC<{
  name: string;
  line: string | null;
  hasNote: boolean;
  open: boolean;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  lead?: React.ReactNode;
  onSettings: () => void;
  onNote: () => void;
  onRemove: () => void;
}> = ({
  name,
  line,
  hasNote,
  open,
  dragProps,
  lead,
  onSettings,
  onNote,
  onRemove,
}) => {
  const icon =
    "flex items-center justify-center shrink-0 rounded-lg hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";
  return (
    <div
      {...dragProps}
      className="flex items-center hover:bg-[#F0EDF9]"
      style={{
        flex: "none",
        minHeight: 64,
        gap: 14,
        background: FIELD,
        borderRadius: 14,
        padding: "8px 20px",
        border: `1.5px solid ${open ? "#AEA1DC" : "transparent"}`,
        cursor: dragProps.draggable ? "grab" : undefined,
      }}
    >
      {lead ?? (
        <GripVertical
          size={20}
          strokeWidth={2}
          aria-hidden
          style={{ color: FAINT, flex: "none" }}
        />
      )}
      <button
        type="button"
        onClick={onSettings}
        className="flex-1 min-w-0 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] rounded-md"
      >
        <span
          className="block truncate"
          style={{ fontSize: 17, lineHeight: "24px", fontWeight: 500 }}
        >
          {name}
        </span>
        {line && (
          <span
            className="block truncate"
            style={{ fontSize: 13, lineHeight: "20px", color: FAINT }}
          >
            {line}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onNote}
        aria-label={hasNote ? t("Coach note added") : t("Add coach note")}
        className={icon}
        style={{ width: 28, height: 28 }}
      >
        {hasNote ? (
          <MessageSquareText
            size={20}
            strokeWidth={2}
            style={{ color: "#7D6BB5" }}
          />
        ) : (
          <MessageSquarePlus
            size={20}
            strokeWidth={2}
            style={{ color: FAINT }}
          />
        )}
      </button>
      <button
        type="button"
        onClick={onSettings}
        aria-label={t("Settings for {name}", { name })}
        className={icon}
        style={{ width: 28, height: 28 }}
      >
        <Settings2 size={20} strokeWidth={2} style={{ color: FAINT }} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("Remove {name}", { name })}
        className={icon}
        style={{ width: 28, height: 28 }}
      >
        <X size={20} strokeWidth={2} style={{ color: FAINT }} />
      </button>
    </div>
  );
};

/**
 * The docked exercise search: the 48 box, up to six results (Arrow keys move
 * the active one, Enter adds it), Browse exercise library at the bottom.
 */
export const ExerciseSearchWeb: React.FC<{
  query: string;
  onQuery: (v: string) => void;
  results: { key: string; name: string }[];
  onAdd: (index: number) => void;
  onBrowse: () => void;
}> = ({ query, onQuery, results, onAdd, onBrowse }) => {
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);
  // A new query starts from its first result.
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setActive(0);
  }
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <>
      <div className="relative" style={{ flex: "none", marginBottom: 12 }}>
        <Search
          size={16}
          strokeWidth={2}
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2"
          style={{ insetInlineStart: 14, color: FAINT }}
        />
        <input
          ref={input}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              onAdd(active);
            }
          }}
          placeholder={t("Search for exercise…")}
          aria-label={t("Search for exercise…")}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="routine-search-results"
          aria-activedescendant={
            results.length ? `routine-search-${active}` : undefined
          }
          className="w-full placeholder:text-[#8C8378] focus:outline-none focus:bg-white focus:border-[#AEA1DC] focus:shadow-[0_0_0_3px_rgba(174,161,220,0.25)]"
          style={{
            height: 48,
            boxSizing: "border-box",
            borderRadius: 12,
            background: FIELD,
            border: LINE,
            paddingInlineStart: 40,
            paddingInlineEnd: 12,
            fontSize: 15,
            color: INK,
          }}
        />
      </div>
      <div
        id="routine-search-results"
        role="listbox"
        aria-label={t("Search for exercise…")}
        className="overflow-y-auto"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {results.map((r, i) => {
          const on = i === active;
          return (
            <button
              key={r.key}
              id={`routine-search-${i}`}
              type="button"
              role="option"
              aria-selected={on}
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onClick={() => onAdd(i)}
              className="flex items-center justify-between text-start hover:bg-[#F0EDF9]"
              style={{
                flex: "none",
                minHeight: 52,
                gap: 8,
                borderRadius: 12,
                padding: "0 16px",
                background: on ? "#F0EDF9" : "rgba(240,237,249,0.6)",
                boxShadow: on ? "0 0 0 1.5px #AEA1DC" : "none",
                border: 0,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  lineHeight: "24px",
                  fontWeight: on ? 700 : 500,
                  color: INK,
                }}
              >
                {r.name}
              </span>
              <span
                style={{
                  flex: "none",
                  whiteSpace: "nowrap",
                  fontSize: 15,
                  lineHeight: "24px",
                  fontWeight: 600,
                  color: on ? "#5F5093" : "#AEA1DC",
                }}
              >
                {t("+ Add")}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="flex items-center justify-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{
          flex: "none",
          marginTop: 12,
          height: 52,
          boxSizing: "border-box",
          gap: 8,
          borderRadius: 14,
          border: "2px dashed rgba(36,31,27,0.15)",
          fontSize: 13,
          fontWeight: 600,
          color: INK2,
          background: "transparent",
        }}
      >
        <Library size={20} strokeWidth={2} aria-hidden />{" "}
        {t("Browse exercise library")}
      </button>
    </>
  );
};
