import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, Users, Store, User as UserIcon, CalendarDays, ClipboardList, MessageCircle, MessageSquare, BarChart3, Tag, Building2, Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Primary items shown in the mobile bottom nav.
export const primaryNavItems: NavItem[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/food", label: "Food", icon: UtensilsCrossed },
  { to: "/app/workout", label: "Workout", icon: Dumbbell },
  { to: "/app/health", label: "Health", icon: HeartPulse },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

// V5 (QA 5.0): professionals have no personal Home/Food/Workout/Health
// tracking — "My Clients" (the "/professionals" route, which renders
// ProfessionalDashboard for this account type) is their main page instead.
// V6 (QA 6.0): Calendar, Templates (Workout Template Builder) and Messages
// replace the Home/Food/Workout/Health tabs the professional doesn't use —
// Meal Plans and Health Metrics live in More alongside the rest.
// V7 (QA 7.0): Meal Plans now takes the bottom-nav slot Messages used to
// hold — Messages moved into More instead.
export const professionalPrimaryNavItems: NavItem[] = [
  { to: "/app/professionals", label: "Clients", icon: Users },
  { to: "/app/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals/templates", label: "Training", icon: ClipboardList },
  { to: "/app/professionals/meal-plans", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

// V6 (QA 6.0): "remove everything that does not pertain to the business
// owner related UI" — same trim as professionals. A business account's
// main page ("/") already renders BusinessDashboard, so there's no separate
// personal Home/Food/Workout/Health tracking to navigate to.
// V7 (QA 7.0): Analytics, Marketplace (listing creation) and Messages are
// now real tabs — Employees/Classes (gym-type only) live in More instead,
// since the bottom nav only has 5 slots.
// V9 (QA 9.0): "Add a new button between analytics and marketplace called
// operations that house both the employees and classes buttons found in
// more" — Operations takes the bottom-nav slot Messages used to hold;
// Messages moves into More instead (still a 5-slot bar).
export const businessPrimaryNavItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: Store },
  { to: "/app/business/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/business/operations", label: "Operations", icon: Briefcase },
  { to: "/app/business/marketplace", label: "Marketplace", icon: Tag },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

// Full set shown in the desktop sidebar.
export const sidebarNavItems: NavItem[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/food", label: "Food", icon: UtensilsCrossed },
  { to: "/app/workout", label: "Workout", icon: Dumbbell },
  { to: "/app/health", label: "Health", icon: HeartPulse },
  { to: "/app/mind", label: "Mind", icon: Sparkles },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals", label: "Professionals", icon: Users },
  { to: "/app/forum", label: "Forum", icon: MessageSquare },
  { to: "/app/marketplace", label: "Explore", icon: Store },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export const professionalSidebarNavItems: NavItem[] = [
  { to: "/app/professionals", label: "My Clients", icon: Users },
  { to: "/app/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/professionals/templates", label: "Training", icon: ClipboardList },
  { to: "/app/professionals/meal-plans", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/app/professionals/messages", label: "Messages", icon: MessageCircle },
  { to: "/app/professionals/health-metrics", label: "Health Metrics", icon: HeartPulse },
  { to: "/app/marketplace", label: "Explore", icon: Store },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export const businessSidebarNavItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: Store },
  { to: "/app/business/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/business/operations", label: "Operations", icon: Briefcase },
  { to: "/app/business/marketplace", label: "Marketplace", icon: Tag },
  { to: "/app/business/messages", label: "Messages", icon: MessageCircle },
  { to: "/app/business/employees", label: "Employees", icon: Users },
  { to: "/app/business/classes", label: "Classes", icon: CalendarDays },
  { to: "/app/business/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/business/profile", label: "Business Profile", icon: Building2 },
];
