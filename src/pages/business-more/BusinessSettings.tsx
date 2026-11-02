import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Accessibility,
  BookOpen,
  Bug,
  Check,
  CircleHelp,
  EyeOff,
  FileText,
  KeyRound,
  Languages,
  Lock,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Star,
} from "lucide-react";
import { REFUND_POLICY_PATH } from "../../marketing/legal/refund";
import { BizCard, BizLabel, BizRow, SubHeader, LIST_BG } from "../../components/business-more/kit";
import { SettingsRowVariant } from "../../components/ui/settingsRowVariant";
import { ContactUsPopup } from "../../components/profile/ContactUsPopup";
import { ReportBugPopup } from "../../components/profile/ReportBugPopup";
import { RateAppPopup } from "../../components/profile/RateAppPopup";
import { StorageUsageRow } from "../../components/profile/StorageUsageRow";
import { ChangePasswordSheet } from "../../components/profile/ChangePasswordSheet";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";
import { CycleTrackingRow } from "../../components/profile/CycleTrackingRow";
import { TimezoneSetting } from "../../components/settings/TimezoneSetting";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { COLOR_THEMES } from "../../theme/colorThemes";
import { languageEntry } from "../../i18n/languages";
import { getMfaStatus } from "../../services/mfa";
import { enablePush, isThisDeviceRegistered, pushSupported, unsubscribeFromPush } from "../../services/push";
import { pushUnavailableReason, watchPermission, type PermissionReading } from "../settings/platform";
import { GymPremiumSetting } from "../../components/premium/GymPremiumSetting";

// MO1B-029 / -030 / -031 / -032 · business Settings (BizMoreV8
// screen="settings", lines 202 to 208): one Settings page with an account-type
// branch (the MO1B-029 recommendation); client and professional accounts keep
// the v5.1 page exactly as built. Rows are the BizMoreV8 sub-page rows.
//
// THE BUSINESS SET: Dark mode without a tile, the colour theme in its own card,
// Camera / Location / Push as switches with their purpose under them (no
// Microphone: no voice logging for businesses), Two-factor with its On / Off,
// Data & account (Change password stays here, user decision; Active sessions;
// Storage; Time zone; Cycle tracking, V6-125; Deactivate or delete, V6-35),
// General with Help centre and Business terms and waivers, the version line
// and "Delete business account". Forum blocks are hidden (no forum for
// businesses). Kept as they are: permission realism, the presentation save
// error, Contact us live chat (A5), Report a bug, Rate this app.

type PermissionKey = "camera" | "location";

