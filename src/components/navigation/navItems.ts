import { Home, UtensilsCrossed, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, Users, Store, User as UserIcon } from "lucide-react";
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
export const professionalPrimaryNavItems: NavItem[] = [
  { to: "/professionals", label: "Clients", icon: Users },
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
  { to: "/mind", label: "Mind", icon: Sparkles },
  { to: "/marketplace", label: "Explore", icon: Store },
  { to: "/profile", label: "Profile", icon: UserIcon },
];
