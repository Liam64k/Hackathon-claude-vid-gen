// Studio Gen landing page: small, dependency-free enhancements. The page is fully usable without JS.
(() => {
  const root = document.documentElement;
  root.classList.remove("no-js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---- nav: firmer background once the page scrolls
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- reveal on scroll (staggered within each group)
  const groups = new Map();
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const parent = el.parentElement;
    const n = groups.get(parent) ?? 0;
    el.style.setProperty("--i", String(n));
    groups.set(parent, n + 1);
  });
  const targets = document.querySelectorAll("[data-reveal], .browser, .final");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("is-in"));
  }

  // ---- hero mock-up: starts tilted back, flattens as it scrolls into view (--tilt 1 → 0)
  const stage = document.querySelector("[data-tilt]");
  if (stage && !reduced) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = stage.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // 1 when the stage's top sits at the bottom of the viewport, 0 once it reaches 35% from the top
      const t = Math.min(1, Math.max(0, (r.top - vh * 0.35) / (vh * 0.65)));
      stage.style.setProperty("--tilt", t.toFixed(3));
    };
    update();
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  } else if (stage) {
    stage.style.setProperty("--tilt", "0");
  }

  // ---- hero video: respect reduced motion, pause when off screen, drive the REC timecode
  const video = document.querySelector(".phone__video");
  const tc = document.querySelector("[data-timecode]");
  // One "Pause motion" control (WCAG 2.2.2): stops the video and every looping animation.
  let calm = reduced;
  const motionBtn = document.querySelector("[data-motion]");
  const setCalm = (on) => {
    calm = on;
    root.classList.toggle("calm", on);
    if (motionBtn) {
      motionBtn.setAttribute("aria-pressed", String(on));
      motionBtn.querySelector(".motion__label").textContent = on ? "Play motion" : "Pause motion";
    }
    if (video) { if (on) video.pause(); else video.play().catch(() => {}); }
  };
  motionBtn?.addEventListener("click", () => setCalm(!calm));

  if (video) {
    if (reduced) {
      video.removeAttribute("autoplay");
      video.pause();
      setCalm(true);
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !calm) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.2 }).observe(video);
    }
    if (tc) {
      const pad = (n) => String(Math.floor(n)).padStart(2, "0");
      video.addEventListener("timeupdate", () => {
        const t = video.currentTime;
        tc.textContent = `00:${pad(t)}:${pad((t % 1) * 30)}`;
      });
    }
  }

  // ---- magnetic download buttons (mouse only, never with reduced motion)
  if (finePointer && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      const strength = 0.22;
      btn.addEventListener("pointermove", (ev) => {
        const r = btn.getBoundingClientRect();
        const x = (ev.clientX - (r.left + r.width / 2)) * strength;
        const y = (ev.clientY - (r.top + r.height / 2)) * strength;
        btn.style.setProperty("--mx", `${x.toFixed(1)}px`);
        btn.style.setProperty("--my", `${y.toFixed(1)}px`);
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.setProperty("--mx", "0px");
        btn.style.setProperty("--my", "0px");
      });
    });
  }

  // ---- product tabs (WAI-ARIA tabs pattern: arrow keys, Home/End)
  document.querySelectorAll("[data-tabs]").forEach((wrap) => {
    const tabs = [...wrap.querySelectorAll('[role="tab"]')];
    const panel = wrap.querySelector('[role="tabpanel"]');
    const img = panel?.querySelector("img");
    if (!img || !tabs.length) return;
    // warm the cache so switching is instant
    const preload = () => tabs.forEach((t) => { const i = new Image(); i.src = t.dataset.src; });
    if ("requestIdleCallback" in window) requestIdleCallback(preload); else setTimeout(preload, 1500);

    let swap = 0;
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", tab.id);
      if (focus) tab.focus();
      const mine = ++swap; // any newer selection cancels pending swaps
      if (img.getAttribute("src") === tab.dataset.src) { img.classList.remove("is-swapping"); return; }
      img.classList.add("is-swapping");
      setTimeout(() => {
        if (mine !== swap) return; // a newer tab was chosen meanwhile
        img.src = tab.dataset.src;
        img.alt = tab.dataset.alt || "";
        const done = () => img.classList.remove("is-swapping");
        if (img.complete) done(); else img.addEventListener("load", done, { once: true });
      }, reduced ? 0 : 180);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t, false));
      t.addEventListener("keydown", (ev) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(ev.key in keys)) return;
        ev.preventDefault();
        select(tabs[(keys[ev.key] + tabs.length) % tabs.length], true);
      });
    });
  });

  // ---- copy buttons
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  };
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy);
      btn.textContent = ok ? "Copied ✓" : "Press Ctrl+C";
      const live = document.getElementById("copy-status");
      if (live) live.textContent = ok ? `Copied: ${btn.dataset.copy}` : "Copy failed. Select the command and press Ctrl+C.";
      btn.classList.toggle("is-done", ok);
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1800);
    });
  });
})();
