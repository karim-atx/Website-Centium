import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Subtle scroll-triggered fade+rise, used throughout the marketing site instead of
 *  page-load animation so long pages don't animate everything at once.
 *  Respects prefers-reduced-motion — reduced-motion users get an instant reveal
 *  instead of the fade/rise. */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className,
  delay = 0,
}) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
