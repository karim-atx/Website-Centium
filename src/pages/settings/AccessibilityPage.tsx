import { ALargeSmall, Contrast, Pointer, Wind } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";

// MO1.8.6 Accessibility, as a page (was a sheet), with the board's four
// switches (R19). Settings are kept on this device, as before. As drawn, the
// rows carry no subtitles (handover-complete pass); what each switch does is
// read to screen readers instead. Screen reader labels ship by default, not
// as a switch.
//
// Larger text keeps today's behaviour until the type rework (R21, batch D).
// Reduce motion also reaches the JavaScript-driven motion (useReducedMotion).
export default function AccessibilityPage() {
  const { accessibility, updateAccessibility } = useApp();

  return (
    <div>
      <PageHeader title="Accessibility" showBack sub tightBack />
      {/* MO1.8.6: 24 pt side insets; the label 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">
      {/* MO1.8.6 draws this label box 26 tall (77 to 103) with the line at
          100 to 101.5, so 1.5 above the text and 1.5 under the line. */}
      <SettingsSection label="Display" labelClassName="pt-[1.5px] mb-[1.5px]">
        <SettingsRow
          icon={ALargeSmall}
          title="Larger text"
          srDescription="Increases text and icon size throughout Centium"
          toggle={{ checked: accessibility.largerText, onChange: (v) => updateAccessibility({ largerText: v }) }}
        />
        <SettingsRow
          icon={Wind}
          title="Reduce motion"
          srDescription="Turns off animations and transitions"
          toggle={{ checked: accessibility.reduceMotion, onChange: (v) => updateAccessibility({ reduceMotion: v }) }}
        />
        <SettingsRow
          icon={Contrast}
          title="High contrast"
          srDescription="Darker text and stronger lines throughout Centium"
          toggle={{ checked: !!accessibility.highContrast, onChange: (v) => updateAccessibility({ highContrast: v }) }}
        />
        <SettingsRow
          icon={Pointer}
          title="Bigger tap targets"
          srDescription="Larger touch areas for buttons and rows"
          toggle={{ checked: !!accessibility.biggerTargets, onChange: (v) => updateAccessibility({ biggerTargets: v }) }}
        />
      </SettingsSection>
      </SettingsBody>
    </div>
  );
}
