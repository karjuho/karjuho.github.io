# Motion

Log of animations on the site: what plays, where it's defined, how to tune it,
and how it degrades. Keep this in sync when adding motion.

Every animation must:
- reference the `--dur-*` / `--ease-*` / `--move-*` tokens in `assets/main.css`
  (or `--doco-loop` for the Doconomy tiles) where it can, so timing is tunable
  in one place;
- sit inside `@media (prefers-reduced-motion: no-preference)` (or otherwise
  collapse to nothing when the tokens are zeroed), so reduced-motion users get
  a static result;
- not rely on JS to look correct on first paint.

| Figma name | Where | Technique | Tokens | Reduced-motion |
|---|---|---|---|---|
| Gradient text (`gradient-breathe`) | `.gradient-text` in `assets/main.css` - every instance: "Design" headline, the hero card's "Read more" CTA and its user count, current job title, contact phone | `background-position` pan on a 200%-wide gradient, `alternate` + `ease-in-out`; the headline overrides `--gradient` to the `--gradient-headline-loop` palindrome so its sweep reads symmetrically | `--dur-breathe` (9s per sweep) | static gradient (no `background-size`/animation) |
| Experience "current" dot | `.exp-row--current::before` | `@keyframes activeDot` box-shadow pulse | 2s (literal) | `animation: none` |
| Case screenshot pop | `.work-card__shot` in `assets/main.css` | Hovering the screenshot stack (`.work-card__shots:hover`, which matches through its children - the stack box itself is zero-height) lifts every shot and fans the tiles a degree or two apart; the front tile also deepens its shadow. The resting angle, the layout offset and the hover lift/spread are separate custom properties (`--rot`, `--tx`/`--ty`, `--lift`/`--spread`) composed into one `transform`, so the same rules work in the stacked mobile view | 0.45s `cubic-bezier(.22,.8,.28,1)` (literal) | no transition, no hover offset - the stack stays at its Figma angles |
| Hero card light sweeps (`glow-drift-a` / `-b`, `hero-tip-warm`) | `.work-card__glow` + `.work-card--dark` in `assets/main.css` | The two Figma sweeps swell (~0.92-1.26) and slide (~45-55px) on purposely unrelated periods - `--dur-glow` against `--dur-glow * 0.72`, plus a negative delay on the second - so they never settle into a visible rhythm, the way daylight through a window wanders rather than pulses. They blend `screen`, which is what makes them read at all: cream-on-cream alpha is invisible, but screen lifts the card's dark end and fades out where it is already bright. In step with them the card gradient's warm tip shifts `#e9cd9a` -> `#f9e6c3` via `--hero-tip`, registered with `@property` so a colour can actually interpolate. Stops and positions never move. The resting Figma angle rides in `--grot` so each keyframe can re-state `rotate()` | `--dur-glow` (24s; second sweep 17.3s) | no animation - the sweeps sit at their Figma angle, the gradient at its base tip |
| Screenshot lightbox | `.work-card__shot` + `.shot-scrim`/`.shot-close` in `assets/main.css`, driven by `assets/main.js` | Clicking a case's screenshots flies the **real** `<img>` elements out of the card into a large, un-rotated, centred view (a FLIP/shared-element move - nothing is cloned), then back on close. Two stages each way: the shots first **pick themselves up** off the card (`--lift: -28px`, hover-like), then **fly**; closing flies them home to that lifted position before setting them down. Shots are staggered `STEP` apart - front leads out, back leads home. JS writes `--ox`/`--oy`/`--oscale`/`--orot`, so the one composed `transform` carries the resting Figma angle, the hover pop and the fly-out together. Layout picks a column or a row - whichever lets the shots be biggest - capped at 2x so the 2x assets never upscale; corner radii are divided by `--oscale` so they stay put as the shot grows | 0.2s lift, 0.55s flight, 70ms stagger, 0.35s scrim (literals in `assets/main.js`) | no transition - the shots jump straight to the enlarged view and back, and the scrim appears instantly |
| Contact map pins reveal | `.contact-pins .contact-pin` in `assets/main.css`; armed by `assets/main.js` | On first scroll into view (`IntersectionObserver`, threshold 0.35) JS adds `.pins-in`; each pin transitions `opacity 0 -> 1` and `translateY(-10px) -> 0` over 0.5s after a 0.5s hold, with per-pin `transition-delay` (0.5 / 0.62 / 0.74 / 0.86 / 0.98s) so they land staggered rather than together | 0.5s transition + 0.5-1.0s staggered delay (literals) | pins render in place (rule sits in `prefers-reduced-motion: no-preference`; also static if JS is blocked, since `.pins-armed` is never added) |
| Doconomy case tiles (`doco-*`) | `assets/case-doconomy.css` (loaded only on `/doconomy` via `page.extra_css`) - tile structure in section 6, the generated `@keyframes` in the appendix at the end; markup in `_cases/doconomy.html` | The three animated tiles from Figma Motion (`107:43922`), generated rather than hand-written: keyframe percentages, per-stop easings and values come verbatim from `get_motion_context`, with only Figma's `--rotate-transform` custom property rewritten to the native `rotate`. They are built on one `6.000643s` linear loop, but two tiles now hold still for a beat before repeating and so run a little longer: **bike** on `--doco-loop-bike` (7.000643s - 1s of dead air; the amount is back to EUR25 at 5.874s and nothing moves after 6.001s, so the tail reads as a pause between the reset and the next confetti burst, stretching that gap to 1.81s) and **coins** on `--doco-loop-coins` (7.200643s - 600ms in each of the two gaps where the coins are up, so the window between the last coin vanishing and the first one dropping again runs 815ms instead of the exported 215ms). The pauses are padding only: every keyframe percentage was remapped so the motion inside is unchanged, and each extended track holds its final value across the added time. The three tiles therefore drift out of phase with each other rather than looping in lockstep. **Coins** and **confirm** are pure DOM - those tiles are flat panels in the design, so there is no screenshot behind them; confetti and dots are `border-radius` circles rather than 40 near-identical SVGs (the confirm burst runs 1-20 with 16 dropped - it landed ~180px below the mark against 114px for the next-lowest and read as a stray dot; the tick's two strokes were also re-joined at their true 45-degree crossing, which the export missed by 2.56px), and the checkmark's two strokes are drawn with `stroke-dasharray` on an inline `<svg>` (`pathLength="1"` comes from the Figma export). **Bike** is rebuilt too - only the photograph survives from the export, because both the progress arc and the ripple ring animate and an exported frame bakes them in. The arc is one path drawn to its fullest sweep and revealed with `stroke-dasharray` (Figma animates the ellipse's ending angle, which is keyframe-bindings-only - there is no CSS snippet for it); the ripple is a `border` circle so its stroke stays 4px as the ellipse grows, the way it does in Figma. Figma's two nested clipping boxes are reproduced because they are what keeps the confetti inside the phone screen. Each tile scales with `zoom: calc(100cqw / var(--doco-tile-w))` on a container-query context, so every offset inside stays a Figma design pixel at any width | `--doco-loop` (6.000643s) for confirm; `--doco-loop-bike` (7.000643s) and `--doco-loop-coins` (7.200643s) for the other two | `animation: none`; coins settle into the pile, the checkmark sits drawn, and the bike tile shows the arc at its starting fill with no burst or amount |
| Doconomy hero wash (`.case-page__ray`) | `assets/case-doconomy.css`; markup in `_layouts/case-dark.html` | The case page's hero wash is the same construction as the home page's hero card: a base gradient with two soft light sweeps (Figma Ellipse 2170 / 2171) drifting over it. They shipped baked into `hero-bg.svg`, so they could not move; that file is now split into `hero-bg-base.svg` (the gradient) plus `hero-ray-a.svg` / `hero-ray-b.svg`, each viewBox padded 120px so the 37.194 blur is not clipped and positioned at the coordinates it had in the flat export. `overflow: hidden` on `.case-page__bg` stands in for the SVG's own clipPath. Same two unrelated cycles as the card - `--dur-glow` against `--dur-glow * 0.72`, negative delay on the second - so the light wanders rather than pulses. Unlike the card there is no `--hero-tip` warming, because the base gradient is still an SVG rather than a CSS gradient | `--dur-glow` (24s; second sweep 17.3s) | no animation - the sweeps sit at their authored size and opacity |
| Design-system theme fan (`.doco-fan`) | `assets/case-doconomy.css`; markup in `_cases/doconomy.html` | Reworked from Figma Motion `107:44395`, after the daisyUI theme preview. The same design-system board rendered three times - cream `#f7f6f2`, white, dark `#20201d` - stacked, with the top two masked into diagonal bands that sweep steadily clockwise, so all three themes are on screen at once. **A deliberate departure from the Figma timeline**: the original sweeps one flat mask off to the right but stops at `translate: 1237px` against a 1272px board, so it never clears - roughly the right tenth of the previous theme stays behind, slicing through the form fields. *Geometry* - the bands radiate from a pivot just below-left of the board (`-120, 780` in board px = `-9.434% 155.378%`), so like daisyUI they converge off-canvas rather than running parallel or meeting in the middle. Each band is a `repeating-conic-gradient` centred on that pivot, used as a mask, with a **72deg** period split into three equal 24deg bands. 72 rather than the 70deg the board actually subtends because a repeating conic still wraps at 360deg: a period that does not divide 360 leaves a runt repetition that would sweep across as one odd narrow band once per revolution. 360/72 = 5 exactly, so there is no seam - verified, the pattern repeats every 9s to a max pixel delta of 6. Each stop pair is split by 0.2deg so the edges are short ramps; a mask is rasterised into the layer, so unlike a `clip-path` (which is applied geometrically at composite time and stair-steps) those edges stay smooth. Note the bands are equal in *angle* but still look different sizes across the sweep - that is the converging geometry, not a bug. *Motion* - the gradient angle is animated through a registered `@property`, not by rotating layers. An earlier version turned a pivot-centred wrapper 360deg with the board counter-turning inside; that wrapper had to be 3300 board px square to cover the far corner, which at the page's 2x zoom is a 6600px layer, and Chrome intermittently dropped the mask on it - the board flashed a single flat theme. Animating the angle keeps every layer board-sized and removes the counter-rotation entirely. It repaints the mask each frame rather than compositing, but on a 1272x502 box that is far cheaper than the layer it replaced. Boards are 3x PNGs (3501x1382 for a 1272px slot) | `--doco-fan` (45s per revolution; the 72deg period comes round every 9s) - ours, not Figma's | `animation: none` - the bands hold their authored angles, which is the daisyUI still. Browsers without `@property` land here too, since the angle never leaves its initial value |
| AI theme editor (`.doco-ai`) | `assets/case-doconomy.css`; markup in `_cases/doconomy.html` | Figma Motion `107:44875`. Three keyframed layers over a still screenshot: a white veil breathing between 50% and 25% opacity, the 4px border cycling `#3918B2` <-> `#9A5DFB`, and a sparkle spinning a full turn twice per loop. Everything underneath is static, so the editor and its colour-picker popover are composited into a single flat 3x PNG (1674x1257 for a 558px slot) and only those three layers are rebuilt. The picker is a separate node from the editor frame, and its export carries a 4px outside stroke, so it is pasted 4 design px up and left of its reported box. Figma flattens the border into a filled outline vector and keyframes its `fill`; `border-color` on a real 4px/8px-radius border is the equivalent. The sparkle is the exported SVG with Figma's opaque `#212121` background rect stripped out. Note both image rules are scoped under their container - `.case-figure img` is more specific than a bare `.doco-*` class and was stretching the sparkle to the full frame width | `--doco-loop` (6.000643s) | `animation: none` - veil at 50%, border at `#3918B2`, sparkle unrotated |

