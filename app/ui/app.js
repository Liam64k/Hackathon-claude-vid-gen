import { api, h, mount, md, money, ago, clock, words, captionPreview, toast, fileUrl, eventsUrl, token } from "./lib.js";

const STAGES = ["ideas", "script", "shots", "voice", "render"];
const LABEL = { ideas: "Ideas", script: "Script", shots: "Storyboard", voice: "Voice", render: "Render" };
const SCREEN = { ideas: "ideas", script: "script", shots: "storyboard", voice: "voice", render: "render", done: "render" };
const FORMATS = [["story", "Survival story"], ["what", "What would you do?"], ["myth", "Myth vs fact"]];
// Same rules as app/lib/store.mjs (the server clamps too).
const PRESET_LENGTHS = [30, 60, 90, 120];
const MIN_S = 20, MAX_S = 180;
const clampS = (n) => { const v = Math.round(Number(n)); return Number.isFinite(v) && v > 0 ? Math.min(MAX_S, Math.max(MIN_S, v)) : 90; };
const wordRange = (sec) => { const s = clampS(sec); return [Math.round(s * 2.56), Math.round(s * 3.11)]; };
const RUNNING_COPY = {
  ideas: "Claude is writing five ideas",
  script: "Claude is writing the script and beat board",
  shots: "Claude is building the shots",
  voice: "Generating the voice",
  render: "Rendering your video",
  verify: "Claude is checking the facts on the web",
};

const S = {
  status: null,
  projects: [],
  detail: null,
  route: { name: "home" },
  feed: [],
  partial: {}, // slug -> ideas streamed in
  progress: {}, // slug:stage -> {value,label}
  now: null,
  stepCost: 0,
  ui: { format: "story", length: 90, topic: "", voiceId: null, customVoice: "", libTab: "projects", skill: null, scriptTab: "lines", lineErrors: [] },
  connecting: false,
  dirty: false,
};

const $ = (id) => document.getElementById(id);
const BOOT = Date.now(); // SSE replays recent history on connect: never toast for events older than the page
const fresh = (ev) => ev.at >= BOOT - 1000;

// ---------------------------------------------------------------- routing
const parseRoute = () => {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "p" && parts[1]) return { name: "project", slug: parts[1], screen: parts[2] ?? null };
  if (parts[0] === "library") return { name: "library", tab: parts[1] ?? "projects" };
  return { name: "home" };
};
const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };
window.addEventListener("hashchange", () => route());

async function route() {
  const prev = S.route;
  S.route = parseRoute();
  if (prev.slug !== S.route.slug) S.ui.lineErrors = [];
  if (S.route.name === "project") {
    if (!S.detail || S.detail.state?.slug !== S.route.slug) { S.detail = null; renderAll(); } // show "Loading…" at once
    await loadDetail(S.route.slug);
    if (S.route.name !== "project") return; // navigated away meanwhile
  } else if (S.route.name === "home" || S.route.name === "library") {
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
    if (S.route.name !== "project" && !document.activeElement?.closest?.("#main input")) renderMain();
  } catch { /* status shows the error */ }
}
let refreshTimer = null;
const refreshDetail = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (S.route.name !== "project") return loadProjects();
    // don't yank the page out from under someone typing
    if (document.activeElement?.closest?.("#main textarea, #main input")) { S.dirty = true; return; }
    await loadDetail(S.route.slug);
    renderRail();
    renderMain();
  }, 150);
};
document.addEventListener("focusout", () => { if (S.dirty) { S.dirty = false; setTimeout(refreshDetail, 50); } });

