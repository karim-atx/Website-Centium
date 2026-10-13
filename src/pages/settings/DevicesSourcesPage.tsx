import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GlassWater, GripVertical, HeartPulse, Link, Ruler, Smartphone, Footprints } from "lucide-react";
import clsx from "clsx";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { Toast } from "../../components/ui/Toast";
import { SettingsSection, settingsRowClass } from "../../components/ui/SettingsRows";
import { WeightScaleIcon } from "../../components/icons/PartBIcons";
import { DEVICE_PLACEHOLDER_ICON } from "../../components/settings/DevicePlaceholders";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { linePx, textPx } from "../../theme/textSize";
import { clock12 } from "../../utils/time12";
import { readSources, savePriorities, type ConnectedSource, type ManualKey, type ManualSummary } from "./sourcesData";

// OURS-Sources: "Devices and sources" (/app/settings/devices). Designed by
// us in the handover's language (Health full-page header, MO1.8 rows, the
// HE1.2.e empty card); the target of Health's "Sources" links. It must not
// collide with /app/health/sources ("Sources and guidelines", kept).
//
// Web (Apple Health / WHOOP later, decided): the "No device connected" card
// and the "Logged by you" rows. If health_integrations ever holds connected
// rows (the phone app writes them), they show as source rows on neutral
// placeholder tiles (DECIDED-2, no brand marks), with their access state
// (Database B1: "Access is off" / "Couldn't sync"; the taps that fix them
// are native), and with two or more, the order used when they overlap
// (PB-O-81, health_integrations.priority). The source detail and disconnect
// are native. No Settings row leads here (V6-124).

const META: Record<ManualKey, { name: string; to?: string; tile: string; ink: string; icon: React.ReactNode }> = {
  water: {
    name: "Water",
    to: "/app/health/water",
    tile: "rgb(var(--metric-water-tint))",
    ink: "rgb(var(--metric-water-ink))",
    icon: <GlassWater size={17} strokeWidth={1.75} />,
  },
  weight: {
    name: "Weight",
    to: "/app/health/weight",
    tile: "rgb(var(--metric-weight-tint))",
    ink: "rgb(var(--metric-weight-accent))",
    icon: <WeightScaleIcon size={17} strokeWidth={1.75} />,
  },
  "blood-pressure": {
    name: "Blood pressure",
    to: "/app/health/blood-pressure",
    tile: "rgb(var(--metric-blood-pressure-tint))",
    ink: "rgb(var(--metric-blood-pressure-ink))",
    icon: <HeartPulse size={17} strokeWidth={1.75} />,
  },
  // Body measurements live in Workout › Metrics, which has no address of its
  // own, so this row doesn't navigate. Tile: the weight family (unspecified).
  measurements: {
    name: "Body measurements",
    tile: "rgb(var(--metric-weight-tint))",
    ink: "rgb(var(--metric-weight-accent))",
    icon: <Ruler size={17} strokeWidth={1.75} />,
  },
  steps: {
    name: "Steps",
    to: "/app/health/steps",
    tile: "rgb(var(--metric-steps-tint))",
    ink: "rgb(var(--metric-steps-ink))",
    icon: <Footprints size={17} strokeWidth={1.75} />,
  },
};

const PROVIDER_NAME: Record<ConnectedSource["provider"], string> = {
  apple_health: "Apple Health",
  android_health: "Health Connect",
  whoop: "WHOOP",
};

const PROVIDER_ICON = {
  apple_health: DEVICE_PLACEHOLDER_ICON["apple-health"],
  android_health: DEVICE_PLACEHOLDER_ICON["health-connect"],
  whoop: DEVICE_PLACEHOLDER_ICON.whoop,
} as const;

/**
 * #7b-#7d: the source's line. Access off (7c) and a failed sync (7d) in the
 * danger ink win over the freshness line; a NULL access state is unknown and
 * shows the freshness line, never "ok" claims. A failed sync is
 * access_state = error, or an error newer than the last good sync.
 */
function sourceLine(src: ConnectedSource): { text: string; danger: boolean } {
  if (src.accessState === "access_off") return { text: "Access is off. Turn it on", danger: true };
  const errorNewer = !!src.lastErrorAt && (!src.lastSyncedAt || src.lastErrorAt > src.lastSyncedAt);
  if (src.accessState === "error" || errorNewer) return { text: "Couldn't sync. Try again", danger: true };
  return { text: freshness(src.lastSyncedAt), danger: false };
}

function dayMonth(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d).replace("Sept", "Sep");
}

/** "Last synced today at 8:40 AM" / "yesterday at …" / "on 3 Oct at …". */
function freshness(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const at = new Date(iso);
  const day = (d: Date) => d.toDateString();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = clock12(at);
  if (day(at) === day(today)) return `Last synced today at ${time}`;
  if (day(at) === day(yesterday)) return `Last synced yesterday at ${time}`;
  return `Last synced on ${dayMonth(at)} at ${time}`;
}

