import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, Tag, UserMinus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { useOnline } from "../../../hooks/useOnline";
import { INK } from "../proInk";
import { TAG_MAX } from "../../../services/pro/clients";

/**
 * Release 3 · W3 client actions shared by CL3 (row menu, multi-select) and
 * the CL2 header.
 *
 * TagsSheet (source gen/r6b.js tagsSheet6): "Tag {names}. Only you see
 * tags." 12.5 text.soft; the new-tag field (40 high, r12, soft fill, 1px 10%
 * border, tag icon, + button); each tag a row pad 11 0 with a 24 r7 check
 * (filled when every picked client has it), the tag 14 / 600 and "{n}
 * clients" 12 text.faint; footer "Apply to {n} clients" (sheet CTA).
 *
 * EndCoachingPopup: Release 2's Remove client, renamed End coaching (FINAL
 * PLAN 2.4). The only thing that ends access (J5): stages never do. The two
 * taps are kept: the first arms "Tap again to confirm" for 3 seconds, the
 * second runs disconnect_client_relationship.
 */

export interface TagTarget {
  clientId: string;
  name: string;
  tags: string[];
}

export const TagsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  targets: TagTarget[];
  /** Every tag the professional uses, with how many clients carry it. */
  known: { tag: string; count: number }[];
  onApply: (changes: { clientId: string; add: string[]; remove: string[] }[]) => Promise<string | null>;
}> = ({ open, onClose, targets, known, onApply }) => {
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();

  const startKey = targets.map((t) => t.clientId).join(",");
  useEffect(() => {
    if (!open) return;
    const all = new Set<string>();
    for (const tag of new Set(targets.flatMap((t) => t.tags))) if (targets.every((t) => t.tags.includes(tag))) all.add(tag);
    setPicked(all);
    setExtra([]);
    setDraft("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startKey]);

  const rows = useMemo(() => {
    const map = new Map(known.map((k) => [k.tag, k.count]));
    for (const e of extra) if (!map.has(e)) map.set(e, 0);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [known, extra]);

  const names = targets.length === 1 ? targets[0].name : targets.length === 2 ? `${targets[0].name} and ${targets[1].name}` : `${targets.length} clients`;
  const addDraft = () => {
    const t = draft.trim();
    if (!t) return;
    if (t.length > TAG_MAX) return setError(`Keep tags to ${TAG_MAX} characters.`);
    setExtra((x) => (x.includes(t) ? x : [...x, t]));
    setPicked((p) => new Set(p).add(t));
    setDraft("");
    setError(null);
  };
  const apply = async () => {
    if (!online) return setError("You're offline. Try again when you're connected.");
    setBusy(true);
    setError(null);
    const changes = targets.map((t) => ({
      clientId: t.clientId,
      add: [...picked].filter((p) => !t.tags.includes(p)),
      // Only a tag every picked client had (shown ticked) and was unticked is removed.
      remove: t.tags.filter((x) => !picked.has(x) && targets.every((o) => o.tags.includes(x))),
    }));
    const err = await onApply(changes);
    setBusy(false);
    if (err) return setError(err);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tags"
      footer={<CtaButton size="sheet" className="w-full" label={targets.length > 1 ? `Apply to ${targets.length} clients` : "Save tags"} loading={busy} onClick={() => void apply()} />}
    >
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 12 }}>{`Tag ${names}. Only you see tags.`}</p>
      <div className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 4px 0 12px", gap: 8 }}>
        <Tag size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        <input
          value={draft}
          maxLength={TAG_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addDraft();
          }}
          placeholder="New tag, e.g. Marathon prep"
          aria-label="New tag"
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
          style={{ fontSize: textPx(14), color: INK.ch }}
        />
        <button type="button" onClick={addDraft} aria-label="Add tag" className="tap flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <Plus size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
        </button>
      </div>
      {error && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: 8 }}>
        {rows.length === 0 && <p style={{ padding: "11px 0", fontSize: textPx(12), color: INK.chF }}>No tags yet. Add one above.</p>}
        {rows.map(([tag, count], i) => {
          const on = picked.has(tag);
          return (
            <button
              key={tag}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() =>
                setPicked((p) => {
                  const n = new Set(p);
                  if (n.has(tag)) n.delete(tag);
                  else n.add(tag);
                  return n;
                })
              }
              className="tap w-full flex items-center text-left"
              style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < rows.length - 1 ? `1px solid ${INK.b06}` : "none" }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: 7, ...(on ? { background: INK.fill } : { border: `1.5px solid ${INK.b10}` }) }}>
                {on && <Check size={14} strokeWidth={2.8} aria-hidden style={{ color: INK.onFill }} />}
              </span>
              <span className="flex-1" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                {tag}
              </span>
              <span style={{ fontSize: textPx(12), color: INK.chF }}>{`${count} client${count === 1 ? "" : "s"}`}</span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

export const EndCoachingPopup: React.FC<{
  name: string | null;
  patient: boolean;
  onEnd: () => Promise<string | null>;
  onClose: () => void;
}> = ({ name, patient, onEnd, onClose }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setArmed(false);
    setError(null);
  }, [name]);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);
  const press = async () => {
    if (!armed) return setArmed(true);
    setBusy(true);
    setError(null);
    const err = await onEnd();
    setBusy(false);
    if (err) {
      setArmed(false);
      setError(err);
    }
  };
  return (
    <CentredPopup
      open={!!name}
      onClose={onClose}
      title={`End coaching with ${name ?? ""}?`}
      icon={<UserMinus size={22} strokeWidth={2} aria-hidden />}
      body={`You'll no longer see anything ${name ?? "they"} shared, and they leave your ${patient ? "patients" : "clients"}. Their own data stays with them.`}
    >
      {error && (
        <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 4 }}>
          {error}
        </p>
      )}
      <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
        <CtaButton size="page" label={armed ? "Tap again to confirm" : "End coaching"} loading={busy} onClick={() => void press()} />
        <CtaButton size="page" variant="secondary" label="Keep" onClick={onClose} disabled={busy} />
      </div>
    </CentredPopup>
  );
};
