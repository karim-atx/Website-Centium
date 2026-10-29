import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { MessagesHeader } from "./MessagesHeader";
import { type PickableClient } from "./ClientPicker";
import {
  createGroup,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_PHOTO_ACCEPT,
  inviteToGroup,
  setGroupDescription,
  submitGroupPhoto,
} from "../../services/messaging/groups";
import { useApp } from "../../context/AppContext";
import { PinnedCta } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { Avatar } from "../pro/client/kit";
import { textPx } from "../../theme/textSize";

/**
 * New group (phase 2B; Release 3 MO27 "New group", gen/r16.js newGroup16).
 * Professional only (ProMessages is its one caller): name it, pick connected
 * clients, send invitations. Nobody is added directly: each person sees an
 * invitation and joins only if they choose to.
 *
 * Drawn as the frame: the teal-pale note (r14, pad 12 14, 13 / 1.5); the
 * group photo (64, striped) beside "Group name" (field: label 12 / 600
 * text.soft 6 above, 40 tall, r12, soft fill, 1px 10% border, 14);
 * "Description (optional)"; "Invite · {n} clients" (12.5 / 700 text.soft)
 * over GroupPicker; the hired-clients line (12 text.soft); the pinned CTA
 * "Create and invite {n} clients". The title row stays the shared Messages
 * header (one title size for pages reached from More, X-12).
 * Round D (Database 20261223040000): the photo and the description are sent
 * once the group exists. The photo waits for approval (submit_image
 * 'group_photo'); the description is checked by the word lists. Either one
 * refused is named on the "Group created" screen; the group exists anyway and
 * both can be set again in Group info.
 *
 * Invitations go one person at a time, so somebody the database refuses (under
 * 18, no longer a client) is named and the rest still go.
 */
export const NewGroup: React.FC<{
  clients: PickableClient[];
  onBack: () => void;
  /** Called with the new group's thread id once it exists and invitations went. */
  onCreated: (threadId: string) => void;
}> = ({ clients, onBack, onCreated }) => {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ name: string; reason: string }[] | null>(null);
  const [notSaved, setNotSaved] = useState<{ name: string; reason: string }[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { authUserId } = useApp();
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The picked photo, shown before anything is sent; its object URL is let go when it changes.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const trimmed = name.trim();
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const made = await createGroup(trimmed);
    if (!made.ok) {
      setBusy(false);
      setError(made.message);
      return;
    }
    const people = clients.filter((c) => picked.has(c.userId)).map((c) => ({ userId: c.userId, name: c.name }));
    const result = people.length > 0 ? await inviteToGroup(made.threadId, people) : { sent: 0, refused: [] };
    const missed: { name: string; reason: string }[] = [];
    if (desc.trim()) {
      const d = await setGroupDescription(made.threadId, desc);
      if (!d.ok) missed.push({ name: "Description", reason: d.message });
    }
    if (photo && authUserId) {
      const p = await submitGroupPhoto(authUserId, made.threadId, photo);
      if (!p.ok) missed.push({ name: "Group photo", reason: p.message });
    }
    setBusy(false);
    if (result.refused.length > 0 || missed.length > 0) {
      // Show what didn't go before moving on; the group exists either way.
      setRefused(result.refused);
      setNotSaved(missed);
      setCreatedId(made.threadId);
      return;
    }
    onCreated(made.threadId);
  };

  const n = picked.size;
  const clientsWord = (k: number) => `${k} ${k === 1 ? "client" : "clients"}`;

  if (refused && createdId) {
    return (
      <div className="flex flex-col" style={{ gap: 14, paddingBottom: 172 }}>
        <Header title="Group created" onBack={() => onCreated(createdId)} />
        {refused.length > 0 && (
          <>
            <p style={{ fontSize: textPx(14), color: INK.ch }}>These people weren't invited. Everyone else has an invitation.</p>
            <ReasonList rows={refused} />
          </>
        )}
        {notSaved.length > 0 && (
          <>
            <p style={{ fontSize: textPx(14), color: INK.ch }}>These weren't saved. You can add them again in Group info.</p>
            <ReasonList rows={notSaved} />
          </>
        )}
        <PinnedCta primary={{ label: "Open the group", onClick: () => onCreated(createdId) }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ paddingBottom: 172 }}>
      <Header title="New group" onBack={onBack} className="mb-3.5" />
      <div style={{ borderRadius: 14, background: INK.tealPale, padding: "12px 14px", fontSize: textPx(13), lineHeight: 1.5, marginBottom: 14 }} className="text-charcoal-soft dark:text-teal-deep-text">
        Each person you pick gets an invitation and joins only if they accept. Members see each other's first names and messages in the group, never health data or other chats.
      </div>
      <div className="flex items-center" style={{ gap: 14, marginBottom: 14 }}>
        <span className="flex flex-col items-center shrink-0" style={{ gap: 4 }}>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={photo ? "Change the group photo" : "Add a group photo"} className="tap rounded-full">
            {preview ? (
              <span className="flex rounded-full overflow-hidden" style={{ width: 64, height: 64, border: `1px solid ${INK.b10}` }}>
                <img src={preview} alt="" className="w-full h-full object-cover" />
              </span>
            ) : (
              <GroupPhoto size={64} />
            )}
          </button>
          <button type="button" onClick={() => (photo ? setPhoto(null) : fileRef.current?.click())} className="tap" style={{ minHeight: 24, fontSize: textPx(11.5), fontWeight: 700, color: photo ? INK.chS : INK.prDeep }}>
            {photo ? "Remove" : "Add photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={GROUP_PHOTO_ACCEPT}
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              setPhoto(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </span>
        <div className="flex-1 min-w-0">
          <FieldLabel htmlFor="gname">Group name</FieldLabel>
          <input id="gname" value={name} maxLength={GROUP_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Strength Group" style={FIELD} className="focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <FieldLabel htmlFor="gdesc">Description (optional)</FieldLabel>
      <textarea
        id="gdesc"
        value={desc}
        rows={2}
        maxLength={GROUP_DESCRIPTION_MAX}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="What the group is for"
        className="w-full rounded-[12px] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-charcoal-faint"
        style={{ fontSize: textPx(14), background: INK.soft, border: `1px solid ${INK.b10}`, color: INK.ch }}
      />
      {photo && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>Members see the photo once our team approves it.</p>}
      <p style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.chS, margin: "14px 0 6px" }}>Invite · {clientsWord(n)}</p>
      <GroupPicker clients={clients} selected={picked} onToggle={toggle} />
      <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 6 }}>Only your hired clients can be invited. Accounts under 18 can't join groups.</p>
      {error && (
        <p role="alert" className="rounded-xl" style={{ fontSize: textPx(12), color: INK.hi, background: INK.hiBg, padding: "10px 14px", marginTop: 12 }}>
          {error}
        </p>
      )}
      <PinnedCta primary={{ label: n > 0 ? `Create and invite ${clientsWord(n)}` : "Create group", onClick: () => void create(), disabled: !trimmed, loading: busy }} />
    </div>
  );
};

