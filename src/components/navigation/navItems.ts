import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, Users, Store, User as UserIcon, CalendarDays, ClipboardList, MessageCircle, BarChart3, Tag, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Primary items shown in the mobile bottom nav.
export const primaryNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/more", label: "More", icon: MoreHorizontal },
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
  { to: "/professionals", label: "Clients", icon: Users },
  { to: "/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/professionals/templates", label: "Templates", icon: ClipboardList },
  { to: "/professionals/meal-plans", label: "Meal Plans", icon: UtensilsCrossed },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

// V6 (QA 6.0): "remove everything that does not pertain to the business
// owner related UI" — same trim as professionals. A business account's
// main page ("/") already renders BusinessDashboard, so there's no separate
// personal Home/Food/Workout/Health tracking to navigate to.
// V7 (QA 7.0): Analytics, Marketplace (listing creation) and Messages are
// now real tabs — Employees/Classes (gym-type only) live in More instead,
// since the bottom nav only has 5 slots.
export const businessPrimaryNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Store },
  { to: "/business/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/business/marketplace", label: "Marketplace", icon: Tag },
  { to: "/business/messages", label: "Messages", icon: MessageCircle },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

// Full set shown in the desktop sidebar.
export const sidebarNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/mind", label: "Mind", icon: Sparkles },
  { to: "/professionals", label: "Professionals", icon: Users },
  { to: "/marketplace", label: "Explore", icon: Store },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export const professionalSidebarNavItems: NavItem[] = [
  { to: "/professionals", label: "My Clients", icon: Users },
  { to: "/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/professionals/templates", label: "Templates", icon: ClipboardList },
  { to: "/professionals/meal-plans", label: "Meal Plans", icon: UtensilsCrossed },
  { to: "/professionals/messages", label: "Messages", icon: MessageCircle },
  { to: "/professionals/health-metrics", label: "Health Metrics", icon: HeartPulse },
  { to: "/marketplace", label: "Explore", icon: Store },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export const businessSidebarNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Store },
  { to: "/business/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/business/marketplace", label: "Marketplace", icon: Tag },
  { to: "/business/messages", label: "Messages", icon: MessageCircle },
  { to: "/business/employees", label: "Employees", icon: Users },
  { to: "/business/classes", label: "Classes", icon: CalendarDays },
  { to: "/business/profile", label: "Business Profile", icon: Building2 },
  { to: "/profile", label: "Profile", icon: UserIcon },
];
