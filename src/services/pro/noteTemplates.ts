// Release 3 · W6 MO21 Note templates on note_templates (DB-3): the owner
// reads, inserts, updates and deletes their own rows (RLS; insert needs a
// professional subtype). Columns: kind (session_note_kind: training,
// nutrition, clinical, body), title (1 to 80), body (1 to 10,000). The client
// page's Notes picker reads the same rows (services/pro/clientPage
// fetchNoteTemplates).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Read, Write } from "./clients";
import { tk } from "../../i18n/core";

const from = (table: string) => supabase.from(table as never);

export type TemplateKind = "training" | "nutrition" | "clinical" | "body";

export interface NoteTemplateRow {
  id: string;
  kind: TemplateKind;
  title: string;
  body: string;
  updatedAt: string;
}

export async function fetchMyNoteTemplates(me: string): Promise<Read<NoteTemplateRow[]>> {
  const { data, error } = await from("note_templates").select("id, kind, title, body, updated_at").eq("professional_id", me).order("title");
  if (error) return { ok: false, offline: isOffline(error) };
  return {
    ok: true,
    data: ((data ?? []) as unknown as { id: string; kind: TemplateKind; title: string; body: string; updated_at: string }[]).map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, updatedAt: r.updated_at })),
  };
}

const fail = (error: unknown): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : tk("Couldn't save the template. Try again.") });

export async function saveNoteTemplate(me: string, id: string | null, kind: TemplateKind, title: string, body: string): Promise<Write> {
  const row = { kind, title: title.trim(), body };
  const { error } = id ? await from("note_templates").update(row as never).eq("id", id) : await from("note_templates").insert({ ...row, professional_id: me } as never);
  return error ? fail(error) : { ok: true };
}

export async function deleteNoteTemplate(id: string): Promise<Write> {
  const { error } = await from("note_templates").delete().eq("id", id);
  return error ? { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : tk("Couldn't remove the template. Try again.") } : { ok: true };
}
