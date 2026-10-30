import React, { useRef, useState } from "react";
import { Calendar, Camera, FileCheck, FileText, FolderOpen, IdCard, RotateCcw, ScrollText, Trash2, Truck, type LucideIcon } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { ageFromDateOfBirth, isoDateYearsAgo, MAX_AGE, MIN_AGE, validateDateOfBirth } from "../../../utils/date";
import { BizFrame } from "./BizFrame";
import { BizDocCard, BizUpload, type UploadState } from "./ui";
import { ObSectionLabel } from "../shell";
import { docCardLines, type PolicyDoc } from "./lanes";
import { docsFor, emptySlot, type UploadSlot } from "./draft";
import { removeVerificationFile, uploadVerificationFile } from "../../../services/business-onboarding";
import type { LaneStepProps } from "./laneTypes";
import { t, tk, tn } from "../../../i18n/core";

// OB-228 / 262 / 291 (+ 230 / 264 waiver preview, 231 verification, 265 ID
// photo blurry, 293 returns preview): Step 4 · Policies and verification.
// The owner's date of birth moved here from DobStep (HANDOVER 5), with its
// 16+ rule and lock (KEEP-SAFETY).
//
// Verification files (B5 + Database 20261120040000): the private
// business-verification bucket, <owner_uid>/<verification_id>/<file>. The
// onboarding account is the owner. Each row uploads with byte progress; an
// uploaded row opens Take a photo / Choose a file / Remove file; an ID photo
// is checked for blur first (OB-265), and the same row flagged twice in a row
// is accepted (services/business-onboarding/blur.ts).

const DOC_ICON: Record<PolicyDoc["icon"], LucideIcon> = {
  "file-check": FileCheck,
  "file-text": FileText,
  "scroll-text": ScrollText,
  "rotate-ccw": RotateCcw,
  truck: Truck,
};

type SlotKey = "proof" | "idFront" | "idBack";
const SLOTS: { key: SlotKey; title: string; icon: LucideIcon }[] = [
  { key: "proof", title: tk("Proof of business"), icon: FileText },
  { key: "idFront", title: tk("Owner ID, front"), icon: IdCard },
  { key: "idBack", title: tk("Owner ID, back"), icon: IdCard },
];

const sizeLabel = (n: number | null) =>
  n == null ? "" : n >= 1024 * 1024 ? t("{n} MB", { n: (n / 1024 / 1024).toFixed(1) }) : t("{n} KB", { n: Math.max(1, Math.round(n / 1024)) });


