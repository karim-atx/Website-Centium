// Every web-app page and route component, in one module that App.tsx loads
// on demand (appPagesLazy.ts). The marketing site (/, /contact, /legal and
// the 404) is the only thing the entry chunk renders, so a visitor to the
// landing no longer downloads the whole app before the first paint.
//
// ONE module on purpose, not one chunk per page: once it has loaded, every
// app route renders synchronously exactly as it did when these were static
// imports, so moving between app pages never suspends. A new app route adds
// its page here and takes it from appPages in App.tsx.
import { withWeb } from "./components/web/withWeb";
import ServicesPageMobile from "./pages/business-ops/appointments/ServicesPage";
import ServicesPageWeb from "./pages/business-ops/appointments/ServicesPage.web";
import ClassRulesPageMobile from "./pages/business-ops/classes/ClassRulesPage";
import ClassRulesPageWeb from "./pages/business-ops/classes/ClassRulesPage.web";
import HealthMobile from "./pages/health/Health";
import HealthWeb from "./pages/health/web/Health.web";

export { MfaChallenge } from "./components/auth/MfaChallenge";
export { Layout } from "./components/navigation/Layout";
export { default as Onboarding } from "./pages/onboarding/Onboarding";
export { default as BusinessSetupPage } from "./pages/onboarding/business/BusinessSetupPage";
export { default as Home } from "./pages/home/Home";
export { default as Food } from "./pages/food/Food";
export { default as NutrientSummaryPage } from "./pages/food/NutrientSummaryPage";
export { default as Workout } from "./pages/workout/Workout";
// Website viewport v1: the web layout from 1024px wide (WC-HE); the mobile page below.
export const Health = withWeb(HealthMobile, HealthWeb);
export { default as HealthChecks } from "./pages/health/HealthChecks";
export { default as HealthSources } from "./pages/health/HealthSources";
export { default as HealthRecords } from "./pages/health/HealthRecords";
export { default as WaterPage } from "./pages/health/metrics/WaterPage";
export { default as StepsPage } from "./pages/health/metrics/StepsPage";
export { default as SleepPage } from "./pages/health/metrics/SleepPage";
export { default as CaloriesPage } from "./pages/health/metrics/CaloriesPage";
export { default as HeartRatePage } from "./pages/health/metrics/HeartRatePage";
export { default as HeartRateAlertsPage } from "./pages/health/metrics/HeartRateAlertsPage";
export { default as BloodPressurePage } from "./pages/health/metrics/BloodPressurePage";
export { default as WeightPage } from "./pages/health/metrics/WeightPage";
export { default as Cycle } from "./pages/cycle/Cycle";
export { default as Contraception } from "./pages/contraception/Contraception";
export { default as Mind } from "./pages/mind/Mind";
export { default as Professionals } from "./pages/professionals/Professionals";
export { default as ProfessionalDetail } from "./pages/professionals/ProfessionalDetail";
export { default as ProfessionalReviews } from "./pages/professionals/ProfessionalReviews";
export { default as ProVerification } from "./pages/professionals/ProVerification";
export { default as Messages } from "./pages/messages/Messages";
export { default as CallLink, LegacyCallLink } from "./components/calls/CallLink";
export { default as ProRoutes, ProHomeRedirect, ProOnlyRedirect } from "./pages/pro/ProRoutes";
export { default as ProMoreRoutes } from "./pages/pro/more/MoreRoutes";
export { default as Marketplace } from "./pages/marketplace/Marketplace";
export { default as MarketplaceCategoryPage } from "./pages/marketplace/MarketplaceCategoryPage";
export { default as MyBookingsPage } from "./pages/marketplace/MyBookingsPage";
export { default as MyRewardsPage } from "./pages/marketplace/MyRewardsPage";
export { default as PointsHistoryPage } from "./pages/marketplace/PointsHistoryPage";
export { default as HowToEarnPage } from "./pages/marketplace/HowToEarnPage";
export { default as OfferDetailPage } from "./pages/marketplace/rewards/OfferDetailPage";
export { default as VoucherPage } from "./pages/marketplace/rewards/VoucherPage";
export { ClientOnly } from "./pages/marketplace/ClientOnly";
export { default as ClientNotificationsPage } from "./pages/notifications/ClientNotificationsPage";
export { default as AnalyticsShell } from "./pages/business-analytics/AnalyticsShell";
export { default as MarketRoutes } from "./pages/business-market/MarketRoutes";
export { default as RedeemVoucher } from "./pages/business-market/RedeemVoucher";
export { default as HiringRoutes } from "./pages/business-market/hiring/HiringRoutes";
export { default as BusinessNotificationsPage } from "./pages/notifications/BusinessNotificationsPage";
export { default as BusinessProfilePage } from "./pages/business-more/profile/BusinessProfilePage";
export { default as BusinessMoreRoutes } from "./pages/business-more/BusinessMoreRoutes";
export { default as TeamRoutes } from "./pages/business-team/TeamRoutes";
export { default as SchedulePage } from "./pages/business-ops/classes/SchedulePage";
export { default as SessionPage } from "./pages/business-ops/classes/SessionPage";
// Website viewport v1: the web layout from 1024px wide (WB-CS-SC.8); the mobile page below.
export const ClassRulesPage = withWeb(ClassRulesPageMobile, ClassRulesPageWeb);
export { default as BusinessOperationsTab } from "./pages/marketplace/BusinessOperationsTab";
export { PlansRoutes } from "./pages/business-ops/plans";
export { BusinessOrdersRoutes, StoreProductsRoute } from "./pages/business-ops/store/StoreOpsRoutes";
export { default as BusinessAppointmentsRoutes } from "./pages/business-ops/appointments/AppointmentsRoutes";
// Website viewport v1: the web layout from 1024px wide (WB-ST-AP.3); the mobile page below.
export const AppointmentServicesPage = withWeb(ServicesPageMobile, ServicesPageWeb);
export { default as StoreRoutes } from "./pages/store/StoreRoutes";
export { default as AppointmentRoutes } from "./pages/appointments/AppointmentRoutes";
export { default as BusinessVenueTab } from "./pages/marketplace/BusinessVenueTab";
export { default as BusinessCalendarTab } from "./pages/marketplace/BusinessCalendarTab";
export { default as Profile } from "./pages/profile/Profile";
export { default as MyCv } from "./pages/profile/MyCv";
export { default as Subscription } from "./pages/subscription/Subscription";
export { default as More } from "./pages/profile/More";
export { default as ClientCalendarTab } from "./pages/profile/ClientCalendarTab";
export { default as Community, CertificatePage, CourseBuilderPage, CoursePage, ForumNewPage, ForumNicknamePage, ForumPostPage, LessonPage, MyCoursesPage } from "./pages/community/Community";
export { default as Settings } from "./pages/settings/Settings";
export { default as NotificationsPage } from "./pages/settings/NotificationsPage";
export { default as HealthCheckRemindersPage } from "./pages/settings/HealthCheckRemindersPage";
export { default as AccessibilityPage } from "./pages/settings/AccessibilityPage";
export { default as PrivacyPage } from "./pages/settings/PrivacyPage";
export { default as TermsPage } from "./pages/settings/TermsPage";
export { default as LanguagePage } from "./pages/settings/LanguagePage";
export { default as YourMusicPage } from "./pages/settings/YourMusicPage";
export { default as BillingHelpPage } from "./pages/settings/BillingHelpPage";
export { default as TwoFactorPage } from "./pages/settings/TwoFactorPage";
export { default as TwoFactorSetupPage } from "./pages/settings/TwoFactorSetupPage";
export { default as ResetPassword } from "./pages/auth/ResetPassword";
export { default as PublicCertificate } from "./pages/courses/PublicCertificate";
export { default as InviteLanding } from "./pages/public/InviteLanding";
export { default as PublicProfile } from "./pages/public/PublicProfile";
export { default as PublicBooking } from "./pages/public/PublicBooking";
export { default as SharedCard } from "./pages/share/SharedCard";
export { default as BusinessLinkPage } from "./pages/share/BusinessLinkPage";
export { default as CarePlan } from "./pages/health/CarePlan";
// Round G3: the Premium content and readers (hidden while the switch is off).
export { default as CentiumProgrammesPage } from "./pages/workout/centium/CentiumProgrammesPage";
export { default as CentiumProgrammePage } from "./pages/workout/centium/CentiumProgrammePage";
export { default as MindLibraryPage } from "./pages/mind/library/MindLibraryPage";
export { default as LibrarySessionPage } from "./pages/mind/library/LibrarySessionPage";
export { default as WeeklyReviewPage } from "./pages/home/review/WeeklyReviewPage";
export { default as DoctorSummaryPage } from "./pages/health/doctor/DoctorSummaryPage";
// Round G4.
export { default as MealPlannerPage } from "./pages/food/planner/MealPlannerPage";
export { default as ProgressPhotosPage } from "./pages/workout/photos/ProgressPhotosPage";
export { ConsoleGate } from "./components/business-console/ConsoleGate";
