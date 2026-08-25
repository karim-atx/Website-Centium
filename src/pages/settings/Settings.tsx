import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Toggle } from "../../components/ui/Toggle";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { IntegrationsCard } from "../../components/health/IntegrationsCard";
import { ColorThemePicker } from "../../components/profile/ColorThemePicker";
import { ContactUsSheet } from "../../components/profile/ContactUsSheet";
import { NotificationsSheet } from "../../components/profile/NotificationsSheet";
import { AccessibilitySheet } from "../../components/profile/AccessibilitySheet";
import { PrivacySheet } from "../../components/profile/PrivacySheet";
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
  Check,
  Accessibility,
} from "lucide-react";

export default function Settings() {
  const { theme, toggleTheme, language, setLanguage, t, user } = useApp();
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

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
      <PageHeader title={t("Settings")} showBack />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        {t("Appearance")}
      </p>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{t("Dark Mode")}</p>
              <p className="text-[11px] text-charcoal-faint">
                {theme === "dark" ? t("Currently on") : t("Currently off")} — {t("applies throughout Centium")}
              </p>
            </div>
          </div>
          <Toggle checked={theme === "dark"} onChange={toggleTheme} label="Dark mode" />
        </div>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
          {t("Color theme")}
        </p>
        <ColorThemePicker />
      </Card>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        {t("Permissions")}
      </p>
      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <Mic size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{t("Microphone")}</p>
              <p className="text-[11px] text-charcoal-faint">
                {t(micAllowed === true ? "Granted" : micAllowed === false ? "Denied" : "Needed for AI voice logging")}
              </p>
            </div>
          </div>
          <button
            onClick={requestMic}
            className="tap text-xs font-semibold text-sohati bg-sohati-pale rounded-full px-3 py-1.5"
          >
            {t(micAllowed === true ? "Re-check" : "Allow")}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <Camera size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{t("Camera")}</p>
              <p className="text-[11px] text-charcoal-faint">
                {t(
                  cameraAllowed === true
                    ? "Granted"
                    : cameraAllowed === false
                    ? "Denied"
                    : "Needed for scanning biomarkers & photos"
                )}
              </p>
            </div>
          </div>
          <button
            onClick={requestCamera}
            className="tap text-xs font-semibold text-sohati bg-sohati-pale rounded-full px-3 py-1.5"
          >
            {t(cameraAllowed === true ? "Re-check" : "Allow")}
          </button>
        </div>
      </Card>

      {/* V8 (QA 8.0): "remove the connected device row/section" — auto-sync
          integrations are a personal health-tracking concept, not something
          a professional or business account has any use for. */}
      {user.accountType === "customer" && (
        <>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            {t("Connected devices")}
          </p>
          <div className="mb-6">
            <IntegrationsCard />
          </div>
        </>
      )}

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        {t("General")}
      </p>
      <Card padded={false} className="divide-y divide-charcoal/[0.04]">
        <button
          onClick={() => setNotificationsOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">{t("Notifications")}</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
        <button
          onClick={() => setLanguageOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">{t("Language")}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-charcoal-faint">
            {language === "ar" ? t("Arabic") : t("English")}
            <ChevronRight size={15} />
          </span>
        </button>
        <button
          onClick={() => setAccessibilityOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Accessibility size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Accessibility</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
        <button
          onClick={() => setPrivacyOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">{t("Privacy")}</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
        <button
          onClick={() => setContactOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">{t("Contact us")}</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
      </Card>

      <ContactUsSheet open={contactOpen} onClose={() => setContactOpen(false)} />
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AccessibilitySheet open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} />
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      <BottomSheet open={languageOpen} onClose={() => setLanguageOpen(false)} title={t("Language")}>
        <div className="space-y-2.5 animate-fade-slide-up">
          {(["en", "ar"] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => {
                setLanguage(lng);
                setLanguageOpen(false);
              }}
              className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-charcoal">
                {lng === "ar" ? t("Arabic") : t("English")}
              </span>
              {language === lng && <Check size={16} className="text-sohati" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
