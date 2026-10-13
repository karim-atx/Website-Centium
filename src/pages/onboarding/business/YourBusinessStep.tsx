import React, { useMemo, useRef, useState } from "react";
import { Camera, Globe, Image as ImageIcon, Mail, Phone, Trash2 } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { BizFrame } from "./BizFrame";
import { BizChips, BizField, stripes } from "./ui";
import { ObMenu, ObSectionLabel } from "../shell";
import {
  categoryLabel,
  categoryOptions,
  coverLabel,
  DESCRIPTION_MAX,
  fixCountLine,
  initials,
  MAX_CATEGORIES,
  NAME_MAX,
  namePlaceholder,
  visibleCategoryChips,
  yourBusinessErrors,
} from "./lanes";
import { imageUrl, removeBusinessImage, saveBusinessBasics, uploadBusinessImage } from "../../../services/business-onboarding";
import type { LaneStepProps } from "./laneTypes";

// OB-218 / 248 / 281 (+ 220 activities menu, 250 contact, 251 field errors,
// 283 cover photo source): Step 1 · Your business.

/** lucide "instagram" (lucide-static dropped brand icons; BU1 §3 Icons). */
const InstagramGlyph: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

type PhotoKind = "cover" | "logo";

export const YourBusinessStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, saveExit, save, uid }) => {
  const lane = biz.lane ?? "gym";
  const [showErrors, setShowErrors] = useState(false);
  const [menu, setMenu] = useState<{ kind: "photo"; photo: PhotoKind; anchor: HTMLElement } | { kind: "cats"; anchor: HTMLElement } | null>(null);
  const [uploading, setUploading] = useState<PhotoKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<PhotoKind>("cover");

  const errors = yourBusinessErrors({ coverPath: biz.coverPath, name: biz.name, phone: biz.phone, email: biz.email, instagram: biz.instagram });
  const errorCount = Object.keys(errors).length;
  const shown = showErrors ? errors : {};
  const cats = categoryOptions(lane, biz.storeType);
  const chips = useMemo(() => visibleCategoryChips(cats.all, cats.shown, biz.categories), [cats.all, cats.shown, biz.categories]);
  const coverUrl = imageUrl("cover", biz.coverPath);
  const logoUrl = imageUrl("logo", biz.logoPath);

  const toggleCategory = (c: string) =>
    setBiz((b) => ({
      ...b,
      categories: b.categories.includes(c) ? b.categories.filter((x) => x !== c) : b.categories.length >= MAX_CATEGORIES ? b.categories : [...b.categories, c],
    }));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const kind = pickFor.current;
    if (!uid) {
      setUploadError("You're signed out. Sign in again to add photos."); // OURS
      return;
    }
    setUploading(kind);
    setUploadError(null);
    // business-covers is written by somebody who may act for the business
    // (may_write_business_file), so the business row has to exist before its
    // first cover: it is created here (inactive, as Continue would) when the
    // cover comes first. Continue then saves the rest of Step 1 onto it.
    if (kind === "cover" && !biz.businessId) {
      const row = await saveBusinessBasics(uid, biz);
      if (!row.ok) {
        setUploading(null);
        setUploadError(row.message);
        return;
      }
      setBiz((b) => ({ ...b, businessId: row.value.id }));
    }
    const res = await uploadBusinessImage(uid, kind, file, kind === "cover" ? biz.coverPath : biz.logoPath);
    setUploading(null);
    if (!res.ok) {
      setUploadError(res.message);
      return;
    }
    setBiz((b) => (kind === "cover" ? { ...b, coverPath: res.value } : { ...b, logoPath: res.value }));
  };

  const continueNow = () => {
    if (errorCount > 0) {
      setShowErrors(true);
      return;
    }
    onContinue();
  };

  const coverErr = !!shown.cover;
  const help = uploadError ?? (coverErr ? shown.cover! : "Square logo, wide cover. Bright, real photos work best.");
  const helpIsError = !!uploadError || coverErr;

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      title="Your business"
      subtitle="This is what clients see first on Explore. Make it feel like you."
      onBack={onBack}
      saveExit={saveExit}
      footer={{
        label: save.error && !save.offline ? "Try again" : "Continue",
        onClick: continueNow,
        disabled: (showErrors && errorCount > 0) || !!uploading,
        busy: save.busy,
        error: showErrors && errorCount > 0 ? fixCountLine(errorCount) : save.error ?? undefined,
        errorTone: save.offline ? "info" : "error",
      }}
      overlay={
        <>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <PopupMenu
            open={menu?.kind === "photo"}
            onClose={() => setMenu(null)}
            anchor={menu?.anchor ?? null}
            heading={menu?.kind === "photo" && menu.photo === "logo" ? "Logo" : "Cover photo"}
            align="right"
            width={200}
            options={[
              { value: "camera", label: "Take a photo", icon: <Camera size={15} strokeWidth={2.2} /> },
              { value: "library", label: "Choose from library", icon: <ImageIcon size={15} strokeWidth={2.2} /> },
              ...((menu?.kind === "photo" && (menu.photo === "cover" ? biz.coverPath : biz.logoPath))
                ? [{ value: "remove", label: "Remove photo", icon: <Trash2 size={15} strokeWidth={2.2} /> }]
                : []),
            ]}
            onSelect={(v) => {
              const kind = menu?.kind === "photo" ? menu.photo : "cover";
              setMenu(null);
              pickFor.current = kind;
              if (v === "camera") cameraRef.current?.click();
              else if (v === "library") fileRef.current?.click();
              else if (uid) {
                void removeBusinessImage(uid, kind, kind === "cover" ? biz.coverPath : biz.logoPath);
                setBiz((b) => (kind === "cover" ? { ...b, coverPath: null } : { ...b, logoPath: null }));
              }
            }}
          />
          {menu?.kind === "cats" && (
            <ObMenu
              title={categoryLabel(lane)}
              anchor={menu.anchor}
              align="left"
              options={cats.all.map((c) => ({ key: c, label: c, on: biz.categories.includes(c), disabled: !biz.categories.includes(c) && biz.categories.length >= MAX_CATEGORIES }))}
              onToggle={(k) => toggleCategory(k)}
              onClose={() => setMenu(null)}
            />
          )}
        </>
      }
    >
      {/* Cover and logo (isMedia) */}
      <div className="mb-[18px]">
        <button
          type="button"
          aria-label="Add a cover photo"
          onClick={(e) => setMenu({ kind: "photo", photo: "cover", anchor: e.currentTarget.querySelector("[data-anchor]") as HTMLElement })}
          className="relative block w-full h-[150px] rounded-[20px] overflow-hidden box-border text-left"
          style={{
            background: coverUrl ? `center / cover no-repeat url("${coverUrl}")` : coverErr ? "rgb(var(--c-cream-card))" : stripes,
            border: coverErr ? "1.5px dashed rgb(var(--c-status-high))" : "none",
          }}
        >
          {!coverUrl && !coverErr && <span className="absolute left-[14px] top-3 font-mono text-[10px] text-charcoal-faint">{coverLabel(lane)}</span>}
          <span
            data-anchor
            className="absolute right-3 bottom-3 h-[34px] px-3 rounded-full bg-cream-card text-primary-dark flex items-center gap-[6px] text-[12px] font-extrabold"
            style={{ boxShadow: "var(--ob-pill-shadow)" }}
          >
            <Camera size={14} strokeWidth={2.2} aria-hidden />
            {uploading === "cover" ? "Uploading…" : biz.coverPath ? "Change cover" : "Add cover"}
          </span>
        </button>
        <div className="flex items-end gap-3 -mt-9 ml-4 relative">
          <button
            type="button"
            aria-label={biz.logoPath ? "Change logo" : "Add a logo"}
            onClick={(e) => setMenu({ kind: "photo", photo: "logo", anchor: e.currentTarget })}
            className="relative w-[76px] h-[76px] rounded-[22px] bg-row-tile text-white flex items-center justify-center text-[22px] font-extrabold box-border shrink-0"
            style={{ boxShadow: "0 0 0 4px rgb(var(--c-cream))" }}
          >
            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover rounded-[22px]" /> : initials(biz.name)}
            <span className="absolute -right-[6px] -bottom-[6px] w-7 h-7 rounded-full bg-cream-card border border-hair-11 text-primary-dark flex items-center justify-center">
              <Camera size={13} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
          <span className={helpIsError ? "pb-1 text-[11.5px] leading-[15px] font-semibold text-status-high text-pretty" : "pb-1 text-[11.5px] leading-[15px] font-medium text-charcoal-faint text-pretty"} role={helpIsError ? "alert" : undefined}>
            {uploading === "logo" ? "Uploading…" : help}
          </span>
        </div>
      </div>

      <BizField
        label="Business name"
        value={biz.name}
        onChange={(v) => setBiz((b) => ({ ...b, name: v }))}
        placeholder={namePlaceholder(lane)}
        maxLength={NAME_MAX}
        autoComplete="organization"
        error={shown.name}
      />
      <BizField
        label="Short description"
        area
        value={biz.description}
        onChange={(v) => setBiz((b) => ({ ...b, description: v.slice(0, DESCRIPTION_MAX) }))}
        maxLength={DESCRIPTION_MAX}
        count={`${biz.description.length} / ${DESCRIPTION_MAX}`}
        help="Say who it's for and what makes you different."
      />
      <BizChips
        label={categoryLabel(lane)}
        tag="Up to 5"
        options={chips}
        selected={biz.categories}
        onToggle={toggleCategory}
        max={MAX_CATEGORIES}
        onMore={(anchor) => setMenu({ kind: "cats", anchor })}
      />
      <ObSectionLabel title="Contact" margin="14px 2px 12px" />
      <BizField
        label="Phone"
        leading={<Phone size={16} aria-hidden />}
        value={biz.phone}
        onChange={(v) => setBiz((b) => ({ ...b, phone: v }))}
        placeholder="+000 00 000 000"
        inputMode="tel"
        type="tel"
        autoComplete="tel"
        error={shown.phone}
      />
      <BizField
        label="Email"
        leading={<Mail size={16} aria-hidden />}
        value={biz.email}
        onChange={(v) => setBiz((b) => ({ ...b, email: v }))}
        placeholder="hello@example.com"
        inputMode="email"
        type="email"
        autoComplete="email"
        error={shown.email}
      />
      <BizField
        label="Instagram"
        tag="Optional"
        leading={<InstagramGlyph />}
        value={biz.instagram}
        onChange={(v) => setBiz((b) => ({ ...b, instagram: v }))}
        placeholder="@yourbusiness"
        error={shown.instagram}
      />
      <BizField
        label="Website"
        tag="Optional"
        leading={<Globe size={16} aria-hidden />}
        value={biz.website}
        onChange={(v) => setBiz((b) => ({ ...b, website: v }))}
        placeholder="e.g. yourbusiness.com"
        inputMode="url"
        autoComplete="url"
      />
    </BizFrame>
  );
};
