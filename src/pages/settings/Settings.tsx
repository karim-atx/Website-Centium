import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { ColorThemePicker } from "../../components/profile/ColorThemePicker";
import { ContactUsPopup } from "../../components/profile/ContactUsPopup";
import { ReportBugPopup } from "../../components/profile/ReportBugPopup";
import { RateAppPopup } from "../../components/profile/RateAppPopup";
import { StorageUsageRow } from "../../components/profile/StorageUsageRow";
import { ChangePasswordSheet } from "../../components/profile/ChangePasswordSheet";
import { DeleteAccountSheet } from "../../components/profile/DeleteAccountSheet";
import { TimezoneSetting } from "../../components/settings/TimezoneSetting";
import { ForumBlocksSetting } from "../../components/forum/ForumBlocksSetting";
import { useApp } from "../../context/AppContext";
import { pushSupported } from "../../services/push";
import { detectPlatform } from "../../components/health/IntegrationsCard";
import { APP_LANGUAGES } from "../../i18n/languages";
import { pushUnavailableReason, watchPermission, type PermissionReading } from "./platform";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  Globe,
  Lock,
  HelpCircle,
  Mic,
  Camera,
  MapPin,
  BellRing,
  Accessibility,
  Bug,
  Star,
  FileText,
  ShieldCheck,
  KeyRound,
  Apple,
  Smartphone,
  Watch,
} from "lucide-react";

// MO1.8 Settings (R17, batch C). The board's layout: labelled sections of
// flat icon-tile rows instead of cards, sub-screens as routed pages
// (/app/settings/notifications, two-factor, accessibility, privacy, terms,
// language) and centred popups (Contact us, Report a bug, Rate this app).
// Colours are today's (decision 15) and the section labels are the pre-R1
// ones (decision 17, C1).
//
// EVERY ROW THE BOARD DROPS IS KEPT (C13): Change password, Storage, Time
// zone and Forum blocks live in a "Data & account" section above General; the
// professionals' two-factor reminder moved to the two-factor page (R18).

/** A permission's state, as the row says it. */
function permissionLine(state: PermissionReading, purpose: string): string {
  if (state === "granted") return "Allowed. Change this in your browser settings.";
  if (state === "denied") return "Blocked in browser settings";
  return purpose;
}

