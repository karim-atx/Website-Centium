import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, ChevronLeft } from "lucide-react";
import "./onboarding.css";
import { LeafBackdrop, MarkSvg, Shapes, Wordmark, type Shape } from "./visuals";
import { OB_STRINGS, useOnboardingFlow } from "./flow";
import { LANES, laneProgress } from "./lanes";
import { t } from "../../../i18n/core";

// v6 Batch 3: the onboarding shell. Every numbered step of every lane renders
// through <ObStep>; the intro screens (Sign in / up, Check your email, account
// type, the type pickers) through <ObPage> + <ObHeader> + <ObTitle> +
// <ObFooter>. Values: SharedOnboardingV4 / BizOnboardingV10 (see
// onboarding.css). APIs listed in design-handover/recon-v6/_COMPONENTS.md.

/** The page: `.ob` palette scope, the 430 column, optional intro leaf backdrop. */
export const ObPage: React.FC<{ backdrop?: boolean; children: React.ReactNode; className?: string }> = ({
  backdrop,
  children,
  className,
}) => (
  <div className={`ob${className ? ` ${className}` : ""}`}>
    <div className="ob-col">
      {backdrop && <LeafBackdrop />}
      {children}
    </div>
  </div>
);

/**
 * The 3px bar. "intro": the first `index` segments filled (SharedOnboardingV4).
 * "lane": done segments filled, the current one lavender, the rest soft
 * (BizOnboardingV10), with role="progressbar".
 */
export const ObProgress: React.FC<{ count: number; index: number; variant?: "intro" | "lane" }> = ({ count, index, variant = "lane" }) => {
  const segs = Array.from({ length: count }, (_, i) => (i < index ? "done" : variant === "lane" && i === index ? "now" : "rest"));
  return variant === "lane" ? (
    <div className="ob-bar" role="progressbar" aria-label={t("Setup progress")} aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={count}>
      {segs.map((s, i) => (
        <span key={i} data-s={s} />
      ))}
    </div>
  ) : (
    <div className="ob-bar" aria-hidden>
      {segs.map((s, i) => (
        <span key={i} data-s={s} />
      ))}
    </div>
  );
};

/** The 22×22 mark + 78×8.5 wordmark lockup (left to right in every language: the mark is its C). */
export const ObLockup = React.forwardRef<HTMLSpanElement, { style?: React.CSSProperties }>(({ style }, ref) => (
  <span ref={ref} className="ob-lockup" dir="ltr" style={style}>
    <MarkSvg size={22} className="ob-lockup-mark" />
    <Wordmark width={78} height={8.5} className="ob-lockup-word" />
  </span>
));
ObLockup.displayName = "ObLockup";

/**
 * The 44px header row. Back (36×36, 44 hit box) on the left or a 28 gap;
 * the lockup centred; "Save and exit" or a 28 gap on the right.
 * `margin`: "intro" 14 0 22 (SharedOnboardingV4), "lane" 14 0 18, "nobar" 24 0 18
 * (BizOnboardingV10 hdrM).
 */
export const ObHeader: React.FC<{
  margin: "intro" | "lane" | "nobar";
  onBack?: () => void;
  saveExit?: boolean;
  lockupStyle?: React.CSSProperties;
  lockupRef?: React.Ref<HTMLSpanElement>;
}> = ({ margin, onBack, saveExit, lockupStyle, lockupRef }) => {
  const [finishLater, setFinishLater] = useState(false);
  const exitRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="ob-head" data-m={margin}>
      {onBack ? (
        <button type="button" className="ob-back hit" onClick={onBack} aria-label={t("Back")}>
          <ChevronLeft size={20} />
        </button>
      ) : (
        <span className="ob-head-gap" />
      )}
      <ObLockup ref={lockupRef} style={lockupStyle} />
      {saveExit ? (
        <button ref={exitRef} type="button" className="ob-exit hit" onClick={() => setFinishLater(true)}>
          {t(OB_STRINGS.saveAndExit)}
        </button>
      ) : (
        <span className="ob-head-gap" />
      )}
      {finishLater && (
        <ObFinishLater
          onClose={() => {
            setFinishLater(false);
            exitRef.current?.focus();
          }}
        />
      )}
    </div>
  );
};

