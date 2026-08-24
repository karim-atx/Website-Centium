import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { IntegrationsCard } from "../../components/health/IntegrationsCard";
import { ColorThemePicker } from "../../components/profile/ColorThemePicker";
import { ContactUsSheet } from "../../components/profile/ContactUsSheet";
import { useApp } from "../../context/AppContext";
import { useState } from "react";
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Lock,
  HelpCircle,
  Mic,
  Camera,
  ChevronRight,
} from "lucide-react";

export default function Settings() {
  const { theme, toggleTheme } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicAllowed(true);
    } catch {
      setMicAllowed(false);
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraAllowed(true);
    } catch {
      setCameraAllowed(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" showBack />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Appearance
      </p>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">Dark Mode</p>
              <p className="text-[11px] text-charcoal-faint">
                {theme === "dark" ? "Currently on" : "Currently off"} — applies throughout Centium
              </p>
            </div>
          </div>
          <Toggle checked={theme === "dark"} onChange={toggleTheme} label="Dark mode" />
        </div>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
          Color theme
        </p>
        <ColorThemePicker />
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Permissions
      </p>
      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <Mic size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">Microphone</p>
              <p className="text-[11px] text-charcoal-faint">
                {micAllowed === true ? "Granted" : micAllowed === false ? "Denied" : "Needed for AI voice logging"}
              </p>
            </div>
          </div>
          <button
            onClick={requestMic}
            className="tap text-xs font-semibold text-sohati bg-sohati-pale rounded-full px-3 py-1.5"
          >
            {micAllowed === true ? "Re-check" : "Allow"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <Camera size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">Camera</p>
              <p className="text-[11px] text-charcoal-faint">
                {cameraAllowed === true
                  ? "Granted"
                  : cameraAllowed === false
                  ? "Denied"
                  : "Needed for scanning biomarkers & photos"}
              </p>
            </div>
          </div>
          <button
            onClick={requestCamera}
            className="tap text-xs font-semibold text-sohati bg-sohati-pale rounded-full px-3 py-1.5"
          >
            {cameraAllowed === true ? "Re-check" : "Allow"}
          </button>
        </div>
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Connected devices
      </p>
      <div className="mb-6">
        <IntegrationsCard />
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        General
      </p>
      <Card padded={false} className="divide-y divide-charcoal/[0.04]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Notifications</span>
          </div>
          <Toggle checked={notifications} onChange={setNotifications} label="Notifications" />
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Language</span>
          </div>
          <span className="text-xs text-charcoal-faint">English</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Privacy</span>
          </div>
        </div>
        <button
          onClick={() => setContactOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Contact us</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
      </Card>

      <ContactUsSheet open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
