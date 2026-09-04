/*
 * Progressive enhancement only.
 * The site is fully usable with this file blocked or failed:
 *  - sticky sidebar        -> CSS (position: sticky)
 *  - smooth anchor scroll  -> CSS (scroll-behavior)
 *  - active nav highlight   -> falls back to the static .active class in the markup
 *  - e-mail address        -> visible in plain text, just not a mailto: link
 */
(function () {
  "use strict";

  /* Turn the obfuscated contact address into a real mailto: link.
     Kept out of the markup so basic scrapers don't get a clean address. */
  var mailNodes = document.querySelectorAll(".mail");
  for (var i = 0; i < mailNodes.length; i++) {
    var node = mailNodes[i];
    var address = node.textContent.trim().replace(/\s*\(at\)\s*/i, "@");
    var link = document.createElement("a");
    link.href = "mailto:" + address;
    link.textContent = address;
    node.textContent = "";
    node.appendChild(link);
  }

  /* Contact map pins: fade + drop in ~0.5s after first scrolled into view. */
  var pins = document.querySelector(".contact-pins");
  if (pins && "IntersectionObserver" in window) {
    pins.classList.add("pins-armed"); /* CSS only hides them once armed */
    var pinObs = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          pins.classList.add("pins-in");
          pinObs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    pinObs.observe(pins);
  }

  /* Contact map pins: click a pin to open its place tooltip. Opening one
     closes any other; a click outside, the tooltip's x button, or Escape
     also closes it. (Figma 139:25902) */
  if (pins) {
    var pinButtons = pins.querySelectorAll(".contact-pin");
    var openPin = null;

    var closeTip = function () {
      if (!openPin) return;
      var pin = openPin;
      openPin = null;
      pin.classList.remove("is-open");
      pin.setAttribute("aria-expanded", "false");
      var tip = pin.querySelector(".contact-pin__tip");
      if (tip) tip.parentNode.removeChild(tip);
      pins.classList.remove("has-open-tip");
    };

    var openTip = function (pin) {
      closeTip();

      var tip = document.createElement("span");
      tip.className = "contact-pin__tip";
      tip.setAttribute("role", "tooltip");

      var place = document.createElement("span");
      place.className = "contact-pin__place";
      place.textContent = pin.getAttribute("data-place") || "";

      var note = document.createElement("span");
      note.className = "contact-pin__note";
      note.textContent = pin.getAttribute("data-note") || "";

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "contact-pin__close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" ' +
        'fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>';
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeTip();
        pin.focus();
      });

      tip.appendChild(place);
      tip.appendChild(note);
      tip.appendChild(closeBtn);
      pin.appendChild(tip);

      pin.classList.add("is-open");
      pin.setAttribute("aria-expanded", "true");
      pins.classList.add("has-open-tip");
      openPin = pin;
    };

    for (var pb = 0; pb < pinButtons.length; pb++) {
      pinButtons[pb].addEventListener("click", function (e) {
        e.stopPropagation();
        if (openPin === this) closeTip();
        else openTip(this);
      });
    }

    document.addEventListener("click", function (e) {
      if (openPin && !openPin.contains(e.target)) closeTip();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openPin) {
        var pin = openPin;
        closeTip();
        pin.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     Screenshot lightbox (Figma 81:29494).

     Clicking a case's screenshots flies the real <img> elements out of
     the card into a large, un-rotated, centred view, and closing flies
     them back. Nothing is cloned - the card is un-clipped and raised
     above the scrim, and we only write custom properties, so the same
     single `transform` keeps carrying the resting Figma angle.

     Coordinate note: >=1050px the whole canvas sits under `zoom`, so
     getBoundingClientRect() (viewport px) and offsetLeft/Top (local px)
     differ by that factor. Everything below works in LOCAL px, with
     rects divided by the measured zoom.
     --------------------------------------------------------------- */
  var GAP = 24;      /* between shots, at scale 1 */
  var PAD = 32;      /* viewport margin */
  var MAX = 2;       /* shots are exported at 2x, so never draw beyond that */
  var LIFT_MS = 150; /* close stage two - must match .is-lifting / the clip */
  var FLY_MS = 430;  /* close stage one - must match .is-flying's duration */
  var STEP = 35;     /* per-shot stagger, so they move one after the other */

  var open = null; /* { card, shots, focus } while a card is open */
  var scrim, closeBtn, timer;

  /* The visible image area inside a shot's own box, unrotated, box-local.
     Most shots fill their box; `strip` shows a phone down the left edge
     and `contain` letterboxes the image, and in both cases it is that
     inner rectangle we want to enlarge, not the frame around it. */
  function contentBox(shot) {
    var w = shot.offsetWidth;
    var h = shot.offsetHeight;
    var img = shot.querySelector("img");
    if (shot.classList.contains("is-strip") && img) {
      return { x: 0, y: 0, w: img.offsetWidth, h: h };
    }
    if (shot.classList.contains("is-contain") && img && img.naturalHeight) {
      var ar = img.naturalWidth / img.naturalHeight;
      var cw = Math.min(w, h * ar);
      var ch = Math.min(h, w / ar);
      return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
    }
    return { x: 0, y: 0, w: w, h: h };
  }

  /* Lay the shots out as one centred group, picking whichever of a
     column or a row lets them be biggest. At the Figma frame's tall
     aspect this yields the column in the mock. */
  function place(shots, vw, vh) {
    var boxes = [];
    var colW = 0, colH = 0, rowW = 0, rowH = 0, i;
    for (i = 0; i < shots.length; i++) {
      var b = contentBox(shots[i]);
      boxes.push(b);
      colW = Math.max(colW, b.w);
      rowH = Math.max(rowH, b.h);
      colH += b.h;
      rowW += b.w;
    }
    colH += GAP * (shots.length - 1);
    rowW += GAP * (shots.length - 1);

    var aw = vw - PAD * 2;
    var ah = vh - PAD * 2;
    var sCol = Math.min(aw / colW, ah / colH);
    var sRow = Math.min(aw / rowW, ah / rowH);
    var column = sCol >= sRow;
    var s = Math.min(column ? sCol : sRow, MAX);

    var totalW = (column ? colW : rowW) * s;
    var totalH = (column ? colH : rowH) * s;
    var x = (vw - totalW) / 2;
    var y = (vh - totalH) / 2;

    for (i = 0; i < boxes.length; i++) {
      var w = boxes[i].w * s;
      var h = boxes[i].h * s;
      /* centre on the group's cross axis, run along the main one */
      boxes[i].cx = column ? vw / 2 : x + w / 2;
      boxes[i].cy = column ? y + h / 2 : vh / 2;
      if (column) y += h + GAP * s;
      else x += w + GAP * s;
      boxes[i].scale = s;
    }
    return boxes;
  }

  function fly(card, shots) {
    var probe = card.getBoundingClientRect();
    var zoom = probe.width / card.offsetWidth || 1; /* canvas zoom */
    var boxes = place(shots, window.innerWidth / zoom, window.innerHeight / zoom);
    var stackRect = card.querySelector(".work-card__shots").getBoundingClientRect();

    for (var i = 0; i < shots.length; i++) {
      var shot = shots[i];
      var b = boxes[i];
      /* untransformed centre of the shot's box, in local px */
      var c0x = stackRect.left / zoom + shot.offsetLeft + shot.offsetWidth / 2;
      var c0y = stackRect.top / zoom + shot.offsetTop + shot.offsetHeight / 2;
      /* where the content sits relative to that centre */
      var offX = b.x + b.w / 2 - shot.offsetWidth / 2;
      var offY = b.y + b.h / 2 - shot.offsetHeight / 2;

      shot.style.setProperty("--tx", "0px"); /* the mobile layout offset */
      shot.style.setProperty("--ty", "0px"); /* is folded into --ox/--oy */
      shot.style.setProperty("--ox", b.cx - c0x - b.scale * offX + "px");
      shot.style.setProperty("--oy", b.cy - c0y - b.scale * offY + "px");
      shot.style.setProperty("--oscale", b.scale);
      shot.style.setProperty("--orot", "0");
    }
  }

  function land(shots) {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i].style;
      s.removeProperty("--tx");
      s.removeProperty("--ty");
      s.removeProperty("--ox");
      s.removeProperty("--oy");
      s.removeProperty("--oscale");
      s.removeProperty("--orot");
    }
  }

  /* The closed clip: the card's own box (intersected with the stack's, on
     the mobile layout where the stack is itself a clipping window),
     expressed as an inset() on the stack's border box. Starting here means
     releasing `overflow: hidden` changes nothing on screen; opening it out
     lets the shots leave without anything ever popping into view. */
  function closedClip(card, stack) {
    var cr = card.getBoundingClientRect();
    var sr = stack.getBoundingClientRect();
    var z = cr.width / card.offsetWidth || 1;
    var l = cr.left, t = cr.top, r = cr.right, b = cr.bottom;
    if (getComputedStyle(stack).overflow !== "visible") {
      l = Math.max(l, sr.left);
      t = Math.max(t, sr.top);
      r = Math.min(r, sr.right);
      b = Math.min(b, sr.bottom);
    }
    var radius = cardRadius(card);
    return (
      "inset(" + (t - sr.top) / z + "px " + (sr.right - r) / z + "px " +
      (sr.bottom - b) / z + "px " + (l - sr.left) / z + "px round " + radius + ")"
    );
  }

  /* the hero card is rounder than the rest, so both ends of the clip
     transition have to take their corner from the card itself */
  function cardRadius(card) {
    return getComputedStyle(card).borderTopLeftRadius || "8px";
  }

  function openClip(card) {
    return "inset(-3000px -3000px -3000px -3000px round " + cardRadius(card) + ")";
  }

  /* Stagger the shots so they travel one quickly after the other: the front
     one leads on the way out, the back one leads on the way home. The clip
     is shared, so every timeout below is padded by `spread` - opening it
     before the last shot has lifted, or closing it before the last shot is
     home, would clip that shot mid-flight. */
  function stagger(shots, frontFirst) {
    var n = shots.length;
    for (var i = 0; i < n; i++) {
      shots[i].style.transitionDelay =
        (frontFirst ? n - 1 - i : i) * STEP + "ms";
    }
    return (n - 1) * STEP;
  }

  function chrome() {
    if (scrim) return;
    scrim = document.createElement("div");
    scrim.className = "shot-scrim";
    scrim.setAttribute("role", "dialog");
    scrim.setAttribute("aria-modal", "true");
    scrim.setAttribute("aria-label", "Screenshots");

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "shot-close";
    closeBtn.setAttribute("aria-label", "Close screenshots");
    closeBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" ' +
      'fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round"><path d="M2 2l14 14M16 2L2 16"/></svg>';

    scrim.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    document.body.appendChild(scrim);
    document.body.appendChild(closeBtn);
  }

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function openCard(card) {
    if (open) return;
    var shots = card.querySelectorAll(".work-card__shot");
    if (!shots.length) return;
    shots = Array.prototype.slice.call(shots);
    var stack = card.querySelector(".work-card__shots");

    chrome();
    open = { card: card, shots: shots, stack: stack, focus: document.activeElement };

    /* Open the clip up front (before .is-shot-open pulls in the clip-path
       transition, so it snaps): no "pick up off the card" step to hide the
       overhang behind, and no clip sweep to wait on. */
    stack.style.clipPath = openClip(card);
    document.documentElement.classList.add("shots-open");
    card.classList.add("is-shot-open");

    var main = document.querySelector(".home");
    if (main) main.inert = true;
    scrim.classList.add("is-in");
    closeBtn.classList.add("is-in");
    closeBtn.focus();

    if (reduced()) {
      fly(card, shots);
      return;
    }

    /* The shots zoom straight from where they sit into the lightbox, on the
       quicker .is-flying-fast timing. */
    var i;
    stagger(shots, true); /* front shot leads on the way out */
    for (i = 0; i < shots.length; i++) {
      shots[i].classList.add("is-flying", "is-flying-fast");
    }
    void card.offsetWidth; /* flush, so there is a "before" to animate from */
    fly(card, shots);
  }

  function close() {
    if (!open) return;
    var card = open.card;
    var shots = open.shots;
    var stack = open.stack;
    var focus = open.focus;
    open = null;
    clearTimeout(timer);

    scrim.classList.remove("is-in");
    closeBtn.classList.remove("is-in");
    var main = document.querySelector(".home");
    if (main) main.inert = false;
    document.documentElement.classList.remove("shots-open");
    if (focus && focus.focus) focus.focus();

    var i;
    var settle = function () {
      card.classList.remove("is-shot-open");
      stack.style.removeProperty("clip-path");
      for (var k = 0; k < shots.length; k++) {
        shots[k].classList.remove(
          "is-flying",
          "is-flying-fast",
          "is-lifting",
          "is-lifted"
        );
        shots[k].style.removeProperty("transition-delay");
      }
    };

    /* the close flight keeps the slower .is-flying timing */
    for (i = 0; i < shots.length; i++) shots[i].classList.remove("is-flying-fast");

    if (reduced()) {
      land(shots);
      settle();
      return;
    }

    /* stage one: fly home, but only as far as the lifted position - the
       clip is still open and the shots are still clear of the card */
    var spread = stagger(shots, false); /* back shot leads on the way home */
    for (i = 0; i < shots.length; i++) {
      shots[i].classList.remove("is-lifting");
      shots[i].classList.add("is-flying", "is-lifted");
    }
    land(shots);

    /* Start closing the clip late in the flight so it finishes just as they
       arrive at the lifted position - the reverse of the open sweep. The
       clip is 3000px out, so it only gets restrictive at the very end and
       never cuts a shot short on its way home. */
    timer = setTimeout(function () {
      stack.style.clipPath = closedClip(card, stack);

      /* stage two: set them down inside the now-closed clip */
      timer = setTimeout(function () {
        for (var k = 0; k < shots.length; k++) {
          shots[k].classList.remove("is-flying");
          shots[k].classList.add("is-lifting");
        }
        void card.offsetWidth;
        for (k = 0; k < shots.length; k++) shots[k].classList.remove("is-lifted");
        timer = setTimeout(settle, LIFT_MS + spread);
      }, LIFT_MS);
    }, FLY_MS + spread - LIFT_MS);
  }

  var stacks = document.querySelectorAll(".work-card__shots");
  for (var si = 0; si < stacks.length; si++) {
    (function (stack) {
      var card = stack.closest(".work-card");
      /* the dark hero card is a whole-card <a> to its case (see
         _layouts/home.html) - it has no lightbox, so clicking its shots
         should just follow the link rather than open them. */
      if (!card || card.tagName === "A") return;
      stack.setAttribute("role", "button");
      stack.setAttribute("tabindex", "0");
      stack.setAttribute("aria-label", "Enlarge screenshots");
      stack.addEventListener("click", function () {
        openCard(card);
      });
      stack.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          openCard(card);
        }
      });
    })(stacks[si]);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) close();
  });

  window.addEventListener("resize", function () {
    if (open) fly(open.card, open.shots);
  });

  /* Scroll-spy: highlight the nav link whose section is crossing
     the vertical middle of the viewport. Replaces the old jQuery
     scroll handler. */
  var nav = document.querySelector(".nav");
  if (!nav || !("IntersectionObserver" in window)) return;

  var pairs = []; // { section, link }
  var anchors = nav.querySelectorAll('a[href^="#"]');
  for (var j = 0; j < anchors.length; j++) {
    var id = anchors[j].getAttribute("href").slice(1);
    var section = id && document.getElementById(id);
    if (section) pairs.push({ section: section, link: anchors[j] });
  }
  if (!pairs.length) return;

  function activate(link) {
    for (var k = 0; k < pairs.length; k++) {
      var on = pairs[k].link === link;
      pairs[k].link.classList.toggle("active", on);
      if (on) pairs[k].link.setAttribute("aria-current", "true");
      else pairs[k].link.removeAttribute("aria-current");
    }
  }

  var observer = new IntersectionObserver(
    function (entries) {
      for (var e = 0; e < entries.length; e++) {
        if (!entries[e].isIntersecting) continue;
        for (var p = 0; p < pairs.length; p++) {
          if (pairs[p].section === entries[e].target) activate(pairs[p].link);
        }
      }
    },
    { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
  );

  for (var m = 0; m < pairs.length; m++) observer.observe(pairs[m].section);
})();
