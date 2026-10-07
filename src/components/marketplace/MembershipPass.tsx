import { useState } from "react";
import { Bluetooth, DoorOpen, Nfc, QrCode, User } from "lucide-react";
import { initials } from "../professionals/typeColour";
import { memberTag, planLine, validRange } from "../../services/venues/venueLogic";
import type { GymMembership } from "../../services/venues";
import { PassQr } from "./PassQr";
import { MemberTag } from "./MemberTag";

// The adaptive membership pass (MO1.4.2.2.2 #2, with MO1.4.2.2.4 Tap and
// MO1.4.2.2.5 Bluetooth), shown on the confirmed screen and in the member's
// "Show membership pass" popup (MO1.4.2.2.3). Measured on the 2x frames.
//
// BR-06: only the methods the venue enabled are offered (my_gym_memberships()
// carries access_qr / access_nfc / access_bluetooth); QR is the fallback and
// the first choice. The method switch is drawn only when there is a choice.
//
// QR IS THE WEB'S METHOD. Tap (NFC Wallet passes / in-app tap) and Bluetooth
// (the gym's access-control SDK) are native-only: their panels are drawn as
// the frames do, inert, with one line saying where they work. The Wallet
// button (BR-05, Apple on iPhone, Google on Android, never both) is native too:
// drawn, disabled.
//
// The frame's pass number under the QR ("FLX 0417 2026") has no field in the
// database (the pass_token is the code itself), so it isn't drawn.

type Method = "qr" | "tap" | "bluetooth";

const UNDER: Record<Method, string> = {
  qr: "Show this QR code at reception to enter.",
  tap: "Tap at the reception reader to enter.",
  bluetooth: "Stand near the entrance and tap Unlock entry.",
};

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

export function MembershipPass({
  membership,
  gymLocation,
  memberName,
}: {
  membership: GymMembership;
  gymLocation: string | null;
  memberName: string;
}) {
  const methods: { key: Method; label: string; Icon: typeof QrCode }[] = [
    ...(membership.access.qr ? [{ key: "qr" as const, label: "QR", Icon: QrCode }] : []),
    ...(membership.access.nfc ? [{ key: "tap" as const, label: "Tap", Icon: Nfc }] : []),
    ...(membership.access.bluetooth ? [{ key: "bluetooth" as const, label: "Bluetooth", Icon: Bluetooth }] : []),
  ];
  const [method, setMethod] = useState<Method>(methods[0]?.key ?? "qr");
  const tag = memberTag(membership.passState);

  return (
    <div className="flex flex-col items-center">
      {/* The pass card: 358 wide, 1.5 primary.soft edge, r20, padding 16. */}
      <div className="w-full rounded-[20px] border-[1.5px] border-th-a79ad5 dark:border-primary-dark/50 bg-cream-card p-4 text-start">
        {methods.length > 1 && (
          // The method switch: 39 tall in #F3F3FD r14, padding 4; the active
          // pill #A79AD5 with white 12/700; others #5B5349 (text.secondary).
          <div role="tablist" aria-label="Entry method" className="mb-4 h-[39px] rounded-[14px] bg-th-f3f3fd dark:bg-cream-soft p-1 flex gap-1">
            {methods.map((m) => {
              const on = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMethod(m.key)}
                  className={`tap flex-1 min-w-0 rounded-[10px] inline-flex items-center justify-center gap-1.5 text-[12px] font-bold ${
                    on ? "bg-th-a79ad5 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "text-charcoal-soft"
                  }`}
                >
                  <m.Icon size={13} strokeWidth={1.75} aria-hidden />
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* The gym: a 40 r12 #241F1B logo tile (initials 14/800 white), the
            name 15/800 and the place 12/400; the tag on the right. */}
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-charcoal dark:bg-cream-soft flex items-center justify-center shrink-0 text-[14px] font-extrabold text-white dark:text-charcoal" aria-hidden>
            {initials(membership.gymName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold text-charcoal truncate">{membership.gymName}</span>
            {gymLocation && <span className="block text-[12px] text-charcoal-faint truncate">{gymLocation}</span>}
          </span>
          <MemberTag label={tag.label} tone={tag.tone} size="pass" />
        </div>

        <div className="my-3 h-px bg-charcoal/[0.08]" aria-hidden />

        {/* The member: a 30 teal-tint avatar disc, the first name 15/700 and
            the plan 12/400; VALID 10/700 tracked and the dates 12/700. */}
        <div className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-full bg-th-e7f2f0 dark:bg-teal-pale flex items-center justify-center shrink-0 text-th-a3c7c0 dark:text-teal-deep-text" aria-hidden>
            <User size={18} strokeWidth={2} fill="currentColor" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-charcoal truncate">{memberName}</span>
            <span className="block text-[12px] text-charcoal-soft truncate">{planLine(membership.planName)}</span>
          </span>
          <span className="shrink-0 text-end">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-faint">Valid</span>
            <span className="block text-[12px] font-bold text-charcoal tabular-nums">{validRange(membership.startedOn, membership.expiresOn)}</span>
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {method === "qr" && (
            // The QR in a 200 box, 1.5 primary.soft edge, r16, padding 12.
            <div className="rounded-2xl border-[1.5px] border-th-a79ad5 dark:border-primary-dark/50 bg-white p-3">
              <PassQr value={membership.passToken} size={176} />
            </div>
          )}
          {method === "tap" && (
            <NativePanel
              disc={<Nfc size={64} strokeWidth={1.5} className="text-th-7d67d9 dark:text-primary-dark" aria-hidden />}
              title="Hold your phone near the reader"
              line="Tap entry works in the Centium app on your phone."
            />
          )}
          {method === "bluetooth" && (
            <NativePanel
              disc={
                <span className="w-[100px] h-[100px] rounded-full bg-th-9a8cd6 dark:bg-primary-fill text-white dark:text-on-primary-fill flex flex-col items-center justify-center gap-1 opacity-60">
                  <DoorOpen size={26} strokeWidth={1.75} aria-hidden />
                  <span className="text-[11px] font-bold">Unlock entry</span>
                </span>
              }
              title="Bluetooth entry"
              line="Bluetooth entry works in the Centium app on your phone."
            />
          )}
        </div>
      </div>

      <p className="mt-2.5 mb-0 text-center text-[12px] text-charcoal-faint">{UNDER[method]}</p>

      {/* BR-05: one Wallet button, Apple on iPhone, Google elsewhere. Wallet
          passes are native (signed pass files), so it is drawn disabled. */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Available in the Centium phone app"
        className="mt-2.5 w-[201px] h-[46px] rounded-xl bg-black text-white text-[14px] font-semibold disabled:opacity-40"
      >
        {isIOS() ? "Add to Apple Wallet" : "Add to Google Wallet"}
      </button>
    </div>
  );
}

/** Tap and Bluetooth: a 176 disc on a soft ring, a 15/800 line and a 12/400 note. */
function NativePanel({ disc, title, line }: { disc: React.ReactNode; title: string; line: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="w-[176px] h-[176px] rounded-full bg-th-f3f3fd dark:bg-cream-soft p-2.5 flex">
        <span className="flex-1 rounded-full bg-primary-pale flex items-center justify-center">{disc}</span>
      </span>
      <p className="mt-3 mb-0 text-[15px] font-extrabold text-charcoal">{title}</p>
      <p className="mt-1 mb-0 text-[12px] text-charcoal-soft max-w-[260px]">{line}</p>
    </div>
  );
}
