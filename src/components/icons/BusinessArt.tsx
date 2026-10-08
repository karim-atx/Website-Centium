import React from "react";
import { BRAND_C, BRAND_LEAF, MARK_LEAF_PATH } from "./CentiumMark";

// v6 Business UI art (TK 4.2): the leaf compositions and the business-type,
// store-type and professional-type drawings from handoff/icons/ (17 drawings,
// 31 files: every *-dark.svg differs from its light file only in the colours
// mapped below, checked element by element when this file was generated).
// Shapes, transforms and opacities are the files' own, verbatim; the C2PA
// <metadata> is dropped. Colours, so the art follows the five themes and dark:
// - #8F68F6 (mark)  -> --c-brand-c    (BRAND_C)
// - #8AC4BA (leaf)  -> --c-brand-leaf (BRAND_LEAF)
// - #AEA1DC light / #C3B3FB dark (lavender) -> th-aea1dc / dark:th-c3b3fb
// - the "holes" (store-clothing #FFFFFF / #1C1F28; store-mealprep and
//   pro-dietitian #F0EDF9 / #303141) -> the `ground` prop, defaulting to the
//   token of the surface each one is drawn on (cream card / primary pale), so a
//   hole always matches whatever the art sits on; pass the real ground when a
//   caller places the art on something else.
// The Centium mark itself (centium-mark.svg = centium-mark-dark.svg) is
// CentiumMark; the nav-* glyphs are BusinessNavGlyphs.

interface ArtProps {
  /** Rendered height in px; the width follows the viewBox. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}
interface GroundProps {
  /** Colour of the cut-out hole: the surface the art sits on. */
  ground?: string;
}

const MARK = BRAND_C;
const LEAF = BRAND_LEAF;
const LEAF_PATH = MARK_LEAF_PATH;
const CARD_GROUND = "rgb(var(--c-cream-card))";
const PALE_GROUND = "rgb(var(--c-primary-pale))";

const Art: React.FC<ArtProps & { viewBox: string; children: React.ReactNode }> = ({ viewBox, size = 100, className, style, children }) => {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return (
    <svg
      viewBox={viewBox}
      width={(size * w) / h}
      height={size}
      fill="none"
      aria-hidden
      className={className}
      style={{ display: "block", flex: "none", ...style }}
    >
      {children}
    </svg>
  );
};

// handoff/icons/centium-leaf.svg
export const CentiumLeafArt: React.FC<ArtProps> = ({ size = 40, className, style }) => (
  <Art viewBox="560 530 380 365" size={size} className={className} style={style}>
    <path d={LEAF_PATH} fill={LEAF} />
  </Art>
);

// handoff/icons/leaf-personal.svg
export const LeafPersonalArt: React.FC<ArtProps> = ({ size = 40, className, style }) => (
  <Art viewBox="540 520 420 400" size={size} className={className} style={style}>
    <path d={LEAF_PATH} fill={LEAF} />
  </Art>
);

// handoff/icons/leaf-professional.svg
export const LeafProfessionalArt: React.FC<ArtProps> = ({ size = 40, className, style }) => (
  <Art viewBox="190 520 770 400" size={size} className={className} style={style}>
    <path d={LEAF_PATH} fill={LEAF} />
    <path d={LEAF_PATH} fill={MARK} transform="translate(1150 0) scale(-1 1)" />
  </Art>
);

// handoff/icons/leaf-business.svg + leaf-business-dark.svg
export const LeafBusinessArt: React.FC<ArtProps> = ({ size = 40, className, style }) => (
  <Art viewBox="200 470 760 450" size={size} className={className} style={style}>
    <path d={LEAF_PATH} fill={LEAF} />
    <path d={LEAF_PATH} transform="rotate(-45 575 884)" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <path d={LEAF_PATH} fill={MARK} transform="rotate(-90 575 884)" />
  </Art>
);

// handoff/icons/type-classes.svg + type-classes-dark.svg
export const TypeClassesArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="14" y="80" width="72" height="2" rx="1" opacity="0.7" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(26 79) scale(0.075) rotate(-45) translate(-566 -884)" />
    <path d={LEAF_PATH} fill={MARK} transform="translate(50 79) scale(0.1) rotate(-45) translate(-566 -884)" />
    <path d={LEAF_PATH} transform="translate(74 79) scale(0.075) rotate(-45) translate(-566 -884)" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
  </Art>
);

// handoff/icons/type-gym.svg + type-gym-dark.svg
export const TypeGymArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="12" y="80" width="76" height="2" rx="1" opacity="0.7" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="14" y="62" width="72" height="3.5" rx="1.75" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="20" y="52" width="7" height="24" rx="2.5" fill={MARK} />
    <rect x="73" y="52" width="7" height="24" rx="2.5" fill={MARK} />
    <rect x="28" y="56" width="4" height="16" rx="1.5" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="68" y="56" width="4" height="16" rx="1.5" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 62) scale(0.085) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/type-store.svg + type-store-dark.svg
