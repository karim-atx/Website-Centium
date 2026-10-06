import React from "react";
import { ChevronRight, Headset, Mail } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { SUPPORT_EMAIL } from "../../services/support";

// MO1.8.9 Contact us, as a centred popup (no ×; tapping outside or Escape
// closes it).
//
// EMAIL ONLY, ON PURPOSE (C32). The board also draws Live chat and Call us,
// but there is no support chat behind the first and the number on the board
// (+961 1 234 567) is a placeholder, so both stay off until they are real.
// The old sheet showed all three as buttons that did nothing, under a
// "Prototype only" line; that line goes with them.
//
// A REAL mailto: LINK, so the row opens the mail app with the address filled
// in. The address is also shown in full, so anyone without a mail app can
// copy it.
export const ContactUsPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <CentredPopup open={open} onClose={onClose} title="Contact us" icon={<Headset size={22} strokeWidth={1.75} />}>
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="tap flex items-center gap-3.5 py-[13px] text-start"
    >
      <span className="w-9 h-9 rounded-2xl bg-berry-pale flex items-center justify-center shrink-0" aria-hidden>
        <Mail size={16} className="text-berry" />
      </span>
      <span className="flex-1 min-w-0 text-[14px] font-semibold text-charcoal">Email</span>
      <span className="shrink-0 max-w-[60%] truncate text-[12.5px] text-charcoal-faint">{SUPPORT_EMAIL}</span>
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
    </a>
  </CentredPopup>
);
