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
import HomeMobile from "./pages/home/Home";
import HomeWeb from "./pages/home/Home.web";
import MindMobile from "./pages/mind/Mind";
import MindWeb from "./pages/mind/Mind.web";
import FoodMobile from "./pages/food/Food";
import FoodWeb from "./pages/food/Food.web";
import NutrientSummaryPageMobile from "./pages/food/NutrientSummaryPage";
import NutrientSummaryPageWeb from "./pages/food/NutrientSummaryPage.web";
import HealthMobile from "./pages/health/Health";
import HealthWeb from "./pages/health/web/Health.web";
import HealthSourcesMobile from "./pages/health/HealthSources";
import HealthSourcesWeb from "./pages/health/web/HealthSources.web";
import MoreMobile from "./pages/profile/More";
import MoreWeb from "./pages/profile/More.web";
import SchedulePageMobile from "./pages/business-ops/classes/SchedulePage";
import SchedulePageWeb from "./pages/business-ops/classes/SchedulePage.web";
import SessionPageMobile from "./pages/business-ops/classes/SessionPage";
import SessionPageWeb from "./pages/business-ops/classes/SessionPage.web";
import ProfileMobile from "./pages/profile/Profile";
import ProfileWeb from "./pages/profile/Profile.web";
import SubscriptionMobile from "./pages/subscription/Subscription";
import SubscriptionWeb from "./pages/subscription/Subscription.web";
import BusinessOperationsTabMobile from "./pages/marketplace/BusinessOperationsTab";
import BusinessOperationsTabWeb from "./pages/marketplace/BusinessOperationsTab.web";
import AnalyticsShellMobile from "./pages/business-analytics/AnalyticsShell";
import AnalyticsShellWeb from "./pages/business-analytics/AnalyticsShell.web";
import MarketRoutesMobile from "./pages/business-market/MarketRoutes";
import MarketRoutesWeb from "./pages/business-market/MarketplacePage.web";
import ProfessionalsMobile from "./pages/professionals/Professionals";
import ProfessionalDetailMobile from "./pages/professionals/ProfessionalDetail";
import ProfessionalReviewsMobile from "./pages/professionals/ProfessionalReviews";
import ProfessionalsWeb from "./pages/professionals/Professionals.web";
import CommunityMobile, { CoursePage as CoursePageMobile, ForumNewPage as ForumNewPageMobile, ForumNicknamePage as ForumNicknamePageMobile, ForumPostPage as ForumPostPageMobile } from "./pages/community/Community";
import CommunityWeb, { CoursePageWeb, ForumNewPageWeb, ForumNicknamePageWeb, ForumPostPageWeb } from "./pages/community/Community.web";