export const TypeStoreArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="14" y="48" width="72" height="2.5" rx="1.25" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="14" y="80" width="72" height="2.5" rx="1.25" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="22" y="31" width="13" height="17" rx="3.5" fill={MARK} opacity="0.85" />
    <rect x="39" y="36" width="11" height="12" rx="3" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="56" y="66" width="14" height="14" rx="3.5" fill={MARK} opacity="0.6" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(64 48) scale(0.055) rotate(-45) translate(-566 -884)" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(30 80) scale(0.06) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-clothing.svg + store-clothing-dark.svg
export const StoreClothingArt: React.FC<ArtProps & GroundProps> = ({ size = 100, className, style, ground = CARD_GROUND }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="30" y="30" width="40" height="50" rx="10" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <circle cx="50" cy="42" r="5" fill={ground} />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 76) scale(0.06) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-equipment.svg + store-equipment-dark.svg
export const StoreEquipmentArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="26" y="56" width="48" height="5" rx="2.5" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="18" y="44" width="10" height="29" rx="3" fill={MARK} />
    <rect x="72" y="44" width="10" height="29" rx="3" fill={MARK} />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 56) scale(0.055) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-general.svg + store-general-dark.svg
export const StoreGeneralArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="28" y="40" width="44" height="40" rx="9" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <circle cx="50" cy="40" r="11" stroke={MARK} strokeWidth="4" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 72) scale(0.06) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-mealprep.svg + store-mealprep-dark.svg
export const StoreMealprepArt: React.FC<ArtProps & GroundProps> = ({ size = 100, className, style, ground = PALE_GROUND }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <circle cx="50" cy="58" r="30" strokeWidth="3" className="stroke-th-aea1dc dark:stroke-th-c3b3fb" />
    <circle cx="50" cy="58" r="19" fill={ground} />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(48 70) scale(0.065) rotate(-45) translate(-566 -884)" />
    <path d={LEAF_PATH} fill={MARK} transform="translate(56 70) scale(0.05) rotate(-90) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-supplement.svg + store-supplement-dark.svg
export const StoreSupplementArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="24" y="40" width="26" height="22" rx="11" fill={MARK} transform="rotate(-30 50 51)" />
    <rect x="48" y="40" width="28" height="22" rx="11" transform="rotate(-30 50 51)" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(62 82) scale(0.05) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/store-wellness.svg + store-wellness-dark.svg
export const StoreWellnessArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <circle cx="50" cy="52" r="32" strokeWidth="2.5" className="stroke-th-aea1dc dark:stroke-th-c3b3fb" />
    <circle cx="50" cy="52" r="21" stroke={MARK} strokeWidth="2.5" opacity="0.7" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 66) scale(0.065) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/pro-dietitian.svg + pro-dietitian-dark.svg
export const ProDietitianArt: React.FC<ArtProps & GroundProps> = ({ size = 100, className, style, ground = PALE_GROUND }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <circle cx="50" cy="58" r="30" strokeWidth="3" className="stroke-th-aea1dc dark:stroke-th-c3b3fb" />
    <circle cx="50" cy="58" r="19" fill={ground} />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(46 72) scale(0.075) rotate(-45) translate(-566 -884)" />
    <path d={LEAF_PATH} fill={MARK} transform="translate(56 72) scale(0.055) rotate(-90) translate(-566 -884)" />
  </Art>
);

// handoff/icons/pro-other.svg + pro-other-dark.svg
export const ProOtherArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <circle cx="50" cy="52" r="32" strokeWidth="2.5" className="stroke-th-aea1dc dark:stroke-th-c3b3fb" />
    <circle cx="50" cy="52" r="21" stroke={MARK} strokeWidth="2.5" opacity="0.7" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 68) scale(0.07) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/pro-physio.svg + pro-physio-dark.svg
export const ProPhysioArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <circle cx="36" cy="50" r="13" stroke={MARK} strokeWidth="4" />
    <circle cx="64" cy="50" r="13" strokeWidth="4" className="stroke-th-aea1dc dark:stroke-th-c3b3fb" />
    <rect x="14" y="80" width="72" height="2" rx="1" opacity="0.7" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 79) scale(0.07) rotate(-45) translate(-566 -884)" />
  </Art>
);

// handoff/icons/pro-trainer.svg + pro-trainer-dark.svg
export const ProTrainerArt: React.FC<ArtProps> = ({ size = 100, className, style }) => (
  <Art viewBox="0 0 100 100" size={size} className={className} style={style}>
    <rect x="22" y="60" width="56" height="5" rx="2.5" className="fill-th-aea1dc dark:fill-th-c3b3fb" />
    <rect x="16" y="48" width="9" height="29" rx="3" fill={MARK} />
    <rect x="75" y="48" width="9" height="29" rx="3" fill={MARK} />
    <path d={LEAF_PATH} fill={LEAF} transform="translate(50 60) scale(0.08) rotate(-45) translate(-566 -884)" />
  </Art>
);
