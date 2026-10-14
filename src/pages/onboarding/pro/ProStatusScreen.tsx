import React, { useEffect, useState } from "react";
import { ObPage, ObHeader, ObFooter } from "../shell/ObShell";
import { ObStatus } from "../shell/ObBlocks";
import type { Shape } from "../shell/visuals";
import { OB_STRINGS } from "../shell/flow";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { time12 } from "../../../utils/time12";
import { STATUS_PENDING_VIS, STATUS_REJECTED_VIS, statusFanVis } from "./proVisuals";
import { ProfilePreview, SummaryCard, Timeline } from "./parts";
import { formatShortDate } from "../../../utils/date";

export type ProStatus = "pending" | "live" | "verified" | "rejected";

/** BizOnboardingV10 approved keyframes k1..k4 (0, 300, 650, 1100 ms; motion/approval-celebration). */
const K = [
  { v: 0, gl: 0, ro: 0.3, rs: 0.8, to: 0 },
  { v: 0.4, gl: 0.3, ro: 0.6, rs: 0.9, to: 0 },
  { v: 1, gl: 0.9, ro: 1, rs: 1.15, to: 0.4 },
  { v: 1, gl: 0, ro: 1, rs: 1, to: 1 },
];
const K_AT = [0, 300, 650, 1100];

export interface ProStatusProps {
  status: ProStatus | "loading" | "error";
  kind: "trainer" | "physio" | "diet" | "other";
  firstName: string;
  /** When the submission was made (the Submitted row of the timeline). */
  submittedAt?: Date | null;
  preview?: { initials: string; avatarUrl: string | null; name: string; label: string; tags: string[]; line: string | null };
  /** OURS: an account under 18 is set up but can't be listed (ATX47). */
  notListed?: string | null;
  /** The reviewer's reason (one free-text reason today; per-item reasons are BACKEND, B5 open item). */
  rejectionReason?: string | null;
  onPrimary: () => void;
  onFix?: () => void;
  onRetry?: () => void;
}

/**
 * After submitting (OB-155 / OB-212 You're live, OB-184 Licence check pending,
 * OB-186 / OB-188 Verified, OB-189 Couldn't verify) and the status screens'
 * OURS states (OURS-step-states rows 9 and 10). KEEP-SAFETY: the health
 * disclaimer stays above the footer on every status screen (ReadyStep).
 */
