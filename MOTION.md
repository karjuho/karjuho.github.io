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
| Gradient text (`gradient-breathe`) | `.gradient-text` in `assets/main.css` - every instance: "Design" headline, "Read case" CTA, current job title, contact phone | `background-position` pan on a 200%-wide gradient, `alternate` + `ease-in-out`; the headline overrides `--gradient` to the `--gradient-headline-loop` palindrome so its sweep reads symmetrically | `--dur-breathe` (9s per sweep) | static gradient (no `background-size`/animation) |
| Experience "current" dot | `.exp-row--current::before` | `@keyframes activeDot` box-shadow pulse | 2s (literal) | `animation: none` |
| Case screenshot pop | `.work-card__shot` in `assets/main.css` | Hovering the screenshot stack (`.work-card__shots:hover`, which matches through its children - the stack box itself is zero-height) lifts every shot and fans the tiles a degree or two apart; the front tile also deepens its shadow. The resting angle, the layout offset and the hover lift/spread are separate custom properties (`--rot`, `--tx`/`--ty`, `--lift`/`--spread`) composed into one `transform`, so the same rules work in the stacked mobile view | 0.45s `cubic-bezier(.22,.8,.28,1)` (literal) | no transition, no hover offset - the stack stays at its Figma angles |
| Screenshot lightbox | `.work-card__shot` + `.shot-scrim`/`.shot-close` in `assets/main.css`, driven by `assets/main.js` | Clicking a case's screenshots flies the **real** `<img>` elements out of the card into a large, un-rotated, centred view (a FLIP/shared-element move - nothing is cloned), then back on close. Two stages each way: the shots first **pick themselves up** off the card (`--lift: -28px`, hover-like), then **fly**; closing flies them home to that lifted position before setting them down. Shots are staggered `STEP` apart - front leads out, back leads home. JS writes `--ox`/`--oy`/`--oscale`/`--orot`, so the one composed `transform` carries the resting Figma angle, the hover pop and the fly-out together. Layout picks a column or a row - whichever lets the shots be biggest - capped at 2x so the 2x assets never upscale; corner radii are divided by `--oscale` so they stay put as the shot grows | 0.2s lift, 0.55s flight, 70ms stagger, 0.35s scrim (literals in `assets/main.js`) | no transition - the shots jump straight to the enlarged view and back, and the scrim appears instantly |
| Contact map pins reveal | `.contact-pins .contact-pin` in `assets/main.css`; armed by `assets/main.js` | On first scroll into view (`IntersectionObserver`, threshold 0.35) JS adds `.pins-in`; each pin transitions `opacity 0 -> 1` and `translateY(-10px) -> 0` over 0.5s after a 0.5s hold, with per-pin `transition-delay` (0.5 / 0.62 / 0.74 / 0.86 / 0.98s) so they land staggered rather than together | 0.5s transition + 0.5-1.0s staggered delay (literals) | pins render in place (rule sits in `prefers-reduced-motion: no-preference`; also static if JS is blocked, since `.pins-armed` is never added) |

## Screenshot lightbox — notes

- The card cannot be the thing that gets un-clipped and raised. `clip-path`
  creates a stacking context, so putting the opening clip on `.work-card`
  would trap `.work-card__shots` (z-index 60) below the scrim; and raising
  the whole card lifts its text above the scrim undimmed. The clip and the
  z-index both live on `.work-card__shots` instead, and JS sizes the closed
  inset to the card's own box so releasing `overflow: hidden` is a no-op.
- The clip is shared by all the shots, so its timing has to bracket the
  whole staggered group: it opens only once the last shot has lifted, and
  finishes closing only once the last shot is home. Opening or closing it
  on the first shot's schedule clips the last one mid-flight.
- Doconomy's phone is 831px tall in a 512px card, so it can never be lifted
  clear of the bottom edge the way the light cards' ~22px overhang can. The
  clip sweep is what covers that one.

## Gradient breathing — notes

- Figma couldn't animate a gradient, so the source file fakes it with a moving
  rectangle (node `39:23231`). We ignore that and do it in CSS instead.
- The headline's loop gradient is a colour palindrome (`#fa4900 -> #ff9501 -> #eb1410 ->
  #ff8d01 -> #fa4900`) so the pan has no seam in either direction; at rest
  (`0% 50%`) the visible half reads orange -> amber -> red, matching the Figma
  static orientation.
- Tune the pace with `--dur-breathe`. Tune how far the colour travels with
  `background-size` (bigger = more travel) or by narrowing the keyframe range
  from `0% -> 100%`.