## Hero card light sweeps — notes

- The sweeps must NOT sit in their own stacking context, or `mix-blend-mode`
  would blend them against each other instead of the card's gradient.
  `.work-card__glow` therefore carries no `z-index`; it stays at the back on
  DOM order alone (first child; the body is `z-index: 1`, the shots follow).
- Brightening the card was first tried as a second, lighter gradient
  cross-faded on top. Two large gradients interfering banded visibly. Moving
  a single stop's colour instead paints one gradient at a time, so there is
  nothing to interfere - hence `@property --hero-tip`.
- Without `@property` support the colour steps once per half-cycle instead of
  interpolating. Subtle, and every current evergreen browser registers it.

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

## Doconomy case tiles — notes

- Only three of the six tiles animate. Calendar, frequency and selection have
  no motion data at all and stay as plain screenshots — don't add any.
- Figma exports a node in its **settled** state, not at t=0. That is why the
  "keep the screenshot, animate an overlay on top" shortcut only works for the
  bike tile: there every animated layer happens to be transparent at rest. In
  the coins tile the export already contains the coins where they land, so an
  overlay would have doubled them — the tile had to lose its screenshot.
- The keyframe blocks are long because the rotate and translate tracks of one
  element carry *different* per-stop easings, so they cannot be merged, and the
  per-element time offsets are real staggers (up to ~680ms), not a shared curve
  plus a delay. Collapsing them would be visible. Regenerate rather than tidy.
