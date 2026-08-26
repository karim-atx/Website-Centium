import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import type { Sex } from "../../types";
import { professionalTiers } from "../../data/professionalTiers";
import { Check, Copy, Venus, Mars, VenusAndMars } from "lucide-react";
import clsx from "clsx";

const sexOptions: { value: Sex; label: string; icon: typeof Venus }[] = [
  { value: "female", label: "Female", icon: Venus },
  { value: "male", label: "Male", icon: Mars },
  { value: "other", label: "Other", icon: VenusAndMars },
];

// V8 (QA 8.0): "Add prefix above first name like Mr, Ms, Dr, etc.."
const prefixOptions = ["", "Mr", "Ms", "Mrs", "Dr", "Mx"];

export const AddClientSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addProfessionalClient, professionalClients, professionalTier } = useApp();
  const navigate = useNavigate();
  const tier = professionalTiers.find((t) => t.id === professionalTier) ?? professionalTiers[0];
  const atCap = tier.maxClients !== null && professionalClients.length >= tier.maxClients;
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName("");
    setPrefix("");
    setAge("");
    setSex(null);
    setHeightCm("");
    setWeightKg("");
    setGeneratedCode(null);
    setCopied(false);
  };

  const create = () => {
    if (!name.trim()) return;
    const code = addProfessionalClient(name.trim(), {
      prefix: prefix || undefined,
      age: age ? Number(age) : undefined,
      sex: sex ?? undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
    });
    setGeneratedCode(code);
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard?.writeText(generatedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add Client"
    >
      {atCap ? (
        <div className="text-center animate-fade-slide-up py-4">
          <p className="text-sm text-charcoal-soft mb-4">
            Your {tier.name} tier allows up to {tier.maxClients} clients, and you're already there.
            Upgrade to add more.
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onClose();
              navigate("/subscription");
            }}
          >
            View subscription tiers
          </Button>
        </div>
      ) : !generatedCode ? (
        <div className="space-y-5 animate-fade-slide-up">
          <div className="grid grid-cols-[88px_1fr] gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Prefix</span>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {prefixOptions.map((p) => (
                  <option key={p} value={p}>
                    {p || "—"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Client name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Age</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="29"
                className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Height (cm)</span>
              <input
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="178"
                className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Weight (kg)</span>
            <input
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="70"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Sex</span>
            <div className="grid grid-cols-3 gap-2">
              {sexOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSex(opt.value)}
                  aria-label={opt.label}
                  title={opt.label}
                  className={clsx(
                    "tap flex items-center justify-center rounded-2xl py-3 border transition-colors",
                    sex === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-cream-soft text-charcoal-soft border-transparent"
                  )}
                >
                  <opt.icon size={20} />
                </button>
              ))}
            </div>
          </div>

          <Button fullWidth size="lg" onClick={create} disabled={!name.trim()}>
            Generate unique client code
          </Button>
        </div>
      ) : (
        <div className="text-center animate-fade-slide-up">
          <p className="text-sm text-charcoal-soft mb-4">
            Share this code with <strong>{name}</strong> — they'll enter it when they sign up as a
            Client of Professional to link accounts.
          </p>
          <div className="bg-primary-pale rounded-2xl py-5 mb-4">
            <p className="text-2xl font-bold tracking-widest text-primary-dark">{generatedCode}</p>
          </div>
          <Button fullWidth onClick={copyCode} variant="outline">
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
          </Button>
          <Button
            fullWidth
            size="lg"
            className="mt-2.5"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
