import React from "react";
import { ObFooter, ObHeader, ObPage, ObStep } from "../shell";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { bizLaneId, type BizFlowKey } from "./bizLanes";
import type { BizLane } from "./lanes";
import "./business-onboarding.css";

// The business lanes' frame, on the onboarding shell (shell/ObShell.tsx):
// a numbered step is <ObStep> (bar, header with Back / lockup / Save and exit,
// lane chip + "Step n of 6", title, subtitle, pinned footer); the status
// screens (no bar, no Back) are <ObPage> + <ObHeader margin="nobar">.

export interface BizFooter {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Footer error slot (12/600 attention, 10 above the button). */
  error?: string;
  /** "info" draws the slot in inkSoft (offline notices). */
  errorTone?: "error" | "info";
  link?: { label: string; onClick: () => void };
  /** Faded (the approval animation before it settles). */
  opacity?: number;
}

export const BizFooterBar: React.FC<{ footer: BizFooter }> = ({ footer }) => (
  <ObFooter
    error={footer.error}
    errorTone={footer.errorTone}
    primary={{
      label: footer.label,
      onClick: () => !footer.busy && footer.onClick(),
      disabled: footer.disabled || footer.busy,
      style: footer.opacity !== undefined ? { opacity: footer.opacity, transition: "opacity 350ms" } : undefined,
    }}
    link={footer.link ? { node: footer.link.label, onClick: footer.link.onClick, variant: "lane" } : undefined}
  />
);

export interface BizFrameProps {
  /** The numbered step (flow key); omit for the status screens. */
  step?: BizFlowKey;
  lane?: BizLane | null;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Save and exit in the header (the shell's Finish later?); off on Review. */
  saveExit?: boolean;
  footer?: BizFooter | null;
  children: React.ReactNode;
  /** Sheets, menus, pop-ups rendered with the page. */
  overlay?: React.ReactNode;
}

export const BizFrame: React.FC<BizFrameProps> = ({ step, lane, title, subtitle, onBack, saveExit = true, footer, children, overlay }) => {
  if (step && lane) {
    return (
      <ObStep
        lane={bizLaneId(lane)}
        step={step}
        title={title ?? ""}
        subtitle={subtitle}
        onBack={onBack}
        saveExit={saveExit}
        footer={footer ? <BizFooterBar footer={footer} /> : undefined}
      >
        <div className="ob-biz">{children}</div>
        {overlay}
      </ObStep>
    );
  }
  return (
    <ObPage>
      <div className="ob-body ob-step-in ob-biz">
        <ObHeader margin="nobar" onBack={onBack} />
        {children}
        {/* KEEP-SAFETY (the old ReadyStep showed it to every account on finishing): the health disclaimer, above the footer. */}
        <HealthDisclaimer className="mx-auto max-w-xs" />
      </div>
      {footer && <BizFooterBar footer={footer} />}
      {overlay}
    </ObPage>
  );
};
