import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Sparkles } from "lucide-react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { ObStatus, ObSkeleton, ObTip, Shapes } from "../shell";
import { BizFrame, type BizFooter } from "./BizFrame";
import { BizListingPreview, BizSummary } from "./ui";
import { approvedBody, submittedLabel } from "./lanes";
import { Toggle } from "../../../components/ui/Toggle";
import { STATUS_REJECTED_VIS, STATUS_SUBMITTED_VIS, statusFan } from "./bizLanes";
import type { ReviewItem } from "../../../services/business-onboarding";

// After submitting (OB-238…243, 271…276, 299…304) and the approval
// celebration (OB-307…314): Pending review, You're live, A few things to fix.
// BizOnboardingV10 STATUS (the shell's ObStatus) and timeline blocks.

/** The status timeline (isTimeline). */
const Timeline: React.FC<{ items: { title: string; desc: string; value: string; state: "done" | "now" | "next" }[] }> = ({ items }) => (
  <ol className="rounded-[20px] bg-list px-4 py-1 mb-[14px]">
    {items.map((t, i) => (
      <li key={t.title} className="flex items-center gap-3 min-h-[54px]" style={{ borderTop: i ? "1px solid var(--list-rule)" : "none" }}>
        <span
          aria-hidden
          className={clsx(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center box-border shrink-0 text-on-primary-fill",
            t.state === "done" ? "bg-primary-fill border-primary-fill" : t.state === "now" ? "border-primary-fill" : "border-desc"
          )}
        >
          {t.state === "done" && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={clsx("block text-[13px]", t.state === "now" ? "font-extrabold" : "font-semibold", t.state === "next" ? "text-charcoal-faint" : "text-charcoal")}>
            {t.title}
            <span className="sr-only">{t.state === "done" ? ", done" : t.state === "now" ? ", in progress" : ", next"}</span>
          </span>
          <span className="block text-[11px] text-charcoal-faint">{t.desc}</span>
        </span>
        <span className={clsx("text-[11.5px] font-bold", t.state === "now" ? "text-primary-dark" : "text-charcoal-faint")}>{t.value}</span>
      </li>
    ))}
  </ol>
);

/** OURS-step-states #9: the status screen while the review state loads. */
export const StatusLoading: React.FC<{ footer: BizFooter }> = ({ footer }) => (
  <BizFrame footer={footer}>
    <div className="text-center pt-2 pb-1" aria-busy="true" aria-label="Loading">
      <div className="relative w-[200px] h-[170px] mx-auto" style={{ opacity: 0.5 }}>
        <Shapes shapes={STATUS_SUBMITTED_VIS} size={120} style={{ position: "absolute", left: 40, top: 25 }} />
      </div>
      <div className="flex flex-col items-center gap-2 mt-[6px]">
        <span className="ob-skel w-[200px] h-7 rounded-[8px]" />
        <span className="ob-skel w-[260px] h-[14px] rounded-[7px] mt-2" />
        <span className="ob-skel w-[260px] h-[14px] rounded-[7px] mb-5" />
      </div>
    </div>
    <ObSkeleton blocks={["rows"]} />
  </BizFrame>
);

export const PendingScreen: React.FC<{ name: string; submittedAt: string | null; footer: BizFooter }> = ({ name, submittedAt, footer }) => {
  const s = submittedLabel(submittedAt);
  return (
    <BizFrame footer={footer}>
      <ObStatus
        vis={STATUS_SUBMITTED_VIS}
        eyebrow="Submitted"
        eyebrowColor="var(--ob-accent)"
        title={`We're reviewing ${name}`}
        body="Usually 1 to 2 working days. We'll message and email you."
      />
      <Timeline
        items={[
          { title: "Submitted", desc: s.line, value: s.day, state: "done" },
          { title: "In review", desc: "Checking your documents and listing", value: "Now", state: "now" },
          { title: "Live on Explore", desc: "Clients can find and book you", value: "", state: "next" },
        ]}
      />
      <ObTip icon={Sparkles} heading="While you wait,">
        explore your Dashboard and finish the Get set up list. Changes go live with your listing.
      </ObTip>
    </BizFrame>
  );
};

// approval-celebration: A1 0 ms, A2 300 ms (fan opens, 350 ms), A3 650 ms
// (glow blooms, 450 ms ease-out), A4 1100 ms (settled with title and actions).
// Reduced motion: the final frame with a 200 ms fade.
const A_FRAMES = [
  { v: 0, gl: 0, ro: 0.3, rs: 0.8, to: 0 },
  { v: 0.4, gl: 0.3, ro: 0.6, rs: 0.9, to: 0 },
  { v: 1, gl: 0.9, ro: 1, rs: 1.15, to: 0.4 },
  { v: 1, gl: 0, ro: 1, rs: 1, to: 1 },
];

export const ApprovedScreen: React.FC<{
  lane: "classes" | "gym" | "store";
  name: string;
  preview: React.ComponentProps<typeof BizListingPreview>;
  animate: boolean;
  onOpenDashboard: () => void;
  onShare: () => void;
  /**
   * B7 (20261120140000): business_profiles.active. New businesses start
   * hidden; approval lists them, but a business that is off (switched off, or
   * paused) is told here and can turn Show on Explore on in place.
   */
  listed?: boolean;
  onShowOnExplore?: () => Promise<string | null>;
}> = ({ lane, name, preview, animate, onOpenDashboard, onShare, listed = true, onShowOnExplore }) => {
  const [busy, setBusy] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const turnOn = async () => {
    if (!onShowOnExplore || busy) return;
    setBusy(true);
    setShowError(null);
    const err = await onShowOnExplore();
    setBusy(false);
    if (err) setShowError(err);
  };
  const reduced = useReducedMotion();
  const [k, setK] = useState(animate && !reduced ? 1 : 4);
  const [fade, setFade] = useState(animate && reduced ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    if (reduced) {
      const r = requestAnimationFrame(() => setFade(1));
      return () => cancelAnimationFrame(r);
    }
    const t = [window.setTimeout(() => setK(2), 300), window.setTimeout(() => setK(3), 650), window.setTimeout(() => setK(4), 1100)];
    return () => t.forEach(clearTimeout);
  }, [animate, reduced]);
  const A = A_FRAMES[k - 1];
  return (
    <div style={{ opacity: fade, transition: "opacity 200ms" }} className="ob-approve">
      <BizFrame footer={{ label: "Open Dashboard", onClick: onOpenDashboard, opacity: k < 3 ? 0.3 : 1, link: { label: "Share your listing", onClick: onShare } }}>
        <div aria-live="polite">
          <ObStatus
            vis={k === 1 ? STATUS_SUBMITTED_VIS : statusFan(A.v)}
            eyebrow="Approved"
            eyebrowColor="var(--ob-good)"
            title="You're live"
            body={listed ? approvedBody(lane, name) : `${name} is approved. Turn on Show on Explore so people can find you.`}
            ringOpacity={A.ro}
            ringScale={A.rs}
            glowOpacity={A.gl}
            glowSize={k === 3 ? 240 : 160}
            textOpacity={A.to}
          />
        </div>
        {!listed && k >= 3 && (
          <div className="rounded-[20px] bg-list px-4 mb-[14px]" role="group" aria-label="Show on Explore">
            <div className="flex items-center gap-3 min-h-[62px]">
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] leading-[19px] font-bold text-charcoal">Show on Explore</span>
                <span className="block text-[11.5px] leading-[16px] text-charcoal-faint mt-[1px]">Hidden: clients can't find you on Explore.</span>
              </span>
              <Toggle checked={false} onChange={() => void turnOn()} label="Show on Explore" size="business-lg" disabled={busy || !onShowOnExplore} />
            </div>
            {showError && <p role="alert" className="text-[12px] font-bold text-status-high pb-3">{showError}</p>}
          </div>
        )}
        {k >= 3 && <BizListingPreview {...preview} />}
      </BizFrame>
    </div>
  );
};

/** OB-242 / 275 / 303: A few things to fix. */
export const RejectedScreen: React.FC<{
  items: (ReviewItem & { n: number; action: string; onAction: () => void })[];
  footer: BizFooter;
}> = ({ items, footer }) => (
  <BizFrame footer={footer}>
    <ObStatus
      vis={STATUS_REJECTED_VIS}
      eyebrow="Needs changes"
      eyebrowColor="var(--ob-high)"
      title="A few things to fix"
      body={items.length === 1 ? "Fix this one and resubmit. Everything else is saved." : `Fix these ${items.length === 2 ? "two" : items.length} and resubmit. Everything else is saved.`}
    />
    {items.map((it, i) => (
      <BizSummary key={i} n={it.n} title={it.field} lines={[it.problem]} action={it.action} onAction={it.onAction} flag={it.fix} bad />
    ))}
  </BizFrame>
);
