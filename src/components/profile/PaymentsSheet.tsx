import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { useApp } from "../../context/AppContext";
import {
  fetchMyProfile,
  saveMyProfile,
  type PaymentModality,
  type ProfessionalProfile,
} from "../../services/professional-profile";

const modalityOptions: { value: PaymentModality; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "whish", label: "Whish" },
];

/** "" is "not set"; 0 is a real rate a professional might genuinely charge. */
const parseRate = (s: string): number | null => {
  const digits = s.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
};

// QA 12.0: "a button called payments, whereby the professional can add
// what his monthly rate is to be hired, alongside other types like
// consultations and how much they cost. Also let the professional choose
// what type of payment modality the client can pay with (cash, card or
// whish). These should reflect in the connected professional in the
// client UI."
//
// These now write `professional_profiles`. Until this change they went
// through updateProfile() into the local `user` object and no further —
// `profiles` has no rate or modality column — so a professional's rates
// lived on one device, were invisible to every client, and were lost with
// the browser's storage. They are also what the public directory renders,
// which made local-only persistence untenable rather than merely incomplete.
export const PaymentsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId } = useApp();
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState("");
  const [consultation, setConsultation] = useState("");
  const [modalities, setModalities] = useState<PaymentModality[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-read on open: this sheet stays mounted, so without this the form would
  // keep whatever the first open loaded.
  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);
    void (async () => {
      const result = await fetchMyProfile(authUserId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      const p: ProfessionalProfile | null = result.profile;
      setMonthly(p?.monthlyRate != null ? String(p.monthlyRate) : "");
      setConsultation(p?.consultationRate != null ? String(p.consultationRate) : "");
      setModalities(p?.paymentModalities ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);

  const toggleModality = (m: PaymentModality) =>
    setModalities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const save = async () => {
    if (!authUserId || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveMyProfile(authUserId, {
      monthlyRate: parseRate(monthly),
      consultationRate: parseRate(consultation),
      paymentModalities: modalities,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Payments">
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Monthly rate (to be hired)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal-faint">$</span>
            <input
              inputMode="numeric"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value.replace(/\D/g, ""))}
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
              value={consultation}
              onChange={(e) => setConsultation(e.target.value.replace(/\D/g, ""))}
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

        {error && <p className="text-xs font-semibold text-status-high">{error}</p>}

        <Button fullWidth onClick={() => void save()} disabled={saving || loading}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>

        <p className="text-[11px] text-charcoal-faint leading-relaxed">
          Whichever of these you set shows to clients connecting with you, and on your Explore
          listing if you've turned it on.
        </p>
      </div>
    </BottomSheet>
  );
};
