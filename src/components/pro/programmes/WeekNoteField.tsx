import React, { useState } from "react";
import { textPx } from "../../../theme/textSize";
import { t } from "../../../i18n/core";
import { INK } from "../proInk";
import { WEEK_NOTE_MAX } from "../../../services/programmes/model";
import { weekNoteLabel, weekNotePlaceholder } from "../../../services/programmes/copy";

const FIELD = "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

/**
 * Round F (DW1, Round D's OURS D-S3): "Note for week {n} (clients see this)"
 * under the builder's week tabs, 280 characters, in the programme details
 * sheet's field style. It saves when the field loses focus and the text
 * changed (set_programme_week_note; empty deletes the note), as the builder
 * saves every other change at once. Keyed by programme, week and saved note,
 * so switching weeks or a re-read starts it from the saved text.
 */
export const WeekNoteField: React.FC<{
  week: number;
  note: string;
  disabled: boolean;
  onSave: (note: string) => Promise<boolean>;
}> = ({ week, note, disabled, onSave }) => {
  const [text, setText] = useState(note);
  const [saving, setSaving] = useState(false);
  const id = `week-note-${week}`;

  const save = async () => {
    if (text.trim() === note.trim() || saving) return;
    setSaving(true);
    await onSave(text);
    setSaving(false);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
        {weekNoteLabel(week)}
      </label>
      <textarea
        id={id}
        value={text}
        maxLength={WEEK_NOTE_MAX}
        rows={2}
        disabled={disabled && !saving}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void save()}
        className={FIELD}
        placeholder={weekNotePlaceholder()}
      />
      <p className="flex justify-between" style={{ marginTop: 4, fontSize: textPx(11), color: INK.chF }}>
        <span>{saving ? t("Saving…") : ""}</span>
        <span>{`${text.length}/${WEEK_NOTE_MAX}`}</span>
      </p>
    </div>
  );
};
