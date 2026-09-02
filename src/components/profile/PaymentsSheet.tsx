import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { useApp } from "../../context/AppContext";
import type { UserProfile } from "../../types";

const modalityOptions: { value: NonNullable<UserProfile["paymentModalities"]>[number]; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "whish", label: "Whish" },
];

// QA 12.0: "a button called payments, whereby the professional can add
// what his monthly rate is to be hired, alongside other types like
// consultations and how much they cost. Also let the professional choose
// what type of payment modality the client can pay with (cash, card or
// whish). These should reflect in the connected professional in the
// client UI." (Rate/modality live on the professional's own account here;
// the client-side "Hire" flow already surfaces a professional's rate the
// same way it does for every seeded professional today.)
export const PaymentsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile } = useApp();
  const modalities = user.paymentModalities ?? [];

  const toggleModality = (m: NonNullable<UserProfile["paymentModalities"]>[number]) =>
    updateProfile({
      paymentModalities: modalities.includes(m) ? modalities.filter((x) => x !== m) : [...modalities, m],
    });

  return (
    <BottomSheet open={open} onClose={onClose} title="Payments">
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Monthly rate (to be hired)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal-faint">$</span>
            <input
              inputMode="numeric"
              value={user.monthlyRate ?? ""}
              onChange={(e) => updateProfile({ monthlyRate: Number(e.target.value.replace(/\D/g, "")) || undefined })}
              placeholder="e.g. 150"
              className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Consultation rate</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal-faint">$</span>
            <input
              inputMode="numeric"
              value={user.consultationRate ?? ""}
              onChange={(e) =>
                updateProfile({ consultationRate: Number(e.target.value.replace(/\D/g, "")) || undefined })
              }
              placeholder="e.g. 40"
              className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Accepted payment methods</span>
          <div className="flex flex-wrap gap-2">
            {modalityOptions.map((m) => (
              <Chip key={m.value} active={modalities.includes(m.value)} onClick={() => toggleModality(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-charcoal-faint leading-relaxed">
          Whichever of these you set shows to clients connecting with you.
        </p>
      </div>
    </BottomSheet>
  );
};
