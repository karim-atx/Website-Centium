import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { Button } from "../ui/Button";
import { breathingPatterns, stretchList, yogaPoses, type BreathingPattern } from "../../data/mockMindContent";
import { Play, Square, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

type SubTab = "breathing" | "stretching" | "yoga";

const difficultyColor: Record<string, string> = {
  beginner: "text-[#3F9165] bg-[#E3F3E9]",
  intermediate: "text-[#B08A2E] bg-[#FBF1DD]",
  advanced: "text-[#C0392B] bg-[#FBE7E4]",
};

const BreathingRunner: React.FC<{ pattern: BreathingPattern }> = ({ pattern }) => {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(pattern.phases[0].seconds);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setRunning(false);
    setPhaseIdx(0);
    setSecondsLeft(pattern.phases[0].seconds);
  }, [pattern]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        setPhaseIdx((p) => (p + 1) % pattern.phases.length);
        return pattern.phases[(phaseIdx + 1) % pattern.phases.length].seconds;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pattern]);

  const phase = pattern.phases[phaseIdx];
  const isInhale = phase.label === "Breathe in";
  const isExhale = phase.label === "Breathe out";

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className="w-36 h-36 rounded-full bg-primary-pale border-2 border-primary flex items-center justify-center mb-5 transition-transform duration-[1000ms] ease-in-out"
        style={{ transform: `scale(${isInhale ? 1.15 : isExhale ? 0.85 : 1})` }}
      >
        <div className="text-center">
          <p className="text-sm font-semibold text-primary-dark">{running ? phase.label : "Ready?"}</p>
          {running && <p className="text-3xl font-bold text-primary-dark">{secondsLeft}</p>}
        </div>
      </div>
      <Button onClick={() => setRunning((r) => !r)} variant={running ? "outline" : "primary"}>
        {running ? (
          <>
            <Square size={14} /> Stop
          </>
        ) : (
          <>
            <Play size={14} /> Start
          </>
        )}
      </Button>
    </div>
  );
};

export const MeditationSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [subTab, setSubTab] = useState<SubTab>("breathing");
  const [patternId, setPatternId] = useState(breathingPatterns[0].id);
  const [expandedStretch, setExpandedStretch] = useState<string | null>(null);
  const [expandedPose, setExpandedPose] = useState<string | null>(null);

  const pattern = breathingPatterns.find((p) => p.id === patternId)!;

  return (
    <BottomSheet open={open} onClose={onClose} title="Meditation">
      <div className="animate-fade-slide-up">
        <div className="flex gap-2 mb-5">
          <Chip active={subTab === "breathing"} onClick={() => setSubTab("breathing")}>
            Breathing
          </Chip>
          <Chip active={subTab === "stretching"} onClick={() => setSubTab("stretching")}>
            Stretching
          </Chip>
          <Chip active={subTab === "yoga"} onClick={() => setSubTab("yoga")}>
            Yoga
          </Chip>
        </div>

        {subTab === "breathing" && (
          <div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
              {breathingPatterns.map((p) => (
                <Chip key={p.id} active={patternId === p.id} onClick={() => setPatternId(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-charcoal-faint mb-3">{pattern.desc}</p>
            <BreathingRunner pattern={pattern} />
          </div>
        )}

        {subTab === "stretching" && (
          <div className="space-y-2">
            {stretchList.map((s) => {
              const expanded = expandedStretch === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setExpandedStretch(expanded ? null : s.id)}
                  className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal-faint">
                        {s.target} · {s.type} · {s.seconds}s
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp size={15} className="text-charcoal-faint shrink-0" />
                    ) : (
                      <ChevronDown size={15} className="text-charcoal-faint shrink-0" />
                    )}
                  </div>
                  {expanded && (
                    <p className="text-xs text-charcoal-soft leading-relaxed mt-2.5 animate-fade-slide-up">
                      {s.instructions}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {subTab === "yoga" && (
          <div className="space-y-2">
            {yogaPoses.map((p) => {
              const expanded = expandedPose === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setExpandedPose(expanded ? null : p.id)}
                  className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-charcoal">{p.name}</p>
                    <span
                      className={clsx(
                        "text-[10px] font-bold uppercase rounded-full px-2 py-0.5 shrink-0",
                        difficultyColor[p.difficulty]
                      )}
                    >
                      {p.difficulty}
                    </span>
                  </div>
                  {expanded && (
                    <p className="text-xs text-charcoal-soft leading-relaxed mt-2.5 animate-fade-slide-up">
                      {p.instructions}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
