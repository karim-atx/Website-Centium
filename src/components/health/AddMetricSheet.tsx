import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { getBloodPressureForDay, logBloodPressure, validateBloodPressure } from "../../services/blood-pressure";
import { X, Camera, ChevronRight, AlertCircle } from "lucide-react";

// Item 3 of the "Centium Mobile" handoff (design_handoff_centium_mobile,
// frame p10b, screen="metric" metricStyle="v2"): Add Metric stops being a
// BottomSheet and becomes its own centred floating card, because the
// reference has all four corners rounded (a bottom sheet only rounds the
// top). Colors/paths below are pulled from that handoff's own generated
// markup (CentiumFrame.dc.html) rather than its README prose table where
// the two disagreed — see the final report for the specific conflicts.
const quickAmounts = [100, 250, 500] as const;

// Traced bottle glyphs, one shared scale per dose (source boxes 61x130,
// 71x173, 123x194 -> rendered 17x56, 20x56, 35x56px). Outline and cap paths
// are copied verbatim from the handoff markup, as are the water fill
// (#BEE3FB) and each water rect (+100ml y61 h70, +250ml y81 h92, +500ml
// y115 h79).
const WaterGlyph100: React.FC = () => (
  <svg width={17} height={56} viewBox="0 0 61 198" fill="none" style={{ display: "block" }}>
    <defs>
      <clipPath id="metric-water-100">
        <path d="M11 25 L11 32 C11 40 2.5 44 2.5 54 L2.5 116 C2.5 124 8 127.5 14 127.5 L47 127.5 C53 127.5 58.5 124 58.5 116 L58.5 54 C58.5 44 50 40 50 32 L50 25 Z" />
      </clipPath>
    </defs>
    <g transform="translate(0,68)">
      <path
        d="M11 25 L11 32 C11 40 2.5 44 2.5 54 L2.5 116 C2.5 124 8 127.5 14 127.5 L47 127.5 C53 127.5 58.5 124 58.5 116 L58.5 54 C58.5 44 50 40 50 32 L50 25 Z"
        fill="#FFFFFF"
      />
      <rect x={0} y={61} width={61} height={70} fill="#BEE3FB" clipPath="url(#metric-water-100)" />
      <path
        d="M11 25 L11 32 C11 40 2.5 44 2.5 54 L2.5 116 C2.5 124 8 127.5 14 127.5 L47 127.5 C53 127.5 58.5 124 58.5 116 L58.5 54 C58.5 44 50 40 50 32 L50 25"
        fill="none"
        stroke="#4A80DC"
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x={9} y={0} width={43} height={27} rx={6} fill="#4274D7" />
    </g>
  </svg>
);

const WaterGlyph250: React.FC = () => (
  <svg width={20} height={56} viewBox="0 0 71 198" fill="none" style={{ display: "block" }}>
    <defs>
      <clipPath id="metric-water-250">
        <rect x={3} y={59} width={65} height={111} rx={14} />
      </clipPath>
    </defs>
    <g transform="translate(0,25)">
      <rect x={3} y={59} width={65} height={111} rx={14} fill="#FFFFFF" />
      <rect x={0} y={81} width={71} height={92} fill="#BEE3FB" clipPath="url(#metric-water-250)" />
      <rect x={3} y={59} width={65} height={111} rx={14} fill="none" stroke="#4A80DC" strokeWidth={6} />
      <path d="M19 28 L19 16 C19 11 23 8 28 8 L46 8 L46 28 Z" fill="#4274D7" />
      <rect x={41.5} y={3.5} width={23} height={15} rx={7} fill="none" stroke="#4274D7" strokeWidth={7} />
      <rect x={5} y={22} width={61} height={31} rx={9} fill="#4274D7" />
    </g>
  </svg>
);

const WaterGlyph500: React.FC = () => (
  <svg width={35} height={56} viewBox="0 0 123 198" fill="none" style={{ display: "block" }}>
    <defs>
      <clipPath id="metric-water-500">
        <rect x={4} y={65} width={93} height={125} rx={16} />
      </clipPath>
    </defs>
    <g transform="translate(0,4)">
      <rect x={4} y={65} width={93} height={125} rx={16} fill="#FFFFFF" />
      <rect x={0} y={115} width={101} height={79} fill="#BEE3FB" clipPath="url(#metric-water-500)" />
      <circle cx={100} cy={22} r={17} fill="none" stroke="#4A80DC" strokeWidth={8} />
      <rect x={29} y={49} width={43} height={12} fill="#FFFFFF" stroke="#4A80DC" strokeWidth={8} strokeLinejoin="round" />
      <rect x={21} y={19} width={54} height={22} rx={8} fill="#4A80DC" stroke="#4A80DC" strokeWidth={8} strokeLinejoin="round" />
      <rect x={4} y={65} width={93} height={125} rx={16} fill="none" stroke="#4A80DC" strokeWidth={8} />
      <path d="M77 85 H97 M77 110 H97 M77 136 H97 M77 160 H97" stroke="#4A80DC" strokeWidth={6} strokeLinecap="round" />
    </g>
  </svg>
);

