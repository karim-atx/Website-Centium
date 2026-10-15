import React, { useCallback, useEffect, useId, useState } from "react";
import { CircleCheck, FileText, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useOnline } from "../../../hooks/useOnline";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { CtaButton } from "../../../components/ui/PinnedCta";
import { INK } from "../../../components/pro/proInk";
import { ListCard } from "../../../components/pro/client/kit";
import { EmptyState } from "../../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { Fab } from "../../../components/pro/library/libraryUi";
import { TopToast, fieldStyle } from "../../../components/pro/forms/moKit";
import { moveItem, useReorder } from "../../../components/pro/forms/useReorder";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX, SECTION_MAX, bodyOf, sectionsOf, templateMeta } from "../../../components/pro/forms/noteTemplateModel";
import { deleteNoteTemplate, fetchMyNoteTemplates, saveNoteTemplate, type NoteTemplateRow, type TemplateKind } from "../../../services/pro/noteTemplates";
import { PRO_ROUTES } from "../../../components/pro/subtypeLanes";

const OFFLINE = "You're offline. Try again when you're connected.";
type Tab = "training" | "nutrition" | "clinical";
const TABS: { key: Tab; label: string }[] = [
  { key: "training", label: "Training" },
  { key: "nutrition", label: "Nutrition" },
  { key: "clinical", label: "Clinical" },
];
const Row: React.FC = () => <ProCardSkeleton lines={2} />;

/**
 * Release 3 · MO21 Note templates (gen/r13.js noteTpl13): pageHead "Note
 * templates" / "Start notes the same way every time"; Training / Nutrition /
 * Clinical (segTabs h36, 12, 12 under); the templates (listCard6, file-text,
 * "{n} sections"); the + (fab10, "New template"); Edit template (bottom
 * sheet: Name, Sections as soft r12 rows pad 10 12 with the grip and the ×,
 * "Add section" 13 / 700 primary.deep, "Save template").
 * The tab starts on the lane's own kind. "Used {n} times" and a section's
 * type have no column, so they aren't shown. The client page's Notes picker
 * (W3 NotesTab) reads these rows and pastes the body into a new note.
 */
export default function NoteTemplates() {
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const back = useBack(PRO_ROUTES.more);
  const [tab, setTab] = useState<Tab>(lane === "nutrition" ? "nutrition" : lane === "clinical_overview" ? "clinical" : "training");
  const [list, setList] = useState<NoteTemplateRow[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [nonce, setNonce] = useState(0);
  const [editing, setEditing] = useState<NoteTemplateRow | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (lane) setTab(lane === "nutrition" ? "nutrition" : lane === "clinical_overview" ? "clinical" : "training");
  }, [lane]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMyNoteTemplates(authUserId).then((r) => {
      if (!live) return;
      if (r.ok) {
        setList(r.data);
        setState("ok");
      } else setState(r.offline ? "offline" : "error");
    });
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  const shown = (list ?? []).filter((t) => t.kind === tab);
  return (
    <div style={{ paddingBottom: 120 }}>
      <PageHeader title="Note templates" subtitle="Start notes the same way every time" showBack onBack={back} />
      <SegmentedTabs className="mb-3" items={TABS} activeKey={tab} onChange={(k) => setTab(k as Tab)} tabHeight={36} labelSize={12} />
      {state === "offline" && list && <OfflineLine />}
      {state === "loading" && !list ? (
        <ListSkeleton rows={3} row={Row} />
      ) : !list ? (
        <ProError onRetry={reload} />
      ) : shown.length ? (
        <ListCard rows={shown.map((t) => ({ key: t.id, icon: FileText, title: t.title, meta: templateMeta(t.body), onClick: () => setEditing(t) }))} />
      ) : (
        <EmptyState icon={FileText} title="No templates yet" line="Make one with +. It shows in the Templates filter when you write a note on a client's page." />
      )}
      <Fab label="New template" icon={Plus} onClick={() => setEditing("new")} />
      <EditTemplateSheet
        open={editing !== null}
        row={editing === "new" ? null : editing}
        kind={tab}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setEditing(null);
          setToast(text);
          reload();
        }}
      />
      <TopToast icon={CircleCheck} text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

