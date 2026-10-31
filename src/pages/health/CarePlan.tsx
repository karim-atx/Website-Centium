import { useCallback, useEffect, useState } from "react";
import { Activity, CalendarClock, ChevronLeft, ClipboardPlus, Lightbulb, Target, type LucideIcon } from "lucide-react";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { HealthDisclaimer } from "../../components/ui/HealthDisclaimer";
import { EmptyCard, INK, INK_FAINT, RetryCard, Skel, rangeText, useHealthMode } from "../../components/health/records/kit";
import { getMyCarePlan, type CarePlanItem, type MyCarePlan } from "../../services/care-plan";
import { firstNameOf } from "../../services/access-requests/copy";
import { fromLine, groupItems, localIsoDay, noteLine, relativeDay, shortDay } from "../../services/care-plan/logic";
import { todayLocal } from "../../utils/date";
import { range12 } from "../../utils/time12";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { textPx, linePx } from "../../theme/textSize";

// Release 3 · CU16 v2 "Your care plan (new page)", re-homed on v6 Health
// (route /app/health/care-plan, from the Health records row). Values from the
// handoff's r7.js cuCarePlan7 with r28.js carePlan28's header (19/700 title,
// 11 #A79E93 line), sectionHead (ui.js) and listCard6 (r6b.js).
//
// The client's own published care plan and only its client-visible items
// (care_plan_items.visible_to_client), read-only. The frame's sample content
// (progress pills and "Now …" values, the Nutrition / Activity / Sleep /
// Medication headings, "Working with you") has no data behind it in DB-6, so
// it is not drawn: each row is the professional's own words, in their order.

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; plan: MyCarePlan | null };

/** lib.js tokens: light / dark. */
const tok = (dark: boolean) => ({
  chS: dark ? "#B8B3C7" : "#5B5349",
  chT: dark ? "#9F9CAC" : "#A79E93",
  pr: dark ? "#A991FE" : "#AEA1DC",
  prPale: dark ? "#303141" : "#F0EDF9",
  prDeep: dark ? "#C3B3FB" : "#5F5093",
  prAccent: dark ? "#9A8CD6" : "#7D67D9",
  card: dark ? "#1C1F28" : "#FFFFFF",
  bCard: dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.11)",
  b06: dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.06)",
  tile: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9",
});

export default function CarePlan() {
  const back = useBack();
  const online = useOnline();
  const { dark, hc } = useHealthMode();
  const t = tok(dark);
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const fetchPlan = useCallback(async () => {
    setLoad({ state: "loading" });
    const r = await getMyCarePlan();
    setLoad(r.ok ? { state: "ready", plan: r.plan } : { state: "error", message: r.message });
  }, []);
  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const plan = load.state === "ready" ? load.plan : null;
  const first = plan ? firstNameOf(plan.professionalName) : "";
  const groups = plan ? groupItems(plan.items) : null;

  return (
    <div className="pb-8" style={{ paddingTop: 16 }}>
      {/* Header: chevron-left 18/2 in 36, gap 6, m-bottom 14; title 19/700
          ls -0.03em; the "From …" line 11 #A79E93 m-top 3. */}
      <div className="flex items-start" style={{ gap: 6, marginBottom: 14, marginInlineStart: -8 }}>
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
          style={{ width: 36, height: 36 }}
        >
          <ChevronLeft size={18} strokeWidth={2} style={{ color: t.chS }} aria-hidden />
        </button>
        <div className="min-w-0 flex-1" style={{ paddingTop: 2 }}>
          <h1 style={{ fontSize: textPx(19), lineHeight: linePx(28.5), fontWeight: 700, letterSpacing: "-0.03em", color: INK }}>Your care plan</h1>
          {plan && (
            <p data-care-plan-from style={{ marginTop: 3, fontSize: textPx(11), lineHeight: linePx(15), color: hc ? INK_FAINT : t.chT }}>
              From {fromLine(plan.professionalName, plan.professionalRole, plan.roleIsSpecialty)} · reviewed{" "}
              {shortDay(localIsoDay(plan.publishedAt))}
            </p>
          )}
        </div>
      </div>

      {load.state === "loading" && (
        <div aria-busy="true" aria-label="Loading your care plan" className="flex flex-col" style={{ gap: 12 }}>
          <Skel w="100%" h={62} r={20} />
          <Skel w="40%" h={12} />
          <Skel w="100%" h={120} r={20} />
        </div>
      )}

      {load.state === "error" && <RetryCard message={online ? load.message : OFFLINE_MESSAGE} onRetry={() => void fetchPlan()} />}

      {load.state === "ready" && !plan && (
        <EmptyCard icon={ClipboardPlus} title="No care plan yet" body="When a professional shares a care plan with you, it shows here." />
      )}

      {plan && groups && (
        <>
          {plan.nextFollowUp && (
            // r20 prPale, pad 12 14, m-bottom 12, gap 10; calendar-clock
            // 18/1.75 prDeep; title 13.5/700, line 12 chS.
            <div
              data-care-plan-review
              className="flex items-center"
              style={{ gap: 10, borderRadius: 20, padding: "12px 14px", marginBottom: 12, background: t.prPale, border: hc ? `1px solid ${t.bCard}` : undefined }}
            >
              <CalendarClock size={18} strokeWidth={1.75} style={{ color: t.prDeep }} aria-hidden className="shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13.5), lineHeight: linePx(19), fontWeight: 700, color: INK }}>
                  Next review {shortDay(plan.nextFollowUp.dueOn)}
                </span>
                <ReviewLine followUp={plan.nextFollowUp} color={t.chS} />
              </span>
            </div>
          )}

          {groups.goal.length > 0 && <ItemSection label="Your goals" icon={Target} items={groups.goal} />}
          {groups.recommendation.length > 0 && <ItemSection label={`What ${first} recommends`} icon={Lightbulb} items={groups.recommendation} />}
          {groups.monitoring.length > 0 && <ItemSection label={`What ${first} keeps an eye on`} icon={Activity} items={groups.monitoring} showRange />}
          {plan.items.length === 0 && (
            <EmptyCard icon={ClipboardPlus} title="Nothing to show yet" body={`${first} hasn't added anything you can see to this plan yet.`} />
          )}
        </>
      )}

      <HealthDisclaimer className="mt-[18px]" />
    </div>
  );
}

