import React, { useRef, useState } from "react";
import { Calendar, FileCheck, FileText, IdCard, RotateCcw, ScrollText, Truck, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ageFromDateOfBirth, isoDateYearsAgo, MAX_AGE, MIN_AGE, validateDateOfBirth } from "../../../utils/date";
import { BizFrame } from "./BizFrame";
import { BizDocCard, BizUpload, type UploadState } from "./ui";
import { ObSectionLabel } from "../shell";
import { docCardLines, type PolicyDoc } from "./lanes";
import { docsFor, type UploadSlot } from "./draft";
import { uploadVerificationFile } from "../../../services/business-onboarding";
import type { LaneStepProps } from "./laneTypes";

// OB-228 / 262 / 291 (+ 230 / 264 waiver preview, 231 verification, 265 ID
// photo blurry, 293 returns preview): Step 4 · Policies and verification.
// The owner's date of birth moved here from DobStep (HANDOVER 5), with its
// 16+ rule and lock (KEEP-SAFETY).

const DOC_ICON: Record<PolicyDoc["icon"], LucideIcon> = {
  "file-check": FileCheck,
  "file-text": FileText,
  "scroll-text": ScrollText,
  "rotate-ccw": RotateCcw,
  truck: Truck,
};

type SlotKey = "proof" | "idFront" | "idBack";
const SLOTS: { key: SlotKey; title: string; icon: LucideIcon }[] = [
  { key: "proof", title: "Proof of business", icon: FileText },
  { key: "idFront", title: "Owner ID, front", icon: IdCard },
  { key: "idBack", title: "Owner ID, back", icon: IdCard },
];

