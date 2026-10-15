import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, RefreshCcw } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import {
  StoreClothingArt,
  StoreEquipmentArt,
  StoreGeneralArt,
  StoreMealprepArt,
  StoreSupplementArt,
  StoreWellnessArt,
  TypeClassesArt,
  TypeGymArt,
  TypeStoreArt,
} from "../../../components/icons/BusinessArt";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { IntroChipFan, ObFooter, ObHeader, ObPage, ObPopup, ObProgress, ObSelectCard, ObTitle, OB, useOnboardingFlow } from "../shell";
import { STORE_TYPES, storeTypeLabel, switchPopup, TYPE_CARDS, typeCardsNote, type BizLane, type StoreType } from "./lanes";
import { hasTypeAnswers, withLane, type BusinessLaneDraft } from "./draft";
import "./business-onboarding.css";

// OB-051…083 (+216 / 246 / 279): "What kind of business is this?" — the
// SharedOnboardingV4 bizType screen on the shell's intro frame. Three cards,
// the "What kind of store?" sheet, the "Switch to {type}?" pop-up, and the
// business-type-transitions motion (in T1-T4, out O1-O3).

const EASE = "cubic-bezier(0.22,1,0.36,1)";

const TYPE_ART: Record<BizLane, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  classes: TypeClassesArt,
  gym: TypeGymArt,
  store: TypeStoreArt,
};
const STORE_ART: Record<StoreType, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  store: StoreGeneralArt,
  supplement_store: StoreSupplementArt,
  equipment_seller: StoreEquipmentArt,
  wellness_service: StoreWellnessArt,
  clothing_store: StoreClothingArt,
  meal_prep_service: StoreMealprepArt,
};

export interface BizTypeStepProps {
  biz: BusinessLaneDraft;
  setBiz: (f: (b: BusinessLaneDraft) => BusinessLaneDraft) => void;
  onNext: () => void;
  onBack: () => void;
}

/** in0 = T2 (cards hidden, title 0.35), in1 = T3 (rising), settled = T4; out1 = O1, out2 = O2. */
type Phase = "in0" | "in1" | "settled" | "out1" | "out2";

