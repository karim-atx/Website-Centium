import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Check, Copy } from "lucide-react";

export const AddClientSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addProfessionalClient } = useApp();
  const [name, setName] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName("");
    setGeneratedCode(null);
    setCopied(false);
  };

  const create = () => {
    if (!name.trim()) return;
    const code = addProfessionalClient(name.trim());
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
      {!generatedCode ? (
        <div className="space-y-5 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Client name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </label>
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
          <div className="bg-sohati-pale rounded-2xl py-5 mb-4">
            <p className="text-2xl font-bold tracking-widest text-sohati-dark">{generatedCode}</p>
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