/** Chip + eyebrow row, title, subtitle. */
export const ObTitle: React.FC<{
  variant?: "intro" | "lane";
  chip?: { label: string; vis?: Shape[] | React.ReactNode };
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** 0.25 while account-type Continue plays (SharedOnboardingV4 titleOp). */
  fade?: number;
  chipStyle?: React.CSSProperties;
}> = ({ variant = "lane", chip, eyebrow, title, subtitle, fade, chipStyle }) => (
  <>
    {(chip || eyebrow) && (
      <div className="ob-eb-row">
        {chip && (
          <span className="ob-chip" data-v={variant} style={chipStyle}>
            {Array.isArray(chip.vis) ? <Shapes shapes={chip.vis as Shape[]} size={20} /> : chip.vis}
            {chip.label}
          </span>
        )}
        {eyebrow && <p className="ob-eb">{eyebrow}</p>}
      </div>
    )}
    <h1 className="ob-title" style={fade !== undefined ? { opacity: fade } : undefined}>
      {title}
    </h1>
    {subtitle && (
      <p className="ob-sub" data-v={variant} style={fade !== undefined ? { opacity: fade } : undefined}>
        {subtitle}
      </p>
    )}
  </>
);

export interface ObAction {
  label: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

/**
 * The pinned footer: error slot (12/600 attention, or inkSoft for an
 * informing offline line), primary 52 r16, optional OR + secondary (outline),
 * optional text link (`link`: node; "intro" 14/600 mt 16, "lane" 14/700 mt 14).
 */
export const ObFooter: React.FC<{
  error?: React.ReactNode;
  errorTone?: "error" | "info";
  primary?: ObAction;
  secondary?: ObAction & { or?: boolean };
  link?: { node: React.ReactNode; onClick: () => void; variant?: "intro" | "lane"; disabled?: boolean };
  /** Above the primary (after the error slot): e.g. the health disclaimer. */
  children?: React.ReactNode;
  /** After the link: a second text link. */
  after?: React.ReactNode;
}> = ({ error, errorTone = "error", primary, secondary, link, children, after }) => (
  <div className="ob-foot">
    {error && (
      <p className="ob-foot-err" data-tone={errorTone} role={errorTone === "error" ? "alert" : "status"}>
        {error}
      </p>
    )}
    {children}
    {primary && (
      <button
        type={primary.type ?? "button"}
        form={primary.form}
        className="ob-btn ob-btn-primary tap"
        onClick={primary.onClick}
        disabled={primary.disabled}
        aria-label={primary.ariaLabel}
        style={primary.style}
      >
        {primary.label}
      </button>
    )}
    {secondary && (
      <>
        {secondary.or && (
          <div className="ob-or" aria-hidden>
            <span />
            <span className="ob-or-t">{t("OR")}</span>
            <span />
          </div>
        )}
        <button
          type={secondary.type ?? "button"}
          className="ob-btn ob-btn-secondary tap"
          style={secondary.or ? undefined : { marginTop: 12 }}
          onClick={secondary.onClick}
          disabled={secondary.disabled}
        >
          {secondary.label}
        </button>
      </>
    )}
    {link && (
      <button type="button" className="ob-link hit" data-v={link.variant ?? "intro"} onClick={link.onClick} disabled={link.disabled}>
        {link.node}
      </button>
    )}
    {after}
  </div>
);

/**
 * One numbered lane step: bar, header (Back, lockup, Save and exit), chip +
 * "Step n of N", title, subtitle, body, pinned footer. The bar, chip and
 * eyebrow come from LANES (lanes.ts) by `lane` + `step`.
 */
export const ObStep: React.FC<{
  lane: string;
  step: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  /** Default true; false on Review and after submit (BizOnboardingV10 `exit`). */
  saveExit?: boolean;
  footer?: React.ReactNode;
  /** OURS-step-states row 1: header renders, the body is skeleton blocks. */
  loading?: boolean;
  /** The chip's text when it is the person's own words (an Other professional's "What do you do?", OB-195). Added by OB-B; unset = the lane's chip. */
  chipLabel?: string;
  children?: React.ReactNode;
}> = ({ lane, step, title, subtitle, onBack, saveExit = true, footer, loading, chipLabel, children }) => {
  const flow = useOnboardingFlow();
  const p = laneProgress(lane, step);
  const def = LANES[lane];
  return (
    <ObPage>
      <div className={`ob-body ${flow?.leaving ? "ob-step-out" : "ob-step-in"}`}>
        {p && <ObProgress count={p.count} index={p.index} variant="lane" />}
        <ObHeader margin={p ? "lane" : "nobar"} onBack={onBack} saveExit={saveExit && !!flow} />
        <ObTitle
          variant="lane"
          chip={def ? { label: chipLabel || t(def.chip), vis: def.vis } : undefined}
          eyebrow={p ? t("Step {n} of {count}", { n: p.index + 1, count: p.count }) : undefined}
          title={title}
          subtitle={subtitle}
        />
        {loading ? <ObSkeleton /> : children}
      </div>
      {footer}
    </ObPage>
  );
};

/** OURS-step-states row 1: field 342×52 r16, collapsible ×58 r18, row group r18, 14 gap. */
export const ObSkeleton: React.FC<{ blocks?: ("field" | "coll" | "rows")[] }> = ({ blocks = ["field", "field", "coll", "rows"] }) => (
  <div aria-busy="true" aria-label={t("Loading")} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {blocks.map((b, i) => (
      <div key={i} className="ob-skel" style={{ height: b === "field" ? 52 : b === "coll" ? 58 : 162, borderRadius: b === "field" ? 16 : 18 }} />
    ))}
  </div>
);

/** The centred pop-up (BizOnboardingV10 hasPop). */
export const ObPopup: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  error?: string | null;
  action: { label: string; onClick: () => void; disabled?: boolean };
  keep: { label: string; onClick: () => void };
}> = ({ icon, title, body, error, action, keep }) => {
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    actionRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keep.onClick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keep]);
  return createPortal(
    <div className="ob-vars">
      <div className="ob-pop-scrim" onClick={keep.onClick} />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="ob-pop">
        <span className="ob-pop-ic">{icon}</span>
        <p className="ob-pop-t">{title}</p>
        <p className="ob-pop-b">{body}</p>
        {error && (
          <p className="ob-pop-err" role="alert">
            {error}
          </p>
        )}
        <div className="ob-pop-acts">
          <button ref={actionRef} type="button" className="ob-pop-a tap" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </button>
          <button type="button" className="ob-pop-k tap" onClick={keep.onClick}>
            {keep.label}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Finish later? (OB-252; OURS-finish-later-client / -classes / -store / -professional). */
export const ObFinishLater: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const flow = useOnboardingFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offline = flow ? !flow.online : false;
  const run = async () => {
    if (!flow || busy) return;
    setBusy(true);
    setError(null);
    const r = await flow.saveAndExit();
    setBusy(false);
    if (!r.ok) setError(t(OB_STRINGS.finishLaterError));
  };
  return (
    <ObPopup
      icon={<Bookmark size={20} strokeWidth={2.2} />}
      title={t(OB_STRINGS.finishLaterTitle)}
      body={
        <>
          {t(OB_STRINGS.finishLaterBody)}
          {offline && <> {t(OB_STRINGS.finishLaterOffline)}</>}
        </>
      }
      error={error}
      action={{ label: error ? t(OB_STRINGS.tryAgain) : t(OB_STRINGS.saveAndExit), onClick: () => void run(), disabled: busy }}
      keep={{ label: t(OB_STRINGS.keepGoing), onClick: onClose }}
    />
  );
};

/** The dark toast (BizOnboardingV10 hasToast): ink fill, page text, check 15/2.6. */
export const ObToast: React.FC<{ message: string | null; bottom?: number }> = ({ message, bottom = 106 }) =>
  message
    ? createPortal(
        <div className="ob-vars">
          <div role="status" className="ob-toast ob-fade-in" style={{ bottom }}>
            <Check size={15} strokeWidth={2.6} />
            {message}
          </div>
        </div>,
        document.body
      )
    : null;

/** A toast that shows for `ms` (3000 by default) each time `message` changes to non-null. */
export function useObToast(ms = 3000): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (m: string) => {
    window.clearTimeout(timer.current);
    setMsg(m);
    timer.current = window.setTimeout(() => setMsg(null), ms);
  };
  return [msg, show];
}