// ---------------------------------------------------------------- top bar
function renderTop() {
  const st = S.status;
  const replay = st?.mode === "replay";
  const c = st?.claude;
  let pill;
  if (!st) pill = h("span.pill.wait", {}, h("span.dot"), "Checking Claude…");
  else if (!c?.installed) pill = h("button.pill.bad", { onclick: () => go("#/"), title: c?.installFix ?? "" }, h("span.dot"), "Claude Code not installed");
  else if (c.loggedIn) pill = h("span.pill.ok", { title: `Your own Claude Code login${c.plan ? ` (${c.plan})` : ""}` }, h("span.dot"), `Claude connected${c.plan ? ` · ${c.plan[0].toUpperCase()}${c.plan.slice(1)}` : ""}`);
  else if (S.connecting) pill = h("span.pill.wait", {}, h("span.dot"), "Finish sign-in in your browser…");
  else pill = h("button.pill.bad", { onclick: connect }, h("span.dot"), "Connect Claude");
  const u = st?.usage;
  const five = u?.rate?.fiveHour;
  mount(
    $("top"),
    h("a.brand", { href: "#/" }, h("span.mark", { "aria-hidden": "true" }, "▶"), "Studio"),
    h("span.packchip", { title: "MVP art pack: winter and cold-water survival topics" }, "Pack: Winter Lake"),
    h("span.spacer"),
    u ? h("div.meter", { title: "What today’s runs would cost on the pay-per-use API. On a Claude subscription you are not charged per run: it counts toward your plan’s usage limit (the 5-hour window)." }, h("span", {}, "Usage today ≈ ", h("b", {}, money(u.today)), " · not billed"), five != null ? h("span", {}, `Plan limit used: ${Math.round(five * 100)}% (5-hour window)`) : null) : null,
    st ? h(`span.pill.${replay ? "replay" : "live"}`, { title: replay ? "Replay: recorded runs and cached files, no Claude calls" : "Live: your own Claude Code does the work" }, h("span.dot", { style: { background: replay ? "var(--warn)" : "var(--ok)" } }), replay ? "Replay" : "Live") : null,
    pill,
  );
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
  renderTop();
  renderFeed();
}

// ---------------------------------------------------------------- rail
function renderRail() {
  const d = S.route.name === "project" ? S.detail : null;
  const items = [h("a.step", { href: "#/", class: S.route.name === "home" ? "on" : "" }, h("span.sdot", { style: { borderRadius: "3px" } }), "New video")];
  if (d && !d.missing) {
    const s = d.state;
    items.push(h("h3", {}, d.example ? "Example" : "This video"), h("div.proj", {}, s.title ?? (s.surprise ? "Surprise me" : s.topic), h("small", {}, d.example ? "Finished example" : s.mode === "replay" ? "Replay project" : `Started ${ago(s.createdAt)}`)));
    const cur = screenOf(d);
    STAGES.forEach((stage, i) => {
      const st = s.stages[stage]?.status ?? "idle";
      const reachable = d.example || i === 0 || s.stages[STAGES[i - 1]].status === "approved" || st !== "idle";
      items.push(h("a.step", { href: `#/p/${s.slug}/${SCREEN[stage]}`, class: `${cur === SCREEN[stage] ? "on" : ""} ${reachable ? "" : "locked"}`, "aria-current": cur === SCREEN[stage] ? "step" : null }, h(`span.sdot.${st}`, { "aria-hidden": "true" }), LABEL[stage], h("span.num", {}, stage === "render" && st === "review" ? "ready" : statusWord(st))));
    });
  }
  items.push(h("h3", {}, "Studio"), h("a.step", { href: "#/library", class: S.route.name === "library" ? "on" : "" }, h("span.sdot", { style: { borderRadius: "3px" } }), "Library"));
  mount($("rail"), items);
  // phone: the rail is a horizontal strip; keep the current step visible
  if (matchMedia("(max-width: 760px)").matches) $("rail").querySelector(".step.on")?.scrollIntoView({ inline: "center", block: "nearest" });
}
const statusWord = (st) => ({ running: "working", review: "to approve", approved: "done", error: "failed", paused: "paused", idle: "" })[st] ?? "";
const screenOf = (d) => S.route.screen ?? SCREEN[d.current] ?? "ideas";

