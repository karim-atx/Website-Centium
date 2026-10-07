import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
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
  Smartphone,
} from "lucide-react";
import { AppleHealthMark, WhoopMark } from "../../components/settings/DeviceMarks";

// MO1.8 Settings (R17, batch C; handover-complete pass). The board's layout:
// labelled sections of flat icon-tile rows instead of cards, sub-screens as
// routed pages (/app/settings/notifications, two-factor, accessibility,
// privacy, terms, language) and centred popups (Contact us, Report a bug,
// Rate this app). Section labels have the line (decision 20). Every row takes
// the handover's lavender tile (decision 23: one tile style).
//
// ROWS AS DRAWN: no subtitles under the permission or device rows (what each
// permission is for stays as screen-reader text). The one line a row still
// shows is the web's stand-in for BR-07 / BR-09, where the native app would
// open the device settings or HealthKit: "Blocked in browser settings", or a
// short note after a tap the browser can't carry out.
//
// THE ACCOUNT ROWS THE BOARD DOESN'T DRAW STAY (exception 1: safety, privacy
// and account features): Change password, Storage, Time zone and Forum
// blocks, in a "Data & account" section above General; the professionals'
// two-factor reminder lives on the two-factor page (R18).

/** What each permission is for: read to screen readers, not drawn (MO1.8). */
const PERMISSION_PURPOSE = {
  mic: "Needed for AI voice logging",
  camera: "Needed for scanning biomarkers & photos",
  location: "Needed to find gyms & businesses near you",
} as const;
type PermissionKey = keyof typeof PERMISSION_PURPOSE;

