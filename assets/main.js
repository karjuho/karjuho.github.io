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