// ---------------------------------------------------------------- feed
function renderFeed() {
  const slug = S.route.name === "project" ? S.route.slug : null;
  const job = S.status?.job;
  const items = S.feed.filter((e) => !slug || !e.slug || e.slug === slug || e.stage === "connect").slice(-120);
  const icon = (e) => (e.type === "error" ? "✕" : e.level === "warn" ? "!" : e.type === "log" ? "…" : e.tool === "init" ? "◆" : e.tool === "server" || e.tool === "voice" || e.tool === "render" ? "⚙" : e.tool === "idea" ? "✦" : "›");
  const list = h("ol", { "aria-live": "polite" }, items.length ? items.map((e) => h(`li.${e.type === "error" ? "error" : e.level === "warn" ? "warn" : e.type === "log" ? "log" : "claude"}`, {}, h("span.ic", { "aria-hidden": "true" }, icon(e)), h("div", {}, e.text ?? e.message, h("time", {}, clock(e.at)))))
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
      h("div.row.between", {}, h("span.eyebrow", { style: { margin: 0 } }, "Activity"), job && S.route.slug !== job.slug ? h("button.btn.sm.danger", { onclick: stop, title: "Stop this step. Partial files are kept and you can resume." }, "Pause") : null),
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
  let view;
  if (r.name === "home") view = homeView();
  else if (r.name === "library") view = libraryView();
  else if (!S.detail) view = h("div.empty", {}, "Loading…");
  else if (S.detail.missing) view = h("div.empty", {}, h("p", {}, "This project was not found."), h("a.btn", { href: "#/" }, "Back home"));
  else {
    const screen = screenOf(S.detail);
    view = { ideas: ideasView, script: scriptView, storyboard: storyboardView, voice: voiceView, render: renderView }[screen]?.() ?? h("div.empty", {}, "Unknown screen");
  }
  // Re-rendering replaces the DOM: put keyboard focus back on the equivalent control (chip, tab, voice…).
  const a = document.activeElement;
  const sig = a && a !== $("main") && $("main").contains(a) ? `${a.tagName}|${a.getAttribute("aria-label") ?? ""}|${a.textContent.trim().slice(0, 60)}` : null;
  mount($("main"), h("div.wrap", {}, view));
  if (sig) [...$("main").querySelectorAll("button, a, input, textarea")].find((el) => `${el.tagName}|${el.getAttribute("aria-label") ?? ""}|${el.textContent.trim().slice(0, 60)}` === sig)?.focus({ preventScroll: true });
}
const renderAll = () => { renderTop(); renderRail(); renderMain(); renderFeed(); };

// --- shared pieces
const claudeOk = () => S.status?.mode === "replay" || (S.status?.claude?.installed && S.status?.claude?.loggedIn);
const stageHead = (n, title, lead) => [h("div.eyebrow", {}, `Step ${n} of 5 · Pack: Winter Lake${S.detail?.state?.mode === "replay" ? " · Replay" : ""}`), h("h2", {}, title), lead ? h("p.lead", {}, lead) : null];

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

// ---------------------------------------------------------------- Home
function homeView() {
  const st = S.status;
  const replay = st?.mode === "replay";
  const c = st?.claude;
  const submit = once(async (surprise) => {
    const topic = S.ui.topic.trim();
    if (!surprise && !topic) { toast("Type a topic, or press Surprise me."); $("topic")?.focus(); return; }
    if (!claudeOk()) { toast("Connect Claude first.", true); return; }
    try {
      S.stepCost = 0;
      S.now = null;
      const d = await api("/api/projects", { method: "POST", body: { topic, surprise, format: S.ui.format, length: S.ui.length } });
      S.partial[d.state.slug] = [];
      S.ui.topic = "";
      await loadStatus();
      go(`#/p/${d.state.slug}/ideas`);
    } catch (e) { toast(e.message, true); }
  });
  const banner = !st ? null
    : replay ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Replay mode. "), "Every step plays back a recorded run of the finished example “Ten Minutes Under”. No Claude calls, no API keys needed. Whatever topic you type, the result is that episode."))
    : !c?.installed ? h("div.banner", {}, h("div.grow", {}, h("b", {}, "Claude Code is not installed. "), "Studio uses your own Claude Code as its AI. Install it, then reload this page:", h("div", { style: { marginTop: "6px" } }, h("span.kbd", {}, c?.installFix?.replace(/^Install Claude Code:\s*/, "") ?? ""))))
    : !c.loggedIn ? h("div.banner", {}, h("div.grow", {}, h("b", {}, "Connect your Claude account. "), "Studio runs your own Claude Code on this computer. Signing in happens on Anthropic's page; Studio never sees your password or tokens."), h("button.btn.primary", { onclick: connect, disabled: S.connecting }, S.connecting ? "Waiting for sign-in…" : "Connect Claude"))
    : null;
  const recent = S.projects.slice(0, 8);
  return [
    banner,
    h("div.eyebrow", {}, "Pack: Winter Lake · winter & cold-water survival"),
    h("h1", {}, "Turn a topic into a finished, narrated vertical video."),
    h("p.lead", {}, "Studio writes the ideas, script and storyboard with your Claude Code, voices it with ElevenLabs and renders it with Remotion. You only decide and approve."),
    h("div.composer", {},
      h("label.sr", { for: "topic" }, "Topic"),
      h("input.topic#topic", { id: "topic", placeholder: matchMedia("(max-width: 760px)").matches ? "Your winter survival topic…" : "e.g. How to help a friend who fell through the ice", value: S.ui.topic, autocomplete: "off", maxlength: 300,
        oninput: (e) => { S.ui.topic = e.target.value; const b = $("go"); if (b) b.disabled = !S.ui.topic.trim(); },
        onkeydown: (e) => { if (e.key === "Enter") submit(false); } }),
      h("div.opts", {},
        h("label", {}, "Format"), h("div.chips", { role: "group", "aria-label": "Format" }, FORMATS.map(([k, l]) => h("button.chip", { "aria-pressed": String(S.ui.format === k), onclick: () => { S.ui.format = k; renderMain(); } }, l))),
        h("label", { for: "secs" }, "Length"), h("div.chips", { role: "group", "aria-label": "Length" },
          PRESET_LENGTHS.map((k) => h("button.chip", { "aria-pressed": String(S.ui.length === k), onclick: () => { S.ui.length = k; renderMain(); } }, `${k} s`)),
          h("span.secs", {}, h("input#secs", { id: "secs", type: "number", min: MIN_S, max: MAX_S, step: 5, value: S.ui.length, "aria-label": `Length in seconds (${MIN_S}-${MAX_S})`,
            onchange: (e) => { S.ui.length = clampS(e.target.value); renderMain(); } }), h("span.small.muted", {}, "sec")))),
      h("div.row", {},
        h("button.btn.primary.lg#go", { id: "go", onclick: () => submit(false), disabled: !S.ui.topic.trim() }, "Make 5 ideas"),
        h("button.btn.ice.lg", { onclick: () => submit(true) }, "✦ Surprise me"),
        h("span.small.faint", {}, replay ? "Replay: no Claude calls." : "About 1-3 minutes per step. You approve each one."))),
    h("div.steps3", {},
      h("div.card", {}, h("b", {}, "1 · Pick an idea"), h("span.muted.small", {}, "Five premises with hook, twist and the real fact behind it.")),
      h("div.card", {}, h("b", {}, "2 · Approve script & storyboard"), h("span.muted.small", {}, "Edit any line. See every shot before anything is voiced.")),
      h("div.card", {}, h("b", {}, "3 · Voice and render"), h("span.muted.small", {}, "ElevenLabs voice, Remotion render: MP4, phone copy, cover, titles."))),
    h("h2", { style: { marginTop: "38px", fontSize: "20px" } }, "Recent"),
    recent.length ? h("div.projects", {}, recent.map(projCard)) : h("div.empty", {}, "No videos yet. Your projects will appear here."),
  ];
}
const projCard = (p) =>
  h("a.proj-card", { href: `#/p/${p.slug}` },
    h("div.cov", {}, p.cover ? h("img", { src: fileUrl(p.cover), alt: "", loading: "lazy" }) : h("span", { "aria-hidden": "true" }, "❄")),
    h("div.meta", {}, h("b", {}, p.title ?? (p.surprise ? "Surprise me" : p.topic) ?? p.slug),
      h("div.row", { style: { marginTop: "6px", gap: "6px" } },
        p.example ? h("span.tag.ice", {}, "Example") : p.stage === "done" ? h("span.tag.ok", {}, "Finished") : h("span.tag.warn", {}, LABEL[p.stage] ?? p.stage),
        p.mode === "replay" ? h("span.tag", {}, "Replay") : null,
        !p.example ? h("span.small.faint", {}, ago(p.updatedAt)) : null)));

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
    h("div.foot", {}, chosen === i ? h("span.tag.ok", {}, "✓ Chosen") : canPick ? h("button.btn.primary", { onclick: () => approve("ideas", { pick: i }, "script") }, "Use this idea") : null));
}
function ideasView() {
  const d = S.detail;
  const st = d.state.stages.ideas.status;
  const ideas = d.ideas ?? S.partial[d.state.slug] ?? [];
  const chosen = d.state.stages.ideas.status === "approved" ? d.state.pick : null;
  const cards = [];
  for (let i = 0; i < 5; i++) cards.push(ideas[i] ? ideaCard(ideas[i], i, st, chosen) : st === "running" ? h("div.skel", { "data-idea": i, "aria-hidden": "true" }) : null);
  const topic = d.state.surprise ? "Surprise me" : `“${d.state.topic}”`;
  return [
    ...stageHead(1, "Pick an idea", `${topic} · ${FORMATS.find((f) => f[0] === d.state.format)?.[1] ?? ""} · ~${d.state.length} s. Facts are flagged to verify; nothing was searched on the web.`),
    st === "running" ? working("ideas") : null,
    st === "error" || st === "paused" ? errorBox("ideas") : null,
    st === "idle" ? h("div.empty", {}, h("p", {}, "Ideas have not been generated yet."), h("button.btn.primary", { onclick: () => runStage("ideas") }, "Make 5 ideas")) : null,
    h("div.ideas#ideas", { id: "ideas" }, cards),
    st === "review" || st === "approved" ? h("div.actions", {}, st === "review" ? h("span.muted.small", { style: { alignSelf: "center" } }, "Choose the idea to turn into a script.") : h("a.btn.primary", { href: `#/p/${d.state.slug}/script` }, "Go to script →"), h("button.btn.ghost", { onclick: () => runStage("ideas") }, "Make 5 new ideas")) : null,
  ];
}