function manualLine(m: ManualSummary): string {
  if (m.count === 0 || !m.lastAt) return "No entries yet";
  return `${m.count} ${m.count === 1 ? "entry" : "entries"} · last on ${dayMonth(new Date(m.lastAt))}`;
}

const Row: React.FC<{
  tile: React.ReactNode;
  tileStyle: React.CSSProperties;
  name: string;
  sub: string;
  /** 7c / 7d: 12/16 600 in the danger ink #B4372C / #F09A8E. */
  subDanger?: boolean;
  onClick?: () => void;
  /** In place of the chevron (#10a's reorder controls). */
  trailing?: React.ReactNode;
}> = ({ tile, tileStyle, name, sub, subDanger, onClick, trailing }) => {
  const body = (
    <>
      <span aria-hidden className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={tileStyle}>
        {tile}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold leading-[19px] text-charcoal">{name}</span>
        {sub && (
          <span
            className={clsx("block mt-0.5 text-[12px] leading-4", subDanger ? "font-semibold" : "text-charcoal-faint")}
            style={subDanger ? { color: "var(--sources-danger)" } : undefined}
          >
            {sub}
          </span>
        )}
      </span>
    </>
  );
  if (!onClick)
    return (
      <div className={settingsRowClass}>
        {body}
        {trailing}
      </div>
    );
  return (
    <button type="button" onClick={onClick} className={clsx("tap", settingsRowClass)}>
      {body}
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
    </button>
  );
};

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; sources: ConnectedSource[]; manual: ManualSummary[] };

