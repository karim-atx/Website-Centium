import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, Users, Store, User as UserIcon, CalendarDays, ClipboardList, MessageCircle } from "lucide-react";
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
export const professionalPrimaryNavItems: NavItem[] = [
  { to: "/professionals", label: "Clients", icon: Users },
  { to: "/professionals/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/professionals/templates", label: "Templates", icon: ClipboardList },
  { to: "/professionals/messages", label: "Messages", icon: MessageCircle },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

// V6 (QA 6.0): "remove everything that does not pertain to the business
// owner related UI" — same trim as professionals. A business account's
// main page ("/") already renders BusinessDashboard, so there's no separate
// personal Home/Food/Workout/Health tracking to navigate to.
export const businessPrimaryNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Store },
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
  { to: "/profile", label: "Profile", icon: UserIcon },
];
