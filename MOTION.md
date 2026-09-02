# Motion

Log of animations on the site: what plays, where it's defined, how to tune it,
and how it degrades. Keep this in sync when adding motion.

Every animation must:
- reference the `--dur-*` / `--ease-*` / `--move-*` tokens in `assets/main.css`
  where it can, so timing is tunable in one place;
- sit inside `@media (prefers-reduced-motion: no-preference)` (or otherwise
  collapse to nothing when the tokens are zeroed), so reduced-motion users get
  a static result;
- not rely on JS to look correct on first paint.

| Figma name | Where | Technique | Tokens | Reduced-motion |
|---|---|---|---|---|
| Headline gradient (`Design`) | `.big-header .gradient-text` in `assets/main.css` | `background-position` pan on a 200%-wide palindrome gradient (`--gradient-headline-loop`), `alternate` + `ease-in-out` | `--dur-breathe` (9s per sweep) | static `--gradient-headline` (exact Figma stops) |
| Experience "current" dot | `.experience-table .row:first-child .dots::before` | `@keyframes activeDot` box-shadow pulse | 2s (literal) | `animation: none` |

## Headline gradient — notes

- Figma couldn't animate a gradient, so the source file fakes it with a moving
  rectangle (node `39:23231`). We ignore that and do it in CSS instead.
- The loop gradient is a colour palindrome (`#fa4900 -> #ff8d01 -> #eb1410 ->
  #ff8d01 -> #fa4900`) so the pan has no seam in either direction; at rest
  (`0% 50%`) the visible half reads orange -> amber -> red, matching the Figma
  static orientation.
- Tune the pace with `--dur-breathe`. Tune how far the colour travels with
  `background-size` (bigger = more travel) or by narrowing the keyframe range
  from `0% -> 100%`.