const waterGlyphs: Record<(typeof quickAmounts)[number], React.FC> = {
  100: WaterGlyph100,
  250: WaterGlyph250,
  500: WaterGlyph500,
};

const WeightGlyph: React.FC = () => (
  <svg width={28} height={26} viewBox="0 0 93 85" fill="none" style={{ display: "block", flex: "none" }}>
    <rect x={1.5} y={1.5} width={90} height={82} rx={13} fill="none" stroke="#4A22CE" strokeWidth={3} />
    <path d="M18 24 C30 13 62 13 72 24 L63 40 C52 34 38 34 28 40 Z" fill="none" stroke="#4A22CE" strokeWidth={3} strokeLinejoin="round" />
    <path d="M30.5 17.5 L33 24 M44 16 L44 24 M58.5 17.5 L56 24" stroke="#4A22CE" strokeWidth={3} strokeLinecap="round" />
    <path d="M50 22 L41.5 37.5" stroke="#4A22CE" strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const CuffGlyph: React.FC = () => (
  <svg width={27} height={24} viewBox="-1 -1 92 83" fill="none" style={{ display: "block", flex: "none" }}>
    <path
      d="M1.5 16 L1.5 50 C1.5 55 5 58.5 9.5 58.5 L37.5 58.5 C42 58.5 45.5 55 45.5 50 L45.5 16"
      fill="none"
      stroke="#4A22CE"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <ellipse cx={23.5} cy={16} rx={22} ry={6} fill="none" stroke="#4A22CE" strokeWidth={4} />
    <path
      d="M23 58.5 L23 70 C23 76 27 79.5 33 79.5 L57 79.5 C63 79.5 67.5 76 67.5 70 L67.5 44"
      fill="none"
      stroke="#4A22CE"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <rect x={65} y={38.5} width={6} height={6} rx={1.5} fill="none" stroke="#4A22CE" strokeWidth={4} />
    <ellipse cx={73} cy={19} rx={13} ry={16} fill="none" stroke="#4A22CE" strokeWidth={4} />
  </svg>
);

const CheckCircleGlyph: React.FC = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1A00E0"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flex: "none" }}
  >
    <circle cx={12} cy={12} r={9.2} />
    <path d="M7.8 12.3 10.6 15l5.6-5.8" />
  </svg>
);

