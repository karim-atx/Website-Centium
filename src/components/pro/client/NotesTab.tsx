import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, History, Lock, Plus, Search, Trash2 } from "lucide-react";
import { clearLegacyClientHealthNote, readLegacyClientHealthNote, useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { Toggle } from "../../ui/Toggle";
import { INK } from "../proInk";
import { EmptyState } from "../EmptyState";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { Chip } from "./kit";
import { fmtDay } from "./clientFormat";
import type { ClientPageData } from "./useClientPage";
import type { ProLane } from "../subtypeLanes";
import { createNote, deleteNote, fetchNotes, fetchNoteTemplates, NOTE_MAX, updateNote, type NoteKind, type NoteTemplate, type SessionNote } from "../../../services/pro/clientPage";
import { t, tk } from "../../../i18n/core";

/**
 * Release 3 · CL2 v3 Tab 5 Notes (source gen/r6b.js cpTab6 'Notes', r8
 * linkChip8): search, the filter chips (All, Session, Private, Templates;
 * r10, pad 6 12, 12, filled when on), note cards (r20, pad 14: "{Kind} note ·
 * {date}" 12 / 700, the Session chip or "Only you" with the lock, the body
 * 13 / 1.5 text.soft, the author line 10.5 text.tertiary), then "Change
 * history" (CL4).
 *
 * Notes are session_notes (DB-3), private unless shared with the client. The
 * kind follows the lane (HANDOVER d: training, nutrition or clinical notes).
 * Templates are note_templates (managed in MO21, W6), picked into a new note.
 *
 * J4 one-time import: the old Health metrics notes (current injuries,
 * personality type) kept in this browser for this client become one private
 * note, and that browser store is cleared for them.
 */

const KIND_FOR: Record<ProLane, NoteKind> = { full_coaching: "training", nutrition: "nutrition", clinical_overview: "clinical" };
const KIND_WORD: Record<NoteKind, string> = { training: tk("Training"), nutrition: tk("Nutrition"), clinical: tk("Clinical"), body: tk("Body") };
type Filter = "all" | "session" | "private" | "templates";

export const NotesTab: React.FC<{ data: ClientPageData; lane: ProLane; onHistory: () => void }> = ({ data, lane, onHistory }) => {
  const { authUserId, user } = useApp();
  const { clientId, rel, firstName } = data;
  const [notes, setNotes] = useState<{ list: SessionNote[] | null; error: boolean; offline: boolean }>({ list: null, error: false, offline: false });
  const [templates, setTemplates] = useState<NoteTemplate[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<{ note: SessionNote | null; body?: string } | null>(null);
  const imported = useRef(false);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchNotes(authUserId, clientId).then((r) => live && setNotes((p) => (r.ok ? { list: r.data, error: false, offline: false } : { list: p.list, error: true, offline: r.offline })));
    void fetchNoteTemplates(authUserId).then((r) => live && setTemplates(r.ok ? r.data : []));
    return () => {
      live = false;
    };
  }, [authUserId, clientId, nonce]);

  // J4: the one-time import, once the notes have loaded (so a failed read never imports twice).
  useEffect(() => {
    if (imported.current || !authUserId || !rel || !notes.list) return;
    const old = readLegacyClientHealthNote(rel.id);
    const injuries = old?.currentInjuries?.trim();
    const personality = old?.personalityType?.trim();
    if (!injuries && !personality) return;
    imported.current = true;
    const body = [t("From your earlier Health metrics notes:"), injuries ? t("Current injuries: {injuries}", { injuries }) : null, personality ? t("Personality type: {personality}", { personality }) : null].filter(Boolean).join("\n");
    void createNote(authUserId, clientId, KIND_FOR[lane], body.slice(0, NOTE_MAX), false).then((r) => {
      if (!r.ok) {
        imported.current = false;
        return;
      }
      clearLegacyClientHealthNote(rel.id);
      setNonce((n) => n + 1);
    });
  }, [authUserId, rel, notes.list, clientId, lane]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      (notes.list ?? []).filter((n) => {
        if (filter === "session" && !n.eventId) return false;
        if (filter === "private" && n.sharedWithClient) return false;
        return !q || n.body.toLowerCase().includes(q);
      }),
    [notes.list, filter, q]
  );

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: t("All") },
    { key: "session", label: t("Session") },
    { key: "private", label: t("Private") },
    { key: "templates", label: t("Templates") },
  ];
  const me = user.firstName?.trim() || t("You");

  return (
    <>
      <label className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8, marginBottom: 10 }}>
        <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search notes")}
          aria-label={t("Search notes")}
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
          style={{ fontSize: textPx(14), color: INK.ch }}
        />
      </label>
      <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 12 }} role="tablist" aria-label={t("Show")}>
        {chips.map((c) => {
          const on = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(c.key)}
              className="tap whitespace-nowrap relative before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-['']"
              style={{ borderRadius: 10, padding: "6px 12px", fontSize: textPx(12), border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.fill : INK.card, color: on ? INK.onFill : INK.chS, fontWeight: on ? 700 : 600 }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="flex" style={{ marginBottom: 12 }}>
        <CtaButton size="base" variant="secondary" icon={<Plus size={15} />} label={t("Add a note")} onClick={() => setSheet({ note: null })} />
      </div>
      {notes.offline && <OfflineLine />}

      {filter === "templates" ? (
        templates === null ? (
          <ProCardSkeleton lines={2} />
        ) : templates.length === 0 ? (
          <EmptyState icon={FileText} title={t("No templates yet")} line={t("Save templates in More, Note templates, to start notes faster.")} />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => setSheet({ note: null, body: t.body })} className="tap text-start" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
                <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.ch }}>{t.title}</p>
                <p className="line-clamp-3" style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 6 }}>
                  {t.body}
                </p>
              </button>
            ))}
          </div>
        )
      ) : notes.list === null && notes.error ? (
        <ProError onRetry={() => setNonce((n) => n + 1)} />
      ) : notes.list === null ? (
        <ListSkeleton rows={2} row={() => <ProCardSkeleton lines={3} />} />
      ) : shown.length === 0 ? (
        <EmptyState icon={FileText} title={q || filter !== "all" ? t("No notes match") : t("No notes yet")} line={q || filter !== "all" ? t("Try another word or filter.") : t("Notes are private to you unless you share one with {firstName}.", { firstName })} />
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {shown.map((n) => {
            const edited = new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 60000;
            return (
              <button key={n.id} type="button" onClick={() => setSheet({ note: n })} className="tap text-start" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
                <span className="flex items-center justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.ch }}>{`${n.sharedWithClient || n.eventId ? t("{kind} note", { kind: t(KIND_WORD[n.kind]) }) : t("Private")} · ${fmtDay(n.createdAt)}`}</span>
                  {n.eventId ? (
                    <Chip label={t("Session")} tone="pr" />
                  ) : n.sharedWithClient ? (
                    <Chip label={t("{firstName} sees this", { firstName })} tone="done" />
                  ) : (
                    <span className="inline-flex items-center" style={{ gap: 3, fontSize: textPx(10.5), fontWeight: 700, color: INK.chF }}>
                      <Lock size={11} strokeWidth={2} aria-hidden />{t("Only you")}</span>
                  )}
                </span>
                <span className="block" style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {n.body}
                </span>
                <span className="block" style={{ fontSize: textPx(10.5), color: INK.chT, marginTop: 8 }}>{`${me}${edited ? t(" · edited") : ""}`}</span>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" onClick={onHistory} className="tap flex items-center" style={{ gap: 6, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, padding: "6px 2px", minHeight: 44, marginTop: 4 }}>
        <History size={14} strokeWidth={2} aria-hidden />{t("Change history")}</button>

      <NoteSheet
        key={sheet ? sheet.note?.id ?? `new:${sheet.body ?? ""}` : "closed"}
        open={!!sheet}
        note={sheet?.note ?? null}
        initialBody={sheet?.body ?? ""}
        firstName={firstName}
        templates={templates ?? []}
        onClose={() => setSheet(null)}
        onSave={async (body, shared) => {
          if (!authUserId) return t("Couldn't save the note. Try again.");
          const r = sheet?.note ? await updateNote(sheet.note.id, body, shared) : await createNote(authUserId, clientId, KIND_FOR[lane], body, shared);
          if (!r.ok) return r.message;
          setSheet(null);
          setNonce((x) => x + 1);
          return null;
        }}
        onDelete={async () => {
          if (!sheet?.note) return null;
          const r = await deleteNote(sheet.note.id);
          if (!r.ok) return r.message;
          setSheet(null);
          setNonce((x) => x + 1);
          return null;
        }}
      />
    </>
  );
};

const NoteSheet: React.FC<{
  open: boolean;
  note: SessionNote | null;
  initialBody: string;
  firstName: string;
  templates: NoteTemplate[];
  onClose: () => void;
  onSave: (body: string, shared: boolean) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}> = ({ open, note, initialBody, firstName, templates, onClose, onSave, onDelete }) => {
  const [body, setBody] = useState(note?.body ?? initialBody);
  const [shared, setShared] = useState(note?.sharedWithClient ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tplEl, setTplEl] = useState<HTMLElement | null>(null);
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={note ? t("Edit note") : t("New note")}
      footer={<CtaButton size="sheet" className="w-full" label={t("Save note")} loading={busy} disabled={!body.trim()} onClick={() => void run(() => onSave(body, shared))} />}
    >
      {!note && templates.length > 0 && (
        <button
          type="button"
          onClick={(e) => setTplEl(e.currentTarget)}
          aria-haspopup="menu"
          className="tap flex items-center relative before:absolute before:-inset-3 before:content-['']"
          style={{ gap: 6, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, marginBottom: 10 }}
        >
          <FileText size={14} strokeWidth={2} aria-hidden />{t("Start from a template")}</button>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={NOTE_MAX}
        rows={7}
        aria-label={t("Note")}
        placeholder={t("Write the note")}
        className="w-full outline-none placeholder:text-charcoal-faint resize-y"
        style={{ minHeight: 140, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, lineHeight: 1.45 }}
      />
      <div className="flex items-center justify-between" style={{ gap: 16, borderRadius: 12, background: INK.soft, padding: "10px 12px", marginTop: 12 }}>
        <span style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{t("{firstName} can see this", { firstName })}</span>
        <Toggle checked={shared} onChange={setShared} label={t("{firstName} can see this", { firstName })} />
      </div>
      <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>{t("Off keeps the note private to you.")}</p>
      {error && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {error}
        </p>
      )}
      {note && (
        <button
          type="button"
          onClick={() => (confirmDelete ? void run(onDelete) : setConfirmDelete(true))}
          className="tap flex items-center"
          style={{ gap: 6, marginTop: 14, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.hi }}
        >
          <Trash2 size={14} strokeWidth={2} aria-hidden />
          {confirmDelete ? t("Tap again to delete") : t("Delete note")}
        </button>
      )}
      <PopupMenu
        open={!!tplEl}
        onClose={() => setTplEl(null)}
        anchor={tplEl}
        heading={t("Templates")}
        options={templates.map((t) => ({ value: t.id, label: t.title }))}
        onSelect={(id) => {
          const t = templates.find((x) => x.id === id);
          if (t) setBody((b) => (b.trim() ? `${b}\n\n${t.body}` : t.body));
        }}
        width={240}
        align="left"
      />
    </BottomSheet>
  );
};
