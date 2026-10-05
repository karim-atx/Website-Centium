import { ALargeSmall, Wind } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";

// MO1.8.6 Accessibility, as a page (was a sheet). Settings are kept on this
// device, as before. The per-row descriptions the board drops are kept as
// subtitles (C27): they say what each switch actually does.
export default function AccessibilityPage() {
  const { accessibility, updateAccessibility } = useApp();

  return (
    <div>
      <PageHeader title="Accessibility" showBack />
      <SettingsSection label="Display">
        <SettingsRow
          icon={ALargeSmall}
          title="Larger text"
          subtitle="Increases text and icon size throughout Centium"
          toggle={{ checked: accessibility.largerText, onChange: (v) => updateAccessibility({ largerText: v }) }}
        />
        <SettingsRow
          icon={Wind}
          title="Reduce motion"
          subtitle="Turns off animations and transitions"
          toggle={{ checked: accessibility.reduceMotion, onChange: (v) => updateAccessibility({ reduceMotion: v }) }}
        />
      </SettingsSection>
    </div>
  );
}