// V4: weight/body fat/steps/sleep/calories burned are now auto-sourced from
// Apple/Android Health and no longer manually loggable — Water is the only
// metric left to quickly add from here (Home's "Add Metric" quick action).
// V8 (QA 8.0): "should not only log water but be able to add weight of that
// day. It should reset if it is a new day" — weight gets its own section,
// pre-filled only if already logged today (weightLoggedDate === today).
// V10 (QA 10.0): both water and weight now log against whichever day is
// selected on Home, not always literal "today".
export const AddMetricSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const {
    water,
    waterGoalMl,
    addWater,
    metricValues,
    weightLoggedDate,
    weightByDate,
    logWeightForToday,
    selectedDate,
    today,
    authUserId,
  } = useApp();
  const isToday = selectedDate === today;
  const loggedForDay = weightLoggedDate === selectedDate;
  const dayWeight = weightByDate[selectedDate] ?? (isToday ? metricValues.weight : undefined);
  // With no weight logged for the day the field shows the handoff's "70"
  // (CentiumFrame.dc.html `v2Weight`). Like blood pressure's 120/80, that is
  // a display default only: autosave waits until the user edits the field,
  // so 70 is never logged as a weight nobody entered.
  const initialWeightDraft = () => (loggedForDay && dayWeight !== undefined ? String(dayWeight) : "70");
  const [weightDraft, setWeightDraft] = useState(initialWeightDraft);
  const [weightDirty, setWeightDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Both halves of this sheet now write to Supabase, so both can fail. One
  // slot rather than two: only one write is ever in flight at a time.
  const [error, setError] = useState<string | null>(null);

  // Blood pressure, persisted in public.blood_pressure_readings (Part 4, R2).
  // Opens on the selected day's latest reading, else the handoff's 120/80
  // defaults. Like weight it autosaves on a short debounce — but only after
  // the user has changed a value, so the defaults are never logged as a
  // reading nobody took.
  const [bpSys, setBpSys] = useState("120");
  const [bpDia, setBpDia] = useState("80");
  const [bpDirty, setBpDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setWeightDraft(initialWeightDraft());
      setWeightDirty(false);
      setError(null);
      setBpSys("120");
      setBpDia("80");
      setBpDirty(false);
      if (authUserId) {
        let cancelled = false;
        void getBloodPressureForDay(authUserId, selectedDate).then((result) => {
          if (cancelled || !result.ok || !result.reading) return;
          setBpSys(String(result.reading.systolic));
          setBpDia(String(result.reading.diastolic));
        });
        return () => {
          cancelled = true;
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open || !bpDirty) return;
    // Wait until both look complete (2-3 digits) so half-typed numbers aren't
    // judged or saved.
    if (bpSys.length < 2 || bpDia.length < 2) return;
    const t = setTimeout(() => {
      const reading = { systolic: Number(bpSys), diastolic: Number(bpDia) };
      const invalid = validateBloodPressure(reading);
      if (invalid) {
        setError(invalid);
        return;
      }
      if (!authUserId) {
        setError("You need to be signed in to save your blood pressure.");
        return;
      }
      setSaving(true);
      setError(null);
      void logBloodPressure({ userId: authUserId, reading, day: selectedDate, today }).then((result) => {
        setSaving(false);
        if (!result.ok) setError(result.message);
        else setBpDirty(false);
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpSys, bpDia, bpDirty, open]);

  // Lock background scroll while the card is open — ported from
  // BottomSheet's own open-effect now that this sheet no longer renders
  // through it.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const saveWeight = async (value: string) => {
    const n = Number(value);
    if (!n || n <= 0) return;
    setSaving(true);
    setError(null);
    const result = await logWeightForToday(n);
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't save that weight.");
    }
  };

  // The handoff drops the old manual "check" save button entirely (the
  // weight row is input + "kg" suffix only) in favour of the confirmation
  // strip's "saved automatically" copy, so weight now autosaves on a short
  // debounce instead of on tap. This is a state-wiring choice, not a fresh
  // feature: it reuses the same saveWeight()/logWeightForToday() path the
  // old save button used to call.
  useEffect(() => {
    if (!open || !weightDirty) return;
    if (!weightDraft) return;
    if (loggedForDay && dayWeight !== undefined && String(dayWeight) === weightDraft) return;
    const t = setTimeout(() => void saveWeight(weightDraft), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightDraft, weightDirty, open]);

  const quickAddWater = async (ml: number) => {
    setSaving(true);
    setError(null);
    const result = await addWater(ml);
    setSaving(false);
    if (!result.ok) setError(result.message ?? "Couldn't save that.");
  };

  // Add Records' destination is Medical Records: close this card and open the
  // Health page's Records sheet (the photo/upload flows live there).
  const navigate = useNavigate();
  const handleAddRecords = () => {
    onClose();
    navigate("/app/health", { state: { openRecords: true } });
  };

  const handleSysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpSys(e.target.value.replace(/\D/g, "").slice(0, 3));
    setBpDirty(true);
  };
  const handleDiaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpDia(e.target.value.replace(/\D/g, "").slice(0, 3));
    setBpDirty(true);
  };

  if (!open) return null;

  const confirmationText = error ? error : saving ? "Saving…" : "Your entries are saved automatically.";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 backdrop-blur-[3px] animate-fade-in"
        style={{ background: "rgba(36,31,27,0.4)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-[20px] shadow-lift overflow-hidden animate-pop flex flex-col max-h-[calc(100dvh-32px)]"
        style={{ background: "#ECEBFE", border: "1px solid #B2A9F4" }}
      >
        <div className="relative shrink-0 flex items-center justify-center" style={{ height: 42 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em", color: "#9C7EF8", whiteSpace: "nowrap" }}>
            Add Metric
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap absolute flex items-center justify-center rounded-full"
            style={{ right: 12, top: 8, width: 26, height: 26, border: "1.5px solid #9C7EF8", background: "none" }}
          >
            <X size={12} strokeWidth={2.4} style={{ color: "#9C7EF8" }} />
          </button>
        </div>

        {/* Scrolls only on a screen too short to fit the card; the shell itself
            stays overflow hidden per the handover. */}
        <div className="bg-white min-h-0 overflow-y-auto" style={{ borderRadius: 18, padding: 14 }}>
          <div className="flex items-start justify-between gap-3" style={{ marginBottom: 9 }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.02em", color: "#655B69" }}>WATER</p>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "#241F1B",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(water / 1000).toFixed(2)}L
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 10, color: "#827C9C" }}>of {(waterGoalMl / 1000).toFixed(1)}L goal</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 14 }}>
            {quickAmounts.map((ml) => {
              const Glyph = waterGlyphs[ml];
              return (
                <button
                  key={ml}
                  onClick={() => void quickAddWater(ml)}
                  disabled={saving}
                  className="flex flex-col items-center active:scale-[0.97] disabled:opacity-50"
                  style={{
                    background: "#E1F2FE",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 0 9px",
                    gap: 7,
                    transition: "transform .15s cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  <Glyph />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0A80E8" }}>+{ml}ml</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-[10px]" style={{ marginBottom: 13 }}>
            <div className="min-w-0">
              <p style={{ margin: "0 0 6px", fontSize: 12, letterSpacing: "0.02em", color: "#655B69" }}>
                {isToday ? "WEIGHT TODAY" : "WEIGHT FOR THIS DAY"}
              </p>
              <div
                className="flex items-center gap-2 box-border"
                style={{ background: "#F3F3F4", borderRadius: 12, padding: "0 10px", height: 42 }}
              >
                <WeightGlyph />
                <input
                  value={weightDraft}
                  onChange={(e) => {
                    setWeightDraft(e.target.value.replace(/[^\d.]/g, ""));
                    setWeightDirty(true);
                  }}
                  placeholder="e.g. 70"
                  inputMode="decimal"
                  className="flex-1 w-full min-w-0 outline-none"
                  style={{
                    background: "#FBFBFD",
                    border: "1px solid rgba(36,31,27,0.06)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    textAlign: "center",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#241F1B",
                  }}
                />
                <span style={{ fontSize: 11, color: "#827C9C", flex: "none" }}>kg</span>
              </div>
            </div>
            <div className="min-w-0">
              <p style={{ margin: "0 0 6px", fontSize: 12, letterSpacing: "0.02em", color: "#655B69" }}>ADD RECORDS</p>
              <button
                onClick={handleAddRecords}
                aria-label="Add records"
                className="tap flex items-center w-full text-left box-border"
                style={{ background: "#F3F3F4", border: "none", borderRadius: 12, padding: "0 8px", height: 42, gap: 7 }}
              >
                <Camera size={21} strokeWidth={1.8} style={{ color: "#4A22CE", flex: "none" }} />
                <span className="flex-1 min-w-0">
                  <span style={{ display: "block", fontSize: 8.5, fontWeight: 600, color: "#241F1B", whiteSpace: "nowrap" }}>
                    Add Photo / Upload File
                  </span>
                  <span style={{ display: "block", fontSize: 7.5, color: "#827C9C", whiteSpace: "nowrap" }}>
                    Lab results, reports, etc.
                  </span>
                </span>
                <ChevronRight size={12} strokeWidth={2.2} style={{ color: "#4A22CE", flex: "none" }} />
              </button>
            </div>
          </div>

          <p style={{ margin: "0 0 6px", fontSize: 12, letterSpacing: "0.02em", color: "#655B69" }}>BLOOD PRESSURE</p>
          <div
            className="flex items-center gap-[9px]"
            style={{ background: "#F3F3F4", borderRadius: 12, padding: "9px 11px", marginBottom: 13 }}
          >
            <CuffGlyph />
            <input
              value={bpSys}
              onChange={handleSysChange}
              inputMode="numeric"
              className="flex-1 min-w-0 outline-none"
              style={{
                background: "#FBFBFD",
                border: "1px solid rgba(36,31,27,0.06)",
                borderRadius: 8,
                padding: "7px 8px",
                textAlign: "center",
                fontSize: 15,
                fontWeight: 600,
                color: "#241F1B",
              }}
            />
            <span style={{ fontSize: 15, color: "#655B69", flex: "none" }}>/</span>
            <input
              value={bpDia}
              onChange={handleDiaChange}
              inputMode="numeric"
              className="flex-1 min-w-0 outline-none"
              style={{
                background: "#FBFBFD",
                border: "1px solid rgba(36,31,27,0.06)",
                borderRadius: 8,
                padding: "7px 8px",
                textAlign: "center",
                fontSize: 15,
                fontWeight: 600,
                color: "#241F1B",
              }}
            />
            <span style={{ fontSize: 11, color: "#827C9C", flex: "none" }}>mmHg</span>
          </div>

          <div
            className="flex items-center gap-[9px]"
            style={{ background: "#F0F0FD", borderRadius: 12, padding: "11px 13px" }}
            role={error ? "alert" : undefined}
          >
            {/* Same strip, same colour; an error gets an alert glyph so it
                doesn't read as a confirmation. */}
            {error ? (
              <AlertCircle size={20} strokeWidth={1.8} style={{ color: "#1A00E0", flex: "none" }} />
            ) : (
              <CheckCircleGlyph />
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A00E0" }}>{confirmationText}</span>
          </div>

          <p style={{ margin: "13px 4px 2px", fontSize: 10, lineHeight: 1.5, color: "#827C9C", textAlign: "center" }}>
            Body Fat, Steps, Sleep and Calories Burned sync automatically from Apple/Android Health and
            aren't manually editable.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
