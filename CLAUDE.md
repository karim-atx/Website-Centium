# Centium marketing site (`src/marketing/`) — design handoff implementation standards

This section exists because two full-page audits (2026-09) found the same
three root causes behind five separate regressions on the landing page:
review belt fade-mask, pillar rail size/spacing mismatch, footer
double-gradient, persona-arc pin bug, ecosystem section spacing. Apply this
whenever implementing a new Claude Design handover, or editing an
already-implemented section, under `src/marketing/`.

## Root causes to actively guard against

1. **Old code left in place when replaced.** A new layer/gradient/style gets
   added without deleting what it superseded, so the two composite on top of
   each other (footer double-gradient), or a mask meant for one background
   layer gets applied to a shared parent that also holds real content
   (review belt — `mask-image` alpha-multiplies *everything* inside the
   element it's on, not just a background).
2. **Approximate reproduction instead of literal values.** Rebuilding a
   component "close enough" from memory drifts from the handoff's actual
   measured values (pillar rail's title size, border width, and badge size
   were all wrong this way).
3. **Partial behavior ports.** Visual structure gets carried over but
   scroll-pin math, reveal-on-scroll wrappers, or other interaction mechanics
   get dropped or simplified — easy to miss when eyeballing a static
   screenshot instead of reading the handoff's own JS.

## Standing rules

1. **Before adding new styling/layers to a section, find what's already
   there and remove it.** If a section is being replaced or updated,
   explicitly delete the gradients/masks/wrapper divs/CSS it supersedes.
   Never add new code alongside old code and assume the new one will simply
   take visual precedence.
2. **Treat the handoff's `.dc.html` and `README.md` as literal specs, not
   references to approximate from.** Pull exact px sizes, hex colors,
   `clamp()` formulas, and animation durations/easings directly from the
   handoff files. When the `.dc.html` markup and the README's prose
   disagree, the `.dc.html` markup wins — prose tables can go stale across
   rounds while the markup is generated from the final design. If a value
   isn't in the handoff, flag it as unspecified rather than guessing. Also
   check whether static markup reflects a pre-JS default state (seen with
   the FAQ pill colors and pricing card selection) — read the corresponding
   `init*()` JS function for the actual rendered values before trusting a
   `style="..."` attribute at face value.
3. **Port behavior, not just appearance.** For every section, explicitly
   check: scroll-pin/lock mechanics, reveal-on-scroll wrappers, hover/active
   states, and any other JS-driven interaction described in the handoff.
   Don't call a section done once it looks right in a static screenshot.
4. **Verify with DOM measurement, not just screenshots.** Check computed
   styles, bounding rects, and transforms directly against the handoff's
   specified values (`getComputedStyle`, `getBoundingClientRect`, inline
   `style.transform`). Screenshots are a useful sanity check but shouldn't be
   the only evidence — the Browser pane has an intermittent staleness issue
   at deep scroll depths / when backgrounded that affects *both* screenshot
   capture (blank frames) and `getComputedStyle` reads (a genuinely-correct
   inline style can transiently read back as a stale/wrong computed value).
   If a screenshot or a computed-style read looks wrong, don't conclude
   there's a bug from one reading — front the tab (a click or a fresh
   `navigate`/`preview_start` works) and re-read; check the raw DOM
   attribute (`el.getAttribute('style')` / `el.style.color`) against the
   computed value as a cross-check when they disagree.
5. **After finishing a section, do an orphan check on the files touched.**
   Search for old class names, unused gradient/mask definitions, or
   duplicate component logic that the new work should have replaced but
   might not have fully removed.
6. **Trace every function a mechanism calls, and every piece of state's
   initial value, separately from verifying its interactive behavior.** A
   handoff's `init*()` function is not one effect — `setTab()` in the
   platform-pin script does both an aria/pointer-events swap *and* a
   separate opacity+blur treatment, and `initFaq()`'s state starts at
   `null` (collapsed) independently of whatever its click handler does
   correctly. Verifying "the interaction works" is not the same as
   verifying "every function this calls does what the handoff says" or
   "the state starts where the handoff says." When auditing a section,
   re-read the *entire* handoff function it's ported from, not just the
   lines already implicated by a past bug, and check the state variable's
   initializer as its own line item.
7. **Prefer inline `style={{ color: ... }}` over `text-[#hex]` arbitrary-value
   classes for anchor text color**, matching how every other custom hex
   color in this codebase is already applied. This was adopted after a
   `text-[#hex]` class on an `<a>` read back via `getComputedStyle` as the
   wrong (inherited) color across several checks, including a full page
   reload — the CSS rule itself generated correctly, and this app does have
   an unlayered `a { color: inherit }` reset, but a later re-check (after
   "waking" the Browser pane per rule 4) showed the equivalent inline-style
   version rendering correctly, so the original class may well have worked
   fine too and this may have been rule 4's staleness issue rather than a
   real cascade bug. Root cause unconfirmed either way — inline style is
   the safe default already used everywhere else, so keep using it here
   rather than re-relitigating which explanation was right.