export const PoliciesStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save, uid, dob, setDob, dobLocked, online }) => {
  const lane = biz.lane ?? "gym";
  const docs = docsFor(biz);
  const [preview, setPreview] = useState<PolicyDoc | null>(null);
  const [edit, setEdit] = useState<{ doc: PolicyDoc; text: string } | null>(null);
  const [busy, setBusy] = useState<{ key: SlotKey; name: string; progress: number } | null>(null);
  const [slotError, setSlotError] = useState<Partial<Record<SlotKey, { message: string; sub: string; blurry: boolean }>>>({});
  const [flaggedBlurry, setFlaggedBlurry] = useState<Partial<Record<SlotKey, boolean>>>({});
  const [menu, setMenu] = useState<{ key: SlotKey; anchor: HTMLElement } | null>(null);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<SlotKey>("proof");

  const dobProblem = dob ? validateDateOfBirth(dob) : null;
  const dobOk = !!dob && !dobProblem;
  const uploadsDone = SLOTS.every((s) => !!biz[s.key].path);
  const canContinue = dobOk && uploadsDone && !busy;

  const onFile = async (file: File | undefined) => {
    if (!file || busy) return;
    const key = pickFor.current;
    if (!uid) return;
    if (!online) {
      setSlotError((e) => ({ ...e, [key]: { message: t("Connect to the internet to upload."), sub: file.name, blurry: false } })); // OURS
      return;
    }
    // The submission these files are grouped under, made on the first upload.
    const verificationId = biz.verificationId ?? crypto.randomUUID();
    const previous = biz[key].path;
    setBusy({ key, name: file.name, progress: 0 });
    setSlotError((e) => ({ ...e, [key]: undefined }));
    const res = await uploadVerificationFile({
      ownerUid: uid,
      verificationId,
      file,
      checkBlur: key !== "proof",
      acceptBlurry: !!flaggedBlurry[key],
      onProgress: (p) => setBusy((b) => (b && b.key === key ? { ...b, progress: p } : b)),
    });
    setBusy(null);
    if (!res.ok) {
      const blurry = res.code === "BLURRY";
      setFlaggedBlurry((m) => ({ ...m, [key]: blurry }));
      setSlotError((e) => ({ ...e, [key]: { message: t(res.message), sub: blurry ? t("{file} · blurry", { file: file.name }) : file.name, blurry } }));
      return;
    }
    setFlaggedBlurry((m) => ({ ...m, [key]: false }));
    const slot: UploadSlot = { path: res.value.path, fileName: res.value.name, sizeBytes: res.value.size };
    setBiz((b) => ({ ...b, verificationId: b.verificationId ?? verificationId, [key]: slot }));
    // The file it replaces, if it was part of this (unsubmitted) submission.
    void removeVerificationFile(previous, verificationId);
  };

  const removeFile = (key: SlotKey) => {
    void removeVerificationFile(biz[key].path, biz.verificationId);
    setBiz((b) => ({ ...b, [key]: emptySlot() }));
    setSlotError((e) => ({ ...e, [key]: undefined }));
  };

  const docStatus = (d: PolicyDoc, i: number): "Ready" | "Template" | "Edited" =>
    biz.docEdits[d.kind] ? "Edited" : used.has(d.kind) || i === 0 ? "Ready" : "Template";

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title={t("Policies and verification")}
      subtitle={t("What clients accept before they book, and a quick check that you own the business.")}
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? t("Try again") : t("Continue"),
        onClick: () => canContinue && onContinue(),
        disabled: !canContinue,
        busy: save.busy,
        error: save.error ?? undefined,
        errorTone: save.offline ? "info" : "error",
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
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <PopupMenu
            open={!!menu}
            onClose={() => setMenu(null)}
            anchor={menu?.anchor ?? null}
            heading={t(SLOTS.find((s) => s.key === menu?.key)?.title ?? "")}
            align="right"
            width={200}
            options={[
              { value: "camera", label: t("Take a photo"), icon: <Camera size={15} strokeWidth={2.2} /> },
              { value: "file", label: t("Choose a file"), icon: <FolderOpen size={15} strokeWidth={2.2} /> },
              { value: "remove", label: t("Remove file"), icon: <Trash2 size={15} strokeWidth={2.2} />, destructive: true },
            ]}
            onSelect={(v) => {
              const key = menu?.key;
              setMenu(null);
              if (!key) return;
              pickFor.current = key;
              if (v === "camera") cameraRef.current?.click();
              else if (v === "file") fileRef.current?.click();
              else removeFile(key);
            }}
          />
          <BottomSheet
            open={!!preview}
            onClose={() => setPreview(null)}
            title={preview ? t(preview.title) : ""}
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
                {preview && biz.docEdits[preview.kind] ? t("Use this document") : t("Use this template")}
              </button>
            }
          >
            {preview && (
              <div className="rounded-[14px] bg-surface-raised border border-list-rule py-[14px] px-4 text-[13px] leading-5 text-charcoal-soft mb-3">
                {/* The document's own text (the stored body; templates stay English, see lanes.ts policyDocs). */}
                {preview.lines.map((line, i) => (
                  <p key={i} className={i === 0 ? "font-extrabold text-charcoal mb-2" : i === 1 ? "font-extrabold mb-1" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </BottomSheet>
          <BottomSheet
            open={!!edit}
            onClose={() => setEdit(null)}
            title={edit ? t("Edit {doc}", { doc: t(edit.doc.title).toLowerCase() }) : ""}
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
                {t("Save")}
              </button>
            }
          >
            {edit && (
              <>
                <p className="text-[12px] leading-[17px] text-charcoal-soft mb-3">{t("Clients see this before they book. Start lines with • for a bullet.")}</p>
                <textarea
                  aria-label={t(edit.doc.title)}
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
      <ObSectionLabel title={lane === "store" ? t("Store policies") : t("Documents")} margin="0 2px 12px" />
      {docs.map((d, i) => (
        <BizDocCard
          key={d.kind}
          icon={DOC_ICON[d.icon]}
          title={t(d.title)}
          sub={t(d.sub)}
          status={docStatus(d, i)}
          lines={docCardLines(d)}
          onPreview={() => setPreview(d)}
          onEdit={() => setEdit({ doc: d, text: d.lines.join("\n") })}
        />
      ))}
      <ObSectionLabel title={t("Verification")} tag={t("Clients never see these")} margin="14px 2px 12px" />
      {SLOTS.map((s) => {
        const slot = biz[s.key];
        const err = slotError[s.key];
        const up = busy?.key === s.key ? busy : null;
        const state: UploadState = up ? "busy" : err ? "err" : slot.path ? "done" : "empty";
        return (
          <BizUpload
            key={s.key}
            icon={s.icon}
            title={t(s.title)}
            sub={
              up
                ? `${up.name} · ${Math.round(up.progress * 100)}%`
                : err
                ? err.sub
                : slot.path
                ? `${slot.fileName ?? t("file")} · ${sizeLabel(slot.sizeBytes)}`
                : t("Take a photo or upload a file")
            }
            state={state}
            progress={up?.progress}
            error={err?.message}
            retryLabel={err?.blurry ? "Retake" : "Retry"}
            onPick={(anchor) => {
              if (busy) return;
              pickFor.current = s.key;
              if (slot.path && !err) setMenu({ key: s.key, anchor });
              else fileRef.current?.click();
            }}
          />
        );
      })}
      {/* Owner's date of birth (isField with the calendar icon): the account's own, 16+, locked once saved. */}
      <div className="mb-[14px]">
        <div className="flex items-center justify-between mb-[6px]">
          <label htmlFor="ob-owner-dob" className="text-[12px] font-bold text-charcoal-soft">
            {t("Owner's date of birth")}
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
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] leading-[22px] text-charcoal [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:end-0"
          />
          <Calendar size={16} strokeWidth={2} className="text-charcoal-faint shrink-0 pointer-events-none" aria-hidden />
        </div>
        <p
          id="ob-owner-dob-help"
          role={dobProblem ? "alert" : undefined}
          className={dobProblem ? "mt-[6px] text-[11.5px] leading-[15px] font-semibold text-status-high" : "mt-[6px] text-[11.5px] leading-[15px] font-medium text-charcoal-faint"}
        >
          {dobProblem
            ? t(dobProblem)
            : dobOk
            ? tn(ageFromDateOfBirth(dob) ?? 0, "{n} years old. Every Centium account needs one.", "{n} years old. Every Centium account needs one.")
            : t("Required. It can't be changed later without contacting support.")}
        </p>
      </div>
    </BizFrame>
  );
};