export { MfaChallenge } from "./components/auth/MfaChallenge";
export { Layout } from "./components/navigation/Layout";
export { default as Onboarding } from "./pages/onboarding/Onboarding";
export { default as BusinessSetupPage } from "./pages/onboarding/business/BusinessSetupPage";
// Website viewport v1: the client Home's web layout from 1024px wide (WC-HO); business accounts and the mobile page below.
export const Home = withWeb(HomeMobile, HomeWeb);
// Website viewport v1: the web layout from 1024px wide (WC-FO, WC-FO.4); the mobile page below.
export const Food = withWeb(FoodMobile, FoodWeb);
export const NutrientSummaryPage = withWeb(NutrientSummaryPageMobile, NutrientSummaryPageWeb);
// Website viewport v1: the web layout from 1024px wide (WC-HE); the mobile page below.
export const Health = withWeb(HealthMobile, HealthWeb);
import WorkoutMobile from "./pages/workout/Workout";
import WorkoutWeb from "./pages/workout/Workout.web";
export const Workout = withWeb(WorkoutMobile, WorkoutWeb);
export { default as HealthChecks } from "./pages/health/HealthChecks";
// Website viewport v1: the web layout from 1024px wide (WC-HE.G); the mobile page below.
export const HealthSources = withWeb(HealthSourcesMobile, HealthSourcesWeb);
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
// Website viewport v1: the Mind hub's web layout from 1024px wide (WC-MI); the sections and the mobile page below.
export const Mind = withWeb(MindMobile, MindWeb);
// Website viewport v1: Professionals' web layout from 1024px wide (WC-PR, WC-PR.1 to .3: one page for the list, the profile and the reviews); the mobile pages below.
export const Professionals = withWeb(ProfessionalsMobile, ProfessionalsWeb);
export const ProfessionalDetail = withWeb(ProfessionalDetailMobile, ProfessionalsWeb);
export const ProfessionalReviews = withWeb(ProfessionalReviewsMobile, ProfessionalsWeb);
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
// Website viewport v1: the Analytics web layout from 1024px wide (WB-AN); the mobile shell below.
export const AnalyticsShell = withWeb(AnalyticsShellMobile, AnalyticsShellWeb);
// Website viewport v1: the Marketplace tabs web layout from 1024px wide (WB-MA); the mobile routes below.
export const MarketRoutes = withWeb(MarketRoutesMobile, MarketRoutesWeb);
export { default as RedeemVoucher } from "./pages/business-market/RedeemVoucher";
export { default as HiringRoutes } from "./pages/business-market/hiring/HiringRoutes";
export { default as BusinessNotificationsPage } from "./pages/notifications/BusinessNotificationsPage";
export { default as BusinessProfilePage } from "./pages/business-more/profile/BusinessProfilePage";
export { default as BusinessMoreRoutes } from "./pages/business-more/BusinessMoreRoutes";
export { default as TeamRoutes } from "./pages/business-team/TeamRoutes";
// Website viewport v1: the web layout from 1024px wide (WB-CS-SC, .1); the mobile page below.
export const SchedulePage = withWeb(SchedulePageMobile, SchedulePageWeb);
// Website viewport v1: the web layout from 1024px wide (WB-CS-SC.3); the mobile page below.
export const SessionPage = withWeb(SessionPageMobile, SessionPageWeb);
// Website viewport v1: the web layout from 1024px wide (WB-CS-SC.8); the mobile page below.
export const ClassRulesPage = withWeb(ClassRulesPageMobile, ClassRulesPageWeb);
// Website viewport v1: a gym's Front desk web layout from 1024px wide (WB-FD); other types their mobile tab, centred; the mobile tab below.
export const BusinessOperationsTab = withWeb(BusinessOperationsTabMobile, BusinessOperationsTabWeb);
export { PlansRoutes } from "./pages/business-ops/plans";
export { BusinessOrdersRoutes, StoreProductsRoute } from "./pages/business-ops/store/StoreOpsRoutes";
export { default as BusinessAppointmentsRoutes } from "./pages/business-ops/appointments/AppointmentsRoutes";
// Website viewport v1: the web layout from 1024px wide (WB-ST-AP.3); the mobile page below.
export const AppointmentServicesPage = withWeb(ServicesPageMobile, ServicesPageWeb);
export { default as StoreRoutes } from "./pages/store/StoreRoutes";
export { default as AppointmentRoutes } from "./pages/appointments/AppointmentRoutes";
export { default as BusinessVenueTab } from "./pages/marketplace/BusinessVenueTab";
export { default as BusinessCalendarTab } from "./pages/marketplace/BusinessCalendarTab";
export const Profile = withWeb(ProfileMobile, ProfileWeb);
export { default as MyCv } from "./pages/profile/MyCv";
export const Subscription = withWeb(SubscriptionMobile, SubscriptionWeb);
// Website viewport v1: the client More column from 1024px wide (decision 4); the mobile page below.
export const More = withWeb(MoreMobile, MoreWeb);
export { default as ClientCalendarTab } from "./pages/profile/ClientCalendarTab";
export { CertificatePage, CourseBuilderPage, LessonPage, MyCoursesPage } from "./pages/community/Community";
// Website viewport v1: the Community web layouts from 1024px wide (WC-CO); professionals and the mobile pages below.
export const Community = withWeb(CommunityMobile, CommunityWeb);
export const ForumNewPage = withWeb(ForumNewPageMobile, ForumNewPageWeb);
export const ForumNicknamePage = withWeb(ForumNicknamePageMobile, ForumNicknamePageWeb);
export const ForumPostPage = withWeb(ForumPostPageMobile, ForumPostPageWeb);
export const CoursePage = withWeb(CoursePageMobile, CoursePageWeb);
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
