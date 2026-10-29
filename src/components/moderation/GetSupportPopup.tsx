import React from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, Phone } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { supportLines, type SupportPlace } from "../../services/moderation/support";

// "Get support" (Round C Release 2; PLAN S3, undrawn, on the Foundations
// centred popup in the "ours" geometry). Shown to the person themselves only:
// after a private message that matched the self-harm list on their own device,
// on their own held forum post, from the support_resources notice, and from
// Settings › Help.
//
// NEVER "we've told someone": nobody is notified by this popup. A centred
// popup rather than a sheet, so it can't be swiped away by accident; "I'm OK"
// closes it and nothing is sent from here.

export const GetSupportPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Lebanon's lines, or the local emergency number and findahelpline.com. */
  place: SupportPlace;
}> = ({ open, onClose, place }) => {
  const lines = supportLines(place);
  const first = lines.numbers[0];
  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      geometry="ours"
      icon={<HeartHandshake size={22} strokeWidth={1.75} />}
      title="You're not alone"
      body="If you're thinking about hurting yourself, you can talk to someone now. It's free and confidential."
      cta={
        first
          ? { label: `Call ${first.number}`, onClick: () => (window.location.href = `tel:${first.number}`) }
          : { label: "Find a helpline", onClick: () => window.open(lines.directory, "_blank", "noopener") }
      }
    >
      <div className="mt-4 flex flex-col rounded-2xl border border-charcoal/[0.08] overflow-hidden text-left">
        {lines.numbers.map((n, i) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className={`tap flex items-center gap-3 min-h-[48px] px-3.5 bg-cream-card ${i > 0 ? "border-t border-charcoal/[0.06]" : ""}`}
          >
            <Phone size={16} className="shrink-0 text-primary-dark" aria-hidden />
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-charcoal">{n.name}</span>
            <span className="text-[14px] font-extrabold text-charcoal tabular-nums">{n.number}</span>
          </a>
        ))}
        {lines.local && (
          <p className="px-3.5 py-3 bg-cream-card text-[13px] font-semibold text-charcoal">Call your local emergency number.</p>
        )}
        <a
          href={lines.directory}
          target="_blank"
          rel="noopener noreferrer"
          className="tap flex items-center min-h-[44px] px-3.5 bg-cream-card border-t border-charcoal/[0.06] text-[12.5px] font-bold text-primary-dark"
        >
          {place === "lebanon" ? "Outside Lebanon? findahelpline.com" : "Find a helpline near you: findahelpline.com"}
        </a>
      </div>
      <button type="button" onClick={onClose} className="tap mt-2 w-full min-h-[44px] text-[13px] font-bold text-charcoal-soft">
        I'm OK, continue
      </button>
      <p className="text-[11.5px] leading-[16px] text-charcoal-faint">
        Nobody is told about this. Read our{" "}
        <Link to="/legal/community-guidelines" className="font-semibold underline" onClick={onClose}>
          community guidelines
        </Link>
        .
      </p>
    </CentredPopup>
  );
};
