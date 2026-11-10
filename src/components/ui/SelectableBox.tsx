import React from "react";
import clsx from "clsx";

/**
 * FP: a selectable box or row that toggles when it is tapped anywhere on it,
 * and is ONE control for a screen reader (Batch B decisions 6-8).
 *
 * Before, many pick lists made only the title a button: the check mark and the
 * box's padding did nothing, and the box drew bigger than what it answered to.
 *
 * Two shapes, one look:
 * - Nothing interactive inside: the box itself is the button (`<SelectableBox>`).
 *   The check mark sits inside it and should be `aria-hidden`.
 * - Inner controls inside (a quantity field, "Also:" chips, "More nutrients",
 *   Create food): `<SelectableBox inner>` puts a full-box invisible button
 *   BEHIND them, carrying the role, the state and the name. Everything else in
 *   the box lets taps through to it (`pointer-events: none`), except the inner
 *   controls (buttons, links, fields, labels, anything focusable), which keep
 *   their own taps and their own names above it (index.css). A region that is
 *   not a control but should keep its taps (a field's padded frame) takes
 *   `SELECTABLE_INNER`. The toggle is a sibling behind the inner controls,
 *   never an ancestor, so a tap on one can't reach it. The visible title is
 *   then not a control of its own: pass its id as `labelledBy` and mark it
 *   `aria-hidden`, so the box is announced once.
 *
 * A settings row with a switch (`kind="switch"`) works the same way: the row
 * is the switch (role switch, aria-checked, named by its title), and the
 * switch drawn inside it is decorative (`<Toggle decorative>`, aria-hidden),
 * so a tap anywhere on the row does what a tap on the switch did.
 *
 * Unfocused, both shapes draw exactly what the box drew before (the full-box
 * button is transparent). Focus outlines the whole box; on a desktop pointer
 * the whole box shows the pointer cursor and a light hover tint.
 */

/** A region of an `inner` SelectableBox that keeps its own taps. */
export const SELECTABLE_INNER = "selectable-inner";

/** The whole-box focus ring and hover tint, the settings rows' recipe. */
const RING = "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC]";

type Common = {
  /** Selected (on) or not. */
  selected: boolean;
  onToggle: () => void;
  /**
   * How the state is announced: "pressed" (a toggle button, aria-pressed),
   * "checkbox", "radio" or "switch" (aria-checked). Default "pressed".
   */
  kind?: "pressed" | "checkbox" | "radio" | "switch";
  /** The accessible name, when the box's own text is not it. */
  label?: string;
  /** The id(s) of the element(s) that name the box. */
  labelledBy?: string;
  describedBy?: string;
  disabled?: boolean;
  /** Announced and drawn as unavailable but still focusable (aria-disabled); onToggle decides. */
  ariaDisabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** The id the row carried before (an anchor or a test hook). */
  id?: string;
  /** Inert, so it takes no tap and no focus (a dimmed row under a switched-off master). */
  inert?: boolean;
  /** data-* hooks the box carried before (kept on the box). */
  [data: `data-${string}`]: string | boolean | undefined;
};

const stateProps = (kind: Common["kind"], selected: boolean) =>
  kind === "checkbox" || kind === "radio" || kind === "switch"
    ? { role: kind, "aria-checked": selected }
    : { "aria-pressed": selected };

export const SelectableBox: React.FC<Common & {
  /**
   * The box holds controls of its own: the toggle becomes a full-box button
   * behind them (decision 7) instead of the box itself (decision 6).
   */
  inner?: boolean;
}> = ({ selected, onToggle, kind = "pressed", label, labelledBy, describedBy, disabled, ariaDisabled, inner, className, style, children, id, inert, ...data }) => {
  const a11y = {
    ...stateProps(kind, selected),
    "aria-label": label,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-disabled": ariaDisabled || undefined,
  };
  if (!inner) {
    return (
      <button
        id={id}
        type="button"
        onClick={onToggle}
        disabled={disabled}
        inert={inert}
        // The box's own className sets its display (block, flex...).
        className={clsx("selectable-box w-full text-start", RING, className)}
        style={style}
        {...data}
        {...a11y}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      id={id}
      inert={inert}
      className={clsx("selectable-box selectable-box--inner", className)}
      style={style}
      {...data}
      // A tap on the box itself (its border, or a rounded corner outside the
      // full-box button's curve) toggles too. Taps on content reach the
      // button; taps on inner controls stay theirs.
      onClick={(e) => {
        if (e.target === e.currentTarget && !disabled) onToggle();
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={clsx("selectable-box__hit", RING)}
        {...a11y}
      />
      {children}
    </div>
  );
};
