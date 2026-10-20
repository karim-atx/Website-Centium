import React, { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Search, Send } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { ChipRow } from "../insights/parts";
import { STAGE_LABEL, fetchClientStages, type StageRow } from "../../../services/pro/clients";
import { REASON_MAX, referClient, type CareLink, type Colleague } from "../../../services/pro/careNetwork";
import { COLLEAGUE_FILTERS, firstName, matchesFilter, typeLabel, type ColleagueFilter } from "./careModel";

const OFFLINE = "You're offline. Try again when you're connected.";
const TONES = ["pr", "teal", "gold", "sky"] as const;

/** The search well (referStep15 field with the 15 search glyph). */
const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8 }}>
    <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
    <span className="sr-only">{placeholder}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint" style={{ fontSize: textPx(14), color: INK.ch }} />
  </label>
);

/** A pick row (referStep15 pick): pad 10 12, r14, 1px border, primary pale when chosen; avatar 38, 14 / 700, 12 text.faint, the 20 radio. */
const Pick: React.FC<{ name: string; line: string; on: boolean; tone: (typeof TONES)[number]; url?: string | null; onClick: () => void }> = ({ name, line, on, tone, url, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onClick}
    className="tap w-full flex items-center text-left"
    style={{ gap: 12, padding: "10px 12px", borderRadius: 14, border: `1px solid ${on ? INK.pr : INK.b10}`, background: on ? INK.prPale : INK.card, marginBottom: 8 }}
  >
    <Avatar name={name} url={url} size={38} tone={tone} />
    <span className="flex-1 min-w-0">
      <span className="block truncate" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
        {name}
      </span>
      <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
        {line}
      </span>
    </span>
    <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20, borderRadius: 9999, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}` }}>
      {on && <span style={{ width: 10, height: 10, borderRadius: 9999, background: INK.prDeep }} />}
    </span>
  </button>
);

/**
 * Release 3 · MO7 v3 Refer a client (gen/r15.js referStep15): the bottom
 * sheet with the three-step bar (4 high r9999 bars, gap 6; the step labels
 * 10.5 / 700, primary.deep up to the current one); 1 Client (search your
 * clients, pick rows: avatar 38, the stage), 2 Colleague (search, the type
 * chips, colleagues in your care network: refer_client takes only a linked
 * colleague), 3 the note (Back / Send referral).
 * "What to share" switches aren't drawn: a referral passes nothing of the
 * client's data on (refer_client takes the client, the colleague and the
 * note), and the receiver sees nothing until the client agrees (CU23). The
 * step says that plainly instead.
 */
export const ReferSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  links: CareLink[];
  colleagues: Record<string, Colleague>;
  onSent: (text: string) => void;
}> = ({ open, onClose, links, colleagues, onSent }) => {
  const { professionalClients } = useApp();
  const online = useOnline();
  const noteId = useId();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");
  const [client, setClient] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<ColleagueFilter>("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setQ("");
    setClient(null);
    setTo(null);
    setFilter("all");
    setNote("");
    setErr(null);
    let live = true;
    void fetchClientStages().then((r) => live && r.ok && setStages(r.data));
    return () => {
      live = false;
    };
  }, [open]);

  const clients = useMemo(
    () =>
      professionalClients
        .filter((c): c is typeof c & { clientId: string } => !!c.clientId)
        .map((c) => ({ id: c.clientId, name: c.name, url: c.avatarUrl ?? null, stage: stages.find((s) => s.clientId === c.clientId)?.stage ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [professionalClients, stages]
  );
  const network = links.filter((l) => l.status === "accepted").map((l) => ({ id: l.other, c: colleagues[l.other] ?? null }));
  const term = q.trim().toLowerCase();
  const shownClients = clients.filter((c) => !term || c.name.toLowerCase().includes(term));
  const shownColleagues = network.filter((x) => matchesFilter(x.c?.type ?? null, filter) && (!term || (x.c?.name ?? "").toLowerCase().includes(term)));
  const chosen = clients.find((c) => c.id === client) ?? null;
  const pro = to ? colleagues[to] ?? null : null;
  const cFirst = firstName(chosen?.name) || "Your client";
  const pFirst = firstName(pro?.name) || "your colleague";

  const goStep = (n: number) => {
    setQ("");
    setStep(n);
  };
  const send = async () => {
    if (!client || !to || busy) return;
    if (!note.trim()) return setErr(`Add a note for ${pFirst}.`);
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    setErr(null);
    const r = await referClient(client, to, note);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSent(`Referral sent. ${cFirst} confirms before ${pFirst} sees anything.`);
  };

  const steps = ["Client", "Colleague", "Your note"];
  const footer =
    step === 0 ? (
      <CtaButton className="flex-1" size="sheet" icon={<ArrowRight size={15} />} label="Next" disabled={!client} onClick={() => goStep(1)} />
    ) : (
      <div className="flex w-full" style={{ gap: 8 }}>
        <CtaButton className="flex-1" size="sheet" variant="secondary" label="Back" onClick={() => goStep(step - 1)} />
        {step === 1 ? (
          <CtaButton className="flex-1" size="sheet" icon={<ArrowRight size={15} />} label="Next" disabled={!to} onClick={() => goStep(2)} />
        ) : (
          <CtaButton className="flex-1" size="sheet" icon={<Send size={15} />} label="Send referral" loading={busy} disabled={!note.trim()} onClick={() => void send()} />
        )}
      </div>
    );

  return (
    <BottomSheet open={open} onClose={onClose} title="Refer a client" footer={footer}>
      <div className="flex" style={{ gap: 6, marginBottom: 14 }} aria-label={`Step ${step + 1} of 3`}>
        {steps.map((s, i) => (
          <span key={s} className="flex-1 min-w-0">
            <span className="block" style={{ height: 4, borderRadius: 9999, background: i <= step ? INK.prDeep : INK.soft }} />
            <span className="block truncate" style={{ fontSize: textPx(10.5), fontWeight: 700, color: i === step ? INK.prDeep : INK.chF, marginTop: 5 }}>{`${i + 1} · ${s}`}</span>
          </span>
        ))}
      </div>
      {step === 0 && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Search your clients" />
          <div style={{ height: 10 }} />
          <div role="radiogroup" aria-label="Client">
            {shownClients.length === 0 ? (
              <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{clients.length ? "No clients match." : "You have no clients to refer yet."}</p>
            ) : (
              shownClients.map((c, i) => <Pick key={c.id} name={c.name} url={c.url} line={c.stage ? STAGE_LABEL[c.stage] : "Client"} on={client === c.id} tone={TONES[i % 4]} onClick={() => setClient(c.id)} />)
            )}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Search colleagues" />
          <div style={{ height: 10 }} />
          <ChipRow label="Colleague type" items={COLLEAGUE_FILTERS} active={filter} onChange={(k) => setFilter(k as ColleagueFilter)} />
          <div role="radiogroup" aria-label="Colleague">
            {network.length === 0 ? (
              <p style={{ fontSize: textPx(12.5), color: INK.chF, lineHeight: 1.5 }}>Your care network is empty. Add colleagues in Network first; you can refer only to them.</p>
            ) : shownColleagues.length === 0 ? (
              <p style={{ fontSize: textPx(12.5), color: INK.chF }}>No colleagues match.</p>
            ) : (
              shownColleagues.map((x, i) => (
                <Pick key={x.id} name={x.c?.name ?? "A colleague"} url={x.c?.avatarUrl} line={`${typeLabel(x.c?.type)} · in your network`} on={to === x.id} tone={TONES[(i + 1) % 4]} onClick={() => setTo(x.id)} />
              ))
            )}
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 10 }}>{`${cFirst} confirms before ${pFirst} sees anything. A referral passes on only your note; ${cFirst} chooses what to share with ${pFirst} later.`}</p>
          <label htmlFor={noteId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            {`Note to ${pFirst}`}
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={REASON_MAX}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full outline-none resize-none focus:border-primary"
            style={{ borderRadius: 12, background: INK.soft, border: `1px solid ${note ? INK.pr : INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, lineHeight: 1.45 }}
          />
          <p className="text-right" style={{ fontSize: textPx(11), color: INK.chF, marginTop: 4 }}>{`${note.length} / ${REASON_MAX}`}</p>
        </>
      )}
      {err && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 10 }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};
