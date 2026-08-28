import React from "react";
import clsx from "clsx";

type Variant =
  | "nutrition"
  | "home"
  | "health"
  | "workout"
  | "ai"
  | "community"
  | "roster"
  | "listing";

/** Abstract stand-in for a real product screenshot: a restrained, token-driven
 *  illustration of what that screen holds (stat tiles, list rows, a chart),
 *  in the same illustration language as HeroIllustration / UnifyDiagram /
 *  NetworkDiagram elsewhere in this folder - never literal "drop an image
 *  here" placeholder art. Swap for a real screenshot crop when one exists;
 *  until then this fills the frame and reads as deliberate, not empty. */
export const AppScreen: React.FC<{ variant: Variant; dark?: boolean; className?: string }> = ({
  variant,
  dark = false,
  className,
}) => {
  const surface = dark ? "bg-mkt-dark-surface" : "bg-white";
  const line = dark ? "border-mkt-dark-line" : "border-mkt-line";
  const bar = dark ? "bg-white/15" : "bg-mkt-ink/10";
  const barSoft = dark ? "bg-white/8" : "bg-mkt-ink/[0.06]";
  const chipA = dark ? "bg-mkt-dark-accent/15 text-mkt-dark-accent" : "bg-mkt-tint text-mkt-accent";
  const chipB = dark ? "bg-mkt-teal/15 text-mkt-teal" : "bg-mkt-teal-tint text-mkt-teal";

  return (
    <div className={clsx("w-full h-full flex flex-col gap-3 p-5", surface, className)}>
      {variant === "nutrition" && (
        <>
          <div className="flex items-center justify-between">
            <div className={clsx("h-2.5 w-20 rounded-full", bar)} />
            <div className="relative w-9 h-9 rounded-full border-[3px] border-mkt-accent/25 shrink-0">
              <div className="absolute inset-0 rounded-full border-[3px] border-mkt-accent border-r-transparent border-b-transparent" />
            </div>
          </div>
          <div className="flex flex-col gap-2.5 mt-1 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx("flex items-center gap-3 rounded-xl border p-2.5", line)}>
                <div className={clsx("w-8 h-8 rounded-lg shrink-0", i % 2 ? chipB : chipA)} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className={clsx("h-2 rounded-full", bar)} style={{ width: `${70 - i * 8}%` }} />
                  <div className={clsx("h-1.5 rounded-full", barSoft)} style={{ width: `${45 - i * 4}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "home" && (
        <>
          <div className={clsx("h-2.5 w-24 rounded-full", bar)} />
          <div className="grid grid-cols-2 gap-3 mt-1 flex-1">
            {[chipA, chipB, chipB, chipA].map((tone, i) => (
              <div key={i} className={clsx("rounded-2xl border p-3.5 flex flex-col gap-2", line)}>
                <div className={clsx("w-6 h-6 rounded-md", tone)} />
                <div className={clsx("h-3 w-2/3 rounded-full", bar)} />
                <div className={clsx("h-1.5 w-4/5 rounded-full", barSoft)} />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "health" && (
        <>
          <div className="flex items-center justify-between">
            <div className={clsx("h-2.5 w-20 rounded-full", bar)} />
            <div className={clsx("h-5 w-14 rounded-full", chipB)} />
          </div>
          <svg viewBox="0 0 200 60" className="w-full h-14 mt-1" preserveAspectRatio="none">
            <polyline
              points="0,45 25,30 50,38 75,15 100,24 125,10 150,20 175,6 200,14"
              fill="none"
              stroke={dark ? "#A991FE" : "#7D67D9"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="grid grid-cols-3 gap-2.5 flex-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={clsx("rounded-xl border p-2.5 flex flex-col gap-1.5", line)}>
                <div className={clsx("h-2.5 w-3/4 rounded-full", bar)} />
                <div className={clsx("h-1.5 w-1/2 rounded-full", barSoft)} />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "workout" && (
        <>
          <div className="flex items-center justify-between">
            <div className={clsx("h-2.5 w-24 rounded-full", bar)} />
            <div className={clsx("h-5 w-12 rounded-full", chipA)} />
          </div>
          <div className="flex flex-col gap-2.5 mt-1 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx("flex items-center justify-between rounded-xl border p-2.5", line)}>
                <div className="flex flex-col gap-1.5">
                  <div className={clsx("h-2 rounded-full", bar)} style={{ width: `${60 + i * 4}px` }} />
                  <div className={clsx("h-1.5 w-16 rounded-full", barSoft)} />
                </div>
                <div className={clsx("h-2 w-8 rounded-full", i === 1 ? chipA : barSoft)} />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "ai" && (
        <div className="flex-1 flex flex-col justify-end gap-2.5">
          <div className={clsx("self-start max-w-[72%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex flex-col gap-1.5", chipA)}>
            <div className="h-2 w-32 rounded-full bg-current opacity-70" />
            <div className="h-2 w-20 rounded-full bg-current opacity-40" />
          </div>
          <div className={clsx("self-end max-w-[60%] rounded-2xl rounded-br-sm px-3.5 py-2.5", dark ? "bg-white/10" : "bg-mkt-ink/8")}>
            <div className={clsx("h-2 w-24 rounded-full", bar)} />
          </div>
          <div className={clsx("self-start max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex flex-col gap-1.5", chipA)}>
            <div className="h-2 w-40 rounded-full bg-current opacity-70" />
            <div className="h-2 w-28 rounded-full bg-current opacity-40" />
          </div>
        </div>
      )}

      {variant === "community" && (
        <>
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx("w-8 h-8 rounded-full border-2", dark ? "border-mkt-dark-surface" : "border-white", i % 2 ? chipB : chipA)} />
            ))}
          </div>
          <div className="flex flex-col gap-2.5 mt-1 flex-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={clsx("flex items-center gap-3 rounded-xl border p-2.5", line)}>
                <div className={clsx("w-8 h-8 rounded-full shrink-0", i % 2 ? chipA : chipB)} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className={clsx("h-2 w-2/3 rounded-full", bar)} />
                  <div className={clsx("h-1.5 w-2/5 rounded-full", barSoft)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "roster" && (
        <>
          <div className="flex items-center justify-between">
            <div className={clsx("h-2.5 w-24 rounded-full", bar)} />
            <div className={clsx("h-5 w-16 rounded-full", chipA)} />
          </div>
          <div className="flex flex-col mt-1 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx("flex items-center gap-3 py-2.5", i !== 0 && "border-t", line)}>
                <div className={clsx("w-7 h-7 rounded-full shrink-0", i % 2 ? chipB : chipA)} />
                <div className={clsx("h-1.5 flex-1 rounded-full max-w-[120px]", barSoft)} />
                <div className={clsx("h-4 w-10 rounded-full", barSoft)} />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "listing" && (
        <>
          <div className={clsx("h-2.5 w-24 rounded-full", bar)} />
          <div className="flex items-end gap-2 h-16 mt-1">
            {[40, 65, 50, 80, 60, 90, 45].map((h, i) => (
              <div key={i} className={clsx("flex-1 rounded-t-md", i === 5 ? chipA : barSoft)} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {[chipA, chipB].map((tone, i) => (
              <div key={i} className={clsx("rounded-xl border p-2.5 flex flex-col gap-1.5", line)}>
                <div className={clsx("h-2.5 w-1/2 rounded-full", bar)} />
                <div className={clsx("h-4 w-10 rounded-full mt-1", tone)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
