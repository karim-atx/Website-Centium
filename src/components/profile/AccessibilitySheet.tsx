import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";

// V7 (QA 7.0): "an accessibility button — provide any accessibility feature
// you find important." Larger Text and Reduce Motion take real effect
// (root font-size and disabling animations); the rest are flagged as
// planned so the sheet doesn't overclaim what this prototype can back.
export const AccessibilitySheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { accessibility, updateAccessibility } = useApp();

  return (
    <BottomSheet open={open} onClose={onClose} title="Accessibility">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-charcoal">Larger text</p>
            <p className="text-[11px] text-charcoal-faint">Increases text and icon size throughout Centium</p>
          </div>
          <Toggle
            checked={accessibility.largerText}
            onChange={(v) => updateAccessibility({ largerText: v })}
            label="Larger text"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-charcoal">Reduce motion</p>
            <p className="text-[11px] text-charcoal-faint">Turns off animations and transitions</p>
          </div>
          <Toggle
            checked={accessibility.reduceMotion}
            onChange={(v) => updateAccessibility({ reduceMotion: v })}
            label="Reduce motion"
          />
        </div>

        <div className="border-t border-charcoal/[0.06] pt-4">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            Planned for a future update
          </p>
          <ul className="space-y-1.5 text-xs text-charcoal-soft list-disc pl-4">
            <li>High-contrast color theme</li>
            <li>Screen reader labels on every icon-only button</li>
            <li>Bigger tap targets throughout</li>
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
};
