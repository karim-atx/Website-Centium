import { useState } from "react";
import { Bluetooth, DoorOpen, Nfc, QrCode, User } from "lucide-react";
import { initials } from "../professionals/typeColour";
import { dayMonthYear, membershipTag } from "../../services/venues/venueLogic";
import { rotatePassToken, type GymMembership } from "../../services/venues";
import { ConfirmCard } from "../ui/ConfirmCard";
import { PassQr } from "./PassQr";
import { MemberTag } from "./MemberTag";
import { clock12 } from "../../utils/time12";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { usePassCode } from "./usePassCode";
import { PassDevicesSheet } from "./PassDevicesSheet";
import { PASS_CODE_PERIOD_SECONDS } from "../../services/venues/passCode";
import { t, tk } from "../../i18n/core";

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
//
// B10 (HANDOVER_API "A member can kill a leaked pass", BACKEND_REQUIREMENTS
// 5.9): "Get a new pass code" under the QR calls rotate_gym_pass_token(); the
// old code reads "not recognised" at the desk from then on. No frame: a 12/700
// primary-dark text button (44 hit box) and the shared "decision" confirm
// (OURS, strings flagged). Online only: an offline copy can't be rotated.
//
// Round F2 · AB5 (Karim F23): the QR carries a 30-second code the phone
// computes from this device's secret ("pd:<device>:<code>", usePassCode), so
// a screenshot stops working within a minute and the pass still works with
// no signal. A thin ring around the QR runs down the 30 seconds. With no
// secret (offline the first time, rate-limited) the static pass_token shows,
// which the desk still accepts (phase one). "Get a new pass code" also
// revokes every device secret, so the pass gets a new one after; "Your
// devices" lists them, each removable (PassDevicesSheet).

type Method = "qr" | "tap" | "bluetooth";

const UNDER: Record<Method, string> = {
  qr: tk("Show this QR code at reception to enter."),
  tap: tk("Tap at the reception reader to enter."),
  bluetooth: tk("Stand near the entrance and tap Unlock entry."),
};

