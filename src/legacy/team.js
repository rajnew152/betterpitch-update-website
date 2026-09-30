/* =============================================================================
   team.js — the kora-style team panel at the end of the journey section. The
   journey keeps its own scroll length (the stylesheet's pin height); the panel
   sits after that, inside the same pin height, one viewport, so the gradient
   stage stays pinned underneath while the panel scrolls up over it. Clicking a
   member row opens the profile dialog (moved to <body>, so position:fixed is
   viewport-true inside the pinned scene). The panel recedes a little as the
   Toolkit arrives, like the journey stage itself does.
   ============================================================================= */
(function () {
  "use strict";

  function init() {
    const root = document.getElementById("section-journey");
    const team = root && root.querySelector(".traj__team");
    if (!root || !team) return;

    /* ---- member profile dialog ---- */
    const modal = team.querySelector(".team-modal");
    if (modal) {
      document.body.appendChild(modal);
      const members = modal.querySelectorAll(".team-modal__member");
      const closeBtn = modal.querySelector(".team-modal__close");
      const scrim = modal.querySelector(".team-modal__scrim");
      const card = modal.querySelector(".team-modal__card");
      let opener = null;
      /* the card grows out of (and shrinks back into) the row's "+" button: its
         offset from the viewport centre, where the flex-centred card sits */
      const aimAt = (row) => {
        if (!card) return;
        const plus = (row && row.querySelector(".team-row__plus")) || row;
        if (!plus) return;
        const r = plus.getBoundingClientRect();
        card.style.setProperty("--tm-from-x", Math.round(r.left + r.width / 2 - window.innerWidth / 2) + "px");
        card.style.setProperty("--tm-from-y", Math.round(r.top + r.height / 2 - window.innerHeight / 2) + "px");
      };
      const open = (id) => {
        members.forEach((m) => m.classList.toggle("is-active", m.dataset.member === id));
        aimAt(opener);
        if (card) card.scrollTop = 0;
        if (opener) opener.classList.add("is-opener");
        /* commit the start state before .is-open, so the entrance always plays */
        void modal.offsetWidth;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (closeBtn) closeBtn.focus({ preventScroll: true });
      };
      const close = () => {
        if (!modal.classList.contains("is-open")) return;
        aimAt(opener);
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (opener) {
          opener.classList.remove("is-opener");
          opener.focus({ preventScroll: true });
          opener = null;
        }
      };
      /* delegated at the document level: the rows live inside ScrollTrigger's
         pinned scene, whose pin-spacers re-parent elements — this keeps the
         click working no matter where the rows end up */
      document.addEventListener("click", (e) => {
        const row = e.target instanceof Element && e.target.closest(".team-row");
        if (!row) return;
        e.preventDefault();
        opener = row;
        open(row.dataset.member);
      });
      if (closeBtn) closeBtn.addEventListener("click", close);
      if (scrim) scrim.addEventListener("click", close);
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) close();
      });
    }

    /* ---- the hiring card's four small cards (components/Journey/TeamHire.jsx):
       the roles filter, the CV checklist and its ring, the hiring steps (which
       advance on their own while in view) and the perk carousel (which rotates on
       its own). Clicks are delegated at the document level for the same
       pin-spacer reason as the rows. Hovering a card pauses its auto-play, and a
       real tap hands that card to the visitor ---- */
    const hire = team.querySelector(".team-hire");
    if (hire) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const $ = (s) => hire.querySelector(s);
      const $$ = (s) => Array.from(hire.querySelectorAll(s));

      /* 1. roles: filter by team; the rows that stay slide back in, in turn */
      const filterRoles = (team) => {
        $$(".hc-filter button").forEach((b) => b.classList.toggle("is-active", b.dataset.filter === team));
        let k = 0;
        $$(".hc-roles li").forEach((li) => {
          const show = team === "all" || li.dataset.team === team;
          li.classList.toggle("is-hidden", !show);
          if (!show || still) return;
          li.style.setProperty("--i", String(k++));
          li.classList.add("is-entering");
          requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove("is-entering")));
        });
      };

      /* 2. CV checklist: each tick fills the ring; all ticked, the card is ready */
      const cvCard = $(".hc--cv");
      const syncChecks = () => {
        const boxes = $$(".hc-checks button");
        const done = boxes.filter((b) => b.getAttribute("aria-pressed") === "true").length;
        const ring = $(".hc-ring"), num = $(".hc-ring__num"), note = $(".hc-cv__note");
        if (ring) ring.style.setProperty("--p", String(done / boxes.length));
        if (num) num.textContent = `${done}/${boxes.length}`;
        const ready = done === boxes.length;
        if (cvCard) cvCard.classList.toggle("is-ready", ready);
        if (note) note.textContent = ready ? "All set! Tap “Apply now” to send it." : done ? `${boxes.length - done} to go.` : "Tick what you have ready.";
      };

      /* 3. steps: the active one explains itself; the rail fills up to it */
      const stepsList = $(".hc-steps");
      let step = 0;
      const showStep = (i) => {
        step = i;
        if (stepsList) stepsList.style.setProperty("--step", String(i));
        $$(".hc-steps button").forEach((b, k) => {
          b.classList.toggle("is-active", k === i);
          b.classList.toggle("is-done", k < i);
        });
        $$(".hc-steps__detail p").forEach((p, k) => p.classList.toggle("is-active", k === i));
      };

      /* 4. perks: the current one slides out left as the next slides in */
      let perk = 0;
      const showPerk = (i) => {
        const slides = $$(".hc-perk");
        if (!slides.length || i === perk) return;
        const old = slides[perk];
        old.classList.remove("is-active");
        old.classList.add("is-leaving");
        setTimeout(() => old.classList.remove("is-leaving"), 600);
        perk = (i + slides.length) % slides.length;
        slides[perk].classList.add("is-active");
        $$(".hc-dots button").forEach((b, k) => b.classList.toggle("is-active", k === perk));
      };

      /* auto-play for the steps and the perks: only while the grid is on screen,
         paused while the pointer is on that card, stopped for good once tapped */
      const STEP_COUNT = $$(".hc-steps button").length || 1;
      const auto = [
        { card: $(".hc--steps"), every: 2800, tick: () => showStep((step + 1) % STEP_COUNT) },
        { card: $(".hc--life"), every: 3600, tick: () => showPerk(perk + 1) },
      ].filter((a) => a.card);
      let inView = false;
      auto.forEach((a) => {
        a.card.addEventListener("pointerenter", () => { a.hover = true; });
        a.card.addEventListener("pointerleave", () => { a.hover = false; });
      });
      const syncAuto = () => {
        auto.forEach((a) => {
          const on = inView && !a.taken && !still;
          if (on && !a.timer) a.timer = setInterval(() => { if (!a.hover && !document.hidden) a.tick(); }, a.every);
          if (!on && a.timer) { clearInterval(a.timer); a.timer = 0; }
        });
      };
      const takeOver = (card, e) => {
        if (!e.isTrusted) return;
        const a = auto.find((x) => x.card === card);
        if (a) { a.taken = true; syncAuto(); }
      };

      document.addEventListener("click", (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t || !hire.contains(t)) return;
        const f = t.closest(".hc-filter button");
        if (f) return filterRoles(f.dataset.filter);
        const c = t.closest(".hc-checks button");
        if (c) { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); return syncChecks(); }
        const s = t.closest(".hc-steps button");
        if (s) { takeOver(s.closest(".hc"), e); return showStep(Number(s.dataset.step)); }
        const d = t.closest(".hc-dots button");
        if (d) { takeOver(d.closest(".hc"), e); return showPerk(Number(d.dataset.go)); }
      });

      /* entrance: each card's own entrance plays when the grid scrolls into view */
      const grid = $(".hire-grid");
      if ("IntersectionObserver" in window && grid) {
        if (!still) grid.classList.add("js-reveal");
        new IntersectionObserver(([e]) => {
          inView = e.isIntersecting && e.intersectionRatio > 0.35;
          if (inView) grid.classList.add("is-in");
          syncAuto();
        }, { threshold: [0, 0.35, 0.6] }).observe(grid);
      }
    }

    /* ---- scroll choreography (same shape as the old card deck, for one panel) ---- */
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".traj__pin-height");
    const panel = team.querySelector(".team-panel");
    if (!pinHeight || !panel) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* the journey's pin length comes from the stylesheet; the panel starts where
       the "outcomes." hold ends and adds one viewport (js/journey.js subtracts the
       block again, so its own timeline keeps its original length) */
    const layout = () => {
      pinHeight.style.height = "";
      team.style.marginTop = "";
      if (reduced) { pinHeight.style.height = "auto"; return; }
      const base = pinHeight.offsetHeight;
      team.style.marginTop = (base - window.innerHeight) + "px";
      pinHeight.style.height = (base + team.offsetHeight) + "px";
    };
    layout();
    if (reduced) return;
    ScrollTrigger.addEventListener("refreshInit", layout);

    /* "Meet the team": pinned over the whole block; it rises and fades in with the
       panel, so title and panel arrive together */
    const heading = team.querySelector(".team-heading");
    const title = heading && heading.querySelector(".team-heading__title");
    if (heading && title) {
      gsap.set(heading, { zIndex: 2 });
      ScrollTrigger.create({
        trigger: heading,
        start: "top top",
        endTrigger: team,
        end: "bottom bottom",
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
      gsap.fromTo(title, { autoAlpha: 0, y: 70, scale: 0.94, filter: "blur(8px)" }, {
        autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "power2.out",
        scrollTrigger: { trigger: panel, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      /* the "outcomes." sentence clears out of the way as the title comes in */
      const center = root.querySelector(".traj__center");
      if (center) {
        gsap.fromTo(center, { opacity: 1 }, {
          opacity: 0, ease: "none",
          scrollTrigger: { trigger: panel, start: "top bottom", end: "top 55%", scrub: true, invalidateOnRefresh: true },
        });
      }
    }

    gsap.set(panel, { zIndex: 1 });
    /* the panel never rests half-risen: once a scroll ends while it is coming up, the
       page glides on until the whole section fills the screen (scrolling down) or
       back to the gradient screen before it (scrolling up) */
    ScrollTrigger.create({
      trigger: panel,
      start: "top bottom",
      end: "top top",
      invalidateOnRefresh: true,
      snap: {
        snapTo: (value, self) => (self.direction >= 0 ? (value > 0.02 ? 1 : 0) : (value < 0.98 ? 0 : 1)),
        duration: { min: 0.45, max: 1.1 },
        delay: 0.1,
        ease: "power2.inOut",
      },
    });
    ScrollTrigger.create({
      trigger: panel,
      start: "top top",
      endTrigger: team,
      end: "bottom bottom",
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    /* keep the panel (and the title) inside the orange / purple stage: whatever part
       of them falls outside the stage's on-screen box is clipped away, so during the
       hand-off (when the stage shrinks and scrolls off) nothing hangs outside it */
    const stage = root.querySelector(".traj__container");
    if (stage) {
      const clipEls = [heading, panel].filter(Boolean);
      let raf = 0;
      const clipToStage = () => {
        raf = 0;
        const c = stage.getBoundingClientRect();
        if (c.bottom < -50 || c.top > window.innerHeight + 50) return;
        clipEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          const t = Math.max(0, c.top - r.top), rt = Math.max(0, r.right - c.right);
          const b = Math.max(0, r.bottom - c.bottom), l = Math.max(0, c.left - r.left);
          el.style.clipPath = t || rt || b || l ? `inset(${t}px ${rt}px ${b}px ${l}px)` : "";
        });
      };
      const queue = () => { if (!raf) raf = requestAnimationFrame(clipToStage); };
      window.addEventListener("scroll", queue, { passive: true });
      ScrollTrigger.addEventListener("refresh", queue);
    }

    /* hand-off: the panel recedes a little as the Toolkit arrives (the gradient
       stage behind it shrinks into its rounded strip, see js/journey.js) */
    const toolkit = document.getElementById("section-toolkit");
    if (toolkit) {
      const inner = panel.querySelector(".team-panel__inner");
      const hand = gsap.timeline({
        scrollTrigger: { trigger: toolkit, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      if (inner) hand.to(inner, { scale: 0.96, transformOrigin: "center center", ease: "none" }, 0);
      if (heading) hand.to(heading, { opacity: 0, ease: "none" }, 0);
      /* and the hand-off never rests half-way (the team panel cut off at the bottom
         with the Platform stage half in view): a scroll that ends while the Platform
         section is coming up glides on until it fills the screen, or back to the
         whole team section when scrolling up */
      ScrollTrigger.create({
        trigger: toolkit,
        start: "top bottom",
        end: "top top",
        invalidateOnRefresh: true,
        snap: {
          snapTo: (value, self) => (self.direction >= 0 ? (value > 0.02 ? 1 : 0) : (value < 0.98 ? 0 : 1)),
          duration: { min: 0.45, max: 1.1 },
          delay: 0.1,
          ease: "power2.inOut",
        },
      });
    }
  }

  window.LiaTeam = { init };
})();