export default function Settings() {
  const {
    theme,
    toggleTheme,
    presentationSaveError,
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
  // Asking only from off; on stays on (the browser owns revoking it), and a
  // tap that tries to switch it off says where to change it instead.
  const [permissionNote, setPermissionNote] = useState<PermissionKey | null>(null);
  const permissionToggle = (key: PermissionKey, state: PermissionReading, ask: () => void) => ({
    checked: state === "granted",
    onChange: (next: boolean) => {
      if (next) {
        setPermissionNote(null);
        ask();
      } else setPermissionNote(key);
    },
  });
  /** The line under a permission row: only the states the web must explain. */
  const permissionLine = (key: PermissionKey, state: PermissionReading): string | undefined => {
    if (state === "denied") return t("Blocked in browser settings");
    if (state === "granted" && permissionNote === key) return t("Change this in your browser settings");
    return undefined;
  };

  // BR-07: switching a device on opens HealthKit / Health Connect / Whoop
  // OAuth, and a cancel returns it to off. The web has none of the three
  // (Apple Health and Health Connect are native-only; Whoop needs its OAuth
  // backend), so the switch returns to off at once and says why.
  const [deviceNote, setDeviceNote] = useState<"platform" | "whoop" | null>(null);

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
      <PageHeader title={t("Settings")} showBack tightBack />

      {/* MO1.8 measured: the sections sit 24 in from each edge (x 24 to 366,
          342 wide), 8 inside the header's 16; the first label starts 8 under
          the title (73 against the title's 25 + 40), so the header's 20 bottom
          margin collapses with -12 here. */}
      <SettingsBody className="-mt-3">
      <SettingsSection label={t("Appearance")}>
        <SettingsRow
          icon={theme === "dark" ? Moon : Sun}
          title={t("Dark Mode")}
          subtitle={`${theme === "dark" ? t("Currently on") : t("Currently off")}. ${t("Applies throughout Centium")}`}
          toggle={{ checked: theme === "dark", onChange: toggleTheme, label: "Dark mode" }}
          // MO1.8 draws no divider between Dark Mode and the colour theme.
          className="before:hidden"
        />
        {/* The board puts the colour theme under the Dark Mode row, in the
            text column: padding 4 0 14 50 (MO1.8), the five R20 themes. */}
        <div className="ps-[50px] pt-1 pb-[14px]">
          <p className="text-[12px] font-semibold text-charcoal-faint mb-2.5">{t("Color theme")}</p>
          <ColorThemePicker />
          {/* Not drawn: the save-error line in danger under the group (as
              MO1.8.3's Notifications); the choice stays applied. */}
          {presentationSaveError && (
            <p role="alert" className="mt-2 text-[12px] text-status-high">
              {presentationSaveError}
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection label={t("Permissions")}>
        <SettingsRow
          icon={Mic}
          title={t("Microphone")}
          subtitle={permissionLine("mic", mic)}
          srDescription={t(PERMISSION_PURPOSE.mic)}
          toggle={permissionToggle("mic", mic, () => void requestMedia("audio"))}
        />
        <SettingsRow
          icon={Camera}
          title={t("Camera")}
          subtitle={permissionLine("camera", camera)}
          srDescription={t(PERMISSION_PURPOSE.camera)}
          toggle={permissionToggle("camera", camera, () => void requestMedia("video"))}
        />
        <SettingsRow
          icon={MapPin}
          title={t("Location")}
          subtitle={permissionLine("location", location)}
          srDescription={t(PERMISSION_PURPOSE.location)}
          toggle={permissionToggle("location", location, requestLocation)}
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
          concept). MO1.8 draws a switch on each row (BR-07); "Health
          Connect" is the Android name (C-11). */}
      {user.accountType === "customer" && (
        <SettingsSection label={t("Connected devices")}>
          {/* MO1.8: the Apple Health and Whoop brand tiles (handover assets);
              the board has no Health Connect mark, so Android shows the
              Smartphone glyph on the standard lavender tile until one is
              supplied (kept-list 49). */}
          <SettingsRow
            {...(isIos ? { tile: <AppleHealthMark /> } : { icon: Smartphone })}
            title={isIos ? "Apple Health" : "Health Connect"}
            subtitle={
              deviceNote === "platform"
                ? isIos
                  ? "Connects in the Centium app on iPhone"
                  : "Connects in the Centium app on Android"
                : undefined
            }
            toggle={{
              checked: false,
              onChange: (next) => setDeviceNote(next ? "platform" : null),
            }}
          />
          <SettingsRow
            tile={<WhoopMark />}
            title="Whoop"
            subtitle={deviceNote === "whoop" ? "Whoop sync isn't available yet" : undefined}
            toggle={{
              checked: false,
              onChange: (next) => setDeviceNote(next ? "whoop" : null),
            }}
          />
        </SettingsSection>
      )}

      <SettingsSection label={t("Security")}>
        {/* Opens the two-factor page (MO1.8.4, another area's screen). */}
        <SettingsRow
          icon={ShieldCheck}
          title={t("Two-factor authentication")}
          onClick={() => navigate("/app/settings/two-factor")}
        />
      </SettingsSection>

      {/* Not on the board; kept as account features (exception 1). */}
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
        <SettingsRow icon={Accessibility} title={t("Accessibility")} onClick={() => navigate("/app/settings/accessibility")} />
        <SettingsRow icon={Lock} title={t("Privacy")} onClick={() => navigate("/app/settings/privacy")} />
        {/* V9 (QA 9.0): for every account type; Settings is the one shared page. */}
        <SettingsRow icon={FileText} title={t("Terms of Service")} onClick={() => navigate("/app/settings/terms")} />
        <SettingsRow icon={HelpCircle} title={t("Contact us")} onClick={() => setContactOpen(true)} />
        <SettingsRow icon={Bug} title={t("Report a bug")} onClick={() => setReportBugOpen(true)} />
        <SettingsRow icon={Star} title={t("Rate this app")} onClick={() => setRateAppOpen(true)} />
      </SettingsSection>

      {/* The board draws it red (D21, C18), centred at the foot, still
          behind the same 30-day confirm. MO1.8 / MO1.8.5.1 measured: 13 px
          on a 19 pt line, set in a box only as wide as its longest word, so
          it breaks after every word ("Delete" / "account"), 37 under the
          last row. */}
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="tap block mx-auto mt-[37px] w-min text-center text-[13px] leading-[19px] font-semibold text-status-high"
      >
        {t("Delete account")}
      </button>
      </SettingsBody>

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