export const ProStatusScreen: React.FC<ProStatusProps> = ({
  status,
  kind,
  firstName,
  submittedAt,
  preview,
  notListed,
  rejectionReason,
  onPrimary,
  onFix,
  onRetry,
}) => {
  const reduced = useReducedMotion();
  const celebrate = status === "live" || status === "verified";
  const [k, setK] = useState(celebrate && !reduced ? 1 : 4);
  useEffect(() => {
    if (!celebrate || reduced) return;
    const timers = K_AT.slice(1).map((ms, i) => window.setTimeout(() => setK(i + 2), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [celebrate, reduced]);

  const nm = firstName.trim().split(/\s+/)[0] || "there";
  const reg = kind === "physio" || kind === "diet";

  let body: React.ReactNode;
  let footer: React.ReactNode;
  if (status === "loading" || status === "error") {
    body = (
      <div className="ob-status" aria-busy={status === "loading"}>
        <div className="ob-status-vis" style={{ opacity: 0.5 }}>
          {[170, 132, 96].map((s, i) => (
            <span key={s} className="ob-status-ring" style={{ width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2, opacity: i === 0 ? 0.6 : 1 }} />
          ))}
        </div>
        <div className="ob-skel" style={{ width: 200, height: 28, borderRadius: 8, margin: "14px auto 0" }} />
        <div className="ob-skel" style={{ width: 260, height: 14, borderRadius: 7, margin: "12px auto 0" }} />
        <div className="ob-skel" style={{ width: 260, height: 14, borderRadius: 7, margin: "8px auto 20px" }} />
      </div>
    );
    footer =
      status === "error" ? (
        <ObFooter error={OB_STRINGS.statusLoadError} primary={{ label: OB_STRINGS.tryAgain, onClick: () => onRetry?.() }} />
      ) : (
        <ObFooter primary={{ label: "Go to my dashboard", onClick: onPrimary, disabled: true }} />
      );
  } else if (status === "pending") {
    body = (
      <>
        <ObStatus
          vis={STATUS_PENDING_VIS}
          eyebrow="Submitted"
          eyebrowColor="var(--ob-accent)"
          title="We're checking your licence"
          body="Usually within 2 working days. We'll message and email you. You can set up your services while you wait."
        />
        <Timeline
          items={[
            {
              title: "Submitted",
              desc: submittedAt
                ? `${isToday(submittedAt) ? "Today" : formatShortDate(submittedAt, { day: "numeric", month: "short" }, undefined)}, ${time12(hhmm(submittedAt))}`
                : "Sent for review",
              value: submittedAt && isToday(submittedAt) ? "Today" : "",
              state: "done",
            },
            { title: "Licence check", desc: "With the registering body", value: "Now", state: "now" },
            { title: "Live and verified", desc: "Clients can find and book you", value: "", state: "next" },
          ]}
        />
      </>
    );
    footer = <ObFooter primary={{ label: "Go to my dashboard", onClick: onPrimary }} />;
  } else if (status === "rejected") {
    body = (
      <>
        <ObStatus
          vis={STATUS_REJECTED_VIS}
          eyebrow="Needs changes"
          eyebrowColor="var(--ob-high)"
          title="We couldn't verify your licence"
          body="Your profile isn't live yet. Fix these and send it again."
        />
        <SummaryCard n={4} heading="Credentials" lines={[rejectionReason?.trim() || "Not approved."]} action="Edit" onAction={onFix} bad />
      </>
    );
    footer = <ObFooter primary={{ label: "Fix and resend", onClick: () => (onFix ? onFix() : onPrimary()) }} />;
  } else {
    const a = K[k - 1];
    const vis: Shape[] = k === 1 ? STATUS_PENDING_VIS : statusFanVis(a.v);
    const verified = status === "verified";
    body = (
      <>
        <ObStatus
          vis={vis}
          eyebrow={verified ? "Verified" : "Live"}
          eyebrowColor="var(--ob-good)"
          title={notListed ? `You're set up, ${nm}` : verified ? `You're verified, ${nm}` : `You're live, ${nm}`}
          body={
            notListed
              ? `${notListed} You can still work with the clients you add.`
              : verified
              ? "Your licence is checked. Clients can now find and book you."
              : "Clients can find and book you now. Your Certified badge appears once your certificate is checked."
          }
          ringOpacity={a.ro}
          ringScale={a.rs}
          glowOpacity={a.gl}
          glowSize={k === 3 ? 240 : 160}
          textOpacity={a.to}
          visStyle={{ transition: reduced ? "opacity 200ms" : "transform 350ms cubic-bezier(0.22,1,0.36,1)" }}
        />
        {k >= 3 && preview && (
          <ProfilePreview
            initials={preview.initials}
            avatarUrl={preview.avatarUrl}
            name={preview.name}
            type={`${preview.label}${verified && reg ? " · Verified" : ""}`}
            tags={preview.tags.slice(0, 2)}
            line={preview.line}
          />
        )}
      </>
    );
    footer = (
      <div style={{ opacity: k < 3 ? 0.3 : 1, transition: "opacity 200ms" }}>
        <ObFooter primary={{ label: "Go to my dashboard", onClick: onPrimary, disabled: k < 3 }} />
      </div>
    );
  }

  return (
    <ObPage>
      <div className={`ob-body ${reduced ? "ob-fade-in" : "ob-step-in"}`}>
        <ObHeader margin="nobar" />
        {body}
        {/* KEEP-SAFETY (ReadyStep): the health disclaimer, above the footer. */}
        <HealthDisclaimer className="mx-auto max-w-xs" />
      </div>
      {footer}
    </ObPage>
  );
};

function isToday(d: Date): boolean {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}



const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