/** "Review iron levels · Sat, Oct 17 at 11:00 to 11:30 AM" (booked) or the note alone. */
function ReviewLine({ followUp, color }: { followUp: NonNullable<MyCarePlan["nextFollowUp"]>; color: string }) {
  const note = noteLine(followUp.note);
  const ev = followUp.event;
  let when = "";
  if (ev) {
    const day = relativeDay(ev.day, todayLocal());
    const time = ev.allDay ? "" : range12(ev.start, ev.end);
    when = time ? `${day} at ${time}` : day;
    // Sentence-initial without a note: "Today at …".
    if (!note) when = when.charAt(0).toUpperCase() + when.slice(1);
  }
  const text = [note, when].filter(Boolean).join(" · ");
  if (!text) return null;
  return (
    <span className="block" style={{ fontSize: textPx(12), lineHeight: linePx(17), color }}>
      {text}
    </span>
  );
}

/**
 * sectionHead (ui.js): 11/600 lh14 uppercase ls .14em chF, pb 7.5 over a
 * 1.5 #AEA1DC rule, m-bottom 10. listCard6 (r6b.js): card r20 1px bCard pad
 * 4 14 m-bottom 12; rows gap 12 pad 11 0 1px b06 between; tile 34 r11 with a
 * 16/1.75 prAccent glyph; title 13/600; meta 11 chF lh 1.4.
 */
function ItemSection({ label, icon: Icon, items, showRange }: { label: string; icon: LucideIcon; items: CarePlanItem[]; showRange?: boolean }) {
  const { dark } = useHealthMode();
  const t = tok(dark);
  return (
    <section>
      <div style={{ marginBottom: 10, paddingBottom: 7.5, borderBottom: `1.5px solid ${t.pr}` }}>
        <h2 className="uppercase" style={{ fontSize: textPx(11), lineHeight: linePx(14), fontWeight: 600, letterSpacing: "0.14em", color: INK_FAINT }}>
          {label}
        </h2>
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
        {items.map((item, i) => {
          const range = showRange ? rangeText(item.thresholdLow, item.thresholdHigh) : "–";
          return (
            <div
              key={item.id}
              data-care-plan-item={item.kind}
              className="flex items-center"
              style={{ gap: 12, padding: "11px 0", borderBottom: i < items.length - 1 ? `1px solid ${t.b06}` : "none" }}
            >
              <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: t.tile }}>
                <Icon size={16} strokeWidth={1.75} style={{ color: t.prAccent }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 600, color: INK, overflowWrap: "anywhere" }}>
                  {item.body}
                </span>
                {range !== "–" && (
                  <span className="block" style={{ fontSize: textPx(11), lineHeight: 1.4, color: INK_FAINT }}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
