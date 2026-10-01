import React from "react";
import { EMERGENCY_NUMBERS, WARNING_SIGNS } from "../../services/health-checks/guidance";

/**
 * The two warning-sign lists, always visible while the mode is on, with the
 * emergency numbers for the profile's timezone: Lebanon's for Asia/Beirut,
 * otherwise "your local emergency number".
 */
export const WarningSignsCard: React.FC<{ timezone: string | null; id?: string }> = ({ timezone, id }) => {
  const lb = EMERGENCY_NUMBERS.lebanon;
  const inLebanon = timezone === lb.timezone;
  return (
    <section id={id} className="rounded-[18px] border border-charcoal/[0.08] bg-cream-card px-4 py-4 mb-4">
      <p className="text-[13px] font-bold text-charcoal">{WARNING_SIGNS.emergencyTitle}</p>
      <ul className="mt-2 space-y-1.5 list-disc pl-4 text-[12px] leading-[1.45] text-charcoal-soft">
        {WARNING_SIGNS.emergency.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl bg-charcoal/[0.04] px-3 py-2.5 text-[12px] leading-[1.5] text-charcoal">
        {inLebanon ? (
          <>
            <p>
              {lb.emergency.map((e, i) => (
                <React.Fragment key={e.number}>
                  {i > 0 && " or "}
                  <a href={`tel:${e.number}`} className="font-extrabold">
                    {e.number}
                  </a>
                  {e.name && ` (${e.name})`}
                </React.Fragment>
              ))}
            </p>
            <p className="mt-1 text-charcoal-soft">
              <a href={`tel:${lb.crisis.number}`} className="font-extrabold text-charcoal">
                {lb.crisis.number}
              </a>{" "}
              ({lb.crisis.name}), the national mental-health line, for thoughts of self-harm
            </p>
          </>
        ) : (
          <p className="font-semibold">Call {EMERGENCY_NUMBERS.elsewhere}.</p>
        )}
      </div>
      <p className="mt-4 text-[13px] font-bold text-charcoal">{WARNING_SIGNS.todayTitle}</p>
      <ul className="mt-2 space-y-1.5 list-disc pl-4 text-[12px] leading-[1.45] text-charcoal-soft">
        {WARNING_SIGNS.today.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
};
