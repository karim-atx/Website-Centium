import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Search, Send, Share } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { suggestCourse, type CourseCard } from "../../../services/pro/courses";
import { fetchEnrolledClients } from "../../../services/courses/extras";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { Field, FieldError, Label } from "./courseUi";
import { siteHref } from "../../../config/site";

const courseUrl = (id: string) => siteHref(`/app/forum/courses/${id}`);

/**
 * Release 3 · W6 MO28 "6 Published, share and suggest" (cAssign18), opened
 * from a published course's Share button:
 * - the link (44 high, r12, soft, 13 text.soft) and the copy button (44,
 *   r12, fill, copy 17 on-fill); the course's page in the app is the link;
 * - "Suggest it to clients": search, then the roster (picker16: card r16 pad
 *   2 12; rows gap 12 pad 9 0, 36 avatar, 14 / 600, 11.5 text.faint; 22 r7
 *   check boxes in primary.deep);
 * - footer Share (secondary, the device's share sheet or copy) and "Send to
 *   {n} clients": each client gets a course recommendation card in their
 *   chat (start_message_thread, send_recommendation 'course').
 * Round D (course_enrolled_clients): a client already enrolled shows
 * "Already enrolled" under their name (11.5 text.faint) and isn't offered.
 */
export const ShareCourseSheet: React.FC<{ course: CourseCard; onClose: () => void; onSent: (n: number) => void }> = ({ course, onClose, onSent }) => {
  const { professionalClients } = useApp();
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Set<string>>(() => new Set());
  const url = courseUrl(course.id);
  useEffect(() => {
    let live = true;
    void fetchEnrolledClients(course.id).then((s) => live && setEnrolled(s));
    return () => {
      live = false;
    };
  }, [course.id]);

  const roster = useMemo(
    () => professionalClients.filter((c) => !!c.clientId).filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [professionalClients, query]
  );

  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    const data = { title: course.title, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch {
        /* closed */
      }
      return;
    }
    copy();
  };
  const send = async () => {
    if (busy || !picked.length) return;
    setBusy(true);
    setError(null);
    let sent = 0;
    for (const id of picked) {
      const r = await suggestCourse(id, course);
      if (!r.ok) {
        setError(r.message);
        break;
      }
      sent += 1;
    }
    setBusy(false);
    if (sent) onSent(sent);
    if (sent === picked.length) onClose();
    else setPicked((p) => p.slice(sent));
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`Share ${course.title}`}
      size="tall"
      footer={
        <div className="flex w-full" style={{ gap: 8 }}>
          <CtaButton variant="secondary" label="Share" icon={<Share size={15} strokeWidth={2} aria-hidden />} onClick={() => void share()} />
          <CtaButton
            label={`Send to ${picked.length} ${picked.length === 1 ? "client" : "clients"}`}
            icon={<Send size={15} strokeWidth={2} aria-hidden />}
            disabled={!picked.length}
            loading={busy}
            onClick={() => void send()}
          />
        </div>
      }
    >
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <span className="flex-1 min-w-0 flex items-center overflow-hidden whitespace-nowrap" style={{ height: 44, borderRadius: 12, background: INK.soft, padding: "0 12px", fontSize: textPx(13), color: INK.chS }}>
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        </span>
        <button type="button" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"} className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: INK.fill }}>
          {copied ? <Check size={17} strokeWidth={2} aria-hidden style={{ color: INK.onFill }} /> : <Copy size={17} strokeWidth={2} aria-hidden style={{ color: INK.onFill }} />}
        </button>
      </div>
      <Label mt={0}>Suggest it to clients</Label>
      <Field id="share-search" ariaLabel="Search your clients" value={query} onChange={setQuery} placeholder="Search your clients" lead={<Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />} />
      <div style={{ height: 8 }} />
      {roster.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{professionalClients.length ? "No clients match." : "Clients you work with appear here."}</p>
      ) : (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "2px 12px" }} role="group" aria-label="Your clients">
          {roster.map((c, i) => {
            const on = picked.includes(c.clientId!);
            const already = enrolled.has(c.clientId!);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={already}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.clientId) : [...p, c.clientId!]))}
                className="tap w-full flex items-center text-left disabled:cursor-default"
                style={{ gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${INK.b06}` : undefined }}
              >
                <Avatar name={c.name} url={c.avatarUrl} size={36} />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                    {c.name}
                  </span>
                  {already && <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>Already enrolled</span>}
                </span>
                {!already && (
                  <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.prDeep : "transparent" }}>
                    {on && <Check size={13} strokeWidth={3} aria-hidden style={{ color: INK.card }} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {error && <FieldError mt={10}>{error}</FieldError>}
    </BottomSheet>
  );
};
