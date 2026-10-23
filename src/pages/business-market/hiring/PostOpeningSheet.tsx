import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBusinessClasses } from "../../../hooks/useBusinessCatalog";
import { textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { todayLocal } from "../../../utils/date";
import { MasterSheet, PrimaryButton } from "../listingParts";
import { createOpening, type Opening, type ProCard } from "../../../services/hiring";
import { ChipSet, FeeNoticeRow, FieldBox, FieldGrid, FieldInput, PersonRow, PickerField, ToggleBox, feeNoticeText, useFeeRules } from "./hiringParts";
import {
  PROPOSALS_HINT,
  REQUIREMENTS,
  emptyForm,
  openingDescription,
  parseForm,
  scheduleLabelOf,
  seriesOptions,
  sessionOptions,
  startsText,
  suggestedPerMonth,
  type FormPayUnit,
  type OpeningFormState,
  type ParsedForm,
  type SeriesOption,
  type SessionOption,
} from "./hubModel";

// Market + Share 3.0 · W4 · B-MA.8.1 Post an opening (`postRole`, `postSlot`)
// in the W3 MasterSheet (band --sband, 1px --sborder, radius 32; 53 title
// bar; body --sbody radius 22 padding 20; footer padding 8 20 34 with the
// 1px --srule above). The fields are the board's `sheet.fields` (markup lines
// 288–296) in a two-column grid, gap 8:
//   Role · ongoing: Type chips; Role title; Classes (chevron) + Positions;
//     Pay + Classes a month; Requirements chips; Allow pay proposals.
//   Class slot · one-off: Type; Linked class (chevron); Pay for the slot +
//     Positions; Requirements; Allow pay proposals.
// Footer: the fee notice (platform_settings' rate and floors, the ticket glyph, 12 / 700 --pdark)
// over "Post opening" (50, radius 16, --fill), at 0.4 until the form is valid.
//
// Ours (not drawn): Pay's unit is chosen next to its label ("per class" / "a
// month", a role only; a class slot is paid for the slot); a class slot's
// title comes from its class ("Saturday Spin 45 cover"), the slot form has no
// title field. Live classes are read through useBusinessClasses (read-only).
// The direct offer's sheet (B-MA.8.6 `dOffer`) reuses these fields.

/** The business's live classes as the two choosers' options (read-only). */
export function useLiveClasses(): { series: SeriesOption[]; sessions: SessionOption[]; loading: boolean } {
  const { classes, loading } = useBusinessClasses();
  return useMemo(() => {
    const today = todayLocal();
    const d = new Date();
    const now = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { series: seriesOptions(classes, today), sessions: sessionOptions(classes, today, now), loading };
  }, [classes, loading]);
}

const TYPES = [
  { key: "role" as const, label: "Role · ongoing" },
  { key: "class_slot" as const, label: "Class slot · one-off" },
];

const UNITS: { value: FormPayUnit; label: string }[] = [
  { value: "per_class", label: "per class" },
  { value: "per_month", label: "a month" },
];

/** The opening form's fields (Post opening, and the direct offer's "Offer to …"). */
export function OpeningFormFields({
  form,
  set,
  mode,
  series,
  sessions,
  person,
}: {
  form: OpeningFormState;
  set: (patch: Partial<OpeningFormState>) => void;
  mode: "post" | "offer";
  series: SeriesOption[];
  sessions: SessionOption[];
  /** The direct offer's person row. */
  person?: { p: ProCard; line: string; muted: boolean };
}) {
  const m = marketPalette(useIsDark());
  const ids = {
    type: useId(),
    title: useId(),
    classes: useId(),
    positions: useId(),
    pay: useId(),
    perMonth: useId(),
    req: useId(),
    linked: useId(),
    starts: useId(),
    unit: useId(),
  };
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<null | { kind: "classes" | "linked" | "unit"; anchor: HTMLElement }>(null);
  const [perMonthTouched, setPerMonthTouched] = useState(false);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const classesRef = useRef<HTMLButtonElement | null>(null);
  const linkedRef = useRef<HTMLButtonElement | null>(null);
  const role = form.type === "role";
  const chosen = series.filter((s) => form.seriesIds.includes(s.id));
  const session = sessions.find((s) => s.id === form.sessionId) ?? null;

  const toggleSeries = (id: string) => {
    const next = form.seriesIds.includes(id) ? form.seriesIds.filter((x) => x !== id) : [...form.seriesIds, id];
    const patch: Partial<OpeningFormState> = { seriesIds: next };
    if (!perMonthTouched) patch.classesPerMonth = suggestedPerMonth(series.filter((s) => next.includes(s.id)).reduce((n, s) => n + s.perWeek, 0));
    set(patch);
  };

  const positions =
    mode === "post" ? (
      <FieldBox label="Positions" htmlFor={ids.positions} half>
        <FieldInput id={ids.positions} value={form.positions} onChange={(v) => set({ positions: v.replace(/[^\d]/g, "").slice(0, 2) })} inputMode="numeric" />
      </FieldBox>
    ) : null;

  const unitButton = (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={menu?.kind === "unit"}
      aria-label={`Pay unit: ${UNITS.find((u) => u.value === form.payUnit)?.label}`}
      onClick={(e) => setMenu({ kind: "unit", anchor: e.currentTarget })}
      className="hit market-focus"
      style={{ display: "inline-flex", alignItems: "center", gap: 2, border: 0, background: "transparent", padding: 0, fontFamily: "inherit", fontSize: textPx(12), fontWeight: 700, color: m.pdark, cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {UNITS.find((u) => u.value === form.payUnit)?.label}
      <ChevronDown size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
    </button>
  );

  return (
    <div ref={setGrid}>
      <FieldGrid>
        {person ? <PersonRow p={person.p} line={person.line} muted={person.muted} /> : null}
        <FieldBox label="Type" labelId={ids.type}>
          <ChipSet labelId={ids.type} kind="radio" options={TYPES} isOn={(k) => form.type === k} onToggle={(k) => set({ type: k, requirements: form.requirements.filter((r) => REQUIREMENTS[k].includes(r)) })} />
        </FieldBox>
        {role ? (
          <>
            <FieldBox label="Role title" htmlFor={ids.title}>
              <FieldInput id={ids.title} value={form.title} onChange={(v) => set({ title: v })} maxLength={80} />
            </FieldBox>
            <FieldBox label="Classes" labelId={ids.classes} half={mode === "post"}>
              <PickerField
                ref={classesRef}
                value={chosen.length ? chosen.map((s) => s.label).join(", ") : null}
                placeholder="Choose"
                labelledBy={ids.classes}
                open={menu?.kind === "classes"}
                onOpen={() => classesRef.current && setMenu({ kind: "classes", anchor: classesRef.current })}
              />
            </FieldBox>
            {positions}
            <div style={{ gridColumn: "span 1", background: m.sgrey, borderRadius: 14, padding: "12px 14px", lineHeight: "normal", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
                <label htmlFor={ids.pay} style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>
                  Pay
                </label>
                {unitButton}
              </div>
              <FieldInput id={ids.pay} value={form.pay} onChange={(v) => set({ pay: v.replace(/[^\d.]/g, "").slice(0, 9) })} inputMode="decimal" prefix="$" />
            </div>
            <FieldBox label="Classes a month" htmlFor={ids.perMonth} half>
              <FieldInput
                id={ids.perMonth}
                value={form.classesPerMonth}
                onChange={(v) => {
                  setPerMonthTouched(true);
                  set({ classesPerMonth: v.replace(/[^\d]/g, "").slice(0, 3) });
                }}
                inputMode="numeric"
              />
            </FieldBox>
            {mode === "offer" ? (
              <FieldBox label="Starts" labelId={ids.starts}>
                <div style={{ position: "relative" }}>
                  <PickerField
                    value={form.startsOn ? startsText(form.startsOn) : null}
                    placeholder="Choose a date"
                    labelledBy={ids.starts}
                    open={false}
                    onOpen={() => {
                      const el = dateRef.current;
                      if (!el) return;
                      try {
                        el.showPicker();
                      } catch {
                        el.focus();
                      }
                    }}
                  />
                  <input
                    ref={dateRef}
                    type="date"
                    tabIndex={-1}
                    aria-hidden
                    min={todayLocal()}
                    value={form.startsOn ?? ""}
                    onChange={(e) => set({ startsOn: e.target.value || null })}
                    style={{ position: "absolute", left: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", border: 0, padding: 0 }}
                  />
                </div>
              </FieldBox>
            ) : null}
          </>
        ) : (
          <>
            <FieldBox label="Linked class" labelId={ids.linked}>
              <PickerField
                ref={linkedRef}
                value={session?.label ?? null}
                placeholder="Choose"
                labelledBy={ids.linked}
                open={menu?.kind === "linked"}
                onOpen={() => linkedRef.current && setMenu({ kind: "linked", anchor: linkedRef.current })}
              />
            </FieldBox>
            <FieldBox label="Pay for the slot" htmlFor={ids.pay} half={mode === "post"}>
              <FieldInput id={ids.pay} value={form.pay} onChange={(v) => set({ pay: v.replace(/[^\d.]/g, "").slice(0, 9) })} inputMode="decimal" prefix="$" />
            </FieldBox>
            {positions}
          </>
        )}
        {mode === "post" ? (
          <>
            <FieldBox label="Requirements" labelId={ids.req}>
              <ChipSet
                labelId={ids.req}
                kind="check"
                options={REQUIREMENTS[form.type].map((r) => ({ key: r, label: r }))}
                isOn={(k) => form.requirements.includes(k)}
                onToggle={(k) => set({ requirements: form.requirements.includes(k) ? form.requirements.filter((x) => x !== k) : [...form.requirements, k] })}
              />
            </FieldBox>
            <ToggleBox label="Allow pay proposals" hint={form.allowProposals ? PROPOSALS_HINT.on : PROPOSALS_HINT.off} on={form.allowProposals} onChange={(v) => set({ allowProposals: v })} />
          </>
        ) : null}
      </FieldGrid>
      <PopupMenu
        open={menu?.kind === "classes"}
        anchor={menu?.kind === "classes" ? menu.anchor : null}
        matchWidth={grid}
        variant="field"
        multiSelect
        selected={form.seriesIds}
        options={series.map((s) => ({ value: s.id, label: s.label }))}
        onSelect={toggleSeries}
        onDone={() => undefined}
        emptyNote={series.length ? undefined : <p style={{ margin: "6px 4px", fontSize: textPx(12.5), color: m.faint }}>No repeating classes yet.</p>}
        onClose={() => setMenu(null)}
      />
      <PopupMenu
        open={menu?.kind === "linked"}
        anchor={menu?.kind === "linked" ? menu.anchor : null}
        matchWidth={grid}
        variant="field"
        selected={form.sessionId}
        options={sessions.map((s) => ({ value: s.id, label: s.label }))}
        onSelect={(id) => set({ sessionId: id })}
        emptyNote={sessions.length ? undefined : <p style={{ margin: "6px 4px", fontSize: textPx(12.5), color: m.faint }}>No upcoming classes.</p>}
        onClose={() => setMenu(null)}
      />
      <PopupMenu
        open={menu?.kind === "unit"}
        anchor={menu?.kind === "unit" ? menu.anchor : null}
        width={120}
        selected={form.payUnit}
        options={UNITS}
        rowLineHeight={17}
        onSelect={(u) => set({ payUnit: u })}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}

export default function PostOpeningSheet({
  open,
  businessId,
  onClose,
  onPosted,
}: {
  open: boolean;
  businessId: string | null;
  onClose: () => void;
  /** Posted: the server's row when it returns one, and the title. */
  onPosted: (o: Opening | null, title: string) => void;
}) {
  const m = marketPalette(useIsDark());
  const live = useLiveClasses();
  const [form, setForm] = useState<OpeningFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: "soon" | "error" } | null>(null);
  const rules = useFeeRules();

  // A fresh form each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(emptyForm());
      setNote(null);
      setBusy(false);
    }
  }

  const set = (patch: Partial<OpeningFormState>) => {
    setNote(null);
    setForm((f) => ({ ...f, ...patch }));
  };
  const slotTitle = live.sessions.find((s) => s.id === form.sessionId)?.slotTitle ?? null;
  const parsed: ParsedForm | null = parseForm(form, "post", slotTitle);

  const post = async () => {
    if (!parsed || !businessId || busy) return;
    setBusy(true);
    // create_opening (Database Release 2). The form draws no description, and the table requires one:
    // the form's own facts in one line (openingDescription).
    const scheduleLabel = scheduleLabelOf(parsed, live.series, live.sessions);
    const r = await createOpening(businessId, {
      type: parsed.type,
      title: parsed.title,
      description: openingDescription(parsed, scheduleLabel),
      classSeriesIds: parsed.seriesIds,
      classSessionId: parsed.sessionId,
      scheduleLabel,
      pay: parsed.pay,
      payUnit: parsed.payUnit,
      classesPerMonth: parsed.classesPerMonth,
      allowPayProposals: parsed.allowProposals,
      requirements: parsed.requirements,
      positions: parsed.positions,
    });
    setBusy(false);
    if (r.ok) onPosted(r.value, parsed.title);
    else setNote({ text: r.message, tone: r.pending ? "soon" : "error" });
  };

  return (
    <MasterSheet
      open={open}
      onClose={onClose}
      title="Post opening"
      footer={
        <>
          <FeeNoticeRow text={feeNoticeText(rules)} />
          {note ? (
            <p role={note.tone === "error" ? "alert" : "status"} style={{ margin: "0 0 10px", textAlign: "center", fontSize: textPx(12), fontWeight: note.tone === "error" ? 700 : 500, color: note.tone === "error" ? m.high : m.faint, lineHeight: "normal" }}>
              {note.text}
            </p>
          ) : null}
          <PrimaryButton onClick={() => void post()} disabled={!parsed || !businessId} busy={busy}>
            Post opening
          </PrimaryButton>
        </>
      }
    >
      <OpeningFormFields form={form} set={set} mode="post" series={live.series} sessions={live.sessions} />
    </MasterSheet>
  );
}

export type { OpeningFormState };