/** What didn't go through after creating the group: a name and the reason, in the roster card's look. */
const ReasonList: React.FC<{ rows: { name: string; reason: string }[] }> = ({ rows }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "2px 12px" }}>
    {rows.map((r, i) => (
      <div key={i} style={{ padding: "9px 0", borderTop: i ? `1px solid ${INK.b06}` : undefined }}>
        <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{r.name}</p>
        <p style={{ fontSize: textPx(11.5), color: INK.chF }}>{r.reason}</p>
      </div>
    ))}
  </div>
);

/** v6 MO1.7 K12: the Messages title row (#2-#4) on New group and the broadcast editor. */
export const Header: React.FC<{ title: string; onBack: () => void; className?: string }> = ({ title, onBack, className }) => (
  <MessagesHeader title={title} onBack={onBack} className={className} />
);

/** ui.js field: 40 tall, r12, soft fill, 1px 10% border, pad 0 12, 14 text. */
const FIELD: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${INK.b10}`,
  padding: "0 12px",
  fontSize: textPx(14),
  color: INK.ch,
};

const FieldLabel: React.FC<{ htmlFor: string; bare?: boolean; children: React.ReactNode }> = ({ htmlFor, bare, children }) => (
  <label htmlFor={htmlFor} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: bare ? 0 : 6 }}>
    {children}
  </label>
);

/** gPhoto16: the group photo placeholder, striped soft / card, 1px 10% border. */
export const GroupPhoto: React.FC<{ size: number }> = ({ size }) => (
  <span
    aria-hidden
    className="flex shrink-0"
    style={{ width: size, height: size, borderRadius: 9999, border: `1px solid ${INK.b10}`, background: `repeating-linear-gradient(45deg, ${INK.soft} 0 5px, ${INK.card} 5px 10px)` }}
  />
);

/**
 * picker16 (MO27): "Search your clients" (the field with a 15 / 2 search
 * glyph), 8 below, then the roster card (card fill, 1px card border, r16, pad
 * 2 12): rows pad 9 0, gap 12, the 36 avatar, 14 / 600 name, a 22 r7 box
 * (2px primary.deep border, filled when picked, check 13 / 3). People in
 * `disabled` show at 55% with "In the group" (11.5 / 700 text.faint).
 */
export const GroupPicker: React.FC<{
  clients: PickableClient[];
  selected: Set<string>;
  onToggle: (userId: string) => void;
  disabled?: Set<string>;
}> = ({ clients, selected, onToggle, disabled }) => {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...clients].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !term || c.name.toLowerCase().includes(term));
  }, [clients, q]);

  if (clients.length === 0) {
    return <p style={{ fontSize: textPx(13), color: INK.chF, textAlign: "center", padding: "24px 0" }}>You don't have any connected clients yet.</p>;
  }
  return (
    <div className="flex flex-col">
      <label className="flex items-center" style={{ ...FIELD, gap: 8 }}>
        <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
        <span className="sr-only">Search your clients</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your clients" className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint" style={{ fontSize: textPx(14), color: INK.ch }} />
      </label>
      <div style={{ height: 8 }} />
      {shown.length === 0 ? (
        <p style={{ fontSize: textPx(13), color: INK.chF, textAlign: "center", padding: "18px 0" }}>No clients match.</p>
      ) : (
        <div role="group" aria-label="Your clients" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "2px 12px" }}>
          {shown.map((c, i) => {
            const fixed = disabled?.has(c.userId) ?? false;
            const on = !fixed && selected.has(c.userId);
            return (
              <button
                key={c.userId}
                type="button"
                role="checkbox"
                aria-checked={fixed || on}
                disabled={fixed}
                onClick={() => onToggle(c.userId)}
                className="tap w-full flex items-center text-left"
                style={{ gap: 12, padding: "9px 0", minHeight: 44, borderTop: i ? `1px solid ${INK.b06}` : undefined, opacity: fixed ? 0.55 : 1 }}
              >
                <Avatar name={c.name} url={c.avatarUrl} size={36} />
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                  {c.name}
                </span>
                {fixed ? (
                  <span className="shrink-0" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.chF }}>
                    In the group
                  </span>
                ) : (
                  <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.prDeep : "transparent" }}>
                    {on && <Check size={13} strokeWidth={3} style={{ color: INK.card }} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