export const BusinessTypeStep: React.FC<BizTypeStepProps> = ({ biz, setBiz, onNext, onBack }) => {
  const reduced = useReducedMotion();
  const flow = useOnboardingFlow();
  const sel = biz.lane;
  const storeConfirmed = sel === "store" && !!biz.storeType;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPick, setSheetPick] = useState<StoreType | null>(biz.storeType);
  const [pending, setPending] = useState<{ lane: BizLane; storeType: StoreType | null } | null>(null);
  const [phase, setPhase] = useState<Phase>(reduced ? "settled" : "in0");
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    if (reduced) return () => t.forEach(clearTimeout);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in1")));
    t.push(window.setTimeout(() => setPhase("settled"), 240 + 120 + 40));
    return () => {
      cancelAnimationFrame(raf);
      t.forEach(clearTimeout);
    };
  }, [reduced]);

  const choose = (lane: BizLane, storeType: StoreType | null) => {
    if (biz.lane !== null && biz.lane !== lane && hasTypeAnswers(biz)) {
      setPending({ lane, storeType });
      return;
    }
    setBiz((b) => withLane(b, lane, storeType));
  };

  const out = phase === "out1" || phase === "out2";
  const tapCard = (key: BizLane) => {
    if (out) return;
    if (key === "store") {
      setSheetPick(biz.lane === "store" ? biz.storeType : null);
      setSheetOpen(true);
      return;
    }
    choose(key, null);
  };

  const canContinue = sel !== null && (sel !== "store" || storeConfirmed);
  const continueNow = () => {
    if (!canContinue || out) return;
    if (reduced) {
      onNext();
      return;
    }
    // O1: the others fade, the chosen card lifts 6; O2: it rises and compacts and the title fades.
    setPhase("out1");
    timers.current.push(window.setTimeout(() => setPhase("out2"), 180));
    // The flow's own step-out (180 ms) then runs, and Your business arrives (O3).
    timers.current.push(window.setTimeout(() => onNext(), 180 + 240));
  };

  const pop = pending && biz.lane ? switchPopup(biz.lane, pending.lane) : null;
  const titleFade = phase === "in0" ? 0.35 : phase === "in1" ? 0.8 : phase === "out2" ? 0 : 1;

  return (
    <ObPage backdrop>
      <div className={`ob-body ${flow?.leaving ? "ob-step-out" : "ob-step-in"}`}>
        <ObProgress count={6} index={0} variant="intro" />
        <ObHeader margin="intro" onBack={onBack} />
        <ObTitle
          variant="intro"
          chip={{ label: "Business", vis: <IntroChipFan /> }}
          chipStyle={{ transform: phase === "in0" ? "translateY(6px)" : "none", transition: reduced ? undefined : `transform 240ms ${EASE}` }}
          eyebrow="Before step 1"
          title="What kind of business is this?"
          subtitle="This shapes your experience. You can adjust it later."
          fade={titleFade}
        />
        <div role="radiogroup" aria-label="Business type" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TYPE_CARDS.map((card, i) => {
            const on = sel === card.key;
            const recede = sel !== null && !on;
            const showType = card.key === "store" && storeConfirmed;
            const Art = TYPE_ART[card.key];
            const enter =
              phase === "in0"
                ? { opacity: 0, transform: "translateY(16px)" }
                : phase === "in1"
                  ? { opacity: 1, transform: "none", transition: `opacity 240ms ${EASE} ${i * 60}ms, transform 240ms ${EASE} ${i * 60}ms` }
                  : phase === "out2" && on
                    ? { transform: "translateY(-144px)", transition: `transform 240ms ${EASE}` }
                    : undefined;
            return (
              <div key={card.key} style={enter}>
                <ObSelectCard
                  title={card.title}
                  desc={
                    showType ? (
                      <span className="flex flex-wrap items-center gap-x-2 text-primary-dark font-bold">
                        <span>{storeTypeLabel(biz.storeType)}</span>
                        <button
                          type="button"
                          data-card-inner
                          onClick={() => tapCard("store")}
                          className="hit inline-flex items-center gap-px text-[12px] font-bold text-primary-dark whitespace-nowrap"
                        >
                          Change
                          <ChevronDown size={13} strokeWidth={2.4} aria-hidden />
                        </button>
                      </span>
                    ) : (
                      card.desc
                    )
                  }
                  points={card.points}
                  dot={card.key === "gym" ? OB.leaf : OB.brand}
                  tile={card.key === "gym" ? "teal" : "pale"}
                  tilt="-4deg"
                  tiltOrigin="50% 78%"
                  on={on}
                  recede={recede}
                  leaving={out}
                  pad={phase === "out2" && on ? "12px 16px" : undefined}
                  recedePad="12px 16px"
                  tileSize={phase === "out2" && on ? 48 : 56}
                  recedeTileSize={48}
                  visual={({ recede: r }) => <Art size={r || (phase === "out2" && on) ? 48 : 56} />}
                  onSelect={() => tapCard(card.key)}
                />
              </div>
            );
          })}
        </div>
        <p className="ob-cards-note" style={{ opacity: titleFade, fontSize: 11.5, lineHeight: "16px", color: "var(--ob-faint)", marginTop: 14, textAlign: "center", textWrap: "pretty" }}>
          {typeCardsNote(sel, storeConfirmed)}
        </p>
      </div>
      <ObFooter primary={{ label: "Continue", onClick: continueNow, disabled: !canContinue && !out }} />
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="What kind of store?"
        bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
        footer={
          <button
            type="button"
            aria-disabled={!sheetPick || undefined}
            onClick={() => {
              if (!sheetPick) return;
              setSheetOpen(false);
              choose("store", sheetPick);
            }}
            className="w-full h-[52px] rounded-[16px] bg-primary-fill text-on-primary-fill flex items-center justify-center text-[14px] font-bold"
            style={{ opacity: sheetPick ? 1 : 0.4 }}
          >
            {sheetPick ? `Confirm ${storeTypeLabel(sheetPick)}` : "Confirm"}
          </button>
        }
      >
        <p className="text-[13px] leading-[19px] text-charcoal-soft mb-[14px]">Pick the one that fits best. Your categories and listings follow it.</p>
        <div role="radiogroup" aria-label="Store type" className="flex flex-col gap-2">
          {STORE_TYPES.map((s) => {
            const on = sheetPick === s.key;
            const Art = STORE_ART[s.key];
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSheetPick(s.key)}
                className={clsx(
                  "w-full text-left flex items-center gap-3 rounded-[16px] py-[9px] pr-3 pl-[9px] box-border",
                  on ? "border-[1.5px] border-solid border-brand-c bg-primary-pale shadow-[0_0_0_3px_rgb(var(--c-brand-c)/0.1)] dark:shadow-[0_0_0_3px_rgba(169,145,254,0.14)]" : "border border-solid border-hair-11 bg-cream-card"
                )}
              >
                <span className={clsx("relative w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 overflow-hidden", on ? "bg-cream-card" : "bg-list")}>
                  <Art size={44} style={{ transform: on ? "rotate(-4deg)" : "none", transformOrigin: "50% 70%", transition: reduced ? undefined : `transform 500ms ${EASE}` }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={clsx("block text-[14px] leading-[19px] text-charcoal", on ? "font-extrabold" : "font-bold")}>{s.title}</span>
                  <span className="block text-[11.5px] leading-[15px] text-charcoal-soft mt-px">{s.desc}</span>
                </span>
                <span
                  aria-hidden
                  className={clsx("w-[22px] h-[22px] rounded-full flex items-center justify-center box-border shrink-0 text-white", on ? "bg-brand-c" : "border-[1.5px] border-hair-11")}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
      {pop && (
        <ObPopup
          icon={<RefreshCcw size={20} strokeWidth={2.2} />}
          title={pop.title}
          body={pop.body}
          action={{
            label: pop.confirm,
            onClick: () => {
              if (pending) setBiz((b) => ({ ...withLane(b, pending.lane, pending.storeType), reached: "business" }));
              setPending(null);
            },
          }}
          keep={{ label: pop.keep, onClick: () => setPending(null) }}
        />
      )}
    </ObPage>
  );
};
