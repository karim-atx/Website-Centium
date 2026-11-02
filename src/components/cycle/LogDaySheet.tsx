import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toggle } from "../ui/Toggle";
import { partBSheetTone } from "../health/log/LogSheetParts";
import { useIsDark } from "../../hooks/useIsDark";
import { OptionButton, hair, type, useCycleMode } from "./cycleUi";
import { useApp } from "../../context/AppContext";
import { saveCycleDay, validateDayLog } from "../../services/cycle";
import {
  FLOWS,
  LH_OPTIONS,
  LOG_LIMITS,
  MOODS,
  MUCUS_OPTIONS,
  PREGNANCY_TEST_OPTIONS,
  SEX_ACTIVITY_OPTIONS,
  SYMPTOMS,
  type CycleDayLog,
  type Flow,
  type Mood,
  type Symptom,
} from "../../services/cycle/types";
import {
  BBT_HELP,
  ENERGY_LABEL,
  FLOW_LABEL,
  LH_LABEL,
  MOOD_LABEL,
  MUCUS_LABEL,
  POSITIVE_TEST_CTA,
  POSITIVE_TEST_PROMPT,
  PREGNANCY_TEST_LABEL,
  SEX_ACTIVITY_LABEL,
  SEX_ACTIVITY_PRIVACY,
  SYMPTOM_LABEL,
} from "../../services/cycle/guidance";
import { Info, Lock } from "lucide-react";
import { appLocale } from "../../i18n/format";
import { t, tx } from "../../i18n/core";

// Logging one day.
//
// A DAY IS ONE RECORD, EDITED, not a stream of events. The sheet opens on
// whatever is already stored for that date and upserts the whole thing, which
// is why `cycle_day_logs` has a unique constraint on (user_id, log_date):
// logging cramps in the morning and a temperature at night is one day, twice
// amended.
//
// EVERY VOCABULARY COMES FROM ./types, which mirrors the CHECK constraints, so
// a chip that cannot be stored cannot be offered. `valid_string_set` is
// executable by `authenticated` (checked), so an out-of-vocabulary value would
// be refused rather than silently kept — but the user should never reach that.

/** One row of smooth-square options that scrolls sideways (no wrap), as HE1.9.b.3 #38-#39. */
const OptionRow: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div className="-mx-5 px-5 overflow-x-auto no-scrollbar" role="group" aria-label={label}>
    <div className="flex w-max" style={{ gap: 6 }}>
      {children}
    </div>
  </div>
);

/** A field section: label 12/16 600 #8C8378 (dark #B8B3C7), margin 0 0 6 2; sections 18 apart. */
const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div style={{ marginBottom: 18 }}>
    <p className="text-charcoal-faint" style={type(12, 16, 600, { marginBlock: "0 6px", marginInlineStart: 2 })}>
      {title}
      {hint && <span style={{ marginInlineStart: 6, fontWeight: 400 }}>{hint}</span>}
    </p>
    {children}
  </div>
);

/**
 * FUNCTIONAL UPDATE, not a value computed from the render closure.
 *
 * `setSymptoms(toggle(symptoms, s))` reads `symptoms` as it was when this
 * render ran, so two chips tapped inside one frame both start from the same
 * list and the second overwrites the first. Caught while scripting the
 * verification, where two clicks genuinely do land in the same tick -- rare
 * with a thumb, not impossible, and silent when it happens.
 */
