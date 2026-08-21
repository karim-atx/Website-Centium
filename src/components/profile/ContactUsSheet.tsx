import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { MessageCircle, Phone, Mail } from "lucide-react";

export const ContactUsSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const options = [
    { icon: MessageCircle, label: "Live Chat", desc: "Typically replies in a few minutes", color: "text-sohati", bg: "bg-sohati-pale" },
    { icon: Phone, label: "Call us", desc: "+961 1 234 567", color: "text-sky", bg: "bg-sky-pale" },
    { icon: Mail, label: "Email", desc: "support@sohati.app", color: "text-berry", bg: "bg-berry-pale" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Contact Us">
      <div className="space-y-2.5 animate-fade-slide-up">
        {options.map((o) => (
          <button
            key={o.label}
            className="tap w-full flex items-center gap-3.5 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <div className={`w-10 h-10 rounded-2xl ${o.bg} flex items-center justify-center shrink-0`}>
              <o.icon size={18} className={o.color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{o.label}</p>
              <p className="text-xs text-charcoal-faint">{o.desc}</p>
            </div>
          </button>
        ))}
        <p className="text-[11px] text-charcoal-faint text-center pt-2">
          Prototype only — these don't connect to a real support channel yet.
        </p>
      </div>
    </BottomSheet>
  );
};