export default function BusinessSettings() {
  const navigate = useNavigate();
  const { theme, toggleTheme, presentationSaveError, language, colorTheme, setColorTheme, t, authUserId } = useApp();
  const dark = useIsDark();

  // Permissions: read without prompting; a switch can only ask (K1).
  const [camera, setCamera] = useState<PermissionReading>(null);
  const [location, setLocation] = useState<PermissionReading>(null);
  const [note, setNote] = useState<PermissionKey | null>(null);
  useEffect(() => {
    const stops = [watchPermission("camera", setCamera), watchPermission("geolocation", setLocation)];
    return () => {
      for (const p of stops) void p.then((stop) => stop());
    };
  }, []);
  const askCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((tr) => tr.stop());
      setCamera("granted");
    } catch {
      setCamera("denied");
    }
  };
  const askLocation = () => navigator.geolocation.getCurrentPosition(() => setLocation("granted"), () => setLocation("denied"));
  const permToggle = (key: PermissionKey, state: PermissionReading, ask: () => void) => ({
    checked: state === "granted",
    onChange: (next: boolean) => {
      if (next) {
        setNote(null);
        ask();
      } else setNote(key);
    },
  });
  const permDesc = (key: PermissionKey, state: PermissionReading, purpose: string) => {
    if (state === "denied") return <span className="font-bold text-status-high">{t("Blocked in browser settings")}</span>;
    if (state === "granted" && note === key) return t("Change this in your browser settings");
    return purpose;
  };

  // Push: this device's registration (the live Notifications page owns the rest).
  const [pushAvailable] = useState(pushSupported);
  const [push, setPush] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushLine, setPushLine] = useState<string | null>(null);
  useEffect(() => {
    if (!pushAvailable) return;
    void isThisDeviceRegistered().then(setPush);
  }, [pushAvailable]);
  const togglePush = async (on: boolean) => {
    setPushBusy(true);
    setPushLine(null);
    if (on) {
      const r = await enablePush(authUserId ?? null);
      if (r.status === "ok") setPush(true);
      else setPushLine(r.message);
    } else {
      const r = await unsubscribeFromPush();
      if (r.status === "ok") setPush(false);
      else setPushLine(r.message);
    }
    setPushBusy(false);
  };

  const [twofa, setTwofa] = useState<boolean | null>(null);
  useEffect(() => {
    void getMfaStatus().then((r) => r.ok && setTwofa(r.data.factors.length > 0));
  }, []);

  const [contactOpen, setContactOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Round F (F7): Arabic reads "العربية · Beta" until every area is translated.
  const languageEntryNow = languageEntry(language);
  const languageName = languageEntryNow.beta ? `${languageEntryNow.name} · ${t("Beta")}` : languageEntryNow.name;

  return (
    <div>
      <SubHeader title={t("Settings")} />

      <BizLabel>{t("Appearance")}</BizLabel>
      <BizCard>
        <BizRow title={t("Dark mode")} toggle={{ checked: theme === "dark", onChange: toggleTheme, label: t("Dark mode") }} />
      </BizCard>

      {/* MO1B-029 row 4: the theme in its own card (padding 14 14 12, margin -6 0 13). */}
      <div className={LIST_BG} style={{ borderRadius: 18, padding: "14px 14px 12px", margin: "-6px 0 13px" }}>
        <p className="text-[12px] font-bold text-charcoal" style={{ marginBottom: 12 }}>
          {t("Color theme")}
        </p>
        <div role="radiogroup" aria-label={t("Color theme")} className="flex justify-between">
          {COLOR_THEMES.map((th) => {
            const on = colorTheme === th.value;
            return (
              <button
                key={th.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setColorTheme(th.value)}
                className="tap flex flex-col items-center"
                style={{ gap: 9, width: 46 }}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 38,
                    height: 38,
                    background: `linear-gradient(${language === "ar" ? "270deg" : "90deg"}, ${th.primary} 50%, ${th.secondary} 50%)`,
                    boxShadow: on ? `0 0 0 2px ${dark ? "#1C1F28" : "#FFFFFF"}, 0 0 0 4px ${th.primary}` : "none",
                    color: th.value === "centium" ? "#FFFFFF" : "#0D0B1A",
                  }}
                >
                  {on && <Check size={15} strokeWidth={3} aria-hidden />}
                </span>
                <span className={clsx("text-[11px] leading-none", on ? "font-bold text-primary-dark" : "font-medium text-charcoal-soft")}>{t(th.label)}</span>
              </button>
            );
          })}
        </div>
        {presentationSaveError && (
          <p role="alert" className="text-[12px] text-status-high" style={{ marginTop: 8 }}>
            {presentationSaveError}
          </p>
        )}
      </div>

      <BizLabel>{t("Permissions")}</BizLabel>
      <BizCard>
        <BizRow title={t("Camera")} desc={permDesc("camera", camera, t("For photos of your space"))} toggle={permToggle("camera", camera, () => void askCamera())} />
        <BizRow title={t("Location")} desc={permDesc("location", location, t("To pin your business on the map"))} toggle={permToggle("location", location, askLocation)} />
        <BizRow
          title={t("Push notifications")}
          desc={!pushAvailable ? t(pushUnavailableReason()) : pushLine ? t(pushLine) : undefined}
          toggle={{ checked: !!push, disabled: !pushAvailable || pushBusy || push === null, onChange: (v) => void togglePush(v) }}
        />
      </BizCard>

      <BizLabel>{t("Security")}</BizLabel>
      <BizCard>
        <BizRow
          icon={ShieldCheck}
          title={t("Two-factor authentication")}
          value={twofa === null ? undefined : twofa ? t("On") : t("Off")}
          onClick={() => navigate("/app/settings/two-factor")}
        />
      </BizCard>

      {/* Round G1 (EA): "Include Premium for members", owner only, with the Premium switch on. */}
      <GymPremiumSetting />

      <BizLabel>{t("Data & account")}</BizLabel>
      <SettingsRowVariant.Provider value="business">
        <BizCard>
          <BizRow icon={KeyRound} title={t("Change password")} onClick={() => setPwOpen(true)} />
          <BizRow icon={Smartphone} title={t("Active sessions")} desc={t("Where you're signed in")} onClick={() => navigate("/app/business/more/security")} />
          <StorageUsageRow />
          {/* The time zone field row is the shared one (Task T); it takes the card's
              14 / 15 inset, and its "Use device time zone" row is a business row. */}
          <div className="[&>#timezone]:ps-[14px] [&>#timezone]:pe-[15px]">
            <TimezoneSetting />
          </div>
          <div style={{ paddingBlock: "12px", paddingInline: "14px 15px" }}>
            <CycleTrackingRow />
          </div>
          <BizRow icon={EyeOff} title={t("Deactivate or delete")} desc={t("Pause, close or delete your business")} onClick={() => navigate("/app/business/more/deactivate")} />
        </BizCard>
      </SettingsRowVariant.Provider>

      <BizLabel>{t("General")}</BizLabel>
      <BizCard>
        <BizRow icon={Languages} title={t("Language")} value={<span lang={language}>{languageName}</span>} onClick={() => navigate("/app/settings/language")} />
        <BizRow icon={Accessibility} title={t("Accessibility")} desc={t("Larger text, reduced motion")} onClick={() => navigate("/app/settings/accessibility")} />
        <BizRow icon={Lock} title={t("Privacy")} onClick={() => navigate("/app/settings/privacy")} />
        <BizRow icon={FileText} title={t("Terms of Service")} onClick={() => navigate("/app/settings/terms")} />
        {/* Round F (DN): the Refund and Cancellation Policy, part of the Terms. */}
        <BizRow icon={ScrollText} title={t("Refund and cancellation policy")} onClick={() => navigate(REFUND_POLICY_PATH)} />
        <BizRow icon={CircleHelp} title={t("Contact us")} onClick={() => setContactOpen(true)} />
        <BizRow icon={Bug} title={t("Report a bug")} onClick={() => setBugOpen(true)} />
        <BizRow icon={Star} title={t("Rate this app")} onClick={() => setRateOpen(true)} />
        <BizRow icon={BookOpen} title={t("Help centre")} desc={t("Guides for running your business")} onClick={() => navigate("/app/business/more/help")} />
        <BizRow icon={ScrollText} title={t("Business terms and waivers")} onClick={() => navigate("/app/business/more/business-terms")} />
      </BizCard>

      {/* MO1B-032 row 5: the version line. The build carries no version number
          yet (package.json 0.0.0), so the line names the app only. */}
      <p className="text-center text-[10.5px] text-th-9a94b3" style={{ margin: "4px 0 6px" }}>
        {t("Centium for Business")}
      </p>
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="tap w-full flex items-center justify-center text-[14px] font-bold text-status-high"
        style={{ height: 48 }}
      >
        {t("Delete business account")}
      </button>

      <ContactUsPopup open={contactOpen} onClose={() => setContactOpen(false)} />
      <ReportBugPopup key={bugOpen ? "bug-open" : "bug-closed"} open={bugOpen} onClose={() => setBugOpen(false)} />
      <RateAppPopup key={rateOpen ? "rate-open" : "rate-closed"} open={rateOpen} onClose={() => setRateOpen(false)} />
      <ChangePasswordSheet key={pwOpen ? "pw-open" : "pw-closed"} open={pwOpen} onClose={() => setPwOpen(false)} />
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} business />
    </div>
  );
}