- **Check the per-track duration in the `animation:` shorthand — it is not
  always the loop.** Everything in the coins and confirm tiles runs at
  6.000643s, but every moving thing in the bike tile has its `translate` (and
  `scale`) track emitted at **6.752982s**: those tracks outlive the loop, so
  Figma normalised their percentages against their own length instead. Play
  them at that duration next to a 6.000643s opacity track and the two drift
  further apart on every repeat. The generator rescales them back onto the loop
  (multiply each stop by `6.752982 / 6.000643`) and holds the final value to
  100%. The rescaled numbers are self-checking: the bike confetti land on
  10.5324% / 17.5311%, which is the same animation the confirm tile already
  carries at 10.532% / 17.531%.
- The ripple is the tell if this ever regresses. Its size runs on the loop and
  its position on the long track, so out of phase the ring slides down-left of
  the progress dot it should expand from; in phase its centre stays pinned at
  (246.5, 391.5) from 7px all the way to 265px.
- The checkmark's stroke endpoints were resolved out of Figma's nested
  `flex`-centred, rotated line boxes into the group's own 92x92 coordinates.
  The half-stroke-width offset those boxes carry is real: without it the mark
  lands about 2px up and left of the exported artwork.
- **Not every animated node comes back as CSS.** The progress arc
  (`26:11046`) has an empty `codeSnippets` and only `keyframeBindings`: Figma
  cannot express an animated ellipse *arc angle* as CSS. The single unnamed
  float track is the ending angle in radians — 1.8589527606964111 (106.51deg)
  growing to 2.382551431655884 (136.51deg), against a fixed 61.5deg start. On a
  path drawn to the full 75deg sweep with `pathLength="1"` that is exactly
  `stroke-dasharray: 0.6 1` growing to `1 1`. If a node looks static, check
  `keyframeBindings` before concluding it has no motion.
- **Figma exports a frame, so anything animated is baked into it at rest.** The
  ripple ellipse is a real 16px ring in the design, and it sat in the bike
  screenshot as a stray dot on the arc for the whole loop. Any tile with an
  animated layer that is *visible* at rest cannot keep its screenshot.
- A Figma ellipse keeps its stroke weight when it is resized, so the ripple is
  a CSS `border`, not a scaled SVG — scaling the SVG thickens the 4px stroke to
  66px at full size and it reads as a disc rather than a ring.
- `.case-grid__tile img { width: 100% }` out-specifies a bare
  `.doco-bike__track`, which silently stretched the 327px ring to 328px. The
  ring rules are scoped through `.doco-bike__states` for that reason.
- The generated `@keyframes` live in one appendix at the bottom of
  `assets/case-doconomy.css` so the hand-written layout above stays readable.
  Everything above the appendix is meant to be read and edited; the appendix
  is not.
