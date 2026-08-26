import React, { useRef } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Camera, FileText, Check, Trash2 } from "lucide-react";

// V7 (QA 7.0): the certification a professional uploads during onboarding
// had no surface to view or replace afterward — this gives it one under More.
export const CertificationSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile } = useApp();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateProfile({ certificationUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const isPdf = user.certificationUrl?.startsWith("data:application/pdf");

  return (
    <BottomSheet open={open} onClose={onClose} title="Certification">
      <div className="space-y-4 animate-fade-slide-up">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {user.certificationUrl ? (
          <div>
            {isPdf ? (
              <iframe title="Certification" src={user.certificationUrl} className="w-full h-64 rounded-2xl border border-charcoal/10" />
            ) : (
              <img
                src={user.certificationUrl}
                alt="Certification"
                className="w-full max-h-64 object-contain rounded-2xl border border-charcoal/10 bg-cream-soft"
              />
            )}
            <p className="flex items-center gap-1.5 text-xs text-primary-dark mt-2.5">
              <Check size={13} /> Certification on file
            </p>
          </div>
        ) : (
          <p className="text-sm text-charcoal-faint text-center py-6">No certification uploaded yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5"
          >
            <Camera size={20} className="text-primary" />
            <span className="text-xs font-semibold text-charcoal-soft">Use camera</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5"
          >
            <FileText size={20} className="text-primary" />
            <span className="text-xs font-semibold text-charcoal-soft">
              {user.certificationUrl ? "Replace file" : "Upload file"}
            </span>
          </button>
        </div>

        {user.certificationUrl && (
          <Button
            variant="outline"
            fullWidth
            onClick={() => updateProfile({ certificationUrl: undefined })}
            className="!border-teal/30 !text-teal-dark"
          >
            <Trash2 size={14} /> Remove certification
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};