export default function Settings() {
  const {
    theme,
    toggleTheme,
    language,
    t,
    user,
  } = useApp();
  const navigate = useNavigate();

  // Cycle tracking moved to the profile in R15 (C6): Safety & content for a
  // customer, Health tracking on a professional's Profile, and the Business
  // Profile for a business (components/profile/CycleTrackingRow).

  // The cycle tracker's Settings tab links to /app/settings#timezone.
  //
  // TRIED A FEW TIMES, because two things move the page after this mounts:
  // Layout scrolls to the top on every route change, and the rows above the
  // time zone grow as their reads come back. So it scrolls instantly, then
  // again until the row is actually in view, for up to a second.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== "#timezone") return;
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById("timezone");
      tries += 1;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top >= 0 && r.bottom <= window.innerHeight) {
          window.clearInterval(id);
          return;
        }
        el.scrollIntoView({ block: "center" });
      }
      if (tries >= 10) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [hash]);

  // --- permissions (C14): the real state, read without prompting ------------
  //
  // A browser cannot revoke a permission, so a toggle can only ask. Off and
  // tapped: the browser asks. On: it stays on, and the row says where to
  // change it. Blocked: off, and the row says so. Where the browser can't say
  // without asking (null), the row shows what the permission is for.
  const [mic, setMic] = useState<PermissionReading>(null);
  const [camera, setCamera] = useState<PermissionReading>(null);
  const [location, setLocation] = useState<PermissionReading>(null);
  useEffect(() => {
    const stops: Promise<() => void>[] = [
      watchPermission("microphone", setMic),
      watchPermission("camera", setCamera),
      watchPermission("geolocation", setLocation),
    ];
    return () => {
      for (const p of stops) void p.then((stop) => stop());
    };
  }, []);

  const requestMedia = async (kind: "audio" | "video") => {
    const set = kind === "audio" ? setMic : setCamera;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: true } : { video: true });
      stream.getTracks().forEach((track) => track.stop());
      set("granted");
    } catch {
      set("denied");
    }
  };
  // QA 11.0: location is used for distance-to-gym/business results in Explore.
  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocation("granted"),
      () => setLocation("denied")
    );
  };
  // Asking only from off; on stays on (the browser owns revoking it).
  const permissionToggle = (state: PermissionReading, ask: () => void) => ({
    checked: state === "granted",
    onChange: (next: boolean) => {
      if (next) ask();
    },
  });

  // Resolved once: installing the app or switching browser reloads the page.
  const [pushAvailable] = useState(pushSupported);

  const [contactOpen, setContactOpen] = useState(false);
  const [reportBugOpen, setReportBugOpen] = useState(false);
  const [rateAppOpen, setRateAppOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isIos = detectPlatform() === "ios";
  const languageName = APP_LANGUAGES.find((l) => l.code === language)?.name ?? "English";

  return (
    <div>
      <PageHeader title={t("Settings")} showBack />

      <SettingsSection label={t("Appearance")}>
        <SettingsRow
          icon={theme === "dark" ? Moon : Sun}
          title={t("Dark Mode")}
          subtitle={`${theme === "dark" ? t("Currently on") : t("Currently off")}. ${t("Applies throughout Centium")}`}
          toggle={{ checked: theme === "dark", onChange: toggleTheme, label: "Dark mode" }}
        />
        {/* The board puts the colour theme under the Dark Mode row, in the
            text column. Today's four themes until R20 (C17). */}
        <div className="ps-[50px] pb-2">
          <p className="text-[12px] font-semibold text-charcoal-soft mb-2.5">{t("Color theme")}</p>
          <ColorThemePicker />
        </div>
      </SettingsSection>

      <SettingsSection label={t("Permissions")}>
        <SettingsRow
          icon={Mic}
          title={t("Microphone")}
          subtitle={t(permissionLine(mic, "Needed for AI voice logging"))}
          toggle={permissionToggle(mic, () => void requestMedia("audio"))}
        />
        <SettingsRow
          icon={Camera}
          title={t("Camera")}
          subtitle={t(permissionLine(camera, "Needed for scanning biomarkers & photos"))}
          toggle={permissionToggle(camera, () => void requestMedia("video"))}
        />
        <SettingsRow
          icon={MapPin}
          title={t("Location")}
          subtitle={t(permissionLine(location, "Needed to find gyms & businesses near you"))}
          toggle={permissionToggle(location, requestLocation)}
        />
        {/* Opens Notifications, where "Allow notifications" is the device's
            permission and registration (C15). The hint stays here when push
            can't work in this browser at all. */}
        <SettingsRow
          icon={BellRing}
          title={t("Push notifications")}
          subtitle={pushAvailable ? undefined : t(pushUnavailableReason())}
          onClick={() => navigate("/app/settings/notifications")}
        />
      </SettingsSection>

      {/* Customers only, as before (V8: device sync is a personal tracking
          concept). Nothing syncs yet, so the rows say "Coming soon" and carry
          no switch (C16); "Health Connect" is the Android name (C-11). */}
      {user.accountType === "customer" && (
        <SettingsSection label={t("Connected devices")}>
          <SettingsRow
            icon={isIos ? Apple : Smartphone}
            title={isIos ? "Apple Health" : "Health Connect"}
            subtitle="Would sync steps, sleep, heart rate and calories burned"
            value="Coming soon"
          />
          <SettingsRow icon={Watch} title="Whoop" value="Coming soon" />
          <p className="mt-2 text-[11px] text-charcoal-faint">
            Device sync isn't available yet. Until it is, weight and water are the metrics you can log yourself.
          </p>
        </SettingsSection>
      )}

      <SettingsSection label="Security">
        <SettingsRow
          icon={ShieldCheck}
          title="Two-factor authentication"
          onClick={() => navigate("/app/settings/two-factor")}
        />
      </SettingsSection>

      <SettingsSection label="Data & account">
        {/* Task J. */}
        <SettingsRow icon={KeyRound} title="Change password" onClick={() => setChangePasswordOpen(true)} />
        <StorageUsageRow />
        {/* Task T: the profile's time zone, for every account (#timezone). */}
        <TimezoneSetting />
        <ForumBlocksSetting />
      </SettingsSection>

      <SettingsSection label={t("General")}>
        <SettingsRow
          icon={Globe}
          title={t("Language")}
          value={<span lang={language}>{languageName}</span>}
          onClick={() => navigate("/app/settings/language")}
        />
        <SettingsRow icon={Accessibility} title="Accessibility" onClick={() => navigate("/app/settings/accessibility")} />
        <SettingsRow icon={Lock} title={t("Privacy")} onClick={() => navigate("/app/settings/privacy")} />
        {/* V9 (QA 9.0): for every account type; Settings is the one shared page. */}
        <SettingsRow icon={FileText} title="Terms of Service" onClick={() => navigate("/app/settings/terms")} />
        <SettingsRow icon={HelpCircle} title={t("Contact us")} onClick={() => setContactOpen(true)} />
        <SettingsRow icon={Bug} title="Report a bug" onClick={() => setReportBugOpen(true)} />
        <SettingsRow icon={Star} title="Rate this app" onClick={() => setRateAppOpen(true)} />
      </SettingsSection>

      {/* QA 12.0 asked for this to be "not that obvious or big"; the board
          draws it red (D21, C18): red text at the foot, still behind the same
          30-day confirm. */}
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="tap block mx-auto mt-8 text-[13px] font-semibold text-status-high"
      >
        Delete account
      </button>

      <ContactUsPopup open={contactOpen} onClose={() => setContactOpen(false)} />
      {/* Keyed on open so each opening mounts fresh: no previous report text,
          no stale error, no rating left over from a previous visit. */}
      <ReportBugPopup key={reportBugOpen ? "bug-open" : "bug-closed"} open={reportBugOpen} onClose={() => setReportBugOpen(false)} />
      <RateAppPopup key={rateAppOpen ? "rate-open" : "rate-closed"} open={rateAppOpen} onClose={() => setRateAppOpen(false)} />
      {/* Keyed so nothing typed into a password field outlives the sheet. */}
      <ChangePasswordSheet
        key={changePasswordOpen ? "pw-open" : "pw-closed"}
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
