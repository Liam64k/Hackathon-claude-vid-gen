import { computeTiming } from "./timing.js";
import { api, h, mount, md, money, ago, clock, words, captionPreview, toast, fileUrl, eventsUrl, token } from "./lib.js";

const STAGES = ["ideas", "script", "shots", "voice", "render"];
const LABEL = { ideas: "Ideas", script: "Script", shots: "Storyboard", voice: "Voice", render: "Render" };
const SCREEN = { ideas: "ideas", script: "script", shots: "storyboard", voice: "voice", render: "render", done: "render" };
const STEP_OF = { ideas: 1, script: 2, storyboard: 3, voice: 4, render: 5 };
const SHORT_PRESET = { shorts: "Shorts", reels: "Reels", feed: "IG feed" };
const FORMATS = [["story", "Story"], ["what", "What would you do?"], ["myth", "Myth vs fact"]];
const FORMAT_FULL = { story: "Survival story", what: "What would you do?", myth: "Myth vs fact" };
// Same rules as app/lib/store.mjs (the server clamps too).
const MIN_S = 20, MAX_S = 180;
const clampS = (n) => { const v = Math.round(Number(n)); return Number.isFinite(v) && v > 0 ? Math.min(MAX_S, Math.max(MIN_S, v)) : 90; };
const wordRange = (sec) => { const s = clampS(sec); return [Math.round(s * 2.56), Math.round(s * 3.11)]; };
const lenLabel = (n) => { const m = Math.floor(n / 60), s = n % 60; return `${m ? `${m} min ` : ""}${s ? `${s} s` : ""}`.trim(); };
const RUNNING_COPY = {
  ideas: "Claude is writing five ideas",
  script: "Claude is writing the script and beat board",
  shots: "Claude is building the shots",
  voice: "Generating the voice",
  render: "Rendering your video",
  verify: "Claude is checking the facts on the web",
};

// /api/options fills these in at boot; the defaults match app/lib/store.mjs so the UI works before it answers.
const OPT = {
  styles: { flat: { name: "Flat 2D", ready: true }, cartoon: { name: "Cartoon", ready: false }, paper: { name: "Paper cut-out", ready: false }, comic: { name: "Comic ink", ready: false }, chalk: { name: "Chalkboard", ready: false } },
  presets: {
    tiktok: { name: "TikTok", ratio: "9:16", width: 1080, height: 1920 },
    shorts: { name: "YouTube Shorts", ratio: "9:16", width: 1080, height: 1920 },
    reels: { name: "Instagram Reels", ratio: "9:16", width: 1080, height: 1920 },
    youtube: { name: "YouTube", ratio: "16:9", width: 1920, height: 1080 },
    feed: { name: "Instagram feed", ratio: "4:5", width: 1080, height: 1350 },
    square: { name: "Square", ratio: "1:1", width: 1080, height: 1080 },
  },
  ratios: { "9:16": { width: 1080, height: 1920 }, "16:9": { width: 1920, height: 1080 }, "16:10": { width: 1920, height: 1200 }, "1:1": { width: 1080, height: 1080 }, "4:5": { width: 1080, height: 1350 }, custom: { width: 1080, height: 1920 } },
};
const STYLE_META = {
  flat: { text: "Clean vector shapes, a live HUD, diagrams that explain.", font: "-apple-system, BlinkMacSystemFont, sans-serif" },
  cartoon: { text: "Thick outlines, squash and stretch, big reactions.", font: "'Bricolage Grotesque', -apple-system, sans-serif" },
  paper: { text: "Layered paper, soft shadows, stop-motion steps.", font: "Fraunces, Georgia, serif" },
  comic: { text: "Ink lines, halftone dots, every beat a panel.", font: "Bangers, Impact, sans-serif" },
  chalk: { text: "Chalk lines that draw themselves, arrows and sums.", font: "Caveat, 'Bradley Hand', cursive" },
};
const styleName = (k) => OPT.styles[k]?.name ?? k ?? "Flat 2D";
const DEFAULT_OUT = { preset: "tiktok", ratio: "9:16", width: 1080, height: 1920 };
const outShape = (o) => { const x = o ?? DEFAULT_OUT; return x.preset ? `${OPT.presets[x.preset]?.name ?? x.preset} ${x.ratio}` : x.ratio === "custom" ? "Custom" : x.ratio; };
const outFull = (o) => { const x = o ?? DEFAULT_OUT; return `${outShape(x)} · ${x.width} × ${x.height}`; };
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => matchMedia("(max-width: 899px)").matches;

const S = {
  status: null,
  projects: [],
  boards: null,
  board: null,
  weaving: null,
  detail: null,
  route: { name: "home" },
  feed: [],
  feedOpen: false,
  partial: {}, // slug -> ideas streamed in
  progress: {}, // slug:stage -> {value,label}
  now: null,
  stepCost: 0,
  ui: {
    format: "story", length: 60, topic: "", voiceId: null, customVoice: "", libTab: "projects", skill: null, scriptTab: "lines", lineErrors: [],
    style: "flat", entry: "generate", hover: null, output: { preset: "tiktok" }, cw: 1920, ch: 1200, fragKind: "Moment", draft: "",
  },
  connecting: false,
  dirty: false,
};

const $ = (id) => document.getElementById(id);
const BOOT = Date.now(); // SSE replays recent history on connect: never toast for events older than the page
const fresh = (ev) => ev.at >= BOOT - 1000;

// What the current view wants in the inspector (right panel).
let INSP = { body: [], foot: [], dark: false, hide: true };
const insp = (body, foot, o = {}) => { INSP = { body, foot, dark: false, hide: false, ...o }; };

// ---------------------------------------------------------------- routing
const parseRoute = () => {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "p" && parts[1]) return { name: "project", slug: parts[1], screen: parts[2] ?? null };
  if (parts[0] === "library") return { name: "library", tab: parts[1] ?? "projects" };
  if (parts[0] === "inspiration") return { name: "inspiration", id: parts[1] ?? null };
  if (parts[0] === "new") return { name: "home", step: ["idea", "look", "shape", "story", "review"].includes(parts[1]) ? parts[1] : null };
  return { name: "home", step: null };
};
const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };
window.addEventListener("hashchange", () => route());

async function route() {
  const prev = S.route;
  S.route = parseRoute();
  if (S.route.name === "home" && !S.route.step) { S.route.step = "idea"; history.replaceState(null, "", "#/new/idea"); }
  if (prev.slug !== S.route.slug) S.ui.lineErrors = [];
  if (S.route.name === "project") {
    if (!S.detail || S.detail.state?.slug !== S.route.slug) { S.detail = null; renderAll(); } // show "Loading…" at once
    await loadDetail(S.route.slug);
    if (S.route.name !== "project") return; // navigated away meanwhile
  } else if (S.route.name === "inspiration") {
    if (S.board && S.route.id && S.board.id !== S.route.id) S.board = null;
    renderAll();
    await openBoards();
    if (S.route.name !== "inspiration") return;
  } else {
    loadProjects();
  }
  renderAll();
  $("main").focus({ preventScroll: true });
  $("main").scrollTop = 0;
  document.body.dataset.ready = location.hash || "#/"; // lets automated screenshots wait for the real screen
}

// Responses for a project the user has already left are dropped (no stale screens or actions).
async function loadDetail(slug) {
  let d;
  try {
    d = await api(`/api/projects/${slug}`);
  } catch (e) {
    d = { missing: true, error: e.message };
  }
  if (S.route.slug === slug) S.detail = d;
}

// One in-flight user action at a time: a second click on create / approve / run is ignored.
let busy = false;
const once = (fn) => async (...args) => {
  if (busy) return;
  busy = true;
  try { return await fn(...args); } finally { busy = false; }
};
let saveChain = Promise.resolve(); // script line saves, in order
async function loadProjects() {
  try {
    S.projects = (await api("/api/projects")).projects;
    S.projectsLoaded = true;
    renderSide();
    if (S.route.name === "library" && !document.activeElement?.closest?.("#main input")) renderMain();
  } catch { /* status shows the error */ }
}
let refreshTimer = null;
const refreshDetail = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (S.route.name !== "project") return loadProjects();
    // don't yank the page out from under someone typing
    if (document.activeElement?.closest?.("#main textarea, #main input, #insp input, #fe input, #fe select")) { S.dirty = true; return; }
    await loadDetail(S.route.slug);
    renderNav();
    renderMain();
  }, 150);
};
document.addEventListener("focusout", () => { if (S.dirty) { S.dirty = false; setTimeout(refreshDetail, 50); } });