// ---------------------------------------------------------------- Script
function scriptView() {
  const d = S.detail;
  const st = d.state.stages.script.status;
  const lines = d.lines ?? [];
  const editable = st === "review" && !d.example;
  const total = lines.reduce((a, l) => a + words(l.text), 0);
  const [lo, hi] = wordRange(d.state.length);
  const secs = Math.round(total / 2.6 + lines.length * 0.3);
  const tab = S.ui.scriptTab;
  // Edits apply to the live lines at once (so nothing typed is lost), saves run one after another with
  // the latest text, and the editors are only rebuilt once focus has left them.
  const saveLine = (i, patch) => {
    const cur = S.detail.lines;
    cur[i] = { ...cur[i], ...patch };
    const payload = cur.map((l) => ({ ...l }));
    const slug = d.state.slug;
    saveChain = saveChain.then(async () => {
      try {
        const r = await api(`/api/projects/${slug}/lines`, { method: "POST", body: { lines: payload } });
        S.ui.lineErrors = r.errors ?? [];
      } catch (e) {
        S.ui.lineErrors = e.data?.errors ?? [e.message];
      }
      if (S.route.slug !== slug) return;
      if (document.activeElement?.closest?.("#main textarea, #main input")) S.dirty = true;
      else renderMain();
    });
  };
  const errFor = (i) => S.ui.lineErrors.filter((e) => e.startsWith(`line ${i}:`));
  const body =
    tab === "lines"
      ? h("div.lines", {}, lines.map((l, i) =>
          h(`div.line${errFor(i).length ? ".err" : ""}`, {},
            h("div.n", {}, String(i + 1)),
            h("div", {},
              editable ? h("textarea", { "aria-label": `Line ${i + 1}`, rows: 2, onchange: (e) => saveLine(i, { text: e.target.value }) }, l.text) : h("div", { style: { fontSize: "16px", padding: "4px 6px" } }, captionPreview(l.text, l.highlight)),
              h("div.hl", {},
                editable ? [h("span.meta", {}, "Coloured words"), h("input", { value: (l.highlight ?? []).join(", "), "aria-label": `Coloured words for line ${i + 1}`, title: "Comma-separated words from the line. Add :r for red, :g for green.", onchange: (e) => saveLine(i, { highlight: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }) })] : null,
                h("span.meta", {}, `${words(l.text)} words · ~${(words(l.text) / 2.6).toFixed(1)} s`)),
              editable ? h("div.small", { style: { marginTop: "6px" } }, captionPreview(l.text, l.highlight)) : null,
              errFor(i).map((e) => h("div.small", { style: { color: "var(--warn)" } }, e.replace(/^line \d+: /, "")))))))
      : tab === "facts"
        ? factsView(d)
        : h("div.md", { html: md(tab === "notes" ? d.scriptMd ?? "_No script notes yet._" : d.shotlistMd ?? "_No beat board yet._") });
  const verifying = S.status?.job?.stage === "verify" && S.status.job.slug === d.state.slug;
  const general = S.ui.lineErrors.filter((e) => !/^line \d+:/.test(e));
  const warnings = d.state.stages.script.warnings ?? [];
  return [
    ...stageHead(2, d.state.title ?? "Script", "Read it out loud. Edit any line; the captions colour the words you list. The beat board shows how each line becomes shots."),
    st === "running" ? working("script") : null,
    st === "error" || st === "paused" ? errorBox("script") : null,
    lines.length ? h("div.stats", {},
      h(`div.stat${total < lo || total > hi ? ".bad" : ""}`, {}, h("b", {}, String(total)), h("span", {}, `words (target ${lo}-${hi})`)),
      h("div.stat", {}, h("b", {}, `${secs} s`), h("span", {}, "estimated length")),
      h("div.stat", {}, h("b", {}, String(lines.length)), h("span", {}, "lines")),
      d.state.stages.script.cost ? h("div.stat", {}, h("b", {}, money(d.state.stages.script.cost)), h("span", {}, "Claude usage")) : null) : null,
    general.length || warnings.length ? h("div.errors", {}, h("b", {}, "Check before approving"), h("ul", {}, [...general, ...warnings].map((e) => h("li", {}, e)))) : null,
    verifying ? h("div.working", { role: "status" }, h("span.spinner"), h("div", { style: { flex: 1 } }, h("b", {}, "Claude is checking the facts on the web…"), h("span.muted.small", { id: "now-line" }, S.now ?? "Starting…")), h("button.btn.sm.danger", { onclick: stop }, "Stop")) : null,
    lines.length || d.scriptMd ? h("div.tabs", { role: "tablist" }, [["lines", "Narration"], ["notes", "Script notes"], ["board", "Beat board"], ["facts", d.facts ? `Fact check (${d.facts.facts?.length ?? 0})` : "Fact check"]].map(([k, l]) => h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => { S.ui.scriptTab = k; renderMain(); } }, l))) : null,
    lines.length || d.scriptMd ? body : st !== "running" ? h("div.empty", {}, "No script yet.") : null,
    st === "review" && !d.example ? h("div.actions", {}, h("button.btn.primary.lg", { onclick: () => approve("script", {}, "storyboard") }, "Approve script → build storyboard"), h("button.btn.ghost", { onclick: () => runStage("script") }, "Rewrite")) : null,
    st === "approved" && !d.example ? h("div.actions", {}, h("a.btn.primary", { href: `#/p/${d.state.slug}/storyboard` }, "Go to storyboard →")) : null,
  ];
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
      h("span.muted.small", {}, "Optional: a researcher run (Sonnet + web search) checks every claim against official sources. It changes nothing; edit the narration yourself if a fact needs adjusting."),
      h("button.btn.sm.ice", { onclick: run, disabled: !can }, d.facts ? "Check again" : "Verify facts")),
    d.facts?.facts?.length
      ? h("div.md", {}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Claim"), h("th", {}, "Verdict"), h("th", {}, "Note"), h("th", {}, "Source"))),
          h("tbody", {}, d.facts.facts.map((f) => h("tr", {}, h("td", {}, f.claim), h("td", {}, h(`span.tag.${tone[f.verdict] ?? ""}`, {}, f.verdict)), h("td", {}, f.note), h("td", {}, /^https?:\/\//.test(f.source ?? "") ? h("a", { href: f.source, target: "_blank", rel: "noopener noreferrer" }, hostOf(f.source)) : f.source ?? ""))))))
      : h("div.empty", {}, "No fact check yet."));
}

// ---------------------------------------------------------------- Storyboard
function storyboardView() {
  const d = S.detail;
  const st = d.state.stages.shots.status;
  const shots = d.shots ?? [];
  const lines = d.lines ?? [];
  const open = (src) => { const lb = h("div.lightbox", { role: "dialog", "aria-label": "Still", onclick: () => lb.remove(), tabindex: 0, onkeydown: (e) => e.key === "Escape" && lb.remove() }, h("img", { src, alt: "" })); document.body.append(lb); lb.focus(); };
  return [
    ...stageHead(3, "Storyboard", "One frame from every shot, rendered from the real scene code. Check the story reads without sound."),
    st === "running" ? working("shots", true) : null,
    st === "error" || st === "paused" ? errorBox("shots") : null,
    d.stills?.length
      ? [h("div.row.between", { style: { margin: "4px 0 12px" } }, h("span.muted.small", {}, `${d.stills.length} shots · ${lines.length} narration lines`), d.storyboard ? h("a.btn.sm", { href: fileUrl(d.storyboard), target: "_blank", rel: "noopener" }, "Open contact sheet") : null),
        h("div.stills", {}, d.stills.map((p, i) => {
          const s = shots[i];
          return h("button.still", { onclick: () => open(fileUrl(p)), "aria-label": `Shot ${s?.id ?? i + 1}` }, h("img", { src: fileUrl(p), alt: "", decoding: "async" }), h("span", {}, h("b", {}, s?.id ?? String(i + 1)), s ? ` · ${s.scene}` : "", s && lines[s.line] ? h("div", {}, lines[s.line].text.slice(0, 54) + (lines[s.line].text.length > 54 ? "…" : "")) : null));
        }))]
      : st !== "running" && st !== "error" ? h("div.empty", {}, "The storyboard appears here after the script is approved.") : null,
    st === "review" && !d.example ? h("div.actions", {}, h("button.btn.primary.lg", { onclick: () => approve("shots", { next: false }, "voice") }, "Approve storyboard → voice"), h("button.btn.ghost", { onclick: () => runStage("shots") }, "Rebuild shots")) : null,
    st === "approved" && !d.example ? h("div.actions", {}, h("a.btn.primary", { href: `#/p/${d.state.slug}/voice` }, "Go to voice →")) : null,
  ];
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
  const setup = !replay && (st === "idle" || st === "error" || st === "paused" || st === "review")
    ? h("div.card", { style: { marginBottom: "18px" } },
        h("div.field", {}, h("label", {}, "Voice"),
          h("div.voices", {}, (voicesCache?.voices ?? []).map((x) => h("button.voice", { "aria-pressed": String(!S.ui.customVoice && S.ui.voiceId === x.id), onclick: () => { S.ui.voiceId = x.id; S.ui.customVoice = ""; renderMain(); } }, h("b", {}, x.name), h("span.small.muted", {}, x.note)))),
          h("input.input", { placeholder: "…or paste a custom ElevenLabs voice ID", value: S.ui.customVoice, "aria-label": "Custom voice ID", style: { marginTop: "8px" }, oninput: (e) => (S.ui.customVoice = e.target.value) })),
        h("div.field", { style: { marginTop: "16px" } }, h("label", { for: "elkey" }, "ElevenLabs API key"),
          keySource
            ? h("div.row", {}, h("span.tag.ok", {}, keySource === "env" ? "✓ From ELEVENLABS_API_KEY" : "✓ Kept in memory for this session"), keySource === "session" ? h("button.btn.sm.ghost", { onclick: forget }, "Forget key") : null)
            : h("div.row", {}, h("input.input#elkey", { id: "elkey", type: "password", autocomplete: "off", placeholder: "sk_…", style: { flex: 1, minWidth: "220px" }, onkeydown: (e) => e.key === "Enter" && setKey() }), h("button.btn", { onclick: setKey }, "Use key")),
          h("span.small.faint", {}, "Never written to disk. Without a key, Studio makes a placeholder voice with your computer's speech engine, clearly labelled, for testing only.")),
        h("div.row", { style: { marginTop: "18px" } },
          h("button.btn.primary.lg", { onclick: generate, disabled: st === "running" }, keySource ? (st === "review" ? "Regenerate voice" : "Generate voice") : (st === "review" ? "Regenerate placeholder voice" : "Make placeholder voice")),
          h("span.small.muted", {}, keySource ? `${lines.length} lines · eleven_v4 · stitched line to line` : `${lines.length} lines · ${S.status?.eleven?.placeholder ?? "system"} speech`)))
    : replay && (st === "idle" || st === "error" || st === "paused")
      ? h("div.card", { style: { marginBottom: "18px" } }, h("p.muted", { style: { marginTop: 0 } }, "Replay uses the recorded ElevenLabs voice of the example episode. No key needed."), h("button.btn.primary.lg", { onclick: () => runStage("voice", {}) }, "Generate voice (replay)"))
      : null;
  return [
    ...stageHead(4, "Voice", "Every narration line becomes its own clip, so the video re-times itself to the real voice."),
    st === "running" ? working("voice", true) : null,
    st === "error" || st === "paused" ? errorBox("voice") : null,
    setup,
    (st === "review" || st === "approved") && v.credit ? h("div.banner.info", {}, h("div.grow", {}, h("b", {}, "Credit reminder. "), "ElevenLabs' free plan is non-commercial and published videos must credit “elevenlabs.io” in the title. Studio adds it to your titles.")) : null,
    placeholder && (st === "review" || st === "approved") ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Placeholder voice. "), "Made with your computer's speech engine for testing. Add an ElevenLabs key and regenerate before publishing.")) : null,
    d.clips?.length
      ? [h("div.row.between", { style: { margin: "6px 0 10px" } }, h("span.muted.small", {}, `${d.clips.length} clips · ${total.toFixed(1)} s total${v.model ? ` · ${placeholder ? "placeholder" : v.model}` : ""}`)),
        h("div.clips", {}, d.clips.map((p, i) => h("div.clip", {}, h("span.n", {}, String(i + 1)), h("span", {}, lines[i]?.text ?? ""), h("audio", { controls: true, preload: "none", src: fileUrl(p), "aria-label": `Line ${i + 1}` }), h("span.s", {}, audio[i] ? `${audio[i].toFixed(1)} s` : ""))))]
      : lines.length && st !== "running"
        ? [h("div.eyebrow", { style: { marginTop: "8px" } }, `Narration to voice · ${lines.length} lines · ~${Math.round(lines.reduce((a, l) => a + words(l.text), 0) / 2.6)} s`),
          h("div.clips", {}, lines.map((l, i) => h("div.clip", { style: { gridTemplateColumns: "30px 1fr 56px" } }, h("span.n", {}, String(i + 1)), h("span", {}, captionPreview(l.text, l.highlight)), h("span.s", {}, `~${(words(l.text) / 2.6).toFixed(1)} s`))))]
        : null,
    st === "review" && !d.example ? h("div.actions", {}, h("button.btn.primary.lg", { onclick: () => approve("voice", {}, "render") }, "Accept voice → render video")) : null,
    st === "approved" && !d.example ? h("div.actions", {}, h("a.btn.primary", { href: `#/p/${d.state.slug}/render` }, "Go to render →")) : null,
  ];
}

// ---------------------------------------------------------------- Render
function renderView() {
  const d = S.detail;
  const st = d.state.stages.render.status;
  const o = d.outputs ?? {};
  const video = o.phone ?? o.mp4;
  const t = d.titles;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast("Copied."); } catch { toast("Copy failed; select the text instead."); } };
  return [
    ...stageHead(5, d.example ? "Ten Minutes Under" : "Your video", d.example ? "The finished example episode that ships with the studio (used by Replay mode)." : "Rendered at 1080×1920, 30 fps, with a phone copy, a cover and three titles."),
    st === "running" ? working("render", true) : null,
    st === "error" || st === "paused" ? errorBox("render") : null,
    st === "idle" && !d.example ? h("div.empty", {}, h("p", {}, "Accept the voice to render."), d.state.stages.voice.status === "approved" ? h("button.btn.primary", { onclick: () => runStage("render") }, "Render video") : null) : null,
    video && (st === "review" || st === "approved" || d.example)
      ? h("div.player", {},
          h("video", { controls: true, playsinline: true, preload: "metadata", src: fileUrl(video), poster: o.cover ? fileUrl(o.cover) : null }),
          h("div", {},
            d.state.mode === "replay" ? h("div.banner.warn", {}, h("div.grow", {}, h("b", {}, "Replay. "), "This is the cached render of the example episode, not a new render.")) : null,
            h("div.eyebrow", {}, "Download"),
            h("div.downloads", {},
              o.mp4 ? h("a.btn.primary", { href: fileUrl(o.mp4), download: `${d.state.slug}.mp4` }, `MP4${o.mp4Mb ? ` · ${o.mp4Mb} MB` : ""}`) : null,
              o.phone ? h("a.btn", { href: fileUrl(o.phone), download: `${d.state.slug}-phone.mp4` }, `Phone copy${o.phoneMb ? ` · ${o.phoneMb} MB` : ""}`) : null,
              o.cover ? h("a.btn", { href: fileUrl(o.cover), download: `${d.state.slug}-cover.png` }, "Cover") : null),
            o.cover ? [h("div.eyebrow", { style: { marginTop: "20px" } }, "Cover (frame at 3 s)"), h("img.coverimg", { src: fileUrl(o.cover), alt: "Cover frame" })] : null,
            t?.titles?.length ? [h("div.eyebrow", { style: { marginTop: "20px" } }, "Titles"), h("div.titles", {}, t.titles.map((x) => h("div.t", {}, h("span", {}, x), h("small", {}, `${x.length}/60`), h("button.btn.sm", { onclick: () => copy(x), "aria-label": `Copy title ${x}` }, "Copy")))),
              t.description ? h("div.card", { style: { marginTop: "10px", padding: "12px 14px" } }, h("div.small", { style: { whiteSpace: "pre-wrap" } }, t.description), h("button.btn.sm", { style: { marginTop: "8px" }, onclick: () => copy(t.description) }, "Copy description")) : null] : null,
            d.state.voice?.credit ? h("p.small.muted", { style: { marginTop: "14px" } }, "ElevenLabs free plan: credit “elevenlabs.io” in the title (added above) and don't use it commercially.") : null))
      : null,
    st === "review" && !d.example ? h("div.actions", {}, h("button.btn.primary", { onclick: () => approve("render", {}, "render") }, "Mark as finished"), h("button.btn.ghost", { onclick: () => runStage("render") }, "Render again")) : null,
    st === "approved" && !d.example ? h("div.actions", {}, h("a.btn.primary", { href: "#/" }, "Make another video")) : null,
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
  return [h("div.eyebrow", {}, "Library"), h("h2", {}, "Everything Studio knows"), h("p.lead", {}, "Your projects, the built-in skills that make the videos good, and the Winter Lake art pack."), tabs, body];
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
    if (mine(ev)) { if (ev.status === "done" && fresh(ev)) { S.ui.scriptTab = "facts"; toast("Fact check is ready."); } refreshDetail(); }
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
(async () => {
  if (!token()) return denied();
  renderAll();
  connectEvents();
  await Promise.all([loadStatus(), route()]);
  // keep the Claude pill honest (e.g. signed out in another terminal)
  setInterval(() => loadStatus(), 60000);
})();
