import React from "react";
import clsx from "clsx";

/** The rounded device bezel wrapping an AppScreen in the hero device stack.
 *  Purely presentational (border + padding + shadow); sizing comes from
 *  the width/height the caller passes. */
export const PhoneShell: React.FC<{
  width: number;
  height: number;
  radius?: number;
  shadow?: string;
  border?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ width, height, radius = 22, shadow, border = "#E4E0F2", className, children }) => (
  <div
    className={clsx("bg-white shrink-0", className)}
    style={{
      width,
      height,
      borderRadius: radius + 7,
      border: `1px solid ${border}`,
      padding: 8,
      boxShadow: shadow,
    }}
  >
    <div className="w-full h-full overflow-hidden" style={{ borderRadius: radius }}>
      {children}
    </div>
  </div>
);