// ---------------------------------------------------------------- toolbar
const ICON = {
  logo: () => svgNode('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="#5a4fd6"></circle><path d="M11 9.5v9l7.5-4.5z" fill="#ffffff"></path></svg>'),
  plus: () => svgNode('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="#5a4fd6" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v10M3 8h10"></path></svg>'),
  bulb: (on) => svgNode(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="${on ? "#5a4fd6" : "#77727e"}" stroke-width="1.5" stroke-linecap="round"><path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.2V12h5V9.7A4.5 4.5 0 0 0 8 1.5zM6 14.5h4"></path></svg>`),
  grid: (on) => svgNode(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="${on ? "#5a4fd6" : "#77727e"}" stroke-width="1.5"><rect x="2" y="2" width="5" height="5" rx="1.5"></rect><rect x="9" y="2" width="5" height="5" rx="1.5"></rect><rect x="2" y="9" width="5" height="5" rx="1.5"></rect><rect x="9" y="9" width="5" height="5" rx="1.5"></rect></svg>`),
  check: () => svgNode('<svg xmlns="http://www.w3.org/2000/svg" class="chk" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.4 2.4 4.6-5"></path></svg>'),
};
// Trusted constant markup only (never user text): parsed as SVG, so nothing goes through innerHTML.
function svgNode(markup, still = false) {
  const el = document.importNode(new DOMParser().parseFromString(markup, "image/svg+xml").documentElement, true);
  if (still) {
    el.querySelectorAll("animate, animateTransform").forEach((a) => a.remove());
    el.querySelectorAll("[stroke-dashoffset]").forEach((p) => p.setAttribute("stroke-dashoffset", "0"));
  }
  return el;
}

const stepState = () => {
  const r = S.route;
  const d = r.name === "project" && S.detail && !S.detail.missing ? S.detail : null;
  const cur = r.name === "home" ? 0 : d ? STEP_OF[screenOf(d)] ?? 1 : -1;
  return { d, cur };
};
function renderStepper() {
  const { d, cur } = stepState();
  const items = [];
  const mk = (i, label, href, cls, status) => {
    const inner = [cls.includes("done") && !cls.includes("cur") ? ICON.check() : status === "running" ? h("span.pulse") : h("span.n", {}, String(i)), label];
    const common = { class: cls, "aria-current": cls.includes("cur") ? "step" : null };
    return h("li", {}, href ? h("a.st", { ...common, href }, inner) : h("span.st", { ...common, "aria-disabled": "true" }, inner));
  };
  items.push(mk(0, "Set up", "#/", cur === 0 ? "cur" : d ? "done" : "", null));
  ["ideas", "script", "shots", "voice", "render"].forEach((stage, k) => {
    const i = k + 1;
    if (!d) return items.push(mk(i, LABEL[stage], null, "locked", null));
    const s = d.state;
    const st = s.stages[stage]?.status ?? "idle";
    const reachable = d.example || k === 0 || s.stages[STAGES[k - 1]].status === "approved" || st !== "idle";
    const cls = i === cur ? "cur" : !reachable ? "locked" : st === "approved" ? "done" : "";
    items.push(mk(i, LABEL[stage], reachable ? `#/p/${s.slug}/${SCREEN[stage]}` : null, cls, st));
  });
  return h("nav.stepper", { "aria-label": "Steps" }, h("ol", {}, items));
}

function renderTop() {
  const st = S.status;
  const replay = st?.mode === "replay";
  const c = st?.claude;
  let pill;
  if (!st) pill = h("span.pill.wait", {}, h("span.dot"), "Checking Claude…");
  else if (!c?.installed) pill = h("button.pill.bad", { onclick: () => go("#/"), title: c?.installFix ?? "" }, h("span.dot"), "Claude Code not installed");
  else if (c.loggedIn) pill = h("span.pill.ok", { title: `Your own Claude Code login${c.plan ? ` (${c.plan})` : ""}` }, h("span.dot"), `Claude${c.plan ? ` · ${c.plan[0].toUpperCase()}${c.plan.slice(1)}` : ""}`);
  else if (S.connecting) pill = h("span.pill.wait", {}, h("span.dot"), "Finish sign-in in your browser…");
  else pill = h("button.pill.bad", { onclick: connect }, h("span.dot"), "Connect Claude");
  const u = st?.usage;
  const five = u?.rate?.fiveHour;
  const job = st?.job;
  mount(
    $("top"),
    h("a.brand", { href: "#/" }, ICON.logo(), "Studio"),
    renderStepper(),
    h("div.tools", {},
      u ? h("span.meter", { title: `What today’s runs would cost on the pay-per-use API. On a Claude subscription you are not charged per run: it counts toward your plan’s usage limit${five != null ? ` (5-hour window used: ${Math.round(five * 100)}%)` : ""}.` }, "≈ ", h("b", {}, money(u.today)), " today · not billed") : null,
      st ? h(`span.pill.${replay ? "replay" : "live"}`, { title: replay ? "Replay: recorded runs and cached files, no Claude calls" : "Live: your own Claude Code does the work" }, h("span.dot", { style: { background: replay ? "var(--warn-dot)" : "var(--ok-dot)" } }), replay ? "Replay" : "Live") : null,
      pill,
      h("button.pill", { "aria-expanded": String(S.feedOpen), "aria-controls": "feed", onclick: () => setFeed(!S.feedOpen), title: "What Claude reads, writes and runs, live" }, job ? h("span.badge") : null, "Activity")),
  );
  if (narrow()) $("top").querySelector(".st.cur")?.scrollIntoView({ inline: "center", block: "nearest" });
}

function setFeed(open) {
  S.feedOpen = open;
  $("feed").hidden = !open;
  if (open) renderFeed();
  renderTop();
}

async function connect() {
  S.connecting = true;
  renderTop();
  try {
    const r = await api("/api/connect", { method: "POST" });
    if (r.connected) { S.connecting = false; await loadStatus(); toast("Claude is connected."); }
    else toast("Anthropic's sign-in opened in your browser. Finish there; Studio turns green by itself.");
  } catch (e) {
    S.connecting = false;
    toast(e.message, true);
  }
  renderTop();
  renderMain();
}

async function loadStatus(fresh) {
  try {
    S.status = await api(`/api/status${fresh ? "?fresh=1" : ""}`);
  } catch (e) {
    if (e.status === 401) return denied();
  }
  // The activity drawer opens by itself whenever a stage starts running.
  const j = S.status?.job;
  if (j) {
    const k = `${j.slug}:${j.stage}:${j.startedAt ?? ""}`;
    if (S.autoK !== k) { S.autoK = k; if (!S.feedOpen) { S.feedOpen = true; $("feed").hidden = false; } }
  }
  renderTop();
  renderFeed();
}

// ---------------------------------------------------------------- sidebar
const statusWord = (st) => ({ running: "working", review: "to approve", approved: "done", error: "failed", paused: "paused", idle: "" })[st] ?? "";
const screenOf = (d) => S.route.screen ?? SCREEN[d.current] ?? "ideas";
const thumbBox = (o) => { const x = o ?? DEFAULT_OUT; const k = 30 / Math.max(x.width, x.height); return { width: `${Math.round(x.width * k)}px`, height: `${Math.round(x.height * k)}px` }; };
const projStatus = (p) => (p.example ? "Example" : p.stage === "done" ? "Done" : `${LABEL[p.stage] ?? p.stage} · ${p.stage === "render" ? "rendering" : "in progress"}`);

function renderSide() {
  const r = S.route;
  const link = (href, on, icon, label) => h("a", { href, "aria-current": on ? "page" : null }, icon, label);
  const items = [
    link("#/new/idea", r.name === "home", ICON.plus(), "New video"),
    link("#/inspiration", r.name === "inspiration", ICON.bulb(r.name === "inspiration"), "Inspiration"),
    link("#/library", r.name === "library", ICON.grid(r.name === "library"), "Library"),
  ];
  if (r.name === "inspiration") {
    items.push(h("p.sec", {}, "Boards"));
    for (const b of S.boards ?? []) items.push(h("a.board", { href: `#/inspiration/${b.id}`, "aria-current": S.board?.id === b.id || r.id === b.id ? "page" : null }, h("span", {}, b.title), h("span.ct", {}, String(b.count))));
    items.push(h("button.navlink.newboard", { onclick: newBoard }, ICON.plus(), "New board"));
  } else {
    items.push(h("p.sec", {}, "Recent"));
    const rec = S.projects.slice(0, 12);
    if (!rec.length) items.push(h("p.none", {}, S.projectsLoaded ? "No videos yet." : "Loading…"));
    for (const p of rec) {
      items.push(h("a.proj", { href: `#/p/${p.slug}`, "aria-current": r.slug === p.slug ? "page" : null },
        h("span.thumb", {}, h("i", { style: { ...thumbBox(p.output), backgroundImage: p.cover ? `url("${fileUrl(p.cover)}")` : null } })),
        h("span.pt", {}, h("span", {}, p.title ?? (p.surprise ? "Surprise me" : p.topic) ?? p.slug), h("span.mono", {}, projStatus(p)))));
    }
  }
  mount($("rail"), items);
}
function renderNav() { renderTop(); renderSide(); }

// ---------------------------------------------------------------- activity drawer
function renderFeed() {
  const slug = S.route.name === "project" ? S.route.slug : null;
  const job = S.status?.job;
  const items = S.feed.filter((e) => !slug || !e.slug || e.slug === slug || e.stage === "connect").slice(-120);
  const list = h("ol", { "aria-live": "polite" }, items.length ? items.map((e) => h(`li.${e.type === "error" ? "error" : e.level === "warn" ? "warn" : e.type === "log" ? "log" : "claude"}`, {}, h("span.ic", { "aria-hidden": "true" }), h("div", {}, e.text ?? e.message, h("time", {}, clock(e.at)))))
    : h("li.empty-feed", {}, "Nothing yet. What Claude reads, writes and runs shows up here, live."));
  const nowText = job ? S.now ?? RUNNING_COPY[job.stage] : "Idle";
  // keep the reader's place: only follow new events when already at the bottom
  const old = $("feed").querySelector("ol");
  const follow = !old || old.scrollHeight - old.scrollTop - old.clientHeight < 40;
  const oldTop = old?.scrollTop ?? 0;
  const hadFocus = $("feed").contains(document.activeElement) ? document.activeElement.textContent : null;
  mount(
    $("feed"),
    h("header", {},
      h("div.row.between", {}, h("span.eyebrow", { style: { margin: 0 } }, "Activity"),
        h("span.row", { style: { gap: "6px" } }, job && S.route.slug !== job.slug ? h("button.btn.sm.danger", { onclick: stop, title: "Stop this step. Partial files are kept and you can resume." }, "Pause") : null, h("button.btn.sm", { onclick: () => setFeed(false), "aria-label": "Close activity" }, "Close"))),
      h("div.now", {}, job ? h("span", {}, h("span.spinner", { style: { width: "12px", height: "12px", borderWidth: "2px", display: "inline-block", verticalAlign: "-1px", marginRight: "8px" } }), nowText) : h("span.faint", {}, nowText)),
      h("div.cost", {}, h("span", {}, S.status?.mode === "replay" ? "Replay: $0.00, no Claude calls" : `This step ≈ ${money(S.stepCost)} (not billed)`), h("span", {}, `Today ≈ ${money(S.status?.usage?.today)}`)),
    ),
    list,
  );
  list.scrollTop = follow ? list.scrollHeight : oldTop;
  if (hadFocus) [...$("feed").querySelectorAll("button")].find((b) => b.textContent === hadFocus)?.focus({ preventScroll: true });
}
async function stop() {
  try { await api("/api/cancel", { method: "POST" }); } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- main
function renderMain() {
  const r = S.route;
  if (!(r.name === "project" && S.detail && !S.detail.missing && screenOf(S.detail) === "storyboard")) document.getElementById("fe")?.remove();
  const a = document.activeElement;
  const isInput = a && /^(INPUT|TEXTAREA)$/.test(a.tagName);
  // never rebuild the screen under a text field / slider someone is using
  if (r.name === "home" && isInput && (a.id === "topic" || $("insp").contains(a))) return;
  const keepStage = r.name === "inspiration" && isInput && $("main").contains(a);
  const keepInsp = isInput && $("insp").contains(a) && r.name !== "home";
  INSP = { body: [], foot: [], dark: false, hide: true };
  let view;
  let cls = "stage";
  if (r.name === "home") { view = homeView(); cls += " home"; }
  else if (r.name === "library") view = libraryView();
  else if (r.name === "inspiration") { view = inspirationView(); cls += " insp-stage"; }
  else if (!S.detail) view = h("div.empty", {}, "Loading…");
  else if (S.detail.missing) view = h("div.empty", {}, h("p", {}, "This project was not found."), h("a.btn", { href: "#/" }, "Back home"));
  else {
    const screen = screenOf(S.detail);
    view = { ideas: ideasView, script: scriptView, storyboard: storyboardView, voice: voiceView, render: renderView }[screen]?.() ?? h("div.empty", {}, "Unknown screen");
  }
  // Re-rendering replaces the DOM: put keyboard focus back on the equivalent control (chip, tab, voice…).
  const sigOf = (el) => `${el.tagName}|${el.getAttribute("aria-label") ?? ""}|${el.textContent.trim().slice(0, 60)}`;
  const zone = a && a !== $("main") ? (["main", "insp"].find((id) => $(id).contains(a)) ?? null) : null;
  const sig = zone ? sigOf(a) : null;
  if (!keepStage) {
    $("main").className = cls;
    mount($("main"), h("div.wrap", {}, view));
  }
  const showInsp = !INSP.hide;
  $("insp").classList.toggle("empty", !showInsp);
  $("insp").classList.toggle("dark", !!INSP.dark);
  if (!keepInsp) {
    mount($("inspBody"), INSP.body);
    mount($("inspFoot"), INSP.foot);
  }
  if (sig && !(zone === "main" && keepStage) && !(zone === "insp" && keepInsp)) [...$(zone).querySelectorAll("button, a, input, textarea")].find((el) => sigOf(el) === sig)?.focus({ preventScroll: true });
}
const renderAll = () => { renderNav(); renderMain(); renderFeed(); };

// --- shared pieces
const claudeOk = () => S.status?.mode === "replay" || (S.status?.claude?.installed && S.status?.claude?.loggedIn);
const pStyle = (s) => s.style ?? "flat";
const pOut = (s) => s.output ?? DEFAULT_OUT;
const arOf = (o) => { const x = o ?? DEFAULT_OUT; return (x.width / x.height).toFixed(4); };
const stageHead = (n, title, lead) => {
  const s = S.detail.state;
  return h("div.shead", {},
    h("p.ctx", {}, h("span", {}, `Step ${n} of 5`), "·", h("span", {}, styleName(pStyle(s))), "·", h("span", {}, outFull(pOut(s))), s.mode === "replay" ? h("span.tag.replay", {}, "Replay") : null),
    h("h2", {}, title),
    lead ? h("p.lead", {}, lead) : null);
};
// Project facts at the top of every step's inspector.
const projFacts = (d) => {
  const s = d.state;
  const len = s.length ? `~${s.length} s` : "";
  return h("section.sect", {}, h("header", {}, h("h3", {}, "This video")),
    h("dl.facts", {},
      h("div", {}, h("dt", {}, "Look"), h("dd", {}, styleName(pStyle(s)))),
      h("div", {}, h("dt", {}, "Posting to"), h("dd", {}, outShape(pOut(s)))),
      h("div", {}, h("dt", {}, "Size"), h("dd.mono", {}, `${pOut(s).width} × ${pOut(s).height}`)),
      len ? h("div", {}, h("dt", {}, "Length"), h("dd.mono", {}, len)) : null,
      s.format ? h("div", {}, h("dt", {}, "Format"), h("dd", {}, FORMAT_FULL[s.format] ?? s.format)) : null,
      h("div", {}, h("dt", {}, "Mode"), h("dd", {}, s.mode === "replay" ? "Replay (recorded)" : s.mode === "example" ? "Finished example" : "Live"))));
};

const working = (stage, extra) => {
  const key = `${S.route.slug}:${stage}`;
  const p = S.progress[key];
  return h("div.working", { role: "status" },
    h("span.spinner", { "aria-hidden": "true" }),
    h("div", { style: { flex: 1 } },
      h("b", {}, RUNNING_COPY[stage] + "…"),
      h("span.muted.small", { id: "now-line" }, S.now ?? "Starting…"),
      p || extra ? h("div", { style: { marginTop: "10px" } }, h("div.progress", { "aria-label": "progress" }, h("div", { id: `prog-${stage}`, style: { width: `${Math.round((p?.value ?? 0) * 100)}%` } })), h("div.small.faint", { id: `progl-${stage}`, style: { marginTop: "4px" } }, p?.label ?? "")) : null),
    h("button.btn.sm.danger", { onclick: stop }, "Pause"));
};

const errorBox = (stage) => {
  const st = S.detail.state.stages[stage];
  const e = st.error ?? {};
  const paused = st.status === "paused";
  const resumable = paused && S.detail.state.mode !== "replay" && st.sessionId && ["ideas", "script", "shots"].includes(stage);
  const titles = { rate_limit: "Usage limit reached", budget: "Spending cap reached", cancelled: "Paused", interrupted: "Interrupted", timeout: "Took too long", denied: "A tool was blocked", typecheck: "The shots did not typecheck", render: "The render failed", not_installed: "Claude Code is not installed", signed_out: "Claude is signed out", eleven_key: "ElevenLabs key rejected", unsafe_topic: "Topic not allowed" };
  return h(`div.errbox${paused ? ".paused" : ""}`, { role: "alert" },
    h("b", {}, titles[e.code] ?? (paused ? "Paused" : "Something went wrong")),
    h("div", {}, e.message ?? "No details."),
    e.resetsAt ? h("div.small.muted", { style: { marginTop: "4px" } }, `Resets around ${new Date(e.resetsAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Your work is saved. Meanwhile you can show the full flow with `, h("span.kbd", {}, "npm run demo"), " (Replay).") : null,
    e.tail?.length ? h("pre", {}, e.tail.join("\n")) : null,
    h("div.row", { style: { marginTop: "10px" } },
      e.code === "signed_out" ? h("button.btn.primary.sm", { onclick: connect }, "Connect Claude") : null,
      resumable ? h("button.btn.primary.sm", { onclick: () => runStage(stage, { resume: true }) }, "Resume") : null,
      h(`button.btn.sm${resumable ? "" : ".primary"}`, { onclick: () => runStage(stage) }, paused ? "Start this step again" : "Retry")));
};

const runStage = once(async (stage, body = {}) => {
  try {
    S.stepCost = 0;
    S.now = null;
    if (stage === "ideas") S.partial[S.route.slug] = [];
    await api(`/api/projects/${S.route.slug}/stages/${stage}/run`, { method: "POST", body });
    await loadStatus();
    refreshDetail();
  } catch (e) { toast(e.message, true); }
});
const approve = once(async (stage, body = {}, nextScreen) => {
  await saveChain; // never approve a script while a line edit is still being saved
  try {
    S.stepCost = 0;
    S.now = null;
    S.detail = await api(`/api/projects/${S.route.slug}/stages/${stage}/approve`, { method: "POST", body });
    await loadStatus();
    go(`#/p/${S.route.slug}/${nextScreen}`);
  } catch (e) {
    toast(e.message, true);
    if (e.data?.errors) { S.ui.lineErrors = e.data.errors; renderMain(); }
  }
});

// ---------------------------------------------------------------- New video (home)
const curDims = () => {
  const o = S.ui.output;
  if (o.preset) { const p = OPT.presets[o.preset] ?? OPT.presets.tiktok; return { w: p.width, h: p.height }; }
  if (o.ratio === "custom") return { w: S.ui.cw, h: S.ui.ch };
  const r = OPT.ratios[o.ratio] ?? OPT.ratios["9:16"];
  return { w: r.width, h: r.height };
};
const curShape = () => (S.ui.output.preset ? OPT.presets[S.ui.output.preset]?.ratio : S.ui.output.ratio);
const outputBody = () => {
  const o = S.ui.output;
  if (o.preset) return { preset: o.preset };
  if (o.ratio === "custom") return { ratio: "custom", width: S.ui.cw, height: S.ui.ch };
  return { ratio: o.ratio };
};
const SAMPLE_CAPTION = "Rule one: lock the door, stay quiet.";

const FLOW = [["idea", "Idea"], ["look", "Look"], ["shape", "Shape"], ["story", "Story"], ["review", "Review"]];
const STARTERS = [
  ["Zombie outbreak", "What would you do on day one of a zombie outbreak?"],
  ["Nuclear war", "What would you do in the first ten minutes after a nuclear attack warning?"],
  ["City blackout", "What would you do if the whole city lost power for three days?"],
  ["Flash flood", "What would you do if a flash flood hit your street at night?"],
  ["Wildfire", "What would you do if a wildfire was heading for your town?"],
  ["Stuck in a lift", "What would you do if you were stuck in a lift with no signal?"],
];
const EXAMPLES = {
  story: "A nurse hears a knock on night three of the outbreak.",
  what: "The sirens stop. You have ten minutes. Pick a door.",
  myth: "Myth: hide in the basement during fallout. Fact: …",
};
const FORMAT_BLURB = { story: "A character, a problem, a way out.", what: "You are the hero. Pick the smart move.", myth: "Pop a common belief, then show what is true." };
const ENTRY_NAME = { generate: "Generate script with Claude", own: "Write it myself" };

function homeView() {
  const st = S.ui.step = S.route.step;
  const replay = S.status?.mode === "replay";
  const c = S.status?.claude;
  S.ui.hover = null;
  const submit = once(async (surprise) => {
    const topic = S.ui.topic.trim();
    if (!surprise && !topic) { toast("Type a topic, or press Surprise me."); go("#/new/idea"); return; }
    if (!claudeOk()) { toast("Connect Claude first.", true); return; }
    try {
      S.stepCost = 0;
      S.now = null;
      const d = await api("/api/projects", { method: "POST", body: { topic, surprise, entry: S.ui.entry, format: S.ui.format, length: S.ui.length, style: S.ui.style, output: outputBody() } });
      S.partial[d.state.slug] = [];
      S.ui.topic = "";
      await loadStatus();
      loadProjects();
      go(`#/p/${d.state.slug}/${S.ui.entry === "own" ? "script" : "ideas"}`);
    } catch (e) { toast(e.message, true); }
  });
  const banner = st !== "idea" || !S.status ? null
    : replay ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Replay mode. "), "Every step plays back a recorded run of the finished example “Ten Minutes Under”. No Claude calls, no API keys needed. Whatever topic you type, the result is that episode."))
    : !c?.installed ? h("div.banner", {}, h("div.grow", {}, h("b", {}, "Claude Code is not installed. "), "Studio uses your own Claude Code as its AI. Install it, then reload this page: ", h("span.kbd", {}, c?.installFix?.replace(/^Install Claude Code:\s*/, "") ?? "")))
    : !c.loggedIn ? h("div.banner", {}, h("div.grow", {}, h("b", {}, "Connect your Claude account. "), "Studio runs your own Claude Code on this computer. Signing in happens on Anthropic's page; Studio never sees your password or tokens."), h("button.btn.primary.sm", { onclick: connect, disabled: S.connecting }, S.connecting ? "Waiting for sign-in…" : "Connect Claude"))
    : null;

  const syncs = [];
  const sync = () => syncs.forEach((f) => f());
  const onSync = (f) => { syncs.push(f); f(); };
  const idx = FLOW.findIndex(([k]) => k === st);
  const hasTopic = () => !!S.ui.topic.trim();

  // ---- progress row
  const progress = h("nav.fprog", { "aria-label": "New video steps" }, h("ol", {}, FLOW.map(([k, l], i) => {
    const ok = i === 0 || hasTopic();
    const inner = [h("span.n", {}, String(i + 1)), l];
    const cls = `${i === idx ? "cur" : i < idx ? "done" : ""}${ok ? "" : " locked"}`;
    return h("li", {}, ok ? h("a.fs", { class: cls, href: `#/new/${k}`, "aria-current": i === idx ? "step" : null }, inner) : h("span.fs", { class: cls, "aria-disabled": "true" }, inner));
  })));

  // ---- shared preview frame
  const makePreview = () => {
    const capText = h("span", {}, SAMPLE_CAPTION);
    const sizeTag = h("span.pv-size");
    const timeTag = h("span.pv-time");
    const frame = h("div.pv", { role: "img" }, sizeTag, h("span.pv-play", {}, svgNode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="28" fill="currentColor" opacity="0.22"></circle><path d="M23 18v20l17-10z" fill="currentColor"></path></svg>')), h("div.cap", {}, capText), h("div.pv-bar", {}, h("span.pv-track", {}, h("i")), timeTag));
    onSync(() => {
      const k = S.ui.hover ?? S.ui.style;
      const { w, h: hh } = curDims();
      frame.style.setProperty("--ar", String(w / hh));
      frame.setAttribute("aria-label", `Preview of ${styleName(k)}, ${w} by ${hh}`);
      frame.className = `pv pv-${k}`;
      sizeTag.textContent = `${w} × ${hh}`;
      timeTag.textContent = `0:00 / ${Math.floor(S.ui.length / 60)}:${String(S.ui.length % 60).padStart(2, "0")}`;
    });
    return h("div.pv-wrap", {}, frame);
  };

  const shapeText = () => {
    const { w, h: hh } = curDims();
    const sh = curShape();
    return { w, hh, where: S.ui.output.preset ? `${OPT.presets[S.ui.output.preset]?.name} ${sh}` : sh === "custom" ? "Custom" : sh };
  };

  // ---- footer nav
  const back = (to) => h("a.btn", { href: `#/new/${to}` }, "Back");
  const nextBtn = (to) => {
    const b = h("a.btn.primary", { href: `#/new/${to}`, onclick: (e) => { if (!hasTopic()) e.preventDefault(); } }, "Next");
    onSync(() => { b.toggleAttribute("aria-disabled", !hasTopic()); b.classList.toggle("off", !hasTopic()); });
    return b;
  };
  const fnav = (...kids) => h("div.fnav", {}, kids);
  const screen = (cls, title, lead, ...kids) => h(`section.fscr.${cls}`, {}, h("header.fhead", {}, h("h1", {}, title), lead ? h("p.lead", {}, lead) : null), kids);

  let body;
  if (st === "idea") {
    const area = h("textarea.topic#topic", { id: "topic", rows: 5, placeholder: "What would you do on day one of a zombie outbreak?", maxlength: 300, "aria-label": "Your video idea", autocomplete: "off",
      oninput: (e) => { S.ui.topic = e.target.value; sync(); } });
    area.value = S.ui.topic;
    const chips = h("div.chips", { role: "group", "aria-label": "Starter ideas" }, STARTERS.map(([l, t]) => h("button.chip", { type: "button", onclick: () => { S.ui.topic = t; area.value = t; sync(); area.focus(); } }, l)));
    const cards = ["generate", "own"].map((k) => {
      const btn = h("button.choice", { type: "button", "aria-pressed": String(S.ui.entry === k), onclick: () => { if (!hasTopic()) { toast("Write your idea first."); area.focus(); return; } S.ui.entry = k; go("#/new/look"); } },
        h("b", {}, ENTRY_NAME[k]), h("span", {}, k === "generate" ? "Claude writes 5 ideas, then the script. You approve each step." : "You write the narration line by line. Claude only helps if you ask."));
      onSync(() => btn.classList.toggle("off", !hasTopic()));
      return btn;
    });
    body = [h("section.fscr.idea", {}, h("header.fhead", {}, h("h1", {}, "What's your video about?"), h("p.lead", {}, "One sentence is enough. Pick a starter or write your own.")), area, h("div.row.between", {}, chips, h("a.spark-link", { href: "#/spark" }, "Need a spark? Roll the dice")), h("div.choices", {}, cards)), fnav(nextBtn("look"))];
  } else if (st === "look") {
    const lookBtns = {};
    const LABEL_OF = { flat: "Flat 2D", cartoon: "Cartoon", paper: "Paper", comic: h("span", {}, "Comic"), chalk: "Chalk" };
    const look = (k) => (lookBtns[k] = h(`button.look.look-${k}`, { type: "button", "aria-label": styleName(k), onclick: () => { S.ui.style = k; sync(); }, onmouseenter: () => { S.ui.hover = k; sync(); }, onfocus: () => { S.ui.hover = k; sync(); }, onmouseleave: () => { S.ui.hover = null; sync(); }, onblur: () => { S.ui.hover = null; sync(); } }, LABEL_OF[k]));
    const note = h("p.look-note", { "aria-live": "polite" });
    const grid = h("div.looks", { role: "group", "aria-label": "Look" }, Object.keys(OPT.styles).map(look));
    onSync(() => {
      const k = S.ui.hover ?? S.ui.style;
      for (const [key, b] of Object.entries(lookBtns)) b.setAttribute("aria-pressed", String(S.ui.style === key));
      const ready = OPT.styles[k]?.ready;
      mount(note, h("strong", {}, `${styleName(k)}.`), ` ${STYLE_META[k].text} `, h(`span.${ready ? "ready" : "soon"}`, {}, ready ? "Renders today." : "Art pack coming."));
    });
    body = [h("div.split", {}, h("section.fscr.looksel", {}, h("header.fhead", {}, h("h1", {}, "Pick a look"), h("p.lead", {}, "Hover to preview, click to choose.")), grid, note), makePreview()), fnav(back("idea"), nextBtn("shape"))];
  } else if (st === "shape") {
    const presetBtns = {};
    const cards = Object.entries(OPT.presets).map(([k, p]) => {
      const kk = 44 / Math.max(p.width, p.height);
      return (presetBtns[k] = h("button.preset", { type: "button", role: "radio", "aria-label": `${p.name}, ${p.ratio}, ${p.width} by ${p.height}`, onclick: () => { S.ui.output = { preset: k }; sync(); } },
        h("span.shape", {}, h("i", { style: { width: `${Math.round(p.width * kk)}px`, height: `${Math.round(p.height * kk)}px` } })),
        h("span.pn", {}, p.name), h("span.r", {}, `${p.ratio} · ${p.width} × ${p.height}`)));
    });
    const ratioBtns = {};
    const seg = h("div.seg.mono", { role: "radiogroup", "aria-label": "Shape" }, Object.keys(OPT.ratios).map((k) => (ratioBtns[k] = h("button", { type: "button", role: "radio", onclick: () => { S.ui.output = { ratio: k }; sync(); } }, k === "custom" ? "Custom" : k))));
    const wIn = h("input", { type: "number", min: 480, max: 3840, step: 2, value: S.ui.cw, "aria-label": "Width in pixels", onchange: (e) => { S.ui.cw = Math.min(3840, Math.max(480, Math.round(Number(e.target.value)) || 1920)); e.target.value = S.ui.cw; sync(); } });
    const hIn = h("input", { type: "number", min: 480, max: 3840, step: 2, value: S.ui.ch, "aria-label": "Height in pixels", onchange: (e) => { S.ui.ch = Math.min(3840, Math.max(480, Math.round(Number(e.target.value)) || 1200)); e.target.value = S.ui.ch; sync(); } });
    const customRow = h("div.wh", {}, h("label", {}, "W", wIn), h("span.faint", {}, "×"), h("label", {}, "H", hIn));
    const size = h("span.mono.faint");
    onSync(() => {
      const sh = curShape();
      for (const [key, b] of Object.entries(presetBtns)) b.setAttribute("aria-checked", String(S.ui.output.preset === key));
      for (const [key, b] of Object.entries(ratioBtns)) b.setAttribute("aria-checked", String(sh === key));
      customRow.hidden = !(S.ui.output.ratio === "custom" && !S.ui.output.preset);
      const { w, hh } = shapeText();
      size.textContent = `Output: ${w} × ${hh} px`;
    });
    body = [screen("shapesel", "Where will it be posted?", "Pick a preset, or choose a shape below.", h("div.presets", { role: "radiogroup", "aria-label": "Posting to" }, cards), h("div.shapeline", {}, h("span.lbl", {}, "Shape"), seg, size), customRow), fnav(back("look"), nextBtn("story"))];
  } else if (st === "story") {
    const fmtBtns = {};
    const cards = FORMATS.map(([k, l]) => (fmtBtns[k] = h("button.fmtcard", { type: "button", role: "radio", onclick: () => { S.ui.format = k; sync(); } }, h("b", {}, l), h("span.blurb", {}, FORMAT_BLURB[k]), h("q", {}, EXAMPLES[k]))));
    const lenOut = h("output.bigval");
    const lenIn = h("input#len", { id: "len", type: "range", min: MIN_S, max: MAX_S, step: 5, value: S.ui.length, oninput: (e) => { S.ui.length = Number(e.target.value); sync(); } });
    onSync(() => {
      for (const [key, b] of Object.entries(fmtBtns)) b.setAttribute("aria-checked", String(S.ui.format === key));
      lenOut.textContent = lenLabel(S.ui.length);
      lenIn.setAttribute("aria-valuetext", lenLabel(S.ui.length));
    });
    body = [screen("storysel", "How should it be told?", null, h("div.fmtcards", { role: "radiogroup", "aria-label": "Format" }, cards),
      h("div.lenbox", {}, h("div.row.between", {}, h("label", { for: "len" }, "Length"), lenOut), lenIn, h("div.ticks", {}, h("span", {}, "20 s"), h("span", {}, "1 min"), h("span", {}, "2 min"), h("span", {}, "3 min")))), fnav(back("shape"), nextBtn("review"))];
  } else {
    const rows = h("dl.sumlist");
    onSync(() => {
      const { w, hh, where } = shapeText();
      const items = [["Idea", S.ui.topic.trim() || "Not written yet", "idea"], ["Look", styleName(S.ui.style), "look"], ["Shape", `${where} · ${w} × ${hh}`, "shape"], ["Format", FORMAT_FULL[S.ui.format], "story"], ["Length", lenLabel(S.ui.length), "story"], ["Script", ENTRY_NAME[S.ui.entry], "idea"]];
      mount(rows, items.map(([l, v, to]) => h("div", {}, h("dt", {}, l), h("dd", {}, v), h("a", { href: `#/new/${to}`, "aria-label": `Edit ${l}` }, "Edit"))));
    });
    const own = S.ui.entry === "own";
    const prim = h("button.btn.primary.lg", { type: "button", onclick: () => submit(false) }, own ? "Start writing" : "Write 5 ideas");
    onSync(() => { prim.disabled = !hasTopic(); });
    body = [h("div.split", {}, h("section.fscr", {}, h("header.fhead", {}, h("h1", {}, "Ready to go?"), h("p.lead", {}, replay ? "Replay: no Claude calls." : "About 2 minutes per step. You approve each one.")), rows), makePreview()), fnav(back("story"), h("button.btn.lg", { type: "button", onclick: () => submit(true) }, "Surprise me"), prim)];
  }
  sync();
  return [banner, progress, h("div.fbody", {}, body)];
}
const projCard = (p) =>
  h("a.proj-card", { href: `#/p/${p.slug}` },
    h("div.cov", {}, p.cover ? h("img", { src: fileUrl(p.cover), alt: "", loading: "lazy" }) : h("span.small", {}, "No cover yet")),
    h("div.meta", {}, h("b", {}, p.title ?? (p.surprise ? "Surprise me" : p.topic) ?? p.slug),
      h("div.row", { style: { marginTop: "6px", gap: "6px" } },
        p.example ? h("span.tag.ice", {}, "Example") : p.stage === "done" ? h("span.tag.ok", {}, "Finished") : h("span.tag.warn", {}, LABEL[p.stage] ?? p.stage),
        p.mode === "replay" ? h("span.tag.replay", {}, "Replay") : null,
        !p.example ? h("span.small.faint", {}, ago(p.updatedAt)) : null),
      h("div.fmt", {}, p.example ? "Flat 2D · TikTok 9:16" : `${styleName(p.style)} · ${outShape(p.output)}`)));



// ---------------------------------------------------------------- Ideas
function ideaCard(it, i, st, chosen) {
  const canPick = st === "review" && !S.detail.example;
  return h("article.card.idea", { "data-idea": i, class: chosen === i ? "hl" : chosen !== null && chosen !== undefined ? "gate-locked" : "" },
    h("div.score", { title: "Score 0-9: clear in 1 s + twist + showable in this pack" }, String(it.score ?? "–"), h("small", {}, "/9")),
    h("h3", {}, it.title),
    h("div.hook", {}, `“${it.hook}”`),
    h("dl", {},
      h("dt", {}, "Premise"), h("dd", {}, it.premise),
      h("dt", {}, "Twist"), h("dd", {}, it.twist),
      h("dt", {}, "On screen"), h("dd", {}, h("div.dchips", {}, (it.diagrams ?? []).map((d) => h("span", {}, d)))),
      h("dt", {}, "Fact"), h("dd", {}, it.fact, it.verify ? h("div.small.faint", {}, `Verify: ${it.verify}`) : null),
      it.risk && !/^low\b/i.test(it.risk) ? [h("dt", {}, "Risk"), h("dd", {}, it.risk)] : null),
    h("div.foot", {}, chosen === i ? h("span.tag.ok", {}, "Chosen") : canPick ? h("button.btn.primary", { onclick: () => approve("ideas", { pick: i }, "script") }, "Use this idea") : null));
}
function ideasView() {
  const d = S.detail;
  const st = d.state.stages.ideas.status;
  const ideas = d.ideas ?? S.partial[d.state.slug] ?? [];
  const chosen = d.state.stages.ideas.status === "approved" ? d.state.pick : null;
  const cards = [];
  for (let i = 0; i < 5; i++) cards.push(ideas[i] ? ideaCard(ideas[i], i, st, chosen) : st === "running" ? h("div.skel", { "data-idea": i, "aria-hidden": "true" }) : null);
  const topic = d.state.surprise ? "Surprise me" : `“${d.state.topic}”`;
  insp([
    projFacts(d),
    h("section.sect", {}, h("header", {}, h("h3", {}, "Next")), h("p.helptext", {}, st === "review" ? "Choose the idea to turn into a script. Facts are flagged to verify; nothing was searched on the web." : st === "approved" ? "Idea chosen. Continue to the script." : st === "running" ? "Claude is writing five ideas. They appear as they arrive." : "Ideas have not been generated yet.")),
  ], [
    st === "idle" ? h("button.btn.primary.lg.block", { onclick: () => runStage("ideas") }, "Write 5 ideas") : null,
    st === "approved" ? h("a.btn.primary.lg.block", { href: `#/p/${d.state.slug}/script` }, "Go to script →") : null,
    st === "review" || st === "approved" ? h("button.btn.block", { onclick: () => runStage("ideas") }, "Make 5 new ideas") : null,
  ]);
  return [
    stageHead(1, "Pick an idea", `${topic} · ${FORMAT_FULL[d.state.format] ?? ""} · ~${d.state.length} s.`),
    st === "running" ? working("ideas") : null,
    st === "error" || st === "paused" ? errorBox("ideas") : null,
    st === "idle" ? h("div.empty", {}, h("p", {}, "Ideas have not been generated yet.")) : null,
    h("div.ideas#ideas", { id: "ideas" }, cards),
  ];
}

// ---------------------------------------------------------------- Script
// ---- script editor helpers: coloured words are stored as "word" (gold), "word:r", "word:g", "word:p"
const wkey = (w) => String(w).toLowerCase().replace(/[^a-z0-9'’-]/g, "");
const HL_ORDER = ["", "gold", "r", "g", "p"];
const HL_NAME = { "": "no colour", gold: "gold", r: "red", g: "green", p: "purple" };
const hlColor = (hl, key) => { for (const x of hl ?? []) { const [w, c] = String(x).split(":"); if (w === key) return c || "gold"; } return ""; };
const hlSet = (hl, key, color) => [...(hl ?? []).filter((x) => String(x).split(":")[0] !== key), ...(color ? [color === "gold" ? key : `${key}:${color}`] : [])];
const hlPrune = (hl, text) => { const ws = new Set(String(text).split(/\s+/).map(wkey)); return (hl ?? []).filter((x) => ws.has(String(x).split(":")[0])); };
const speakSec = (n) => n / 2.6;
let lineTimer = null;
let scriptPaint = null;
function persistLines() {
  clearTimeout(lineTimer);
  lineTimer = null;
  const slug = S.route.slug;
  saveChain = saveChain.then(async () => {
    if (S.route.slug !== slug || !S.detail || S.detail.state?.slug !== slug) return;
    const payload = (S.detail.lines ?? []).map((l) => ({ text: l.text, highlight: l.highlight ?? [] }));
    try {
      const r = await api(`/api/projects/${slug}/lines`, { method: "POST", body: { lines: payload } });
      S.ui.lineErrors = r.errors ?? [];
      S.ui.saveState = "Saved";
    } catch (e) {
      S.ui.lineErrors = e.data?.errors ?? [e.message];
      S.ui.saveState = "Not saved";
    }
    scriptPaint?.();
  });
}
const queueLines = () => { S.ui.saveState = "Saving…"; scriptPaint?.(); clearTimeout(lineTimer); lineTimer = setTimeout(persistLines, 700); };

function scriptView() {
  const d = S.detail;
  const st = d.state.stages.script.status;
  d.lines ??= [];
  const L = () => S.detail.lines;
  const editable = st === "review" && !d.example;
  const [lo, hi] = wordRange(d.state.length);
  const tab = S.ui.scriptTab;
  const cards = [];
  const mutate = (fn, focus) => {
    fn(L());
    persistLines();
    renderMain();
    if (focus !== undefined) document.querySelector(`#main [data-line="${focus}"] textarea`)?.focus();
  };
  const errFor = (i) => S.ui.lineErrors.filter((e) => e.startsWith(`line ${i}:`));
  const stats = h("div.sbar", { role: "status" });
  const approveBtn = st === "review" && !d.example ? h("button.btn.primary.lg.block", { onclick: () => { if (lineTimer) persistLines(); approve("script", {}, "storyboard"); } }, "Approve script → storyboard") : null;
  const paintHead = () => {
    const ls = L();
    const total = ls.reduce((a, l) => a + words(l.text), 0);
    const secs = Math.round(speakSec(total) + ls.length * 0.3);
    mount(stats,
      h(`span.stat${total && (total < lo || total > hi) ? ".bad" : ""}`, {}, h("b", {}, String(total)), ` words · target ${lo}-${hi}`),
      h("span.stat", {}, h("b", {}, String(ls.length)), ls.length === 1 ? " line" : " lines"),
      h("span.stat", {}, "≈ ", h("b", {}, `${secs} s`)),
      h(`span.savestate${S.ui.saveState === "Not saved" ? ".bad" : ""}`, {}, S.ui.saveState ?? ""));
    if (approveBtn) approveBtn.disabled = !ls.some((l) => l.text?.trim());
  };
  const paintCard = (c, i) => {
    const l = L()[i];
    if (!l) return;
    const w = words(l.text);
    c.meta.textContent = `${w} word${w === 1 ? "" : "s"} · ~${speakSec(w).toFixed(1)} s${w > 34 ? " · over 34 words" : ""}`;
    c.root.classList.toggle("err", errFor(i).length > 0);
    mount(c.err, errFor(i).map((e) => h("div.lerr", {}, e.replace(/^line \d+: /, ""))));
    mount(c.chips, String(l.text).split(/\s+/).filter(Boolean).map((tok) => {
      const key = wkey(tok);
      const col = hlColor(l.highlight, key);
      return h(`button.wchip${col ? ".c-" + col : ""}`, {
        type: "button", disabled: !key, "aria-label": `${tok}: ${HL_NAME[col]}. Click to change colour`, title: "Click to cycle colour: gold, red, green, purple, none",
        onclick: () => {
          const next = HL_ORDER[(HL_ORDER.indexOf(col) + 1) % HL_ORDER.length];
          if (next && !col && (l.highlight ?? []).length >= 4) return toast("Up to four coloured words per line.");
          l.highlight = hlSet(l.highlight, key, next);
          paintCard(c, i);
          queueLines();
        },
      }, tok);
    }));
  };
  const card = (l, i) => {
    const ta = h("textarea", {
      "aria-label": `Line ${i + 1}`, rows: 2, placeholder: "Write the narration for this beat…",
      oninput: (e) => {
        const cur = L()[i];
        cur.text = e.target.value;
        cur.highlight = hlPrune(cur.highlight, cur.text);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight + 2}px`;
        paintCard(c, i);
        paintHead();
        queueLines();
      },
      onchange: () => { if (lineTimer) persistLines(); },
    }, l.text);
    const c = { root: h("div.line.edit", { "data-line": String(i) }), ta, meta: h("span.meta"), chips: h("div.chips-w", { role: "group", "aria-label": `Coloured words for line ${i + 1}` }), err: h("div") };
    const split = () => {
      const pos = ta.selectionStart;
      const txt = L()[i].text;
      const a = txt.slice(0, pos).trim(), b = txt.slice(pos).trim();
      if (!a || !b) return toast("Put the cursor inside the line where it should split.");
      const hl = L()[i].highlight ?? [];
      mutate((ls) => ls.splice(i, 1, { text: a, highlight: hlPrune(hl, a) }, { text: b, highlight: hlPrune(hl, b) }), i + 1);
    };
    const swap = (j) => mutate((ls) => { [ls[i], ls[j]] = [ls[j], ls[i]]; }, j);
    mount(c.root,
      h("div.n", {}, String(i + 1)),
      h("div.lbody", {},
        ta,
        h("div.chiprow", {}, h("span.meta", {}, "Click a word to colour it"), c.meta),
        c.chips,
        c.err,
        h("div.lact", {},
          h("button.btn.sm.tall", { type: "button", disabled: i === 0, "aria-label": `Move line ${i + 1} up`, onclick: () => swap(i - 1) }, "↑ Up"),
          h("button.btn.sm.tall", { type: "button", disabled: i === L().length - 1, "aria-label": `Move line ${i + 1} down`, onclick: () => swap(i + 1) }, "↓ Down"),
          h("button.btn.sm.tall", { type: "button", onclick: split, title: "Splits the line at the cursor" }, "Split at cursor"),
          h("button.btn.sm.tall.danger", { type: "button", "aria-label": `Delete line ${i + 1}`, onclick: () => mutate((ls) => ls.splice(i, 1), Math.max(0, i - 1)) }, "Delete"))));
    cards[i] = c;
    return c.root;
  };
  const fixedLine = (l, i) => h(`div.line${errFor(i).length ? ".err" : ""}`, {},
    h("div.n", {}, String(i + 1)),
    h("div", {}, h("div", { style: { fontSize: "15px", padding: "4px 6px" } }, captionPreview(l.text, l.highlight)),
      h("div.hl", {}, h("span.meta", {}, `${words(l.text)} words · ~${speakSec(words(l.text)).toFixed(1)} s`)),
      errFor(i).map((e) => h("div.lerr", {}, e.replace(/^line \d+: /, "")))));
  const addLine = () => mutate((ls) => ls.push({ text: "", highlight: [] }), L().length);
  const linesBody = () => {
    const ls = L();
    if (!editable) return h("div.lines", {}, ls.map(fixedLine));
    if (!ls.length) return h("div.empty.first", {}, h("p", {}, h("b", {}, "Write your first line — the hook.")), h("p", {}, "Keep it under 34 words, spell numbers as words."), h("button.btn.primary", { onclick: addLine }, "Write line one"));
    return [stats, h("div.lines", {}, ls.map(card)), h("div.row", { style: { marginTop: "10px" } }, h("button.btn", { onclick: addLine }, "+ Add line"))];
  };
  const body = tab === "lines" ? linesBody()
    : tab === "facts" ? factsView(d)
    : h("div.md", { html: md(tab === "notes" ? d.scriptMd ?? "_No script notes yet._" : d.shotlistMd ?? "_No beat board yet._") });
  const verifying = S.status?.job?.stage === "verify" && S.status.job.slug === d.state.slug;
  const general = S.ui.lineErrors.filter((e) => !/^line \d+:/.test(e));
  const warnings = d.state.stages.script.warnings ?? [];
  scriptPaint = editable && tab === "lines" ? () => {
    paintHead();
    cards.forEach((c, i) => c && paintCard(c, i));
    const g = document.getElementById("gen-errors");
    if (g) { const gen = S.ui.lineErrors.filter((e) => !/^line \d+:/.test(e)); mount(g, [...gen, ...warnings].map((e) => h("li", {}, e))); g.parentElement.hidden = !(gen.length || warnings.length); }
  } : null;
  const total = L().reduce((a, l) => a + words(l.text), 0);
  insp([
    projFacts(d),
    !editable && L().length ? h("section.sect", {}, h("header", {}, h("h3", {}, "Script")), h("div.stats", {},
      h("div.stat", {}, h("b", {}, String(total)), h("span", {}, `words (target ${lo}-${hi})`)),
      h("div.stat", {}, h("b", {}, String(L().length)), h("span", {}, "lines")))) : null,
    h("div.errors", { hidden: !(general.length || warnings.length) }, h("b", {}, "Check before approving"), h("ul#gen-errors", {}, [...general, ...warnings].map((e) => h("li", {}, e)))),
  ], [
    approveBtn,
    st === "review" && !d.example ? h("button.btn.block", { onclick: () => runStage("script") }, "Rewrite with Claude") : null,
    st === "approved" && !d.example ? h("a.btn.primary.lg.block", { href: `#/p/${d.state.slug}/storyboard` }, "Go to storyboard →") : null,
    st === "idle" && !d.example && d.state.stages.ideas.status === "approved" ? h("button.btn.primary.lg.block", { onclick: () => runStage("script") }, "Write the script") : null,
  ]);
  const out = [
    stageHead(2, d.state.title ?? "Script", "Read it out loud. Edit any line; click a word to colour it in the captions. The beat board shows how each line becomes shots."),
    st === "running" ? working("script") : null,
    st === "error" || st === "paused" ? errorBox("script") : null,
    verifying ? h("div.working", { role: "status" }, h("span.spinner"), h("div", { style: { flex: 1 } }, h("b", {}, "Claude is checking the facts on the web…"), h("span.muted.small", { id: "now-line" }, S.now ?? "Starting…")), h("button.btn.sm.danger", { onclick: stop }, "Stop")) : null,
    L().length || d.scriptMd ? h("div.tabs", { role: "tablist" }, [["lines", "Narration"], ["notes", "Script notes"], ["board", "Beat board"], ["facts", d.facts ? `Fact check (${d.facts.facts?.length ?? 0})` : "Fact check"]].map(([k, l]) => h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => { S.ui.scriptTab = k; renderMain(); } }, l))) : null,
    L().length || d.scriptMd ? body : st !== "running" ? h("div.empty", {}, "No script yet.") : null,
  ];
  queueMicrotask(() => { if (scriptPaint) { paintHead(); cards.forEach((c, i) => { if (c) { paintCard(c, i); c.ta.style.height = `${c.ta.scrollHeight + 2}px`; } }); } });
  return out;
}

function factsView(d) {
  const st = d.state.stages.script.status;
  const can = (st === "review" || st === "approved") && !d.example && !S.status?.job;
  const run = async () => {
    try { await api(`/api/projects/${d.state.slug}/verify`, { method: "POST" }); S.now = null; await loadStatus(); renderMain(); } catch (e) { toast(e.message, true); }
  };
  const tone = { confirmed: "ok", adjust: "warn", unverified: "" };
  return h("div", {},
    h("div.row.between", { style: { marginBottom: "12px" } },
      h("span.muted.small", { style: { flex: 1, minWidth: "200px" } }, "Optional: a researcher run (Sonnet + web search) checks every claim against official sources. It changes nothing; edit the narration yourself if a fact needs adjusting."),
      h("button.btn.sm.ice", { onclick: run, disabled: !can }, d.facts ? "Check again" : "Verify facts")),
    d.facts?.facts?.length
      ? h("div.md", {}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Claim"), h("th", {}, "Verdict"), h("th", {}, "Note"), h("th", {}, "Source"))),
          h("tbody", {}, d.facts.facts.map((f) => h("tr", {}, h("td", {}, f.claim), h("td", {}, h(`span.tag.${tone[f.verdict] ?? ""}`, {}, f.verdict)), h("td", {}, f.note), h("td", {}, /^https?:\/\//.test(f.source ?? "") ? h("a", { href: f.source, target: "_blank", rel: "noopener noreferrer" }, hostOf(f.source)) : f.source ?? ""))))))
      : h("div.empty", {}, "No fact check yet."));
}

// ---------------------------------------------------------------- Storyboard
// Working copy of the user's edits (edits.shots / edits.lines), shared by the Frames and Timing tabs.
const ZOOMS = [["Wide", 0.8], ["Medium", 1.2], ["Close", 1.8]];
const nearZoom = (z) => ZOOMS.reduce((b, c) => (Math.abs(c[1] - z) < Math.abs(b[1] - z) ? c : b))[1];
const W = { slug: null, shots: [], lines: {}, dirty: false, sel: null, errs: [], saving: false };
const rawOf = () => S.detail?.rawShots ?? [];
const effLine = (e) => e.line ?? rawOf()[e.base]?.line ?? 0;
const byLine = (arr) => arr.map((e, i) => ({ e, i })).sort((a, b) => effLine(a.e) - effLine(b.e) || a.i - b.i).map((x) => x.e);
const eff = (e) => { const r = rawOf()[e.base] ?? {}; return { base: e.base, id: r.id, line: e.line ?? r.line ?? 0, scene: e.scene ?? r.scene, zoom: e.zoom ?? r.zoom ?? 1, text: e.text !== undefined ? e.text : r.text ?? "", sec: e.sec }; };
const isEdited = (e) => Object.keys(e).length > 1 || W.shots.filter((x) => x.base === e.base).length > 1;
function syncWork() {
  const d = S.detail;
  if (W.slug === d.state.slug && W.dirty) return;
  W.slug = d.state.slug;
  W.shots = byLine((d.edits?.shots ?? rawOf().map((r) => ({ base: r.base }))).map((x) => ({ ...x })));
  W.lines = { ...(d.edits?.lines ?? {}) };
  W.dirty = false;
  W.errs = [];
  if (W.sel !== null && W.sel >= W.shots.length) W.sel = null;
}
const editsPayload = () => {
  const raw = rawOf();
  const identity = W.shots.length === raw.length && W.shots.every((e, i) => e.base === i && Object.keys(e).length === 1);
  const o = {};
  if (!identity) o.shots = W.shots;
  if (Object.keys(W.lines).length) o.lines = W.lines;
  return Object.keys(o).length ? o : null;
};
const touch = () => { W.dirty = true; W.errs = []; };
const stillSrc = (p) => (p ? fileUrl(p) + (S.stillsV ? `&v=${S.stillsV}` : "") : "");
// Which saved still shows this working entry (a changed entry shows the last rendered frame of the same base).
const stillOf = (d, e, k) => {
  if (!W.dirty) return d.stills?.[k];
  const saved = byLine((d.edits?.shots ?? rawOf().map((r) => ({ base: r.base }))));
  const j = saved.findIndex((x) => x.base === e.base);
  return d.stills?.[j >= 0 ? j : 0];
};
const fmtT = (sec) => { const t = Math.max(0, Math.round(sec * 10)); const r = (t % 600) / 10; return `${Math.floor(t / 600)}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };
const rendering = () => S.status?.job?.stage === "edits" && S.status.job.slug === S.route.slug;
const canEdit = (d) => ["review", "approved"].includes(d.state.stages.shots.status) && !d.example && rawOf().length > 0 && !S.status?.job;

const saveEdits = once(async () => {
  const slug = S.route.slug;
  try {
    await api(`/api/projects/${slug}/shots/edits`, { method: "POST", body: { edits: editsPayload() } });
    W.dirty = false;
    W.sel = null;
    await loadStatus();
    await loadDetail(slug);
  } catch (e) {
    W.errs = e.data?.errors ?? [e.message];
  }
  renderMain();
});
const discardEdits = () => { W.dirty = false; W.sel = null; renderMain(); };

const subtabs = (first) => h("div.tabs", { role: "tablist" }, [["main", first], ["timing", "Timing"]].map(([k, l]) => h("button", { role: "tab", "aria-selected": String((S.ui.sbTab ?? "main") === k), onclick: () => { S.ui.sbTab = k; renderMain(); } }, l)));

const dirtyBar = (d) => {
  if (!W.dirty) return null;
  const n = W.shots.filter(isEdited).length;
  return h("div.dirtybar", { role: "region", "aria-label": "Unsaved changes" },
    h("div.grow", {}, h("b", {}, "Unsaved changes"), h("span.small.muted", {}, ` ${[n ? `${n} edited frame${n === 1 ? "" : "s"}` : "", Object.keys(W.lines).length ? "custom line lengths" : "", W.shots.some((e) => e.sec !== undefined) ? "custom shot lengths" : ""].filter(Boolean).join(", ") || "Changes"}. `),
      d.state.stages.shots.status === "approved" ? h("span.small.muted", {}, "Saving re-opens the storyboard and resets the voice step.") : null,
      W.errs.length ? h("ul.small.berr", {}, W.errs.slice(0, 4).map((e) => h("li", {}, e))) : null),
    h("button.btn", { onclick: discardEdits }, "Discard"),
    h("button.btn.primary", { onclick: saveEdits }, "Update frames"));
};

function renderingBar() {
  if (!rendering()) return null;
  const p = S.progress[`${S.route.slug}:shots`];
  return h("div.working", { role: "status" }, h("span.spinner", { "aria-hidden": "true" }),
    h("div", { style: { flex: 1 } }, h("b", {}, "Re-drawing your frames…"), h("span.muted.small", {}, S.now ?? "Starting…"),
      h("div", { style: { marginTop: "10px" } }, h("div.progress", { "aria-label": "progress" }, h("div", { id: "prog-shots", style: { width: `${Math.round((p?.value ?? 0) * 100)}%` } })), h("div.small.faint", { id: "progl-shots", style: { marginTop: "4px" } }, p?.label ?? ""))));
}

const lineLabel = (lines, i) => `${i + 1} · ${(lines[i]?.text ?? "").split(/\s+/).slice(0, 7).join(" ")}`;

function paintFE() {
  const prevId = document.activeElement?.closest?.("#fe") ? document.activeElement.id : null;
  document.getElementById("fe")?.remove();
  const d = S.detail;
  if (W.sel === null || !d || !canEdit(d)) return;
  const k = W.sel;
  const e = W.shots[k];
  if (!e) return;
  const x = eff(e);
  const raw = rawOf()[e.base] ?? {};
  const lines = d.lines ?? [];
  const sceneList = [...new Set([...(OPT.scenes ?? []), ...rawOf().map((r) => r.scene), x.scene].filter(Boolean))].sort();
  const close = () => { W.sel = null; paintFE(); };
  const resort = (mutator) => { mutator(); const keep = W.shots[k]; W.shots = byLine(W.shots); W.sel = Math.max(0, W.shots.indexOf(keep)); touch(); renderMain(); };
  const patch = (obj) => {
    Object.assign(e, obj);
    for (const key of ["scene", "zoom", "line"]) if (e[key] === raw[key]) delete e[key];
    if (e.text !== undefined && e.text === (raw.text ?? "")) delete e.text;
    if (e.sec === undefined) delete e.sec;
    touch();
    W.shots = byLine(W.shots);
    W.sel = W.shots.indexOf(e);
    renderMain();
  };
  const move = (dir) => {
    const j = k + dir;
    const o = W.shots[j];
    if (!o) return;
    if (effLine(o) !== effLine(e)) { e.line = effLine(o); if (e.line === raw.line) delete e.line; W.shots = byLine(W.shots); }
    else { W.shots[k] = o; W.shots[j] = e; }
    W.sel = W.shots.indexOf(e);
    touch();
    renderMain();
  };
  const src = stillSrc(stillOf(d, e, k));
  const changed = W.dirty && isEdited(e);
  const field = (label, id, control) => h("div.ff", {}, h("label", { for: id }, label), control);
  const card = h("div.fe-card", { role: "dialog", "aria-modal": "true", "aria-label": `Edit shot ${k + 1}` },
    h("header.fe-head", {}, h("b", {}, `Shot ${k + 1} of ${W.shots.length}`), h("span.muted.small", {}, `${x.id ? x.id + " · " : ""}line ${x.line + 1}`), h("button.btn.sm.tall", { onclick: close, "aria-label": "Close editor" }, "Close")),
    h("div.fe-body", {},
      h("div.fe-img", { style: { "--ar": arOf(pOut(d.state)) } }, src ? h("img", { src, alt: `Shot ${k + 1}` }) : h("div.empty", {}, "No frame yet"), changed ? h("p.small.muted.fe-note", {}, "Showing the last drawn frame. Press Update frames to see your changes.") : null),
      h("div.fe-form", {},
        field("Scene", "fe-scene", h("select.input", { id: "fe-scene", onchange: (ev) => patch({ scene: ev.target.value }) }, sceneList.map((s) => h("option", { value: s, selected: s === x.scene }, s)))),
        h("div.ff", {}, h("span.lab", { id: "fe-cam" }, "Camera"), h("div.seg", { role: "group", "aria-labelledby": "fe-cam" }, ZOOMS.map(([l, z]) => h("button", { type: "button", "aria-pressed": String(nearZoom(x.zoom) === z), onclick: () => patch({ zoom: z }) }, l)))),
        field("On-screen text (max 60)", "fe-text", h("input.input", { id: "fe-text", value: x.text ?? "", maxlength: 60, placeholder: "No text", onchange: (ev) => patch({ text: ev.target.value.trim() }) })),
        field("Narration line", "fe-line", h("select.input", { id: "fe-line", onchange: (ev) => patch({ line: Number(ev.target.value) }) }, lines.map((_, i) => h("option", { value: i, selected: i === x.line }, lineLabel(lines, i))))),
        field("Duration (seconds, blank = auto)", "fe-sec", h("input.input", { id: "fe-sec", type: "number", step: "0.1", min: "0.5", max: "30", inputmode: "decimal", value: e.sec ?? "", placeholder: "Auto", onchange: (ev) => { const v = parseFloat(ev.target.value); patch({ sec: Number.isFinite(v) ? Math.min(30, Math.max(0.5, v)) : undefined }); } })),
        h("div.fe-acts", {},
          h("button.btn", { onclick: () => { W.shots.splice(k + 1, 0, { ...e }); W.sel = k + 1; touch(); renderMain(); } }, "Duplicate"),
          h("button.btn.danger", { disabled: W.shots.length <= 1, onclick: () => { W.shots.splice(k, 1); W.sel = Math.min(k, W.shots.length - 1); touch(); renderMain(); } }, "Delete"),
          h("button.btn", { disabled: k === 0, onclick: () => move(-1) }, "◀ Move"),
          h("button.btn", { disabled: k === W.shots.length - 1, onclick: () => move(1) }, "Move ▶")))));
  const back = h("div.fe", { id: "fe", onclick: (ev) => { if (ev.target === back) close(); }, onkeydown: (ev) => { if (ev.key === "Escape") close(); } }, card);
  document.body.append(back);
  if (prevId) document.getElementById(prevId)?.focus();
  else if (!S.ui.feOpened) card.querySelector("button")?.focus();
  S.ui.feOpened = true;
}

function storyboardView() {
  const d = S.detail;
  const st = d.state.stages.shots.status;
  const lines = d.lines ?? [];
  const o = pOut(d.state);
  syncWork();
  const edit = canEdit(d);
  const lightbox = (src) => { const lb = h("div.lightbox", { role: "dialog", "aria-label": "Still", onclick: () => lb.remove(), tabindex: 0, onkeydown: (e) => e.key === "Escape" && lb.remove() }, h("img", { src, alt: "" })); document.body.append(lb); lb.focus(); };
  insp([
    projFacts(d),
    d.stills?.length ? h("section.sect", {}, h("header", {}, h("h3", {}, "Storyboard")), h("p.helptext", {}, `${d.stills.length} shots · ${lines.length} narration lines. Check the story reads without sound.`), d.storyboard ? h("a.btn.sm", { href: fileUrl(d.storyboard), target: "_blank", rel: "noopener" }, "Open contact sheet") : null) : null,
  ], [
    st === "review" && !d.example ? h("button.btn.primary.lg.block", { disabled: W.dirty || rendering(), onclick: () => approve("shots", { next: false }, "voice") }, "Approve storyboard → voice") : null,
    st === "review" && !d.example ? h("button.btn.block", { onclick: () => runStage("shots") }, "Rebuild shots") : null,
    st === "approved" && !d.example ? h("a.btn.primary.lg.block", { href: `#/p/${d.state.slug}/voice` }, "Go to voice →") : null,
    st === "idle" && !d.example && d.state.stages.script.status === "approved" ? h("button.btn.primary.lg.block", { onclick: () => runStage("shots") }, "Build the storyboard") : null,
  ]);
  const tab = S.ui.sbTab ?? "main";
  const hasRaw = rawOf().length > 0 && d.stills?.length;
  const grid = d.stills?.length
    ? h("div.stills", { class: `${o.width > o.height ? "wide" : ""}${rendering() ? " busy" : ""}`, style: { "--ar": arOf(o) } },
        (hasRaw ? W.shots : d.stills).map((item, k) => {
          const e = hasRaw ? item : null;
          const x = e ? eff(e) : null;
          const s = e ? null : (d.shots ?? [])[k];
          const p = e ? stillOf(d, e, k) : item;
          const line = lines[x ? x.line : s?.line];
          return h("button.still", { onclick: () => { if (edit && hasRaw) { S.ui.feOpened = false; W.sel = k; paintFE(); } else lightbox(stillSrc(p)); }, "aria-label": `Shot ${k + 1}${e && isEdited(e) ? ", edited" : ""}` },
            h("img", { src: stillSrc(p), alt: "", decoding: "async" }),
            e && isEdited(e) ? h("em.etag", {}, "edited") : null,
            h("span", {}, h("b", {}, x?.id ?? s?.id ?? String(k + 1)), (x?.scene ?? s?.scene) ? ` · ${x?.scene ?? s.scene}` : "", line ? h("div", {}, line.text.slice(0, 54) + (line.text.length > 54 ? "…" : "")) : null));
        }))
    : st !== "running" && st !== "error" ? h("div.empty", {}, "The storyboard appears here after the script is approved.") : null;
  queueMicrotask(paintFE);
  return [
    stageHead(3, "Storyboard", edit ? "One frame from every shot. Click a frame to change its scene, camera, text or line." : "One frame from every shot, rendered from the real scene code."),
    st === "running" ? working("shots", true) : null,
    st === "error" || st === "paused" ? errorBox("shots") : null,
    renderingBar(),
    d.stills?.length ? subtabs("Frames") : null,
    tab === "timing" && d.stills?.length ? timingView(d, edit) : grid,
    dirtyBar(d),
  ];
}

// ---------------------------------------------------------------- Timing
function timingView(d, edit) {
  syncWork();
  const lines = d.lines ?? [];
  const raw = rawOf();
  if (!raw.length || !lines.length) return h("div.empty", {}, "Timing appears once the storyboard is built.");
  const T = computeTiming({ lines, audio: d.audio, shots: raw, edits: { shots: W.shots, lines: W.lines } });
  const F = T.fps;
  const open = (S.ui.tOpen ??= new Set());
  const secOf = (n) => n / F;
  const short = (dur, v) => v != null && dur / F < v - 0.05;
  const num = (set) => (ev) => { const v = parseFloat(ev.target.value); set(Number.isFinite(v) ? v : undefined); touch(); renderMain(); };
  const hasAny = Object.keys(W.lines).length > 0 || W.shots.some((e) => e.sec !== undefined);
  const cut = T.lines.filter((l) => short(l.end - l.start, l.voiceSec)).length;
  const bar = h("div.tbar", { role: "img", "aria-label": `Total ${fmtT(T.totalSec)}` }, T.lines.map((l) => {
    const dur = l.end - l.start;
    return h(`div.tseg${short(dur, l.voiceSec) ? ".warn" : ""}${W.lines[l.i] ? ".set" : ""}`, { style: { flex: `${dur} 1 0` }, title: `Line ${l.i + 1}: ${fmtT(secOf(l.start))} – ${fmtT(secOf(l.end))} (${secOf(dur).toFixed(1)} s)` }, secOf(dur) >= 2 ? String(l.i + 1) : "");
  }));
  const rows = T.lines.map((l) => {
    const dur = l.end - l.start;
    const sh = T.shots.filter((s) => s.line === l.i);
    const isOpen = open.has(l.i);
    const text = (lines[l.i]?.text ?? "").split(/\s+/).slice(0, 6).join(" ");
    return h("div.tline", {},
      h("div.trow.head", {},
        h("button.tog", { "aria-expanded": String(isOpen), "aria-label": `${isOpen ? "Hide" : "Show"} shots of line ${l.i + 1}`, onclick: () => { isOpen ? open.delete(l.i) : open.add(l.i); renderMain(); } }, isOpen ? "▾" : "▸"),
        h("span.tn", {}, String(l.i + 1)),
        h("span.tt", {}, text + "…"),
        h("span.tc.mono", { "data-l": "Start" }, fmtT(secOf(l.start))),
        h("span.tc.mono", { "data-l": "End" }, fmtT(secOf(l.end))),
        h("span.tc", { "data-l": "Length (s)" }, h("input.input.tin", { type: "number", step: "0.1", min: "0.5", max: "60", inputmode: "decimal", disabled: !edit, value: W.lines[l.i]?.sec ?? "", placeholder: secOf(dur).toFixed(1), "aria-label": `Length of line ${l.i + 1} in seconds`, onchange: num((v) => { if (v === undefined) delete W.lines[l.i]; else W.lines[l.i] = { sec: Math.min(60, Math.max(0.5, v)) }; }) })),
        h("span.tc.mono", { "data-l": "Voice" }, l.voiceSec != null ? `${l.voiceSec.toFixed(1)} s` : "—")),
      short(dur, l.voiceSec) ? h("div.twarn", { role: "alert" }, h("span", { "aria-hidden": "true" }, "⚠"), ` Voice is ${l.voiceSec.toFixed(1)} s — it will be cut off`) : null,
      isOpen ? sh.map((s) => {
        const k = s.idx;
        const e = W.shots[k];
        const x = e ? eff(e) : {};
        return h("div.trow.shot", {},
          h("span"), h("span.tn", {}, `${l.i + 1}.${sh.indexOf(s) + 1}`),
          h("span.tt", {}, `${x.id ?? `shot ${k + 1}`} · ${x.scene ?? ""}`),
          h("span.tc.mono", { "data-l": "Start" }, fmtT(secOf(s.start))),
          h("span.tc.mono", { "data-l": "End" }, fmtT(secOf(s.end))),
          h("span.tc", { "data-l": "Length (s)" }, h("input.input.tin", { type: "number", step: "0.1", min: "0.5", max: "30", inputmode: "decimal", disabled: !edit || !e, value: e?.sec ?? "", placeholder: secOf(s.end - s.start).toFixed(1), "aria-label": `Length of shot ${l.i + 1}.${sh.indexOf(s) + 1} in seconds`, onchange: num((v) => { if (e) { if (v === undefined) delete e.sec; else e.sec = Math.min(30, Math.max(0.5, v)); } }) })),
          h("span"));
      }) : null);
  });
  return h("div.timing", {},
    h("div.row.between", { style: { marginBottom: "10px" } },
      h("p.small.muted", { style: { margin: 0, flex: 1, minWidth: "220px" } }, "Each line lasts as long as its voice plus a short pause. Type a length to set your own; leave it blank for automatic. Times are m:ss.s."),
      h("button.btn", { disabled: !edit || !hasAny, onclick: () => { W.lines = {}; W.shots.forEach((e) => delete e.sec); touch(); renderMain(); } }, "Reset timing")),
    h("div.ttot", {}, h("b.mono", {}, fmtT(T.totalSec)), h("span.muted.small", {}, ` total · ${lines.length} lines · ${T.shots.length} shots`), cut ? h("span.tag.warn", {}, `${cut} line${cut === 1 ? "" : "s"} shorter than the voice`) : null),
    bar,
    h("div.thead", {}, h("span"), h("span", {}, "#"), h("span", {}, "Line"), h("span", {}, "Start"), h("span", {}, "End"), h("span", {}, "Length (s)"), h("span", {}, "Voice")),
    h("div.tlist", {}, rows));
}

// ---------------------------------------------------------------- Voice
let voicesCache = null;
let voicesLoading = false;
const hostOf = (u) => { try { return new URL(u).hostname || u; } catch { return String(u); } };
function voiceView() {
  const d = S.detail;
  const st = d.state.stages.voice.status;
  const replay = d.state.mode === "replay" || d.example;
  if (!voicesCache && !voicesLoading && !replay) { voicesLoading = true; api("/api/voices").then((v) => { voicesCache = v; if (!S.ui.voiceId) S.ui.voiceId = v.voices?.[0]?.id ?? null; renderMain(); }).catch((e) => toast(`Could not load voices: ${e.message}`, true)).finally(() => (voicesLoading = false)); }
  const keySource = S.status?.eleven?.keySource;
  const lines = d.lines ?? [];
  syncWork();
  const audio = d.audio?.voice ?? {};
  const total = Object.values(audio).reduce((a, b) => a + b, 0);
  const v = d.state.voice ?? {};
  const placeholder = v.provider === "placeholder";
  const setKey = async () => {
    const el = $("elkey");
    try { await api("/api/elevenlabs/key", { method: "POST", body: { key: el.value } }); el.value = ""; await loadStatus(); renderMain(); toast("Key kept in memory for this session only."); } catch (e) { toast(e.message, true); }
  };
  const forget = async () => { try { await api("/api/elevenlabs/key", { method: "POST", body: { key: "" } }); await loadStatus(); renderMain(); } catch (e) { toast(e.message, true); } };
  const generate = () => runStage("voice", { voiceId: S.ui.customVoice.trim() || S.ui.voiceId, provider: keySource ? "elevenlabs" : "placeholder" });
  const editableSetup = !replay && (st === "idle" || st === "error" || st === "paused" || st === "review");
  const setup = editableSetup
    ? [h("section.sect", {}, h("header", {}, h("h3", {}, "Voice")),
          h("div.voices", {}, (voicesCache?.voices ?? []).map((x) => h("button.voice", { "aria-pressed": String(!S.ui.customVoice && S.ui.voiceId === x.id), onclick: () => { S.ui.voiceId = x.id; S.ui.customVoice = ""; renderMain(); } }, h("b", {}, x.name), h("span.small.muted", {}, x.note)))),
          h("input.input", { placeholder: "…or paste a custom ElevenLabs voice ID", value: S.ui.customVoice, "aria-label": "Custom voice ID", oninput: (e) => (S.ui.customVoice = e.target.value) })),
        h("section.sect.field", {}, h("header", {}, h("h3", {}, h("label", { for: "elkey", style: { fontSize: "13px", color: "var(--ink)", fontWeight: 600 } }, "ElevenLabs API key"))),
          keySource
            ? h("div.row", {}, h("span.tag.ok", {}, keySource === "env" ? "✓ From ELEVENLABS_API_KEY" : "✓ Kept in memory for this session"), keySource === "session" ? h("button.btn.sm.ghost", { onclick: forget }, "Forget key") : null)
            : h("div.row", { style: { flexWrap: "nowrap" } }, h("input.input#elkey", { id: "elkey", type: "password", autocomplete: "off", placeholder: "sk_…", style: { flex: 1, minWidth: 0 }, onkeydown: (e) => e.key === "Enter" && setKey() }), h("button.btn.sm", { onclick: setKey }, "Use key")),
          h("span.small.faint", {}, "Never written to disk. Without a key, Studio makes a placeholder voice with your computer's speech engine, clearly labelled, for testing only."))]
    : replay && (st === "idle" || st === "error" || st === "paused")
      ? [h("p.helptext", {}, "Replay uses the recorded ElevenLabs voice of the example episode. No key needed.")]
      : [];
  insp([projFacts(d), ...setup], [
    st === "review" && !d.example ? h("button.btn.primary.lg.block", { onclick: () => approve("voice", {}, "render") }, "Accept voice → render") : null,
    editableSetup ? h(`button.btn${st === "review" ? "" : ".primary.lg"}.block`, { onclick: generate, disabled: st === "running" }, keySource ? (st === "review" ? "Regenerate voice" : "Generate voice") : (st === "review" ? "Regenerate placeholder voice" : "Make placeholder voice")) : null,
    editableSetup ? h("p.note", {}, keySource ? `${lines.length} lines · eleven_v4 · stitched line to line` : `${lines.length} lines · ${S.status?.eleven?.placeholder ?? "system"} speech`) : null,
    replay && (st === "idle" || st === "error" || st === "paused") ? h("button.btn.primary.lg.block", { onclick: () => runStage("voice", {}) }, "Generate voice (replay)") : null,
    st === "approved" && !d.example ? h("a.btn.primary.lg.block", { href: `#/p/${d.state.slug}/render` }, "Go to render →") : null,
  ]);
  return [
    stageHead(4, "Voice", "Every narration line becomes its own clip, so the video re-times itself to the real voice."),
    st === "running" ? working("voice", true) : null,
    st === "error" || st === "paused" ? errorBox("voice") : null,
    (st === "review" || st === "approved") && v.credit ? h("div.banner.info", {}, h("div.grow", {}, h("b", {}, "Credit reminder. "), "ElevenLabs' free plan is non-commercial and published videos must credit “elevenlabs.io” in the title. Studio adds it to your titles.")) : null,
    placeholder && (st === "review" || st === "approved") ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Placeholder voice. "), "Made with your computer's speech engine for testing. Add an ElevenLabs key and regenerate before publishing.")) : null,
    rawOf().length ? subtabs("Voice") : null,
    rawOf().length && S.ui.sbTab === "timing" ? [timingView(d, canEdit(d)), dirtyBar(d)] :
    d.clips?.length
      ? [h("div.row.between", { style: { margin: "6px 0 10px" } }, h("span.muted.small", {}, `${d.clips.length} clips · ${total.toFixed(1)} s total${v.model ? ` · ${placeholder ? "placeholder" : v.model}` : ""}`)),
        h("div.clips", {}, d.clips.map((p, i) => h("div.clip", {}, h("span.n", {}, String(i + 1)), h("span", {}, lines[i]?.text ?? ""), h("audio", { controls: true, preload: "none", src: fileUrl(p), "aria-label": `Line ${i + 1}` }), h("span.s", {}, audio[i] ? `${audio[i].toFixed(1)} s` : ""))))]
      : lines.length && st !== "running"
        ? [h("div.eyebrow", { style: { marginTop: "8px" } }, `Narration to voice · ${lines.length} lines · ~${Math.round(lines.reduce((a, l) => a + words(l.text), 0) / 2.6)} s`),
          h("div.clips", {}, lines.map((l, i) => h("div.clip", { style: { gridTemplateColumns: "28px 1fr 50px" } }, h("span.n", {}, String(i + 1)), h("span", {}, captionPreview(l.text, l.highlight)), h("span.s", {}, `~${(words(l.text) / 2.6).toFixed(1)} s`))))]
        : null,
  ];
}

// ---------------------------------------------------------------- Render
function renderView() {
  const d = S.detail;
  const st = d.state.stages.render.status;
  const o = d.outputs ?? {};
  const out = pOut(d.state);
  const portrait = out.height >= out.width;
  const video = portrait ? o.phone ?? o.mp4 : o.mp4 ?? o.phone;
  const t = d.titles;
  const showVideo = video && (st === "review" || st === "approved" || d.example);
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast("Copied."); } catch { toast("Copy failed; select the text instead."); } };
  insp([
    projFacts(d),
    showVideo ? h("section.sect", {}, h("header", {}, h("h3", {}, "Download")),
      h("div.downloads", {},
        o.mp4 ? h("a.btn.primary.sm", { href: fileUrl(o.mp4), download: `${d.state.slug}.mp4` }, `MP4${o.mp4Mb ? ` · ${o.mp4Mb} MB` : ""}`) : null,
        o.phone ? h("a.btn.sm", { href: fileUrl(o.phone), download: `${d.state.slug}-phone.mp4` }, `Phone copy${o.phoneMb ? ` · ${o.phoneMb} MB` : ""}`) : null,
        o.cover ? h("a.btn.sm", { href: fileUrl(o.cover), download: `${d.state.slug}-cover.png` }, "Cover") : null),
      o.cover ? h("img.coverimg", { src: fileUrl(o.cover), alt: "Cover frame" }) : null) : null,
    showVideo && t?.titles?.length ? h("section.sect", {}, h("header", {}, h("h3", {}, "Titles")), h("div.titles", {}, t.titles.map((x) => h("div.t", {}, h("span", {}, x), h("small", {}, `${x.length}/60`), h("button.btn.sm", { onclick: () => copy(x), "aria-label": `Copy title ${x}` }, "Copy")))),
      t.description ? h("div.titles", {}, h("div.t", { style: { alignItems: "flex-start" } }, h("span", { style: { whiteSpace: "pre-wrap", fontWeight: 400 } }, t.description), h("button.btn.sm", { onclick: () => copy(t.description) }, "Copy"))) : null) : null,
    showVideo && d.state.voice?.credit ? h("p.helptext", {}, "ElevenLabs free plan: credit “elevenlabs.io” in the title (added above) and don't use it commercially.") : null,
  ], [
    st === "review" && !d.example ? h("button.btn.primary.lg.block", { onclick: () => approve("render", {}, "render") }, "Mark as finished") : null,
    st === "review" && !d.example ? h("button.btn.block", { onclick: () => runStage("render") }, "Render again") : null,
    st === "approved" && !d.example ? h("a.btn.primary.lg.block", { href: "#/" }, "Make another video") : null,
    st === "idle" && !d.example && d.state.stages.voice.status === "approved" ? h("button.btn.primary.lg.block", { onclick: () => runStage("render") }, "Render video") : null,
    d.example ? h("a.btn.primary.lg.block", { href: "#/" }, "Make a new video") : null,
  ]);
  return [
    stageHead(5, d.example ? "Ten Minutes Under" : "Your video", d.example ? "The finished example episode that ships with the studio (used by Replay mode)." : `Rendered at ${out.width}×${out.height}, 30 fps, with a phone copy, a cover and three titles.`),
    st === "running" ? working("render", true) : null,
    st === "error" || st === "paused" ? errorBox("render") : null,
    st === "idle" && !d.example ? h("div.empty", {}, d.state.stages.voice.status === "approved" ? "Ready to render." : "Accept the voice to render.") : null,
    showVideo
      ? [d.state.mode === "replay" ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Replay. "), "This is the cached render of the example episode, not a new render.")) : null,
        h("div.player-wrap", { style: { "--ar": portrait ? arOf(out) : arOf(out) } }, h("video", { controls: true, playsinline: true, preload: "metadata", src: fileUrl(video), poster: o.cover ? fileUrl(o.cover) : null }))]
      : null,
  ];
}

// ---------------------------------------------------------------- Library
let skillsCache = null;
let assetsCache = null;
function libraryView() {
  const tab = S.route.tab ?? "projects";
  const tabs = h("div.tabs", { role: "tablist" }, [["projects", "Projects"], ["skills", "Skills"], ["assets", "Assets"]].map(([k, l]) => h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => go(`#/library/${k}`) }, l)));
  let body;
  if (tab === "projects") body = !S.projectsLoaded ? h("div.empty", {}, "Loading projects…") : S.projects.length ? h("div.projects", {}, S.projects.map(projCard)) : h("div.empty", {}, "No projects yet.");
  else if (tab === "skills") {
    if (!skillsCache) { api("/api/skills").then((r) => { skillsCache = r.skills; renderMain(); }).catch((e) => toast(e.message, true)); body = h("div.empty", {}, "Loading skills…"); }
    else {
      const sel = S.ui.skill;
      const pick = async (id) => { S.ui.skill = { id, markdown: null }; renderMain(); try { S.ui.skill = await api(`/api/skills/${id}`); } catch (e) { toast(e.message, true); } renderMain(); };
      const sorted = [...skillsCache].sort((a, b) => Number(b.core) - Number(a.core) || a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
      body = h("div.skills", {},
        h("div.skill-list", {}, sorted.map((s) => h("button.skill-item", { "aria-pressed": String(sel?.id === s.id), onclick: () => pick(s.id) }, h("b", {}, s.name, s.core ? h("span.tag.ice", { style: { marginLeft: "6px" } }, "used") : null), h("span", {}, s.description)))),
        sel ? h("div.md", { html: sel.markdown ? md(sel.markdown.replace(/^---[\s\S]*?---\s*/, "")) : "<p>Loading…</p>" }) : h("div.empty", {}, `${skillsCache.length} skills ship with the studio. They are built in: Studio picks the right ones for each step. Select one to read it.`));
    }
  } else {
    if (!assetsCache) { api("/api/assets").then((r) => { assetsCache = r; renderMain(); }).catch((e) => toast(e.message, true)); body = h("div.empty", {}, "Loading assets…"); }
    else body = [
      h("p.muted", {}, `Pack: ${assetsCache.pack.name}. Scenes: ${assetsCache.pack.scenes.join(", ")}. Cast: ${assetsCache.pack.cast.join(" and ")}.`),
      h("div.assets", {}, assetsCache.images.map((a) => h("figure", {}, h("img", { src: fileUrl(a.path), alt: a.name, loading: "lazy" }), h("figcaption", {}, a.name)))),
      assetsCache.clips.length ? [h("h2", { style: { fontSize: "18px", marginTop: "26px" } }, "Example voice clips"), h("div.clips", {}, assetsCache.clips.map((c, i) => h("div.clip", {}, h("span.n", {}, String(i + 1)), h("span", {}, c.text), h("audio", { controls: true, preload: "none", src: fileUrl(c.path) }), h("span.s"))))] : null,
    ];
  }
  return [h("div.shead", {}, h("h2", {}, "Library"), h("p.lead", {}, "Your videos, the built-in skills that make them good, and the art pack.")), tabs, body];
}

// ---------------------------------------------------------------- Inspiration
const KIND_DOT = { Person: "#5a4fd6", Place: "#2f8f6b", Moment: "#e0892f", Danger: "#d9483b", Lesson: "#2f6fbf", Twist: "#9d96f9" };
const KIND_HINT = { Person: "Who is in it?", Place: "Where does it happen?", Moment: "A moment you keep picturing", Danger: "What could go wrong?", Lesson: "What should people remember?", Twist: "What would surprise them?" };
const SPARKS = ["A knock at the door", "The last radio broadcast", "The siren goes off", "A rule you never break"];

let boardInit = null;
async function openBoards() {
  try {
    S.boards = (await api("/api/boards")).boards;
    if (!S.boards.length) {
      boardInit ??= api("/api/boards", { method: "POST", body: { title: "Untitled board" } }).finally(() => (boardInit = null));
      await boardInit;
      S.boards = (await api("/api/boards")).boards;
    }
    let id = S.route.id;
    if (!id || !S.boards.some((b) => b.id === id)) {
      id = S.boards[0].id;
      history.replaceState(null, "", `#/inspiration/${id}`);
      S.route = parseRoute();
    }
    const b = await api(`/api/boards/${id}`);
    if (S.route.id === id) S.board = b;
  } catch (e) {
    S.boardError = e.message;
    toast(e.message, true);
  }
}
const syncBoardList = () => {
  const b = S.board;
  const row = S.boards?.find((x) => x.id === b?.id);
  if (row) { row.title = b.title; row.count = b.fragments.length; }
  renderSide();
};
async function newBoard() {
  try {
    const b = await api("/api/boards", { method: "POST", body: { title: "Untitled board" } });
    S.board = b;
    S.boards = (await api("/api/boards")).boards;
    go(`#/inspiration/${b.id}`);
  } catch (e) { toast(e.message, true); }
}
async function weave() {
  const b = S.board;
  if (!b?.fragments.length || S.weaving) return;
  S.weaving = b.id;
  renderMain();
  try {
    const nb = await api(`/api/boards/${b.id}/weave`, { method: "POST" });
    if (S.board?.id === nb.id) S.board = nb;
  } catch (e) { toast(e.message, true); }
  S.weaving = null;
  renderMain();
}

function inspirationView() {
  const b = S.board;
  if (!b) {
    insp([], [], { hide: true });
    return h("div.empty", {}, S.boardError ?? "Loading your boards…");
  }
  const kindBtns = Object.keys(KIND_DOT).map((k) => h("button.kind", { type: "button", role: "radio", "aria-checked": String(S.ui.fragKind === k), onclick: () => { S.ui.fragKind = k; renderMain(); $("frag")?.focus(); } }, h("i", { style: { background: KIND_DOT[k] } }), k));
  const add = once(async () => {
    const text = S.ui.draft.trim();
    if (!text) { $("frag")?.focus(); return; }
    try {
      S.board = await api(`/api/boards/${b.id}/fragments`, { method: "POST", body: { kind: S.ui.fragKind, text } });
      S.ui.draft = "";
      syncBoardList();
      renderMain();
    } catch (e) { toast(e.message, true); }
    $("frag")?.focus();
  });
  const remove = once(async (fid) => {
    try { S.board = await api(`/api/boards/${b.id}/fragments/${fid}`, { method: "DELETE" }); syncBoardList(); renderMain(); } catch (e) { toast(e.message, true); }
  });
  const rename = async (e) => {
    const title = e.target.value.trim() || "Untitled board";
    try { S.board = await api(`/api/boards/${b.id}`, { method: "PATCH", body: { title } }); syncBoardList(); e.target.value = S.board.title; } catch (err) { toast(err.message, true); }
  };
  const stage = [
    h("div.row.between", { style: { flex: "none", flexWrap: "nowrap" } },
      h("label.sr", { for: "btitle" }, "Board title"),
      h("input.board-title#btitle", { id: "btitle", value: b.title, maxlength: 80, onchange: rename, onkeydown: (e) => e.key === "Enter" && e.target.blur() }),
      h("div.mob-only", { style: { gap: "6px", alignItems: "center" } },
        h("select.input", { "aria-label": "Switch board", style: { width: "auto", maxWidth: "150px" }, onchange: (e) => go(`#/inspiration/${e.target.value}`) }, (S.boards ?? []).map((x) => h("option", { value: x.id, selected: x.id === b.id }, `${x.title} (${x.count})`))),
        h("button.btn.sm", { onclick: newBoard }, "New"))),
    h("div.fragbar", {},
      h("div.kinds", { role: "radiogroup", "aria-label": "Fragment kind" }, kindBtns),
      h("div.fragrow", {},
        h("label.sr", { for: "frag" }, "Fragment text"),
        h("input#frag", { id: "frag", value: S.ui.draft, maxlength: 200, autocomplete: "off", placeholder: KIND_HINT[S.ui.fragKind], oninput: (e) => (S.ui.draft = e.target.value), onkeydown: (e) => e.key === "Enter" && add() }),
        h("button.add", { type: "button", onclick: add }, "Add")),
      h("div.sparks", {}, "Stuck? Try", SPARKS.map((t) => h("button.spark", { type: "button", onclick: () => { S.ui.draft = `${t}: `; const f = $("frag"); f.value = S.ui.draft; f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, t)))),
    h("div.frags", { role: "list", "aria-label": "Fragments" }, b.fragments.length
      ? b.fragments.map((f, i) => h("article.frag", { role: "listitem" },
          h("div.hd", {}, h("span.k", {}, h("i", { style: { background: KIND_DOT[f.kind] } }), f.kind), h("span.no", {}, `#${i + 1}`)),
          h("p", {}, f.text),
          h("button.rm", { type: "button", "aria-label": `Remove fragment ${i + 1}`, title: "Remove", onclick: () => remove(f.id) }, "×")))
      : h("div.empty", {}, "Nothing here yet. Add a person, a place, a moment, a danger, a lesson or a twist. Small pieces are fine.")),
  ];

  // ---- dark inspector: the woven story
  const weaving = S.weaving === b.id;
  const story = b.story;
  const n = b.fragments.length;
  const weaveBtn = h("button.btn.sm", { type: "button", onclick: weave, disabled: weaving || !n }, weaving ? [h("span.spinner"), "Weaving…"] : story ? "Weave again" : "Weave story");
  const body = [
    h("div.story-head", {}, h("span.mono", {}, `Story · from ${n} fragment${n === 1 ? "" : "s"}`), weaveBtn),
    weaving ? h("p.story-empty", { role: "status" }, h("b", {}, "Claude is weaving your fragments. "), "This can take 30 to 90 seconds. You can keep reading; don't add fragments until it finishes.")
    : story ? [
      story.replay ? h("div", {}, h("span.tag.replay", {}, "Replay: a recorded story, not woven from your fragments")) : null,
      h("div", {}, h("h2.story-title", {}, story.title), h("p.story-logline", {}, story.logline)),
      h("ol.beats", {}, story.beats.map((x) => h("li", {}, h("span.p", {}, x.part), h("span.t", {}, x.text, x.uses?.length ? h("span.u", {}, x.uses.map((k) => `#${k}`).join(" ")) : null)))),
      h("p.small-note", {}, "Facts are flagged to check before the script is approved."),
    ]
    : h("p.story-empty", {}, h("b", {}, "Weave turns your pile into one story. "), "Claude arranges the fragments into a hook, a mistake, what really happens, what to do and a twist, and shows which fragments each beat uses. It adds no new facts. Add a few fragments, then press Weave story."),
  ];
  const makeVideo = once(async () => {
    if (!claudeOk()) { toast("Connect Claude first.", true); return; }
    try {
      S.stepCost = 0;
      S.now = null;
      const d = await api(`/api/boards/${b.id}/project`, { method: "POST", body: { style: S.ui.style, output: outputBody(), length: S.ui.length, format: S.ui.format } });
      S.partial[d.state.slug] = [];
      await loadStatus();
      loadProjects();
      go(`#/p/${d.state.slug}/${S.ui.entry === "own" ? "script" : "ideas"}`);
    } catch (e) { toast(e.message, true); }
  });
  const { w, h: hh } = curDims();
  const shapeNow = curShape();
  insp(body, [
    h("span.mono-note", {}, `${styleName(S.ui.style)} · ${S.ui.output.preset ? `${OPT.presets[S.ui.output.preset]?.name} ` : ""}${shapeNow === "custom" ? "Custom" : shapeNow} · ${w} × ${hh} · ${lenLabel(S.ui.length)}`),
    h("button.btn.light.lg.block", { type: "button", onclick: makeVideo, disabled: !story || weaving }, "Make this video"),
    h("a.small-note", { href: "#/", style: { color: "#b9b2ff", textAlign: "center" } }, "Change look, size or length"),
  ], { dark: true });
  return stage;
}

// ---------------------------------------------------------------- SSE
function connectEvents() {
  const es = new EventSource(eventsUrl());
  const push = (e) => {
    const ev = JSON.parse(e.data);
    if (S.feed.some((x) => x.id === ev.id)) return ev;
    S.feed.push(ev);
    if (S.feed.length > 400) S.feed.shift();
    return ev;
  };
  const mine = (ev) => S.route.name === "project" && ev.slug === S.route.slug;
  es.addEventListener("activity", (e) => {
    const ev = push(e);
    if (ev.stage === "connect") return renderFeed();
    S.now = ev.text;
    const n = $("now-line");
    if (n && mine(ev)) n.textContent = ev.text;
    renderFeed();
  });
  es.addEventListener("log", (e) => { const ev = push(e); if (ev.url && fresh(ev)) toast("If no sign-in window opened, the link is in the activity feed."); renderFeed(); });
  es.addEventListener("error", (e) => { if (!e.data) return; const ev = push(e); renderFeed(); if (mine(ev)) refreshDetail(); else if (fresh(ev)) toast(ev.message, true); });
  es.addEventListener("stage", async (e) => {
    const ev = JSON.parse(e.data);
    if (ev.status === "running") { S.stepCost = 0; S.now = null; }
    if (ev.status !== "running") S.now = null;
    await loadStatus();
    renderFeed();
    if (mine(ev)) refreshDetail(); else if (S.route.name !== "project") loadProjects();
  });
  es.addEventListener("gate", (e) => {
    const ev = JSON.parse(e.data);
    if (!mine(ev)) return;
    refreshDetail();
    if (fresh(ev) && screenOf(S.detail ?? {}) === SCREEN[ev.stage]) toast(`${LABEL[ev.stage]} is ready for you.`);
  });
  es.addEventListener("artifact", (e) => { const ev = JSON.parse(e.data); if (mine(ev) && ev.name === "voice-line") refreshDetail(); });
  es.addEventListener("partial", (e) => {
    const ev = JSON.parse(e.data);
    if (ev.kind !== "idea") return;
    (S.partial[ev.slug] ??= [])[ev.index] = ev.idea;
    if (!mine(ev) || screenOf(S.detail ?? {}) !== "ideas") return;
    const slot = document.querySelector(`#ideas [data-idea="${ev.index}"]`);
    const card = ideaCard(ev.idea, ev.index, "running", null);
    if (slot) slot.replaceWith(card); else $("ideas")?.append(card);
  });
  es.addEventListener("progress", (e) => {
    const ev = JSON.parse(e.data);
    S.progress[`${ev.slug}:${ev.stage}`] = { value: ev.value, label: ev.label };
    const bar = $(`prog-${ev.stage}`);
    if (bar && mine(ev)) { bar.style.width = `${Math.round(ev.value * 100)}%`; const l = $(`progl-${ev.stage}`); if (l) l.textContent = ev.label ?? ""; }
  });
  es.addEventListener("cost", (e) => { const ev = JSON.parse(e.data); S.stepCost += ev.cost || 0; if (ev.usage && S.status) S.status.usage = ev.usage; renderTop(); renderFeed(); });
  es.addEventListener("usage", (e) => { const ev = JSON.parse(e.data); if (S.status) S.status.usage = ev.usage; renderTop(); });
  es.addEventListener("status", async () => { S.connecting = false; await loadStatus(true); renderMain(); });
  es.addEventListener("project", () => loadProjects());
  es.addEventListener("now", (e) => {
    const ev = JSON.parse(e.data);
    S.now = ev.text;
    const n = $("now-line");
    if (n && mine(ev)) n.textContent = ev.text;
    const f = document.querySelector("#feed .now span:last-child");
    if (f) f.lastChild && (f.lastChild.textContent = ev.text);
  });
  es.addEventListener("task", async (e) => {
    const ev = JSON.parse(e.data);
    if (ev.status !== "running") S.now = null;
    await loadStatus();
    renderFeed();
    if (mine(ev)) {
      if (ev.task === "verify" && ev.status === "done" && fresh(ev)) { S.ui.scriptTab = "facts"; toast("Fact check is ready."); }
      if (ev.task === "edits" && ev.status === "done") { S.stillsV = Date.now(); if (fresh(ev)) toast("Frames updated."); }
      refreshDetail();
    }
  });
  es.onerror = () => { /* EventSource retries by itself */ };
}

function denied() {
  mount(document.body, h("div.denied", {}, h("h2", {}, "Open Studio from the terminal link"),
    h("p.muted", {}, "For your safety Studio only answers the private link it printed when it started (", h("span.kbd", {}, "http://127.0.0.1:4317/?t=…"), "). A link from an earlier start stops working when Studio restarts."),
    h("p.muted", {}, "In the terminal where Studio runs, copy the “Open:” link into this browser. Or start it again in the studio folder with ", h("span.kbd", {}, "npm start"), "; it opens a fresh link for you.")));
  throw new Error("no token");
}

// ---------------------------------------------------------------- boot
async function loadOptions() {
  try {
    const o = await api("/api/options");
    if (o.styles) OPT.styles = o.styles;
    if (o.presets) OPT.presets = o.presets;
    if (o.ratios) OPT.ratios = o.ratios;
    if (o.scenes) OPT.scenes = o.scenes;
  } catch { /* defaults match the server */ }
}
(async () => {
  if (!token()) return denied();
  renderAll();
  connectEvents();
  await loadOptions();
  await Promise.all([loadStatus(), route(), loadProjects()]);
  // keep the Claude pill honest (e.g. signed out in another terminal)
  setInterval(() => loadStatus(), 60000);
})();