const toggle = <T,>(value: T) => (list: T[]): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export const LogDaySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** yyyy-mm-dd being logged. */
  date: string;
  onSaved: () => void;
  /**
   * Offered beside the positive-test note. Absent while a pregnancy is
   * already being tracked, which is what keeps the prompt from appearing on
   * a day logged from inside pregnancy mode.
   */
  onStartPregnancy?: () => void;
}> = ({ open, onClose, date, onSaved, onStartPregnancy }) => {
  const { authUserId, cycleLogs } = useApp();
  const dark = useIsDark();
  const { hc } = useCycleMode();
  const existing = cycleLogs.find((l) => l.date === date) ?? null;

  const [isPeriod, setIsPeriod] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [mood, setMood] = useState<Mood[]>([]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [mucus, setMucus] = useState<CycleDayLog["cervicalMucus"]>(null);
  const [bbt, setBbt] = useState("");
  const [lh, setLh] = useState<CycleDayLog["lhTest"]>(null);
  const [pregnancyTest, setPregnancyTest] = useState<CycleDayLog["pregnancyTest"]>(null);
  const [sexActivity, setSexActivity] = useState<CycleDayLog["sexActivity"]>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on each fresh open, onto whatever is stored for that date.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (open && openedFor !== date) {
    setOpenedFor(date);
    setIsPeriod(existing?.isPeriod ?? false);
    setFlow(existing?.flow ?? null);
    setSymptoms(existing?.symptoms ?? []);
    setMood(existing?.mood ?? []);
    setEnergy(existing?.energy ?? null);
    setMucus(existing?.cervicalMucus ?? null);
    setBbt(existing?.bbtCelsius != null ? String(existing.bbtCelsius) : "");
    setLh(existing?.lhTest ?? null);
    setPregnancyTest(existing?.pregnancyTest ?? null);
    setSexActivity(existing?.sexActivity ?? null);
    setNotes(existing?.notes ?? "");
    setError(null);
  } else if (!open && openedFor !== null) {
    setOpenedFor(null);
  }

  const save = async () => {
    if (!authUserId) {
      setError(t("You need to be signed in to log a day."));
      return;
    }
    const log: CycleDayLog = {
      date,
      flow,
      // FLOW IMPLIES A PERIOD, except "none" and "spotting". Asking twice —
      // "is this a period?" and "how heavy?" — invites a day marked as a
      // period with no flow, which the insights then count as a period day.
      isPeriod: isPeriod || (flow !== null && flow !== "none" && flow !== "spotting"),
      symptoms,
      mood,
      energy,
      cervicalMucus: mucus,
      bbtCelsius: bbt === "" ? null : Number(bbt),
      lhTest: lh,
      pregnancyTest,
      sexActivity,
      notes: notes.trim() ? notes.trim() : null,
    };
    const invalid = validateDayLog(log);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveCycleDay(authUserId, log);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    // A POSITIVE TEST KEEPS THE SHEET OPEN, so the note about pregnancy mode
    // is read rather than flashed past on the way back to the ring.
    if (pregnancyTest !== "positive") onClose();
  };

  // Field (HE1.6.1 / HE1.10.b.1 #9): 44 r12 #F5F5F6 with a 0.5px #241F1B@10%
  // border (dark #242730 / #F5F3FA@10%), 14/21 400.
  const fieldStyle: React.CSSProperties = {
    borderRadius: 12,
    padding: "0 12px",
    border: `0.5px solid ${hair(dark, hc, 0.1)}`,
    ...type(14, 21, 400),
  };
  const field = "w-full bg-cream-soft text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

  const prettyDate = (() => {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "short", day: "numeric" });
  })();

  const opt = (key: string, label: string, on: boolean, onClick: () => void, role: "radio" | "checkbox" = "radio") => (
    <OptionButton key={key} size="sheet" role={role} selected={on} onClick={onClick}>
      {label}
    </OptionButton>
  );

  // K8: the cycle "Log" sheet in the Part B lavender-header chrome (chrome
  // "partB": 0.5px outline, 1.1 close ring; the shared Log sheet's tone and
  // pinned footer 12 20 30). Every field the repo logs is kept; chips are now
  // smooth-square options in sideways rows.
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={prettyDate}
      chrome="partB"
      tone={partBSheetTone(dark)}
      footerBottom={30}
      footer={
        <div>
          {error && (
            <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginBottom: 10 })}>
              {t(error)}
            </p>
          )}
          <CtaButton label={t("Save day")} loading={saving} onClick={() => void save()} style={{ lineHeight: "21px" }} />
        </div>
      }
    >
      <div>
        <Section title={t("Flow")}>
          <OptionRow label={t("Flow")}>{FLOWS.map((f) => opt(f, tx(FLOW_LABEL[f], "flow"), flow === f, () => setFlow(flow === f ? null : f)))}</OptionRow>
          {/* Only offered where it is not already implied, so the two controls
              cannot contradict each other. */}
          {(flow === null || flow === "none" || flow === "spotting") && (
            <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 10 }}>
              <span className="text-charcoal-soft" style={type(12.5, 18.8, 400)}>
                {t("Count this as a period day")}
              </span>
              <Toggle checked={isPeriod} onChange={setIsPeriod} label={t("Count this as a period day")} />
            </div>
          )}
        </Section>

        <Section title={t("Symptoms")}>
          <OptionRow label={t("Symptoms")}>
            {SYMPTOMS.map((sym) => opt(sym, t(SYMPTOM_LABEL[sym]), symptoms.includes(sym), () => setSymptoms(toggle(sym)), "checkbox"))}
          </OptionRow>
        </Section>

        <Section title={t("Mood")}>
          <OptionRow label={t("Mood")}>{MOODS.map((m) => opt(m, tx(MOOD_LABEL[m], "mood"), mood.includes(m), () => setMood(toggle(m)), "checkbox"))}</OptionRow>
        </Section>

        {/* Energy 1-5, each level named (ENERGY_LABEL); tapping the chosen
            one again clears it (the repo's Clear). */}
        <Section title={t("Energy")}>
          <OptionRow label={t("Energy, 1 very low to 5 very high")}>
            {Array.from({ length: LOG_LIMITS.energy.max - LOG_LIMITS.energy.min + 1 }, (_, k) => LOG_LIMITS.energy.min + k).map((e) =>
              opt(String(e), tx(ENERGY_LABEL[e], "energy"), energy === e, () => setEnergy(energy === e ? null : e))
            )}
          </OptionRow>
        </Section>

        <Section title={t("Cervical mucus")}>
          <OptionRow label={t("Cervical mucus")}>{MUCUS_OPTIONS.map((m) => opt(m, tx(MUCUS_LABEL[m], "mucus"), mucus === m, () => setMucus(mucus === m ? null : m)))}</OptionRow>
        </Section>

        <Section title={t("Temperature")} hint="°C">
          <input
            value={bbt}
            onChange={(e) => setBbt(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
            inputMode="decimal"
            placeholder="36.5"
            aria-label={t("Basal body temperature in degrees Celsius")}
            className={field}
            style={{ ...fieldStyle, height: 44 }}
          />
          <p className="text-charcoal-faint" style={type(11, 16, 400, { marginTop: 4 })}>
            {BBT_HELP}
          </p>
        </Section>

        <Section title={t("LH test")}>
          <OptionRow label={t("LH test")}>{LH_OPTIONS.map((o) => opt(o, t(LH_LABEL[o]), lh === o, () => setLh(lh === o ? null : o)))}</OptionRow>
        </Section>

        <Section title={t("Pregnancy test")}>
          <OptionRow label={t("Pregnancy test")}>
            {PREGNANCY_TEST_OPTIONS.map((o) => opt(o, t(PREGNANCY_TEST_LABEL[o]), pregnancyTest === o, () => setPregnancyTest(pregnancyTest === o ? null : o)))}
          </OptionRow>
          {pregnancyTest === "positive" && (
            // The shared Info box: #9A8CD6@12% r14 pad 12 14, 12/18 #5B5349.
            <div className="flex" style={{ gap: 10, marginTop: 10, padding: "12px 14px", borderRadius: 14, background: "rgb(var(--c-fill-pinned) / 0.12)" }}>
              <Info size={16} aria-hidden className="shrink-0 text-primary-dark" style={{ marginTop: 1 }} />
              <div className="min-w-0">
                <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                  {POSITIVE_TEST_PROMPT}
                </p>
                {onStartPregnancy && (
                  <button type="button" onClick={onStartPregnancy} className="tap text-primary-dark" style={{ marginTop: 4, minHeight: 32, ...type(13, 19.5, 700) }}>
                    {t(POSITIVE_TEST_CTA)}
                  </button>
                )}
              </div>
            </div>
          )}
        </Section>

        <Section title={t("Sexual activity")}>
          <OptionRow label={t("Sexual activity")}>
            {SEX_ACTIVITY_OPTIONS.map((o) => opt(o, t(SEX_ACTIVITY_LABEL[o]), sexActivity === o, () => setSexActivity(sexActivity === o ? null : o)))}
          </OptionRow>
          {/* TRUE, AND CHECKED: no access_category covers this column, and
              client_cycle_phase returns one word. Nothing can read it. */}
          <p className="flex items-center text-charcoal-faint" style={{ gap: 5, marginTop: 8, ...type(11, 16, 600) }}>
            <Lock size={12} aria-hidden /> {t(SEX_ACTIVITY_PRIVACY)}
          </p>
        </Section>

        <Section title={t("Notes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, LOG_LIMITS.notesMaxLength))}
            rows={2}
            placeholder={t("Anything worth remembering about today")}
            className={`${field} resize-none`}
            style={{ ...fieldStyle, padding: "10px 12px" }}
          />
        </Section>
      </div>
    </BottomSheet>
  );
};
