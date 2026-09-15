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
import { ReportBugSheet } from "../../components/profile/ReportBugSheet";
import { RateAppSheet } from "../../components/profile/RateAppSheet";
import { StorageUsageCard } from "../../components/profile/StorageUsageCard";
import { TermsOfServiceSheet } from "../../components/profile/TermsOfServiceSheet";
import { TwoFactorSheet } from "../../components/profile/TwoFactorSheet";
import { useApp } from "../../context/AppContext";
import { subscribeToPush } from "../../services/push";
import { getMfaStatus } from "../../services/mfa";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Lock,
  HelpCircle,
  Mic,
  Camera,
  MapPin,
  BellRing,
  ChevronRight,
  Check,
  Accessibility,
  Bug,
  Star,
  FileText,
  ShieldCheck,
} from "lucide-react";

/**
 * Whether this browser can receive a push notification at all.
 *
 * FEATURE DETECTION, NEVER PLATFORM DETECTION, and the distinction is the
 * entire design of this row. `detectPlatform()` in IntegrationsCard answers
 * this shape of question with `/android/i.test(userAgent) ? "android" : "ios"`
 * — every desktop browser is "ios" to it. That is fine for choosing between
 * two integration logos and wrong here, where the question is whether three
 * specific APIs exist. A user-agent test would have told a Chrome-on-Windows
 * user to add the app to their Home Screen.
 *
 * ALL THREE ARE REQUIRED, and the third is the one that is easy to miss.
 * `Notification` is what actually displays the thing; iOS shipped
 * `serviceWorker` years before a web app there could show a notification, so
 * checking only the first two reports success on exactly the platform most
 * likely to fail.
 */
function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Whether the app is running installed rather than in a browser tab.
 *
 * Two checks because they cover different engines: the display-mode media
 * query is the standard, and `navigator.standalone` is Safari's own
 * non-standard predecessor, which is still what iOS reports.
 */
function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Whether this is iOS or iPadOS.
 *
 * USED ONLY TO PICK A MESSAGE, NEVER TO GATE ANYTHING. `pushSupported()`
 * decides what the row can do; this decides which sentence explains a `false`,
 * because "add it to your Home Screen" is actionable on iOS and misleading
 * everywhere else. If this function is ever wrong, the cost is showing the
 * wrong explanation, not blocking a browser that works.
 *
 * The second clause is iPadOS 13+, which reports itself as a Mac. A real Mac
 * has no touch points, so maxTouchPoints separates them.
 */
function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Notification.permission's three states in this card's boolean|null shape. */
function permissionTriState(p: NotificationPermission): boolean | null {
  if (p === "granted") return true;
  if (p === "denied") return false;
  return null;
}