const sizeLabel = (n: number | null) => (n == null ? "" : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Uploads not open yet (the bucket refused an own-prefix write): a pending state. */
export const VERIFY_PENDING_NOTE = "Verification uploads open soon. We'll ask for these before you go live."; // OURS

export const PoliciesStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save, uid, dob, setDob, dobLocked, online }) => {
  const lane = biz.lane ?? "gym";
  const docs = docsFor(biz);
  const [preview, setPreview] = useState<PolicyDoc | null>(null);
  const [edit, setEdit] = useState<{ doc: PolicyDoc; text: string } | null>(null);
  const [busy, setBusy] = useState<SlotKey | null>(null);
  const [slotError, setSlotError] = useState<Partial<Record<SlotKey, string>>>({});
  const [bucketClosed, setBucketClosed] = useState(false);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<SlotKey>("proof");

  const dobProblem = dob ? validateDateOfBirth(dob) : null;
  const dobOk = !!dob && !dobProblem;
  const uploadsDone = SLOTS.every((s) => !!biz[s.key].path);
  const canContinue = dobOk && (uploadsDone || bucketClosed) && !busy;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const key = pickFor.current;
    if (!uid) return;
    if (!online) {
      setSlotError((e) => ({ ...e, [key]: "Connect to the internet to upload." })); // OURS
      return;
    }
    setBusy(key);
    setSlotError((e) => ({ ...e, [key]: undefined }));
    const res = await uploadVerificationFile(uid, file);
    setBusy(null);
    if (!res.ok) {
      if (res.code === "BUCKET_CLOSED") {
        setBucketClosed(true);
        return;
      }
      setSlotError((e) => ({ ...e, [key]: res.message }));
      return;
    }
    const slot: UploadSlot = { path: res.value.path, fileName: res.value.name, sizeBytes: res.value.size };
    setBiz((b) => ({ ...b, [key]: slot }));
  };

  const docStatus = (d: PolicyDoc, i: number): "Ready" | "Template" | "Edited" =>
    biz.docEdits[d.kind] ? "Edited" : used.has(d.kind) || i === 0 ? "Ready" : "Template";

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title="Policies and verification"
      subtitle="What clients accept before they book, and a quick check that you own the business."
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? "Try again" : "Continue",
        onClick: () => canContinue && onContinue(),
        disabled: !canContinue,
        busy: save.busy,
        error: save.error ?? (bucketClosed ? VERIFY_PENDING_NOTE : undefined),
        errorTone: save.offline || (bucketClosed && !save.error) ? "info" : "error",
      }}
      overlay={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <BottomSheet
            open={!!preview}
            onClose={() => setPreview(null)}
            title={preview?.title ?? ""}
            bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
            footer={
              <button
                type="button"
                onClick={() => {
                  if (preview) setUsed((u) => new Set(u).add(preview.kind));
                  setPreview(null);
                }}
                className="w-full h-[52px] rounded-[16px] bg-primary-fill text-on-primary-fill flex items-center justify-center text-[14px] font-bold"
              >
                {preview && biz.docEdits[preview.kind] ? "Use this document" : "Use this template"}
              </button>
            }
          >
            {preview && (
              <div className="rounded-[14px] bg-surface-raised border border-list-rule py-[14px] px-4 text-[13px] leading-5 text-charcoal-soft mb-3">
                {preview.lines.map((t, i) => (
                  <p key={i} className={i === 0 ? "font-extrabold text-charcoal mb-2" : i === 1 ? "font-extrabold mb-1" : ""}>
                    {t}
                  </p>
                ))}
              </div>
            )}
          </BottomSheet>
          <BottomSheet
            open={!!edit}
            onClose={() => setEdit(null)}
            title={edit ? `Edit ${edit.doc.title.toLowerCase()}` : ""}
            bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
            footer={
              <button
                type="button"
                disabled={!edit?.text.trim()}
                onClick={() => {
                  if (!edit) return;
                  const lines = edit.text.split("\n").map((l) => l.trimEnd()).filter((l, i, a) => l || (i > 0 && a[i - 1]));
                  setBiz((b) => ({ ...b, docEdits: { ...b.docEdits, [edit.doc.kind]: lines } }));
                  setEdit(null);
                }}
                className="w-full h-[52px] rounded-[16px] bg-primary-fill text-on-primary-fill flex items-center justify-center text-[14px] font-bold disabled:opacity-40"
              >
                Save
              </button>
            }
          >
            {edit && (
              <>
                <p className="text-[12px] leading-[17px] text-charcoal-soft mb-3">Clients see this before they book. Start lines with • for a bullet.</p>
                <textarea
                  aria-label={edit.doc.title}
                  value={edit.text}
                  onChange={(e) => setEdit({ ...edit, text: e.target.value.slice(0, 5000) })}
                  rows={10}
                  className="w-full rounded-[14px] bg-surface-raised border border-list-rule py-[14px] px-4 text-[13px] leading-5 text-charcoal outline-none focus:border-brand-c resize-none"
                />
              </>
            )}
          </BottomSheet>
        </>
      }
    >
      <ObSectionLabel title={lane === "store" ? "Store policies" : "Documents"} margin="0 2px 12px" />
      {docs.map((d, i) => (
        <BizDocCard
          key={d.kind}
          icon={DOC_ICON[d.icon]}
          title={d.title}
          sub={d.sub}
          status={docStatus(d, i)}
          lines={docCardLines(d)}
          onPreview={() => setPreview(d)}
          onEdit={() => setEdit({ doc: d, text: d.lines.join("\n") })}
        />
      ))}
      <ObSectionLabel title="Verification" tag="Clients never see these" margin="14px 2px 12px" />
      {SLOTS.map((s) => {
        const slot = biz[s.key];
        const state: UploadState = busy === s.key ? "busy" : slotError[s.key] ? "err" : slot.path ? "done" : "empty";
        return (
          <BizUpload
            key={s.key}
            icon={s.icon}
            title={s.title}
            sub={slot.path ? `${slot.fileName ?? "file"} · ${sizeLabel(slot.sizeBytes)}` : "Take a photo or upload a file"}
            state={state}
            error={slotError[s.key]}
            retryLabel={slotError[s.key] && /blurry/i.test(slotError[s.key]!) ? "Retake" : "Retry"}
            onPick={() => {
              pickFor.current = s.key;
              fileRef.current?.click();
            }}
          />
        );
      })}
      {/* Owner's date of birth (isField with the calendar icon): the account's own, 16+, locked once saved. */}
      <div className="mb-[14px]">
        <div className="flex items-center justify-between mb-[6px]">
          <label htmlFor="ob-owner-dob" className="text-[12px] font-bold text-charcoal-soft">
            Owner's date of birth
          </label>
        </div>
        <div
          className={
            dobProblem
              ? "min-h-[52px] rounded-[16px] bg-cream-card flex items-center gap-[10px] px-4 border-[1.5px] border-status-high"
              : "min-h-[52px] rounded-[16px] bg-cream-card flex items-center gap-[10px] px-4 border border-hair-11 focus-within:border-[1.5px] focus-within:border-brand-c focus-within:shadow-[var(--ob-focus)]"
          }
        >
          <input
            id="ob-owner-dob"
            type="date"
            value={dob}
            min={isoDateYearsAgo(MAX_AGE)}
            max={isoDateYearsAgo(MIN_AGE)}
            readOnly={dobLocked}
            required
            aria-invalid={!!dobProblem}
            aria-describedby="ob-owner-dob-help"
            onChange={(e) => setDob(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] leading-[22px] text-charcoal [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0"
          />
          <Calendar size={16} strokeWidth={2} className="text-charcoal-faint shrink-0 pointer-events-none" aria-hidden />
        </div>
        <p
          id="ob-owner-dob-help"
          role={dobProblem ? "alert" : undefined}
          className={dobProblem ? "mt-[6px] text-[11.5px] leading-[15px] font-semibold text-status-high" : "mt-[6px] text-[11.5px] leading-[15px] font-medium text-charcoal-faint"}
        >
          {dobProblem
            ? dobProblem
            : dobOk
            ? `${ageFromDateOfBirth(dob)} years old. Every Centium account needs one.`
            : "Required. It can't be changed later without contacting support."}
        </p>
      </div>
    </BizFrame>
  );
};
