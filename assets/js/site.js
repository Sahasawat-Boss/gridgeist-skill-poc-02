/*
Softy Pinko — Editorial Grid
Vanilla replacement for jQuery + scrollReveal + waypoints + counterUp.

Every behaviour here is progressive: with JS disabled the page still
renders complete content, the nav links still jump to their sections,
and the form still submits through native validation.
*/
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Marks that JS is running, so CSS may hide reveal targets.
  root.classList.add("js");

  /* -------------------------------------------------
  mobile navigation — disclosure, Escape, focus return
  ------------------------------------------------- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    nav.setAttribute("data-open", String(open));
  }

  function navIsOpen() {
    return toggle && toggle.getAttribute("aria-expanded") === "true";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!navIsOpen());
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navIsOpen()) {
        setNav(false);
        toggle.focus();
      }
    });

    // Close when the layout leaves the mobile range.
    var wide = window.matchMedia("(min-width: 721px)");
    var onWide = function (event) {
      if (event.matches) setNav(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else wide.addListener(onWide);
  }

  /* -------------------------------------------------
  scroll spy — marks the section currently being read
  ------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-list a[href^='#']")
  );
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  function markCurrent(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = new Map();

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        var best = null;
        visible.forEach(function (ratio, id) {
          if (ratio > 0 && (!best || ratio > best.ratio)) best = { id: id, ratio: ratio };
        });

        if (best) markCurrent(best.id);
      },
      {
        // Discount the sticky header so the active mark matches what is read.
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1]
      }
    );

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* -------------------------------------------------
  reveal on enter — decoration only, never content-gating
  ------------------------------------------------- */
  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal]")
  );

  function revealAll() {
    revealTargets.forEach(function (el) {
      el.classList.add("is-revealed");
    });
  }

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealAll();
  } else {
    var revealer = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    revealTargets.forEach(function (el) {
      revealer.observe(el);
    });
  }

  // If motion is switched off mid-session, stop hiding anything.
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function (event) {
      if (event.matches) revealAll();
    });
  }

  /* -------------------------------------------------
  counting figures — final value is in the HTML already
  ------------------------------------------------- */
  var counters = Array.prototype.slice.call(
    document.querySelectorAll("[data-count-to]")
  );

  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count-to"), 10);
    if (isNaN(target)) return;

    var duration = 900;
    var start = null;

    function step(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      // ease-out so the number settles rather than snapping
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  if (counters.length && "IntersectionObserver" in window && !reduceMotion.matches) {
    var counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  /* -------------------------------------------------
  contact form — validation, loading, error, success
  ------------------------------------------------- */
  var form = document.getElementById("contact");
  var status = document.getElementById("form-status");
  var submit = document.getElementById("form-submit");

  function fieldOf(input) {
    return input.closest("[data-field]");
  }

  function setFieldValidity(input) {
    var wrapper = fieldOf(input);
    if (!wrapper) return input.checkValidity();

    var valid = input.checkValidity();
    wrapper.setAttribute("data-invalid", String(!valid));
    input.setAttribute("aria-invalid", String(!valid));
    return valid;
  }

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message;
    if (tone) status.setAttribute("data-tone", tone);
    else status.removeAttribute("data-tone");
  }

  if (form && submit) {
    var inputs = Array.prototype.slice.call(
      form.querySelectorAll("input, textarea")
    );

    inputs.forEach(function (input) {
      // Validate on blur, then live once the field has been corrected.
      input.addEventListener("blur", function () {
        setFieldValidity(input);
      });
      input.addEventListener("input", function () {
        var wrapper = fieldOf(input);
        if (wrapper && wrapper.getAttribute("data-invalid") === "true") {
          setFieldValidity(input);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var firstInvalid = null;
      inputs.forEach(function (input) {
        if (!setFieldValidity(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        setStatus("Check the highlighted fields — your text has been kept.", "error");
        firstInvalid.focus();
        return;
      }

      // Demo only: no request is made and no data leaves the page.
      submit.setAttribute("data-state", "loading");
      submit.disabled = true;
      setStatus("Sending", "pending");

      window.setTimeout(function () {
        submit.removeAttribute("data-state");
        submit.disabled = false;
        setStatus(
          "Thanks — this is a demo form, so nothing was actually sent.",
          "success"
        );
        form.reset();
        inputs.forEach(function (input) {
          var wrapper = fieldOf(input);
          if (wrapper) wrapper.removeAttribute("data-invalid");
          input.removeAttribute("aria-invalid");
        });
      }, 900);
    });
  }
})();
