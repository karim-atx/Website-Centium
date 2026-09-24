import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
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
  POSITIVE_TEST_PROMPT,
  PREGNANCY_TEST_LABEL,
  SEX_ACTIVITY_LABEL,
  SEX_ACTIVITY_PRIVACY,
  SYMPTOM_LABEL,
} from "../../services/cycle/guidance";
import { Info, Lock } from "lucide-react";

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

/** A horizontally scrollable row of chips, the preview's pattern. */
const ChipRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="-mx-1 px-1 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
    <div className="flex gap-2 w-max pb-1">{children}</div>
  </div>
);

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <div className="mb-4">
    <p className="text-[11px] font-semibold text-charcoal-soft mb-1.5">
      {title}
      {hint && <span className="ml-1.5 font-normal text-charcoal-faint">{hint}</span>}
    </p>
    {children}
  </div>
);

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export const LogDaySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** yyyy-mm-dd being logged. */
  date: string;
  onSaved: () => void;
}> = ({ open, onClose, date, onSaved }) => {
  const { authUserId, cycleLogs } = useApp();
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
      setError("You need to be signed in to log a day.");
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

  const field =
    "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={prettyDate}>
      <div className="animate-fade-slide-up">
        <Section title="Flow">
          <ChipRow>
            {FLOWS.map((f) => (
              <Chip key={f} active={flow === f} onClick={() => setFlow(flow === f ? null : f)}>
                {FLOW_LABEL[f]}
              </Chip>
            ))}
          </ChipRow>
          {/* Only offered where it is not already implied, so the two controls
              cannot contradict each other. */}
          {(flow === null || flow === "none" || flow === "spotting") && (
            <label className="flex items-center gap-2 mt-2.5">
              <input
                type="checkbox"
                checked={isPeriod}
                onChange={(e) => setIsPeriod(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-[12px] text-charcoal-soft">Count this as a period day</span>
            </label>
          )}
        </Section>

        <Section title="Symptoms">
          <ChipRow>
            {SYMPTOMS.map((sym) => (
              <Chip
                key={sym}
                active={symptoms.includes(sym)}
                onClick={() => setSymptoms(toggle(symptoms, sym))}
              >
                {SYMPTOM_LABEL[sym]}
              </Chip>
            ))}
          </ChipRow>
        </Section>

        <Section title="Mood">
          <ChipRow>
            {MOODS.map((m) => (
              <Chip key={m} active={mood.includes(m)} onClick={() => setMood(toggle(mood, m))}>
                {MOOD_LABEL[m]}
              </Chip>
            ))}
          </ChipRow>
        </Section>

        <Section title="Energy" hint={energy ? `· ${ENERGY_LABEL[energy]}` : undefined}>
          <input
            type="range"
            min={LOG_LIMITS.energy.min}
            max={LOG_LIMITS.energy.max}
            step={1}
            value={energy ?? 3}
            onChange={(e) => setEnergy(Number(e.target.value))}
            aria-label="Energy, 1 very low to 5 very high"
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9.5px] text-charcoal-faint">
            <span>{ENERGY_LABEL[1]}</span>
            <span>{ENERGY_LABEL[5]}</span>
          </div>
          {energy !== null && (
            <button
              onClick={() => setEnergy(null)}
              className="tap mt-1 text-[10.5px] font-semibold text-charcoal-faint"
            >
              Clear
            </button>
          )}
        </Section>

        <Section title="Cervical mucus">
          <ChipRow>
            {MUCUS_OPTIONS.map((m) => (
              <Chip key={m} active={mucus === m} onClick={() => setMucus(mucus === m ? null : m)}>
                {MUCUS_LABEL[m]}
              </Chip>
            ))}
          </ChipRow>
        </Section>

        <Section title="Temperature" hint="°C">
          <input
            value={bbt}
            onChange={(e) => setBbt(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
            inputMode="decimal"
            placeholder="36.5"
            aria-label="Basal body temperature in degrees Celsius"
            className={field}
          />
          <p className="mt-1 text-[10px] text-charcoal-faint leading-snug">{BBT_HELP}</p>
        </Section>

        <Section title="LH test">
          <ChipRow>
            {LH_OPTIONS.map((o) => (
              <Chip key={o} active={lh === o} onClick={() => setLh(lh === o ? null : o)}>
                {LH_LABEL[o]}
              </Chip>
            ))}
          </ChipRow>
        </Section>

        <Section title="Pregnancy test">
          <ChipRow>
            {PREGNANCY_TEST_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={pregnancyTest === o}
                onClick={() => setPregnancyTest(pregnancyTest === o ? null : o)}
              >
                {PREGNANCY_TEST_LABEL[o]}
              </Chip>
            ))}
          </ChipRow>
          {pregnancyTest === "positive" && (
            <div className="flex gap-2 mt-2.5 rounded-xl bg-primary-pale px-3 py-2.5">
              <Info size={14} className="text-primary-dark shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-[1.45] text-primary-deep-text">
                {POSITIVE_TEST_PROMPT}
              </p>
            </div>
          )}
        </Section>

        <Section title="Sexual activity">
          <ChipRow>
            {SEX_ACTIVITY_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={sexActivity === o}
                onClick={() => setSexActivity(sexActivity === o ? null : o)}
              >
                {SEX_ACTIVITY_LABEL[o]}
              </Chip>
            ))}
          </ChipRow>
          {/* TRUE, AND CHECKED: no access_category covers this column, and
              client_cycle_phase returns one word. Nothing can read it. */}
          <p className="flex items-center gap-1 mt-2 text-[10.5px] font-semibold text-charcoal-faint">
            <Lock size={11} /> {SEX_ACTIVITY_PRIVACY}
          </p>
        </Section>

        <Section title="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, LOG_LIMITS.notesMaxLength))}
            rows={2}
            placeholder="Anything worth remembering about today"
            className={`${field} resize-none`}
          />
        </Section>

        {error && (
          <p className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-3">
            {error}
          </p>
        )}

        <Button fullWidth onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save day"}
        </Button>
      </div>
    </BottomSheet>
  );
};