export default function DevicesSourcesPage() {
  const { authUserId, language } = useApp();
  const back = useBack();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [phoneNote, setPhoneNote] = useState(false);
  /** PB-O-81: a reorder that didn't save (the order reverts). */
  const [orderFailed, setOrderFailed] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchInto = useCallback(() => {
    if (!authUserId) return;
    void readSources(authUserId).then((r) => setLoad(r.ok ? { state: "ready", sources: r.sources, manual: r.manual } : { state: "error" }));
  }, [authUserId]);
  useEffect(() => {
    fetchInto();
  }, [fetchInto]);
  const read = () => {
    setLoad({ state: "loading" });
    fetchInto();
  };

  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;
  const sources = load.state === "ready" ? load.sources : [];
  const manual =
    load.state === "ready"
      ? // Steps only when manual steps exist (there is no manual step entry).
        load.manual.filter((m) => m.key !== "steps" || m.count > 0)
      : [];

  /** #10a / S7: move one source up or down; saved at once, put back if it fails. */
  const move = async (from: number, to: number) => {
    if (load.state !== "ready" || savingOrder || to < 0 || to >= load.sources.length) return;
    const before = load.sources;
    const next = [...before];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLoad({ ...load, sources: next });
    setSavingOrder(true);
    const ok = await savePriorities(next);
    setSavingOrder(false);
    if (!ok) {
      setLoad((l) => (l.state === "ready" ? { ...l, sources: before } : l));
      setOrderFailed(true);
    }
  };

  const tileFor = (src: ConnectedSource) => {
    const Icon = PROVIDER_ICON[src.provider];
    return <Icon size={17} strokeWidth={1.75} />;
  };
  // DECIDED-2: a neutral tile #F5F5F6 / #242730, glyph #5B5349 / #B8B3C7.
  const neutralTile = { background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-soft))" };

  const skeleton = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <div key={i} className={settingsRowClass} aria-hidden>
        <span className="w-9 h-9 rounded-[11px] bg-cream-soft animate-skeleton-pulse shrink-0" />
        <span className="flex-1 flex flex-col gap-1.5">
          <span className="block w-[120px] h-3 rounded-md bg-cream-soft animate-skeleton-pulse" />
          <span className="block w-20 h-2.5 rounded-md bg-cream-soft animate-skeleton-pulse" />
        </span>
      </div>
    ));

  return (
    <div className="pb-[120px] [--sources-danger:#B4372C] dark:[--sources-danger:#F09A8E]">
      {/* OURS #1-#4: the Health full-page header (back 36, title 24 / 30 700
          ls -0.5), fixed with fill #FFFFFF / #1C1F28 once content is under it. */}
      <FixedHeader paddingBottom={14} fillClassName="bg-cream dark:bg-[#1C1F28]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft shrink-0"
          >
            <BackIcon size={20} />
          </button>
          <h1 className="font-display font-bold text-charcoal tracking-[-0.5px]" style={{ fontSize: textPx(24), lineHeight: linePx(30) }}>
            Devices and sources
          </h1>
        </div>
        <p className="mt-1 text-charcoal-soft" style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8) }}>
          Centium only reads the data types you allow.
        </p>
      </FixedHeader>

      <div className="px-2 pt-5">
        <SettingsSection label="Connected">
          {load.state === "loading" ? (
            <div className="pt-2.5">{skeleton(1)}</div>
          ) : load.state === "error" ? (
            <div className="py-4 text-center">
              <p className="font-semibold text-status-high" style={{ fontSize: textPx(11.5), lineHeight: linePx(17) }}>
                Couldn't load. Check your connection.
              </p>
              <button type="button" onClick={read} className="tap mt-1 font-bold text-primary-dark" style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8) }}>
                Try again
              </button>
            </div>
          ) : sources.length > 0 ? (
            sources.map((s) => {
              const line = sourceLine(s);
              return (
                <Row
                  key={s.id}
                  tile={tileFor(s)}
                  tileStyle={neutralTile}
                  name={PROVIDER_NAME[s.provider]}
                  sub={line.text}
                  subDanger={line.danger}
                />
              );
            })
          ) : (
            // OURS #6: the no-device card (HE1.2.e), tinted with the theme
            // primary's tint (weight family, follows the theme).
            <div
              className="mt-2.5 -mx-2 rounded-[22px] text-center flex flex-col items-center"
              style={{ padding: "22px 18px", background: "rgb(var(--metric-weight-tint))" }}
            >
              <span
                aria-hidden
                className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-white/80 dark:bg-white/[0.08]"
                style={{ color: "rgb(var(--metric-weight-accent))" }}
              >
                <Link size={24} strokeWidth={1.75} />
              </span>
              <h2
                className="mt-3 font-extrabold text-charcoal tracking-[-0.3px]"
                style={{ fontSize: textPx(17), lineHeight: linePx(25.5) }}
              >
                No device connected
              </h2>
              <p className="mt-1.5 text-charcoal-soft" style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8) }}>
                Apple Health, Health Connect and WHOOP connect in the Centium app on your phone. Until then, what you log
                here is saved as your own entries.
              </p>
              {/* V6-124: a note until the phone app ships (no store link yet). */}
              <button
                type="button"
                aria-expanded={phoneNote}
                onClick={() => setPhoneNote((v) => !v)}
                className="tap mt-2.5 inline-flex items-center gap-[7px] font-semibold"
                style={{ fontSize: textPx(12), lineHeight: linePx(18), color: "rgb(var(--metric-weight-accent))" }}
              >
                <Smartphone size={15} strokeWidth={1.75} aria-hidden />
                Connect on your phone
              </button>
              {phoneNote && (
                <p role="status" className="mt-1.5 text-charcoal-soft" style={{ fontSize: textPx(11.5), lineHeight: linePx(17) }}>
                  Open Centium on your phone and go to Settings › Connected devices.
                </p>
              )}
            </div>
          )}
        </SettingsSection>

        {/* #10-#10b (PB-O-81): with two or more sources, the order used
            when they report the same thing. Up / down buttons (44 hit area)
            beside the grip; the first row is "Used first". */}
        {sources.length >= 2 && (
          <SettingsSection label="Order when sources overlap" className="!mt-5">
            {sources.map((s, i) => (
              <Row
                key={s.id}
                tile={tileFor(s)}
                tileStyle={neutralTile}
                name={PROVIDER_NAME[s.provider]}
                sub={i === 0 ? "Used first" : ""}
                trailing={
                  <span className="flex items-center shrink-0 text-charcoal-faint">
                    <button
                      type="button"
                      onClick={() => void move(i, i - 1)}
                      disabled={i === 0 || savingOrder}
                      aria-label={`Move ${PROVIDER_NAME[s.provider]} up`}
                      className="tap w-8 h-8 flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronUp size={16} strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(i, i + 1)}
                      disabled={i === sources.length - 1 || savingOrder}
                      aria-label={`Move ${PROVIDER_NAME[s.provider]} down`}
                      className="tap w-8 h-8 flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
                    </button>
                    <GripVertical size={16} strokeWidth={1.75} aria-hidden />
                  </span>
                }
              />
            ))}
            <p className="mt-1.5 text-charcoal-faint" style={{ fontSize: textPx(11), lineHeight: linePx(15) }}>
              When two sources record the same thing, Centium uses the one higher in this list. It never adds them together.
            </p>
          </SettingsSection>
        )}

        <SettingsSection label="Logged by you" className="!mt-5">
          {load.state === "loading"
            ? skeleton(4)
            : load.state === "ready" &&
              manual.map((m) => {
                const meta = META[m.key];
                return (
                  <Row
                    key={m.key}
                    tile={meta.icon}
                    tileStyle={{ background: meta.tile, color: meta.ink }}
                    name={meta.name}
                    sub={manualLine(m)}
                    onClick={meta.to ? () => navigate(meta.to!) : undefined}
                  />
                );
              })}
        </SettingsSection>

        <p className="mt-5 px-0 text-charcoal-soft" style={{ fontSize: textPx(11), lineHeight: linePx(16.5) }}>
          Removing a synced reading in Centium does not delete it from its source.
        </p>
      </div>
      {/* ST5: a reorder that didn't save. */}
      <Toast
        open={orderFailed}
        message="Couldn't save. Try again."
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
        onExpire={() => setOrderFailed(false)}
      />
    </div>
  );
}