const EditTemplateSheet: React.FC<{ open: boolean; row: NoteTemplateRow | null; kind: TemplateKind; onClose: () => void; onSaved: (text: string) => void }> = ({ open, row, kind, onClose, onSaved }) => {
  const { authUserId } = useApp();
  const online = useOnline();
  const nameId = useId();
  const textId = useId();
  const [name, setName] = useState("");
  const [sections, setSections] = useState<string[] | null>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setName(row?.title ?? "");
    const s = row ? sectionsOf(row.body) : [""];
    setSections(s);
    setText(row && s === null ? row.body : "");
  }, [open, row]);

  const move = useCallback((a: number, b: number) => setSections((s) => (s ? moveItem(s, a, b) : s)), []);
  const { register, gripProps } = useReorder(sections?.length ?? 0, move);
  const body = sections === null ? text : bodyOf(sections);

  const save = async () => {
    if (!authUserId || busy) return;
    if (!name.trim()) return setErr("Give the template a name.");
    if (!body.trim()) return setErr(sections === null ? "Write the template." : "Add at least one section.");
    if (body.length > NOTE_BODY_MAX) return setErr("The template is too long.");
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    setErr(null);
    const r = await saveNoteTemplate(authUserId, row?.id ?? null, row?.kind ?? kind, name, body);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSaved("Template saved.");
  };
  const remove = async () => {
    if (!row || busy) return;
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    const r = await deleteNoteTemplate(row.id);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSaved("Template removed.");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={row ? "Edit template" : "New template"} footer={<CtaButton className="w-full" size="sheet" label="Save template" loading={busy} onClick={() => void save()} />}>
      <label htmlFor={nameId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        Name
      </label>
      <input id={nameId} value={name} maxLength={NOTE_TITLE_MAX} onChange={(e) => setName(e.target.value)} className="outline-none focus:border-primary" style={{ ...fieldStyle(), height: 40 }} />
      <div style={{ height: 12 }} />
      {sections === null ? (
        <>
          <label htmlFor={textId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            Template
          </label>
          <textarea id={textId} value={text} maxLength={NOTE_BODY_MAX} rows={8} onChange={(e) => setText(e.target.value)} className="block w-full outline-none resize-none focus:border-primary" style={{ ...fieldStyle(), padding: "10px 12px", lineHeight: 1.45 }} />
        </>
      ) : (
        <>
          <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 8 }}>Sections</p>
          {sections.map((s, i) => {
            const grip = gripProps(i);
            return (
              <div key={i} ref={register(i)} className="flex items-center" style={{ gap: 8, background: INK.soft, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
                <button type="button" aria-label={`Move section ${i + 1} of ${sections.length}. Use the arrow keys.`} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-3 before:content-['']" {...grip} style={{ width: 14, height: 20, ...grip.style }}>
                  <GripVertical size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                </button>
                <input
                  value={s}
                  maxLength={SECTION_MAX}
                  onChange={(e) => setSections((cur) => (cur ? cur.map((x, j) => (j === i ? e.target.value : x)) : cur))}
                  placeholder="Section name"
                  aria-label={`Section ${i + 1}`}
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-tertiary"
                  style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, height: 24 }}
                />
                <button type="button" onClick={() => setSections((cur) => (cur ? cur.filter((_, j) => j !== i) : cur))} aria-label={`Remove section ${i + 1}`} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ width: 20, height: 20 }}>
                  <X size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setSections((cur) => [...(cur ?? []), ""])} className="tap flex items-center relative before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']" style={{ gap: 4, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep, marginTop: 6 }}>
            <Plus size={13} strokeWidth={2.4} aria-hidden />
            Add section
          </button>
        </>
      )}
      {row && (
        <button type="button" onClick={() => void remove()} disabled={busy} className="tap flex items-center" style={{ gap: 6, marginTop: 18, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.hi }}>
          <Trash2 size={14} strokeWidth={2} aria-hidden />
          Remove template
        </button>
      )}
      {err && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 10 }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};
