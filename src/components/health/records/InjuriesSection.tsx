import { partBSheetTone } from "../log/LogSheetParts";
import React, { useCallback, useEffect, useState } from "react";
import { Bandage, CalendarDays, CircleCheck, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { SwipeActions } from "../../ui/SwipeActions";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { textPx, linePx } from "../../../theme/textSize";
import { addInjury, fetchMyInjuries, onInjuriesChanged, removeInjury, setInjuryStatus, updateInjury, type Injury } from "../../../services/injuries";
import { INJURY_AREA_MAX, INJURY_DESCRIPTION_MAX, injuryMeta, injuryProblem } from "../../../services/injuries/model";
import { useHealthMode, fieldStyle, fmtDate, ListCard, RowTile, RowText, Skel, ErrorLine, rowRule, SectionCaps, FieldLabel, HelpLine, INK_FAINT } from "./kit";

/**
 * Round D · the client's Injuries (public.injuries, 20261222050000), on the
 * History tab beside Past surgeries and Medications and in their style (not
 * drawn): swipe rows with Edit, "Mark as healed" (status resolved) or "Still
 * current", and Delete; a healed injury stays listed, faded, under the
 * current ones. Added from "Add to history › Injury", or when the client
 * confirms an answer a form carried (confirm_form_profile_proposal).
 * Professionals read it under the client's medical_history consent.
 */
export const InjuriesSection: React.FC<{ onEdit: (injury: Injury) => void }> = ({ onEdit }) => {
  const { authUserId } = useApp();
  const { dark, hc } = useHealthMode();
  const [list, setList] = useState<Injury[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!authUserId) return;
    void fetchMyInjuries(authUserId).then((r) => {
      if (r.ok) {
        setList(r.data);
        setFailed(false);
      } else setFailed(true);
    });
  }, [authUserId]);

  useEffect(() => {
    load();
    return onInjuriesChanged(load);
  }, [load]);

  const run = async (action: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setError(null);
    const r = await action();
    if (!r.ok) setError(r.message);
  };

  return (
    <>
      <SectionCaps>Injuries</SectionCaps>
      {list === null && !failed ? (
        <ListCard>
          <div style={{ height: 60, padding: "9px 14px" }} className="flex items-center gap-3">
            <Skel w={32} h={32} r={10} />
            <Skel w="50%" h={11} />
          </div>
        </ListCard>
      ) : list === null ? (
        <p style={{ margin: "0 0 9px", fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>
          Couldn't load your injuries.{" "}
          <button type="button" onClick={load} className="tap underline" style={{ minHeight: 44 }}>
            Try again
          </button>
        </p>
      ) : list.length === 0 ? (
        <p style={{ margin: "0 0 9px", fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>No injuries added.</p>
      ) : (
        <ListCard>
          {list.map((i, n) => {
            const healed = i.status === "resolved";
            return (
              <div key={i.id} style={{ borderTop: n ? rowRule(dark, hc) : undefined }}>
                <SwipeActions
                  radius={0}
                  tileMax={45}
                  tileRadius={12}
                  edgeInset={8}
                  keyboardLabel={`${i.description}${healed ? ", healed" : ""}`}
                  actions={[
                    { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => onEdit(i) },
                    healed
                      ? { key: "current", label: "Still current", icon: <RotateCcw size={16} />, onClick: () => void run(() => setInjuryStatus(i.id, "active")) }
                      : { key: "healed", label: "Mark as healed", icon: <CircleCheck size={16} />, onClick: () => void run(() => setInjuryStatus(i.id, "resolved")) },
                    { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => void run(() => removeInjury(i.id)) },
                  ]}
                >
                  <div className="flex items-center" style={{ minHeight: 60, padding: "9px 14px", gap: 11, background: "rgb(var(--c-cream-card))", opacity: healed ? 0.6 : 1 }}>
                    <RowTile icon={Bandage} />
                    <RowText title={i.description} meta={injuryMeta(i) || undefined} />
                  </div>
                </SwipeActions>
              </div>
            );
          })}
        </ListCard>
      )}
      {error && <ErrorLine style={{ marginTop: 8 }}>{error}</ErrorLine>}
    </>
  );
};

/** Injury sheet: What happened, Body area, Since (optional, not in the future). */
export const InjurySheet: React.FC<{ open: boolean; injury: Injury | null; onClose: () => void; onSaved: (m: string) => void }> = ({ open, injury, onClose, onSaved }) => {
  const { authUserId, today } = useApp();
  const { dark, hc } = useHealthMode();
  const [description, setDescription] = useState("");
  const [bodyArea, setBodyArea] = useState("");
  const [since, setSince] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setDescription(injury?.description ?? "");
    setBodyArea(injury?.bodyArea ?? "");
    setSince(injury?.since ?? "");
    setError(null);
  }, [open, injury]);
  const draft = { description, bodyArea, since };
  const problem = injuryProblem(draft, today);
  const save = async () => {
    if (problem || busy || !authUserId) return;
    setBusy(true);
    setError(null);
    const r = injury ? await updateInjury(injury.id, draft) : await addInjury(authUserId, draft);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved(injury ? "Changes saved." : "Injury added.");
    onClose();
  };
  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={injury ? "Edit injury" : "Add injury"}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={<CtaButton label="Save" onClick={() => void save()} loading={busy} disabled={!description.trim()} />}
      >
        <FieldLabel htmlFor="injury-what">What happened</FieldLabel>
        <input id="injury-what" value={description} maxLength={INJURY_DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Torn meniscus" className="outline-none placeholder:text-charcoal-faint" style={fieldStyle(dark, hc)} />
        <FieldLabel htmlFor="injury-area" style={{ marginTop: 16 }}>
          Body area (optional)
        </FieldLabel>
        <input id="injury-area" value={bodyArea} maxLength={INJURY_AREA_MAX} onChange={(e) => setBodyArea(e.target.value)} placeholder="e.g. Left knee" className="outline-none placeholder:text-charcoal-faint" style={fieldStyle(dark, hc)} />
        <FieldLabel style={{ marginTop: 16 }}>Since (optional)</FieldLabel>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" onClick={() => setCalendarOpen(true)} className="tap flex-1 flex items-center text-start" style={{ ...fieldStyle(dark, hc), gap: 8, color: since ? undefined : INK_FAINT }}>
            <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
            {since ? fmtDate(since) : "Choose a date"}
          </button>
          {since && (
            <button type="button" onClick={() => setSince("")} className="tap shrink-0" style={{ minHeight: 44, padding: "0 6px", fontSize: textPx(13), fontWeight: 700, color: INK_FAINT }}>
              Clear
            </button>
          )}
        </div>
        {description.trim() && problem && <HelpLine error>{problem}</HelpLine>}
        {error && <HelpLine error>{error}</HelpLine>}
      </BottomSheet>
      <CalendarPickerSheet variant="partB" open={calendarOpen} onClose={() => setCalendarOpen(false)} selectedDate={since || today} today={today} maxDate={today} onSelect={(d) => { setSince(d); setCalendarOpen(false); }} />
    </>
  );
};