/** membershipTag()'s label (services/venues/venueLogic memberTag, shared), in the app's language. */
function passTagText(m: Pick<GymMembership, "passState" | "startedOn">): string {
  switch (m.passState) {
    case "valid":
      return t("Member");
    case "awaiting_payment":
      return t("Pay on your first visit");
    case "expired":
      return t("Expired");
    case "cancelled":
      return t("Cancelled");
    case "refunded":
      return t("Refunded");
    case "upcoming":
      return t("Starts {date}", { date: dayMonthYear(m.startedOn) });
    default:
      return t("Status unavailable");
  }
}

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
    ...(membership.access.nfc ? [{ key: "tap" as const, label: t("Tap"), Icon: Nfc }] : []),
    ...(membership.access.bluetooth ? [{ key: "bluetooth" as const, label: "Bluetooth", Icon: Bluetooth }] : []),
  ];
  const [method, setMethod] = useState<Method>(methods[0]?.key ?? "qr");
  const tag0 = membershipTag(membership);
  const tag = { ...tag0, label: passTagText(membership) };
  // The rotated token shows at once; the next read of my_gym_memberships carries it too.
  const [rotated, setRotated] = useState<{ id: string; token: string } | null>(null);
  const token = rotated?.id === membership.id ? rotated.token : membership.passToken;
  const [asking, setAsking] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateNote, setRotateNote] = useState<{ text: string; error: boolean } | null>(null);
  const { authUserId } = useApp();
  const online = useOnline();
  // AB5: the offline copy of the pass draws with the stored secret only (never issues).
  const live = usePassCode({ userId: authUserId ?? null, membershipId: membership.id, online: online && !membership.cachedAt });
  const [devicesOpen, setDevicesOpen] = useState(false);
  const rotate = async () => {
    setRotating(true);
    const r = await rotatePassToken(membership.id);
    setRotating(false);
    setAsking(false);
    if (!r.ok) {
      setRotateNote({ text: r.message, error: true });
      return;
    }
    setRotated({ id: membership.id, token: r.value });
    // Rotating revoked every device secret (20261226070000): get a new one.
    live.renew();
    setRotateNote({ text: t("Your pass has a new code. The old one no longer works."), error: false });
  };
  const qrValue = live.value ?? token;

  return (
    <div className="flex flex-col items-center">
      {/* The pass card: 358 wide, 1.5 primary.soft edge, r20, padding 16. */}
      <div className="w-full rounded-[20px] border-[1.5px] border-th-a79ad5 dark:border-primary-dark/50 bg-cream-card p-4 text-start">
        {methods.length > 1 && (
          // The method switch: 39 tall in #F3F3FD r14, padding 4; the active
          // pill #A79AD5 with white 12/700; others #5B5349 (text.secondary).
          <div role="tablist" aria-label={t("Entry method")} className="mb-4 h-[39px] rounded-[14px] bg-th-f3f3fd dark:bg-cream-soft p-1 flex gap-1">
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
            <span className="block text-[12px] text-charcoal-soft truncate">{membership.planName ? (/membership/i.test(membership.planName) ? membership.planName : t("{plan} membership", { plan: membership.planName })) : t("Membership")}</span>
          </span>
          <span className="shrink-0 text-end">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-faint">{t("Valid")}</span>
            <span className="block text-[12px] font-bold text-charcoal tabular-nums">{membership.expiresOn ? t("{start} to {end}", { start: dayMonthYear(membership.startedOn), end: dayMonthYear(membership.expiresOn) }) : t("From {date}", { date: dayMonthYear(membership.startedOn) })}</span>
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {method === "qr" &&
            (live.value ? (
              // AB5: the same box, its edge replaced by a thin ring that runs
              // down the 30 seconds (2px, primary on the soft edge colour).
              <div className="relative rounded-2xl bg-white p-3">
                <PassRing left={live.left} />
                <PassQr value={qrValue} size={176} />
              </div>
            ) : (
              // The QR in a 200 box, 1.5 primary.soft edge, r16, padding 12.
              <div className="rounded-2xl border-[1.5px] border-th-a79ad5 dark:border-primary-dark/50 bg-white p-3">
                <PassQr value={qrValue} size={176} />
              </div>
            ))}
          {method === "tap" && (
            <NativePanel
              disc={<Nfc size={64} strokeWidth={1.5} className="text-th-7d67d9 dark:text-primary-accent" aria-hidden />}
              title={t("Hold your phone near the reader")}
              line={t("Tap entry works in the Centium app on your phone.")}
            />
          )}
          {method === "bluetooth" && (
            <NativePanel
              disc={
                <span className="w-[100px] h-[100px] rounded-full bg-th-9a8cd6 dark:bg-primary-fill text-white dark:text-on-primary-fill flex flex-col items-center justify-center gap-1 opacity-60">
                  <DoorOpen size={26} strokeWidth={1.75} aria-hidden />
                  <span className="text-[11px] font-bold">{t("Unlock entry")}</span>
                </span>
              }
              title={t("Bluetooth entry")}
              line={t("Bluetooth entry works in the Centium app on your phone.")}
            />
          )}
        </div>
      </div>

      <p className="mt-2.5 mb-0 text-center text-[12px] text-charcoal-faint">{t(UNDER[method])}</p>
      {method === "qr" && live.value && (
        <p className="mt-1 mb-0 text-center text-[12px] text-charcoal-faint max-w-[300px]">{t("This code refreshes every 30 seconds. Screenshots won't work at the desk.")}</p>
      )}
      {method === "qr" && !membership.cachedAt && (
        <div className="mt-1 flex items-center justify-center gap-4">
          <button type="button" onClick={() => setAsking(true)} className="tap text-[12px] font-bold text-primary-dark" style={{ minHeight: 32 }}>
            {t("Get a new pass code")}
          </button>
          {online && (
            <button type="button" onClick={() => setDevicesOpen(true)} className="tap text-[12px] font-bold text-primary-dark" style={{ minHeight: 32 }}>
              {t("Your devices")}
            </button>
          )}
        </div>
      )}
      <PassDevicesSheet open={devicesOpen} onClose={() => setDevicesOpen(false)} membershipId={membership.id} thisDeviceId={live.deviceId} onRemovedThis={live.renew} />      {rotateNote && (
        <p role={rotateNote.error ? "alert" : "status"} className={`mt-1 mb-0 text-center text-[12px] font-semibold ${rotateNote.error ? "text-status-high" : "text-charcoal-faint"}`}>
          {rotateNote.text}
        </p>
      )}
      <ConfirmCard
        open={asking}
        layout="decision"
        title={t("Get a new pass code?")}
        subtitle={t("Your current code stops working straight away. Do this if someone else may have a copy of your pass.")}
        confirmLabel={rotating ? t("Getting a code…") : t("Get a new code")}
        cancelLabel={t("Keep this one")}
        busy={rotating}
        onCancel={() => setAsking(false)}
        onConfirm={() => void rotate()}
      />
      {/* V6-30: the device's short-lived offline copy is showing. */}
      {membership.cachedAt && (
        <p role="status" className="mt-1 mb-0 text-center text-[12px] font-semibold text-charcoal-faint">
          {t("Offline. Last updated {time}.", { time: clock12(membership.cachedAt) })}
        </p>
      )}

      {/* BR-05: one Wallet button, Apple on iPhone, Google elsewhere. Wallet
          passes are native (signed pass files), so it is drawn disabled. */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t("Available in the Centium phone app")}
        className="mt-2.5 w-[201px] h-[46px] rounded-xl bg-black text-white text-[14px] font-semibold disabled:opacity-40"
      >
        {isIOS() ? t("Add to Apple Wallet") : t("Add to Google Wallet")}
      </button>
    </div>
  );
}

/**
 * AB5: the 30-second ring around the QR box (200 square, r16): the soft
 * 1.5 edge as the track, and a 2px primary stroke for the seconds left,
 * running down clockwise from the top. Decorative: the line under the pass
 * says what it means.
 */
function PassRing({ left }: { left: number }) {
  const share = Math.max(0, Math.min(1, left / PASS_CODE_PERIOD_SECONDS));
  return (
    <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 200 200" preserveAspectRatio="none">
      <rect x="0.75" y="0.75" width="198.5" height="198.5" rx="15.25" fill="none" strokeWidth="1.5" className="stroke-th-a79ad5 dark:stroke-primary-dark/50" opacity="0.35" />
      <path
        d="M100 1 H184 A15 15 0 0 1 199 16 V184 A15 15 0 0 1 184 199 H16 A15 15 0 0 1 1 184 V16 A15 15 0 0 1 16 1 Z"
        pathLength={100}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${share * 100} 100`}
        className="stroke-th-7d67d9 dark:stroke-primary-accent"
        style={{ transition: left >= PASS_CODE_PERIOD_SECONDS ? "none" : "stroke-dasharray 1s linear" }}
      />
    </svg>
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
