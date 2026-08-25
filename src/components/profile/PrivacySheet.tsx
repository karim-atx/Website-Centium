import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { ShieldCheck, Download, Trash2 } from "lucide-react";

// V7 (QA 7.0): "take inspiration from Apple Health and Google Health for
// the privacy button" — both frame health data as private-by-default,
// stored on-device unless the user explicitly shares it, with clear
// controls to export or delete it. This prototype has no backend, so
// export/delete act on local data only.
export const PrivacySheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [shareWithProfessionals, setShareWithProfessionals] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(true);

  return (
    <BottomSheet open={open} onClose={onClose} title="Privacy">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-start gap-3 bg-sohati-pale rounded-2xl p-4">
          <ShieldCheck size={18} className="text-sohati-dark shrink-0 mt-0.5" />
          <p className="text-xs text-sohati-dark leading-relaxed">
            Your health data stays on this device by default. It's only shared with a professional or
            business when you explicitly connect with them — you control that per connection in
            Professionals and Explore.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Share with connected professionals</p>
              <p className="text-[11px] text-charcoal-faint">Controlled per-professional in their detail page</p>
            </div>
            <Toggle checked={shareWithProfessionals} onChange={setShareWithProfessionals} label="Share with professionals" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Analytics & diagnostics</p>
              <p className="text-[11px] text-charcoal-faint">Helps improve Centium — never sold to third parties</p>
            </div>
            <Toggle checked={analytics} onChange={setAnalytics} label="Analytics" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Personalized recommendations</p>
              <p className="text-[11px] text-charcoal-faint">Uses your logs to tailor goals and insights</p>
            </div>
            <Toggle checked={personalization} onChange={setPersonalization} label="Personalization" />
          </div>
        </div>

        <div className="border-t border-charcoal/[0.06] pt-4 space-y-2">
          <button className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left">
            <Download size={17} className="text-sohati" />
            <span className="text-sm font-semibold text-charcoal">Download my data</span>
          </button>
          <button className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left">
            <Trash2 size={17} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Delete my data</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
