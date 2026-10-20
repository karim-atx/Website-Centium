import React, { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Home, MapPin, Package, Phone, Star, Video, type LucideIcon } from "lucide-react";
import { CtaButton, Section, StateLine } from "../pro/profile/kit";
import { INK } from "../pro/proInk";
import { priceLabel, sessionLine } from "../pro/profile/profileModel";
import { OfflineLine, ProCardSkeleton, ProError } from "../pro/states";
import { useIsDark } from "../../hooks/useIsDark";
import { fetchPlansFor, planPriceLabel, type Plan } from "../../services/hires";
import {
  NOT_TAKING_BOOKINGS,
  WEEKDAY_LETTERS,
  bookingAllowed,
  fetchBookableSessions,
  fetchOpenSlots,
  localDay,
  mondayOf,
  sessionsThatFit,
  slotsByDay,
  weekDays,
  type BookableSession,
} from "../../services/public-pro";
import type { ReviewRow } from "../../services/professional-reviews";
import { textPx } from "../../theme/textSize";

/**
 * Release 3 · W7: the MO3 v3 public-profile sections on the client-facing
 * professional profile (ProfessionalDetail), as additions under the CV:
 * Services, Where, Availability this week and Reviews (r13 pubProfile13), and
 * "Book a session" (the MO3 pair's secondary button, kit CtaButton) when this
 * client may book. Hire is not repeated here: the page's pinned Message + Hire
 * row stays the one Hire (lead decision, W7 integration). Not rendered in the professional's own MO3 preview.
 *
 * Exact values (source/gen): sectionHead (kit Section) with 10 under the
 * rule; listCard6 (r20, card fill, the card border, padding 4 14; rows 11 0
 * with a 1 px 6% rule between, a 34 r11 tile in #F0EDF9 / lavender 14% with
 * the 16 / 1.75 icon in primary.accent, title 13 / 600, line 11 / 1.4
 * text.faint); the availability grid (7 columns 4 apart, r10 cells 8 0,
 * letter 10 / 700 text.faint, number 13 / 800 primary.deep on primary.pale or
 * text.tertiary on soft); the review card (r20, padding 14, name 13 / 700,
 * stars 12, body 13 / 1.5 text.soft 6 below).
 *
 * Data: the session types this client may read (appointment_services, RLS by
 * the booking policy) and the hire plans (professional_plans_for); Where from
 * the listing's place and the session types' locations (which businesses a
 * professional works at is not readable by clients); availability from
 * professional_open_slots for the first session type, counted as sessions
 * that fit (the engine offers a start every 15 minutes); the reviews the page
 * already reads.
 */
