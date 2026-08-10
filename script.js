/* ============================================================
   Benson Mathews — portfolio interactions.
   1. Scroll-driven theme inversion (white → black → white),
      lerped per frame for a smooth, continuous transition.
   2. Scroll progress hairline.
   3. Staggered scroll reveals (IntersectionObserver).
   4. Subtle parallax on project media.
   5. Live IST clock in the footer.
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var docEl = document.documentElement;

  /* ---------------------------------------------------------
     Theme color sets. Hex values are interpolated per channel.
     Keys map 1:1 to the CSS custom properties on :root.
     --------------------------------------------------------- */
  var LIGHT = {
    "--bg": "#ffffff",
    "--text": "#111110",
    "--muted": "#6b6b66",
    "--line": "#dededa",
    "--surface": "#ececea"
  };
  var DARK = {
    "--bg": "#0a0a0a",
    "--text": "#f4f4f2",
    "--muted": "#8a8a85",
    "--line": "#262624",
    "--surface": "#161615"
  };

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  var LIGHT_RGB = {}, DARK_RGB = {};
  Object.keys(LIGHT).forEach(function (k) {
    LIGHT_RGB[k] = hexToRgb(LIGHT[k]);
    DARK_RGB[k] = hexToRgb(DARK[k]);
  });

  function applyTheme(t) {
    // t = 0 → light, t = 1 → dark
    Object.keys(LIGHT_RGB).forEach(function (k) {
      var a = LIGHT_RGB[k], b = DARK_RGB[k];
      var r = Math.round(a[0] + (b[0] - a[0]) * t);
      var g = Math.round(a[1] + (b[1] - a[1]) * t);
      var bl = Math.round(a[2] + (b[2] - a[2]) * t);
      docEl.style.setProperty(k, "rgb(" + r + "," + g + "," + bl + ")");
    });
  }

  /* ---------------------------------------------------------
     Compute the target darkness (0..1) from scroll position.
     The dark zone spans from the top of #work to the top of
     #contact, with soft ramps on either side so the inversion
     is gradual rather than a toggle.
     --------------------------------------------------------- */
  var workEl = document.getElementById("work");
  var contactEl = document.getElementById("contact");

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Smoothstep keeps the ramp ends gentle.
  function smooth(v) { return v * v * (3 - 2 * v); }

  function targetDarkness() {
    var vh = window.innerHeight;
    var scrollY = window.scrollY || window.pageYOffset;
    var ramp = vh * 0.7;

    // Ramp in: begins when #work's top is ~65% down the viewport.
    var workTop = workEl.getBoundingClientRect().top + scrollY;
    var tIn = clamp01((scrollY - (workTop - vh * 0.65)) / ramp);

    // Ramp out: completes as #contact's top approaches the viewport top.
    var contactTop = contactEl.getBoundingClientRect().top + scrollY;
    var tOut = clamp01((scrollY - (contactTop - vh * 0.95)) / ramp);

    return smooth(tIn) * (1 - smooth(tOut));
  }

  /* ---------------------------------------------------------
     Scroll progress hairline.
     --------------------------------------------------------- */
  var progressBar = document.getElementById("progress-bar");

  function updateProgress() {
    var max = docEl.scrollHeight - window.innerHeight;
    var p = max > 0 ? (window.scrollY || window.pageYOffset) / max : 0;
    progressBar.style.width = (p * 100).toFixed(2) + "%";
  }

  /* ---------------------------------------------------------
     Scroll choreography for the plates (skipped under reduced
     motion). Two behaviours, mixed for rhythm:
       – .plate--pin: the sheet is pinned to the viewport; the
         plate is a moving window over it, so surrounding
         sections slide across a stationary image.
       – regular plates: a gentle parallax drift as they pass.
     Captions rise into place once the sheet has landed.
     --------------------------------------------------------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));

  function updateParallax() {
    var vh = window.innerHeight;
    // On small screens plates flow statically (image + band below) —
    // transforms would open gaps at the plate edges.
    var mobile = window.innerWidth <= 860;
    parallaxEls.forEach(function (wrap) {
      var inner = wrap.firstElementChild;
      if (!inner) return;
      var caption = wrap.querySelector(".plate__caption");
      if (mobile) {
        inner.style.transform = "";
        wrap.style.clipPath = "";
        if (caption) {
          caption.style.opacity = "";
          caption.style.transform = "";
        }
        return;
      }
      var rect = wrap.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;

      // 0 → still below the viewport, 1 → fully arrived.
      var enter = smooth(clamp01(1 - rect.top / (vh * 0.85)));

      if (wrap.classList.contains("plate--pin")) {
        // Counter-translate the sheet against the plate's motion
        // so it stays fixed to the viewport; overflow:hidden clips
        // it to the plate, which acts as the reveal window.
        inner.style.transform = "translateY(" + (-rect.top).toFixed(2) + "px)";
      } else {
        // Parallax drift: -1 (below viewport) → +1 (above viewport).
        // No zoom — the sheet must never be cropped; the white
        // plate absorbs any gap the drift opens.
        var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        inner.style.transform = "translateY(" + (progress * -2.5).toFixed(2) + "%)";
      }

      // Caption trails the sheet slightly.
      if (caption) {
        var cp = clamp01((enter - 0.45) / 0.5);
        caption.style.opacity = cp.toFixed(3);
        caption.style.transform = "translateY(" + ((1 - cp) * 26).toFixed(1) + "px)";
      }
    });
  }

  /* ---------------------------------------------------------
     Main animation loop: lerp current darkness toward target
     each frame for a buttery transition, and drive parallax.
     Loop idles (skips work) once values settle and nothing
     scrolled, so it stays cheap.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Heavy scroll (desktop pointer devices): wheel input feeds a
     target position; the frame loop eases toward it, giving the
     page weight and momentum. Scrollbar drags, keyboard and
     touch stay native — the loop adopts any external movement.
     --------------------------------------------------------- */
  var heavyScroll = !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches;
  var scrollTarget = window.scrollY || window.pageYOffset;
  var scrollCurrent = scrollTarget;

  function maxScroll() {
    return Math.max(0, docEl.scrollHeight - window.innerHeight);
  }

  if (heavyScroll) {
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return; // pinch-zoom
      e.preventDefault();
      var d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      scrollTarget = Math.min(maxScroll(), Math.max(0, scrollTarget + d));
    }, { passive: false });

    // Anchor navigation rides the same eased motion.
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (ev) {
        var el = document.querySelector(a.getAttribute("href"));
        if (!el) return;
        ev.preventDefault();
        scrollTarget = Math.min(maxScroll(),
          el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset));
      });
    });
  }

  /* ---------------------------------------------------------
     Interactive skyline under the hero name: thin bars ripple
     idly like a slow wave; the cursor raises a hill of bars
     around it, the nearest ones flushing red.
     --------------------------------------------------------- */
  var barsWrap = document.getElementById("hero-bars");
  var bars = [];
  var barHeights = [];
  var BAR_COUNT = 72;
  var barMouseX = -1;   // 0..1 across the strip, -1 = not hovering
  var accentColor = "#b0322a";

  if (barsWrap) {
    var frag = document.createDocumentFragment();
    for (var bi = 0; bi < BAR_COUNT; bi++) {
      var s = document.createElement("span");
      frag.appendChild(s);
      bars.push(s);
      barHeights.push(0.14);
    }
    barsWrap.appendChild(frag);

    if (!prefersReducedMotion) {
      barsWrap.addEventListener("mousemove", function (e) {
        var r = barsWrap.getBoundingClientRect();
        barMouseX = (e.clientX - r.left) / r.width;
      });
      barsWrap.addEventListener("mouseleave", function () {
        barMouseX = -1;
      });
    }
  }

  function updateBars(now) {
    if (!bars.length) return;
    for (var i = 0; i < BAR_COUNT; i++) {
      var n = i / (BAR_COUNT - 1);
      // Idle wave — two slow sines drifting through the strip
      var t = 0.12
        + 0.10 * (0.5 + 0.5 * Math.sin(now * 0.0012 + i * 0.32))
        + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.0007 - i * 0.18));
      var hot = false;
      if (barMouseX >= 0) {
        var d = (n - barMouseX) / 0.06;          // hill width
        var lift = Math.exp(-d * d);
        t += lift * 0.88;
        hot = lift > 0.7;
      }
      if (t > 1) t = 1;
      barHeights[i] += (t - barHeights[i]) * 0.18;
      bars[i].style.transform = "scaleY(" + barHeights[i].toFixed(3) + ")";
      bars[i].style.background = hot ? accentColor : "";
    }
  }

  if (!prefersReducedMotion) {
    var current = 0;
    var lastScrollY = -1;

    var tick = function () {
      updateBars(performance.now());
      if (heavyScroll) {
        var actual = window.scrollY || window.pageYOffset;
        if (Math.abs(actual - Math.round(scrollCurrent)) > 1) {
          // Moved by scrollbar / keyboard / native smooth — adopt it.
          scrollCurrent = scrollTarget = actual;
        } else if (scrollCurrent !== scrollTarget) {
          scrollCurrent += (scrollTarget - scrollCurrent) * 0.07;
          if (Math.abs(scrollTarget - scrollCurrent) < 0.5) scrollCurrent = scrollTarget;
          window.scrollTo({ top: scrollCurrent, left: 0, behavior: "instant" });
        }
      }

      var target = targetDarkness();
      var delta = target - current;

      if (Math.abs(delta) > 0.0005) {
        current += delta * 0.09;
        applyTheme(current);
      } else if (current !== target) {
        current = target;
        applyTheme(current);
      }

      var y = window.scrollY || window.pageYOffset;
      if (y !== lastScrollY) {
        lastScrollY = y;
        updateProgress();
        updateParallax();
      }

      requestAnimationFrame(tick);
    };

    applyTheme(0);
    updateProgress();
    updateParallax();
    window.addEventListener("resize", updateParallax);
    requestAnimationFrame(tick);
  } else {
    /* Reduced motion: plain section-based switching, no lerp,
       no parallax. Dark zones are marked with data-theme-zone. */
    var darkZones = Array.prototype.slice.call(document.querySelectorAll("[data-theme-zone='dark']"));

    var applyStatic = function () {
      var mid = window.innerHeight / 2;
      var inDark = darkZones.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      docEl.setAttribute("data-theme", inDark ? "dark" : "light");
      updateProgress();
    };

    window.addEventListener("scroll", applyStatic, { passive: true });
    window.addEventListener("resize", applyStatic);
    applyStatic();
  }

  /* ---------------------------------------------------------
     Scroll reveals — staggered within each batch that enters.
     --------------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var stagger = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--reveal-delay", (stagger * 90) + "ms");
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
        stagger++;
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------------------------------------------------
     Live IST clock.
     --------------------------------------------------------- */
  var clockEl = document.getElementById("ist-clock");
  var istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  function updateClock() {
    clockEl.textContent = istFormatter.format(new Date());
  }

  updateClock();
  setInterval(updateClock, 1000);
})();
