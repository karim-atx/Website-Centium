import { ArrowRightLeft, CalendarClock, CalendarDays, Gauge, Hash, Repeat, Sun, UserCheck, type LucideIcon } from "lucide-react";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { t } from "../../../i18n/core";
import { classesLabel, commitmentLabel, daysLabel, joinAnd, limitLabel, renewsLabel, renewsSub } from "./planModel";

// The plan page's "Who it covers" rows (moved unchanged from PlanDetailPage so the
// Front desk's web plan page, MembershipsTab.web, shows the same rows).

export function coverRows(plan: MembershipPlanRow, runsClasses: boolean, nameOf: (id: string) => string | null): { icon: LucideIcon; title: string; sub: string; value: string }[] {
  const classes = plan.allowedClassTypes;
  const covers = classes
    ? { icon: CalendarDays, title: t("Covers"), sub: joinAnd(classes), value: classesLabel(classes) }
    : runsClasses
      ? { icon: CalendarDays, title: t("Covers"), sub: t("Every class on your schedule"), value: t("All classes") }
      : { icon: Sun, title: t("Covers"), sub: t("Entry to the gym"), value: t("Gym entry") };
  const anyone = { icon: UserCheck, title: t("Who can buy"), sub: t("Anyone on Explore"), value: t("Anyone") };
  if (plan.kind === "day_pass") return [{ ...covers, sub: classes ? covers.sub : runsClasses ? t("Every class that day") : t("One day at the gym") }, anyone];
  if (plan.kind === "drop_in") return [{ ...covers, title: t("Which classes") }, anyone];
  if (plan.kind === "class_pack") {
    return [
      { icon: Hash, title: t("Sessions"), sub: t("Classes in the pack"), value: plan.sessionsInPack ? String(plan.sessionsInPack) : "–" },
      { icon: CalendarClock, title: t("Valid for"), sub: t("From the day it's bought"), value: plan.validForDays ? daysLabel(plan.validForDays) : "–" },
      covers,
    ];
  }
  if (plan.kind === "intro_offer") {
    const target = plan.convertsToPlanId ? nameOf(plan.convertsToPlanId) : null;
    return [
      { icon: CalendarClock, title: t("Length"), sub: t("From the day it's bought"), value: plan.validForDays ? daysLabel(plan.validForDays) : "–" },
      { icon: ArrowRightLeft, title: t("Converts to"), sub: t("Suggested when the offer ends"), value: target ?? t("Nothing") },
    ];
  }
  return [
    ...(runsClasses ? [{ icon: CalendarDays, title: t("Classes"), sub: classes ? joinAnd(classes) : t("Every class on your schedule"), value: classesLabel(classes) }] : []),
    anyone,
    ...(runsClasses ? [{ icon: Gauge, title: t("Limit"), sub: t("How often a member can book"), value: limitLabel(plan.visitsPerPeriod, plan.billing) }] : []),
    { icon: Repeat, title: t("Renews"), sub: renewsSub(plan.billing), value: renewsLabel(plan.billing) },
    ...(plan.minimumTermMonths || plan.noticeDays ? [{ icon: CalendarClock, title: t("Commitment"), sub: t("Minimum term and notice"), value: commitmentLabel(plan.minimumTermMonths, plan.noticeDays) }] : []),
  ];
}
