import React from "react";
import { ChevronRight, Headset, Mail } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { SUPPORT_EMAIL } from "../../services/support";

// MO1.8.9 Contact us, as a centred popup (no ×; tapping outside or Escape
// closes it).
//
// EMAIL ONLY FOR NOW (C32; handover-complete pass, still true). The board
// also draws Live chat and Call us, but there is no support chat behind the
// first (a backend gap) and the number on the board (+961 1 234 567) is a
// sample value with no real line behind it, so both wait for those to exist
// rather than being drawn as rows that do nothing.
// The old sheet showed all three as buttons that did nothing, under a
// "Prototype only" line; that line goes with them.
//
// A REAL mailto: LINK, so the row opens the mail app with the address filled
// in. The address is also shown in full, so anyone without a mail app can
// copy it.
export const ContactUsPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  // MO1.8.9 measured: the card 346 wide (the overlay padded 0 22 on the 390
  // board, card x 44 to 735 on the 2x board).
  <CentredPopup open={open} onClose={onClose} title="Contact us" icon={<Headset size={22} strokeWidth={1.75} />} maxWidth={346}>
    {/* Rows 60 apart on the board (dividers at 790 and 850 on the 2x board):
        12 above and below a 36 pt tile. The value is 12 / 400 muted, Mail
        17 / 1.75 (MO1.8.9 table and icon list). */}
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="tap flex items-center gap-3.5 py-3 text-start"
    >
      <span className="w-9 h-9 rounded-2xl bg-berry-pale flex items-center justify-center shrink-0" aria-hidden>
        <Mail size={17} strokeWidth={1.75} className="text-berry" />
      </span>
      <span className="flex-1 min-w-0 text-[14px] font-semibold text-charcoal">Email</span>
      <span className="shrink-0 max-w-[60%] truncate text-[12px] text-charcoal-faint">{SUPPORT_EMAIL}</span>
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
    </a>
  </CentredPopup>
);