export default function Settings() {
  const { theme, toggleTheme, language, setLanguage, t, user, deleteAccount, authUserId } = useApp();
  const navigate = useNavigate();
  // QA 12.0: "For all UIs put the ability to delete account which when
  // pressed will prompt you to make sure... Make it not that obvious or
  // big." Settings.tsx is already the one shared page for every account
  // type, so this covers Client/Professional/Business at once.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  // Resolved once. Neither answer can change while the page is mounted —
  // installing the app or switching browser reloads it either way.
  const [pushAvailable] = useState(pushSupported);
  // THE ONLY ROW THAT CAN READ ITS TRUE STATE WITHOUT ASKING. The three above
  // start at null because the only way to learn a camera or mic permission is
  // to request it, which prompts. `Notification.permission` is readable
  // synchronously and prompts nobody, so this row shows what is actually the
  // case on arrival rather than "unknown until you press Allow".
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(() =>
    pushSupported() ? permissionTriState(Notification.permission) : null
  );
  // Kept apart from notificationsAllowed on purpose: permission granted with a
  // failed subscription is a real state, and collapsing it into "Denied" would
  // blame the user for something the browser or the server did.
  const [pushError, setPushError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [reportBugOpen, setReportBugOpen] = useState(false);
  const [rateAppOpen, setRateAppOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);

  // Whether a factor is enrolled, so the row can say which state it is in
  // rather than making someone open the sheet to find out. Null while unknown
  // — including when the read fails, where a neutral description is honest
  // and "Off" would be a claim we cannot make.
  //
  // Re-read when the sheet CLOSES, which is the only thing that changes it.
  // mfaPending from context is a different question (a challenge is
  // outstanding) and would be false for exactly the enrolled users this row
  // is describing.
  const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null);
  useEffect(() => {
    if (twoFactorOpen) return;
    let cancelled = false;
    void getMfaStatus().then((result) => {
      if (cancelled || !result.ok) return;
      setMfaEnrolled(result.data.factors.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [twoFactorOpen]);

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

  /**
   * Asks the OS for permission, then registers this browser to receive push.
   *
   * TWO STEPS, AND THEY FAIL DIFFERENTLY. Permission is the browser's answer
   * about notifications; the subscription is a record in push_subscriptions
   * that lets the server address this specific browser. Granting the first and
   * failing the second leaves someone who has seen "Granted" and will never be
   * rung — so the subscribe failure gets its own message rather than being
   * folded into the permission state, which would either lie or show "Denied"
   * for something the user did allow.
   *
   * SUBSCRIBE ONLY AFTER "granted". Calling subscribe() with userVisibleOnly
   * on an undecided permission raises the prompt itself, from a service layer,
   * with nothing on screen explaining it.
   */
  const requestNotifications = async () => {
    if (!pushAvailable) return;

    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      // Some engines reject rather than resolve when called outside a user
      // gesture or in a context where notifications are disallowed outright.
      setNotificationsAllowed(false);
      return;
    }

    setNotificationsAllowed(permissionTriState(permission));
    setPushError(null);
    if (permission !== "granted") return;

    if (!authUserId) {
      setPushError("Sign in to receive notifications on this device.");
      return;
    }

    setSubscribing(true);
    const result = await subscribeToPush(authUserId);
    setSubscribing(false);
    // "ok" is the only outcome that leaves the row reading plain "Granted".
    if (result.status !== "ok") setPushError(result.message);
  };

  // QA 11.0: "Besides microphone and camera, the app should also ask for
  // location permission" — used for distance-to-gym/business results in
  // Explore.
  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocationAllowed(true),
      () => setLocationAllowed(false)
    );
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
            className="tap text-xs font-semibold text-primary bg-primary-pale rounded-full px-3 py-1.5"
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
            className="tap text-xs font-semibold text-primary bg-primary-pale rounded-full px-3 py-1.5"
          >
            {t(cameraAllowed === true ? "Re-check" : "Allow")}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{t("Location")}</p>
              <p className="text-[11px] text-charcoal-faint">
                {t(
                  locationAllowed === true
                    ? "Granted"
                    : locationAllowed === false
                    ? "Denied"
                    : "Needed to find gyms & businesses near you"
                )}
              </p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="tap text-xs font-semibold text-primary bg-primary-pale rounded-full px-3 py-1.5"
          >
            {t(locationAllowed === true ? "Re-check" : "Allow")}
          </button>
        </div>
        {/* "Push notifications", not "Notifications", because the General card
            below already has a Notifications row — that one opens preference
            toggles for which alerts you want, this one is the OS permission
            that decides whether any of them can be delivered at all. Two rows
            with the same name on one page would read as a duplicate. */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft">
              <BellRing size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{t("Push notifications")}</p>
              <p className="text-[11px] text-charcoal-faint">
                {!pushAvailable
                  ? isIosLike() && !isInstalled()
                    ? // The honest instruction rather than a flat "unsupported":
                      // on iOS the APIs genuinely do appear once the app is
                      // installed to the Home Screen, so this is a step the
                      // user can take, not a dead end.
                      t("Add Centium to your Home Screen to receive call notifications when the app is closed")
                    : t("Not available in this browser")
                  : subscribing
                  ? t("Registering this device…")
                  : pushError
                  ? // The permission answer is still shown by the button; this
                    // line carries why nothing will arrive despite it.
                    pushError
                  : t(
                      notificationsAllowed === true
                        ? "Granted"
                        : notificationsAllowed === false
                        ? "Denied"
                        : "Needed for calls & messages when Centium is closed"
                    )}
              </p>
            </div>
          </div>
          {/* No button when the APIs are absent: there is nothing to request,
              and an Allow that cannot do anything is worse than no control. */}
          {pushAvailable && (
            <button
              onClick={() => void requestNotifications()}
              disabled={subscribing}
              className="tap text-xs font-semibold text-primary bg-primary-pale rounded-full px-3 py-1.5 disabled:opacity-60"
            >
              {t(notificationsAllowed === true ? "Re-check" : "Allow")}
            </button>
          )}
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

      {/* Above General rather than inside it: the rows below are all controls
          that open something, and this opens nothing — it is a reading. */}
      <StorageUsageCard />

      {/* Security did not exist before two-factor, which is why it is a new
          section rather than a row under General: the only auth screen this
          app had was the password-reset page, reachable only from an email.
          Placed above General because "who can get into my account" outranks
          "which language is the interface in". */}
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Security
      </p>
      <Card padded={false} className="mb-6">
        <button
          onClick={() => setTwoFactorOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-charcoal-soft" />
            <div className="text-left">
              <span className="text-sm font-medium text-charcoal">
                Two-factor authentication
              </span>
              <p className="text-[11px] text-charcoal-faint">
                {mfaEnrolled === null
                  ? "A code from your phone, as well as your password"
                  : mfaEnrolled
                  ? "On — a code is required when you sign in"
                  : "Off — your password alone signs you in"}
              </p>
            </div>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
        </button>
      </Card>

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
        {/* V9 (QA 9.0): "a button for terms and services... applicable in
            the other professional and business UI as well" — Settings.tsx
            is already the one shared page for every account type. */}
        <button
          onClick={() => setTosOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Terms of Service</span>
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
        {/* Below Contact us, which is still the prototype mock it has always
            been — three controls that connect to nothing. This one does write
            somewhere, so it goes last rather than above and reads as the
            working option. Reconciling the two is a product question, left
            alone here and recorded as a follow-up. */}
        <button
          onClick={() => setReportBugOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Bug size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Report a bug</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
        {/* Beside Report a bug because they are the same kind of thing: both
            write to a write-only table nobody is notified about, and both say
            so in their own copy. Kept below it so the two working options sit
            together, under the Contact us mock. */}
        <button
          onClick={() => setRateAppOpen(true)}
          className="tap w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Star size={16} className="text-charcoal-soft" />
            <span className="text-sm font-medium text-charcoal">Rate this app</span>
          </div>
          <ChevronRight size={15} className="text-charcoal-faint" />
        </button>
      </Card>

      <button
        onClick={() => setDeleteOpen(true)}
        className="tap block mx-auto mt-6 text-[11px] font-medium text-charcoal-faint"
      >
        Delete account
      </button>

      <ContactUsSheet open={contactOpen} onClose={() => setContactOpen(false)} />
      {/* Keyed on open so each opening mounts a fresh sheet: that is what
          clears the previous report text and any stale error, without an
          effect setting state on open. */}
      <ReportBugSheet
        key={reportBugOpen ? "open" : "closed"}
        open={reportBugOpen}
        onClose={() => setReportBugOpen(false)}
      />
      {/* Keyed for the same reason, and it matters more here: a rating left
          over from a previous visit would be a number the user never chose
          this time, sitting one tap from being submitted. */}
      <RateAppSheet
        key={rateAppOpen ? "review-open" : "review-closed"}
        open={rateAppOpen}
        onClose={() => setRateAppOpen(false)}
      />
      <TwoFactorSheet
        key={twoFactorOpen ? "2fa-open" : "2fa-closed"}
        open={twoFactorOpen}
        onClose={() => setTwoFactorOpen(false)}
      />
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AccessibilitySheet open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} />
      {/* Closing Privacy before opening Delete rather than stacking them: two
          bottom sheets open at once would leave the user dismissing one to
          find another underneath. Settings owns both flags, which is why the
          handoff lives here and not inside either sheet. */}
      <PrivacySheet
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        onDeleteAccount={() => {
          setPrivacyOpen(false);
          setDeleteOpen(true);
        }}
      />
      <TermsOfServiceSheet open={tosOpen} onClose={() => setTosOpen(false)} />

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
              {language === lng && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <div className="space-y-4 animate-fade-slide-up">
          {/* The old copy claimed this was permanent and could not be undone.
              Neither was true: nothing was deleted at all, and now that
              deletion is real it runs after a 30-day grace period during which
              it can be cancelled. Saying so is the point. */}
          <p className="text-sm text-charcoal-soft leading-relaxed">
            Your account will be scheduled for deletion in 30 days. After that your food
            logs, workouts, health metrics and connections are permanently removed.
          </p>
          <p className="text-sm text-charcoal-soft leading-relaxed">
            You can change your mind at any point in those 30 days — sign back in and choose
            “Cancel deletion”.
          </p>
          {deleteError && (
            <p className="text-xs font-semibold text-status-high text-center">{deleteError}</p>
          )}
          <button
            onClick={async () => {
              if (deleting) return;
              setDeleteError(null);
              setDeleting(true);
              const result = await deleteAccount();
              setDeleting(false);
              // Only leave on a confirmed success. A failed request keeps the
              // user signed in with their data intact and says what happened,
              // rather than navigating away as though it had worked.
              if (!result.ok) {
                setDeleteError(result.message ?? "Could not schedule deletion.");
                return;
              }
              setDeleteOpen(false);
              navigate("/app/onboarding");
            }}
            disabled={deleting}
            className="tap w-full rounded-2xl bg-status-high text-white text-sm font-semibold py-3.5 disabled:opacity-60"
          >
            {deleting ? "Scheduling…" : "Schedule my account for deletion"}
          </button>
          <button
            onClick={() => setDeleteOpen(false)}
            className="tap w-full rounded-2xl bg-cream-soft text-charcoal text-sm font-semibold py-3.5"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