export const ProfileMoreSections: React.FC<{
  professionalId: string;
  firstName: string;
  location: string | null;
  /** Other clients' reviews (useProfessionalReviews().others), newest first or not. */
  reviews: ReviewRow[];
  reviewCount: number;
  onSeeReviews: () => void;
  onBook: () => void;
  /** No Book on your own profile. */
  isOwn: boolean;
}> = ({ professionalId, firstName, location, reviews, reviewCount, onSeeReviews, onBook, isOwn }) => {
  const dark = useIsDark();
  type Data = { allowed: boolean; sessions: BookableSession[]; plans: Plan[]; week: number[] | null };
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<{ error: boolean; offline: boolean }>({ error: false, offline: false });

  const load = useCallback(async () => {
    setState({ error: false, offline: false });
    const [allowed, plans] = await Promise.all([bookingAllowed(professionalId), fetchPlansFor(professionalId)]);
    const sessions = allowed.ok && allowed.data ? await fetchBookableSessions(professionalId) : null;
    if (!allowed.ok || (sessions && !sessions.ok)) {
      const offline = (!allowed.ok && allowed.offline) || (!!sessions && !sessions.ok && sessions.offline);
      setState({ error: true, offline });
      return;
    }
    const list = sessions && sessions.ok ? sessions.data : [];
    let week: number[] | null = null;
    if (allowed.data && list.length > 0) {
      const days = weekDays(mondayOf(new Date()));
      const slots = await fetchOpenSlots(professionalId, localDay(days[0]), localDay(days[6]), list[0].id);
      if (slots.ok) {
        const by = slotsByDay(slots.slots);
        week = days.map((d) => sessionsThatFit(by.get(localDay(d)) ?? []));
      }
    }
    setData({ allowed: allowed.data, sessions: list, plans: plans.ok ? plans.plans : [], week });
  }, [professionalId]);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => live && void load());
    return () => {
      live = false;
    };
  }, [load]);

  const tileBg = dark ? "rgba(174,161,220,0.14)" : "#F0EDF9";
  const listCard = (rows: { icon: LucideIcon; title: string; line: string; right?: string }[]) => (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px" }}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center" style={{ gap: 12, padding: "11px 0", borderBottom: i < rows.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: tileBg }} aria-hidden>
            <r.icon size={16} strokeWidth={1.75} style={{ color: INK.prAccent }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block break-words" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
              {r.title}
            </span>
            <span className="block" style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.4 }}>
              {r.line}
            </span>
          </span>
          {r.right && (
            <span className="shrink-0 tabular-nums" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
              {r.right}
            </span>
          )}
        </div>
      ))}
    </div>
  );
  const body = (children: React.ReactNode) => <div style={{ marginTop: 10 }}>{children}</div>;

  if (!data) {
    return (
      <div className="mb-5" aria-label="Services and availability">
        {state.error ? (
          <ProError onRetry={() => void load()} message={state.offline ? "You're offline. Services and availability will load when you're connected." : undefined} />
        ) : (
          <div role="status" aria-label="Loading" className="flex flex-col" style={{ gap: 12 }}>
            <ProCardSkeleton lines={3} height={120} />
            <ProCardSkeleton lines={2} height={80} />
          </div>
        )}
      </div>
    );
  }

  const serviceRows = [
    ...data.sessions.map((s) => ({ icon: CalendarClock, title: s.name, line: sessionLine(s.durationMin, s.locationKind), right: priceLabel(s.price, s.currency) })),
    ...data.plans.map((p) => ({ icon: Package, title: p.name, line: p.features[0] ?? "Plan", right: planPriceLabel(p.price, p.billing) })),
  ];
  const kinds = new Set(data.sessions.map((s) => s.locationKind));
  const whereRows = [
    ...(location?.trim() ? [{ icon: MapPin, title: location.trim(), line: "In person" }] : []),
    ...(kinds.has("online") || kinds.has(null) ? [{ icon: Video, title: "Online", line: "Video sessions" }] : []),
    ...(kinds.has("home_visit") ? [{ icon: Home, title: "Home visits", line: "At your place" }] : []),
    ...(kinds.has("phone") ? [{ icon: Phone, title: "Phone", line: "Phone sessions" }] : []),
  ];
  const review = reviews.find((r) => !r.redactedAt && r.body?.trim());
  const canBook = data.allowed && data.sessions.length > 0;

  return (
    <div className="mb-5">
      {state.offline && <OfflineLine />}
      <Section label="Services" first>
        {serviceRows.length === 0 ? <StateLine>No services listed yet.</StateLine> : body(listCard(serviceRows))}
      </Section>

      <Section label="Where">
        {whereRows.length === 0 ? <StateLine>{firstName || "They"} hasn't said where they work yet.</StateLine> : body(listCard(whereRows))}
      </Section>

      <Section label="Availability this week">
        {!data.allowed ? (
          <StateLine>{NOT_TAKING_BOOKINGS}</StateLine>
        ) : data.sessions.length === 0 ? (
          <StateLine>No session types to book yet.</StateLine>
        ) : !data.week ? (
          <StateLine>Couldn't load open times.</StateLine>
        ) : (
          body(
            <div className="grid grid-cols-7" style={{ gap: 4 }} role="list" aria-label="Open sessions this week">
              {data.week.map((n, i) => (
                <span key={i} role="listitem" className="text-center" style={{ borderRadius: 10, padding: "8px 0", background: n ? INK.prPale : INK.soft }} aria-label={`${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}: ${n} open`}>
                  <span className="block" aria-hidden style={{ fontSize: textPx(10), fontWeight: 700, color: INK.chF }}>
                    {WEEKDAY_LETTERS[i]}
                  </span>
                  <span className="block tabular-nums" aria-hidden style={{ fontSize: textPx(13), fontWeight: 800, color: n ? INK.prDeep : INK.chT }}>
                    {n}
                  </span>
                </span>
              ))}
            </div>
          )
        )}
      </Section>

      <Section
        label="Reviews"
        right={
          reviewCount > 0 ? (
            <button type="button" onClick={onSeeReviews} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
              See all {reviewCount}
            </button>
          ) : undefined
        }
      >
        {!review ? (
          <StateLine>No reviews yet.</StateLine>
        ) : (
          body(
            <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14 }}>
              <div className="flex items-center justify-between gap-2">
                <b className="truncate" style={{ fontSize: textPx(13), color: INK.ch }}>
                  {review.reviewerName ?? "A client"}
                </b>
                <span className="flex shrink-0" style={{ gap: 2 }} role="img" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={12} aria-hidden className={i < review.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                  ))}
                </span>
              </div>
              <p className="whitespace-pre-line break-words" style={{ fontSize: textPx(13), color: INK.chS, marginTop: 6, lineHeight: 1.5 }}>
                {review.body}
              </p>
            </div>
          )
        )}
      </Section>

      {canBook && !isOwn && (
        <div style={{ marginTop: 20 }}>
          <CtaButton label="Book a session" icon={CalendarPlus} variant="secondary" onClick={onBook} full />
        </div>
      )}
    </div>
  );
};
