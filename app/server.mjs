// Studio server: Node built-in http, zero framework. Binds to 127.0.0.1 only and requires a private
// random token on every /api and /files request (the URL printed and opened at start carries it).
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream";
import { ROOT, UI, SKILLS, OUT, RUNTIME, EXAMPLE_SLUG, EXAMPLE_DIR, episodeDir, resolveServed, rel } from "./lib/paths.mjs";
import * as bus from "./lib/bus.mjs";
import * as store from "./lib/store.mjs";
import * as usage from "./lib/usage.mjs";
import { ensureExampleSnapshot, EXAMPLE_BUILD, owner } from "./lib/workspace.mjs";
import { setElevenKey, elevenKeySource, redact } from "./lib/secrets.mjs";
import { MODE, registerStage, startStage, startTask, cancel, current } from "./jobs.mjs";
import { verifyFacts } from "./stages/extras.mjs";
import { startLogin } from "./engine/claude.mjs";
import { checkClaude, runDoctor } from "./doctor.mjs";
import * as ideas from "./stages/ideas.mjs";
import * as script from "./stages/script.mjs";
import * as shots from "./stages/shots.mjs";
import * as voice from "./stages/voice.mjs";
import * as render from "./stages/render.mjs";
import * as boards from "./lib/boards.mjs";
import { weave, pickWeaveAngle } from "./stages/weave.mjs";
import { hooks } from "./stages/hooks.mjs";
import { safetyIssues, loadShots, catalogScenes } from "./lib/validate.mjs";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { EDITS_JSON } from "./lib/paths.mjs";
import { checkout } from "./lib/workspace.mjs";
import { storyboard } from "./lib/remotion-tasks.mjs";
import { copyStoryboard } from "./stages/shots.mjs";
import { editsFile, ensureRawShots, rawFile, summarizeRaw, timingFor, validateEdits } from "./lib/edits.mjs";

for (const [id, mod] of Object.entries({ ideas, script, shots, voice, render })) registerStage(id, mod);

export const TOKEN = process.env.STUDIO_TOKEN_FOR_TESTS || randomBytes(24).toString("base64url");
const HOST = "127.0.0.1";
let PORT = Number(process.env.STUDIO_PORT || 4317);

// ---- helpers ---------------------------------------------------------------------------------------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".md": "text/markdown; charset=utf-8", ".ts": "text/plain; charset=utf-8", ".woff2": "font/woff2" };
const SEC_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'",
};
const json = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SEC_HEADERS });
  res.end(JSON.stringify(data));
};
const fail = (res, status, message, extra = {}) => json(res, status, { error: message, ...extra });

const tokenOk = (req, url) => {
  const given = req.headers["x-studio-token"] || url.searchParams.get("t") || "";
  const a = Buffer.from(String(given));
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
};
// DNS-rebinding and cross-site protection: only our own host names, only same-origin writes.
const hostOk = (req) => {
  const h = String(req.headers.host ?? "").toLowerCase();
  return h === `${HOST}:${PORT}` || h === `localhost:${PORT}`;
};
const originOk = (req) => {
  const o = req.headers.origin;
  if (!o) return true;
  return o === `http://${HOST}:${PORT}` || o === `http://localhost:${PORT}`;
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) { reject(Object.assign(new Error("Request too large"), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(Object.assign(new Error("Invalid JSON"), { status: 400 })); }
    });
    req.on("error", reject);
  });

const sendFile = (req, res, file, { cache = "no-cache" } = {}) => {
  let st;
  try { st = statSync(file); } catch { return fail(res, 404, "Not found"); }
  if (!st.isFile()) return fail(res, 404, "Not found");
  const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": cache, ...SEC_HEADERS };
  // pipeline() closes the file when the client aborts (video seeking does constantly) and turns a file
  // that vanished or is locked (EBUSY on Windows mid-render) into a closed response, never a crash.
  const stream = (opts) => pipeline(createReadStream(file, opts), res, () => {});
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    if (start >= st.size || start < 0 || end < start) { res.writeHead(416, { "content-range": `bytes */${st.size}` }); return res.end(); }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...base, "content-range": `bytes ${start}-${end}/${st.size}`, "content-length": end - start + 1 });
    if (req.method === "HEAD") return res.end();
    return stream({ start, end });
  }
  res.writeHead(200, { ...base, "content-length": st.size });
  if (req.method === "HEAD") return res.end();
  stream();
};

const readText = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);

// ---- status ----------------------------------------------------------------------------------------
// `claude --version` + `claude auth status` take a few seconds, so the pill is served from a cache that is
// refreshed in the background (stale-while-revalidate); `fresh` forces a real check (Connect, sign-in poll).
let claudeCache = { at: 0, data: null, pending: null };
const checkNow = (lookup = false) =>
  (claudeCache.pending ??= checkClaude({ fresh: lookup })
    .then((c) => {
      const data = { installed: c.installed.status === "pass", installDetail: c.installed.detail, installFix: c.installed.fix, loggedIn: !!c.status?.loggedIn, plan: c.status?.plan ?? null, method: c.status?.authMethod ?? null, version: c.installed.detail };
      const changed = JSON.stringify(data) !== JSON.stringify(claudeCache.data);
      claudeCache = { at: Date.now(), data, pending: null };
      if (changed) bus.send("status", { claude: data });
      return data;
    })
    .catch((e) => { claudeCache.pending = null; throw e; }));
const claudeStatus = async (fresh = false) => {
  if (fresh || !claudeCache.data) return checkNow(fresh && !claudeCache.data?.installed);
  if (Date.now() - claudeCache.at > 30000) checkNow().catch(() => {});
  return claudeCache.data;
};

// ---- project detail --------------------------------------------------------------------------------
const projectDetail = (slug) => {
  if (slug === EXAMPLE_SLUG) return exampleDetail();
  const s = store.load(slug);
  if (!s) return null;
  const d = episodeDir(slug);
  const sbDir = path.join(d, "storyboard");
  const r = render.outputs(slug);
  const exists = (f) => (existsSync(f) ? rel(f) : null);
  return {
    state: s,
    current: store.currentStage(s),
    ideas: store.readJson(path.join(d, "ideas.json"))?.ideas ?? null,
    lines: store.readJson(path.join(d, "lines.json")),
    scriptMd: readText(path.join(d, "script.md")),
    shotlistMd: readText(path.join(d, "shotlist.md")),
    shots: store.readJson(path.join(d, "shots.json")),
    rawShots: store.readJson(rawFile(slug)), // [{base,id,line,scene,zoom,text,weight}] from shots.ts, for the frame editor
    edits: store.readJson(editsFile(slug), null), // {shots?:[{base,line?,scene?,zoom?,text?,sec?}], lines?:{[i]:{sec}}} | null
    timing: timingFor(slug), // {fps,total,totalSec,lines:[{i,start,end,voiceSec}],shots:[{idx,base,line,start,end}]} in frames
    storyboard: exists(path.join(d, "storyboard.png")),
    stills: existsSync(sbDir) ? readdirSync(sbDir).filter((f) => f.endsWith(".png")).sort().map((f) => `episodes/${slug}/storyboard/${f}`) : [],
    audio: store.readJson(path.join(d, "audio.json")),
    clips: existsSync(path.join(d, "voice")) ? readdirSync(path.join(d, "voice")).filter((f) => /^line-\d+\.mp3$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5))).map((f) => `episodes/${slug}/voice/${f}`) : [],
    outputs: { mp4: exists(r.mp4), phone: exists(r.phone), cover: exists(r.cover), mp4Mb: render.sizeMb(r.mp4), phoneMb: render.sizeMb(r.phone) },
    titles: store.readJson(r.titles),
    facts: store.readJson(path.join(d, "facts.json")),
    workspaceOwner: owner(),
  };
};

const exampleDetail = () => {
  const sb = path.join(EXAMPLE_BUILD, "storyboard");
  return {
    example: true,
    state: { slug: EXAMPLE_SLUG, title: "Ten Minutes Under", mode: "example", stages: Object.fromEntries(store.STAGES.map((k) => [k, { status: "approved" }])) },
    current: "done",
    lines: store.readJson(path.join(ROOT, "app", "replays", "artifacts", "lines.json")),
    scriptMd: readText(path.join(EXAMPLE_DIR, "script.md")),
    shotlistMd: readText(path.join(EXAMPLE_DIR, "shotlist.md")),
    storyboard: existsSync(path.join(EXAMPLE_BUILD, "storyboard.png")) ? rel(path.join(EXAMPLE_BUILD, "storyboard.png")) : null,
    stills: existsSync(sb) ? readdirSync(sb).filter((f) => f.endsWith(".png")).sort().map((f) => rel(path.join(sb, f))) : [],
    audio: store.readJson(path.join(EXAMPLE_BUILD, "audio.json")),
    clips: existsSync(path.join(EXAMPLE_BUILD, "voice")) ? readdirSync(path.join(EXAMPLE_BUILD, "voice")).filter((f) => /^line-\d+\.mp3$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5))).map((f) => rel(path.join(EXAMPLE_BUILD, "voice", f))) : [],
    outputs: { mp4: null, phone: existsSync(path.join(EXAMPLE_BUILD, "episode-phone.mp4")) ? rel(path.join(EXAMPLE_BUILD, "episode-phone.mp4")) : null, cover: existsSync(path.join(EXAMPLE_DIR, "cover.png")) ? rel(path.join(EXAMPLE_DIR, "cover.png")) : null },
    titles: store.readJson(path.join(ROOT, "app", "replays", "artifacts", "titles.json")),
  };
};

// ---- skills + assets -------------------------------------------------------------------------------
const skillList = () => {
  if (!existsSync(SKILLS)) return [];
  return readdirSync(SKILLS)
    .filter((d) => existsSync(path.join(SKILLS, d, "SKILL.md")))
    .map((d) => {
      const md = readFileSync(path.join(SKILLS, d, "SKILL.md"), "utf8");
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1] ?? "";
      const name = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? d;
      let desc = /^description:\s*([\s\S]*?)(?=^\w[\w-]*:|\s*$(?![\s\S]))/m.exec(fm)?.[1] ?? "";
      desc = desc.replace(/^>-?\s*/, "").replace(/\s+/g, " ").trim();
      const group = d.startsWith("threejs") ? "three.js" : d.startsWith("remotion") ? "Remotion" : d.startsWith("elevenlabs") ? "ElevenLabs" : "Story";
      return { id: d, name, description: desc, group, core: ["story-explainer-2d", "survival-short", "cinematic-director", "elevenlabs-text-to-speech", "remotion-render"].includes(d) };
    });
};

const assets = () => {
  const style = path.join(OUT, "style");
  const images = existsSync(style) ? readdirSync(style).filter((f) => f.endsWith(".png")).map((f) => ({ name: f.replace(/\.png$/, "").replace(/-/g, " "), path: `out/style/${f}` })) : [];
  const exVoice = path.join(EXAMPLE_BUILD, "voice");
  const clips = existsSync(exVoice) ? readdirSync(exVoice).filter((f) => f.endsWith(".mp3")).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5))).map((f) => rel(path.join(exVoice, f))) : [];
  const lines = store.readJson(path.join(ROOT, "app", "replays", "artifacts", "lines.json")) ?? [];
  return { images, clips: clips.map((p, i) => ({ path: p, text: lines[i]?.text ?? "" })), pack: { id: "winter-lake", name: "Winter Lake", scenes: ["lakeSide", "lakeCut", "lakeTop", "lakePrint"], cast: ["Eli", "his brother"] } };
};

// ---- routes ----------------------------------------------------------------------------------------
const approve = async (slug, stage, body) => {
  const s = store.load(slug);
  if (!s) throw Object.assign(new Error("No such project"), { status: 404 });
  if (current()?.slug === slug) throw Object.assign(new Error("Wait for the running step to finish."), { status: 409 });
  const st = s.stages[stage];
  if (st.status !== "review" && !(stage === "script" && st.status === "approved")) throw Object.assign(new Error(`${store.STAGE_LABELS[stage]} is not ready to approve.`), { status: 409 });
  if (stage === "ideas") {
    const list = store.readJson(path.join(episodeDir(slug), "ideas.json"))?.ideas ?? [];
    const pick = Number(body.pick);
    if (!Number.isInteger(pick) || !list[pick]) throw Object.assign(new Error("Pick one of the ideas."), { status: 400 });
    store.update(slug, (x) => { x.pick = pick; x.title = String(list[pick].title).slice(0, 80); });
  }
  if (stage === "script" && body.lines) {
    const v = script.saveLines(slug, body.lines, s.length);
    if (!v.saved) throw Object.assign(new Error(`Fix the script first: ${v.errors[0]}`), { status: 400, errors: v.errors });
  }
  if (stage === "script") {
    const ls = store.readJson(path.join(episodeDir(slug), "lines.json"));
    if (!Array.isArray(ls) || !ls.length) throw Object.assign(new Error("Add at least one line to the script before approving it."), { status: 400 });
  }
  store.update(slug, (x) => (x.stages[stage].status = "approved"));
  bus.send("stage", { slug, stage, status: "approved" });
  const next = { ideas: "script", script: "shots", voice: "render" }[stage];
  if (next && body.next !== false) {
    try { startStage(slug, next, {}); } catch (e) { bus.send("error", { slug, stage: next, code: "start", message: e.message }); }
  }
  return projectDetail(slug);
};

const routes = async (req, res, url) => {
  const p = url.pathname;
  const m = req.method;
  let mm;

  if (p === "/api/events" && m === "GET") return bus.subscribe(req, res);

  if (p === "/api/status" && m === "GET") {
    const claude = MODE === "replay" ? { ...(await claudeStatus()), replayNote: "Replay mode makes no Claude calls." } : await claudeStatus(url.searchParams.get("fresh") === "1");
    return json(res, 200, { mode: MODE, claude, usage: usage.get(), job: current(), eleven: { keySource: elevenKeySource(), placeholder: voice.placeholderEngine() }, pack: { id: "winter-lake", name: "Winter Lake" }, platform: process.platform });
  }
  if (p === "/api/doctor" && m === "GET") return json(res, 200, { rows: await runDoctor({ quick: url.searchParams.get("quick") === "1" }) });

  if (p === "/api/connect" && m === "POST") {
    const st = await claudeStatus(true);
    if (!st.installed) return fail(res, 400, "Claude Code is not installed.", { code: "not_installed", fix: st.installFix });
    if (st.loggedIn) return json(res, 200, { connected: true, claude: st });
    try {
      const lp = startLogin((line) => {
        const urlMatch = /(https:\/\/\S+)/.exec(line);
        bus.send("log", { stage: "connect", text: urlMatch ? `Sign-in page: ${urlMatch[1]}` : redact(line).slice(0, 200), url: urlMatch?.[1] ?? null });
      });
      bus.send("activity", { stage: "connect", text: "Opening Anthropic's sign-in in your browser…" });
      // Poll until the official login completes (or gives up).
      const t0 = Date.now();
      const poll = setInterval(async () => {
        try {
          const s = await claudeStatus(true);
          if (s.loggedIn || Date.now() - t0 > 10 * 60 * 1000) {
            clearInterval(poll);
            bus.send("status", { claude: s });
            if (s.loggedIn) { bus.send("activity", { stage: "connect", text: "Claude connected" }); lp.kill(); }
          }
        } catch (err) {
          if (Date.now() - t0 > 10 * 60 * 1000) clearInterval(poll);
          console.error("sign-in check failed:", err.message);
        }
      }, 2500);
      return json(res, 202, { connected: false, pending: true });
    } catch (e) {
      return fail(res, 500, e.message);
    }
  }

  if (p === "/api/options" && m === "GET") return json(res, 200, { styles: store.STYLES, presets: store.OUTPUT_PRESETS, ratios: store.RATIOS, length: { min: store.MIN_SECONDS, max: store.MAX_SECONDS, presets: store.PRESET_LENGTHS }, scenes: catalogScenes() });

  // ---- inspiration boards ----
  if (p === "/api/boards" && m === "GET") return json(res, 200, { boards: boards.list() });
  if (p === "/api/boards" && m === "POST") return json(res, 201, boards.create(await readBody(req)));
  if ((mm = /^\/api\/boards\/([a-f0-9]{10})(?:\/(fragments|weave|project)(?:\/([a-f0-9]{10}))?)?$/.exec(p))) {
    const [, id, sub, fid] = mm;
    const board = () => boards.get(id);
    if (!board()) return fail(res, 404, "No such board");
    if (!sub && m === "GET") return json(res, 200, board());
    if (!sub && m === "PATCH") return json(res, 200, boards.rename(id, (await readBody(req)).title));
    if (sub === "fragments" && !fid && m === "POST") {
      const b = await readBody(req);
      if (safetyIssues(b.text).length) return fail(res, 400, `That touches ${safetyIssues(b.text).join(", ")}, which Studio does not make videos about.`, { code: "unsafe_topic" });
      return json(res, 200, boards.addFragment(id, b));
    }
    if (sub === "fragments" && fid && m === "DELETE") return json(res, 200, boards.removeFragment(id, fid));
    if (sub === "fragments" && fid && (m === "PATCH" || m === "POST")) return json(res, 200, boards.setPin(id, fid, (await readBody(req)).pin));
    if (sub === "weave" && m === "POST") {
      const b = await readBody(req);
      const remix = b.remix === true;
      const cur = board();
      const angle = remix ? pickWeaveAngle(cur.lastAngle) : undefined;
      const story = await weave(cur.fragments, { mode: MODE, angle, previous: remix ? cur.story?.logline : undefined });
      return json(res, 200, boards.setStory(id, story));
    }
    if (sub === "project" && m === "POST") {
      const b = await readBody(req);
      const story = board().story;
      if (!story) return fail(res, 409, "Weave the board into a story first.");
      if (current()) return fail(res, 409, "Studio is busy with another step. Wait for it or stop it first.");
      const topic = `${story.title}: ${story.logline}`.slice(0, 300);
      const seed = `${topic}\n${story.beats.map((x, i) => `${i + 1}. ${x.part}: ${x.text}`).join("\n")}`;
      const s = store.createProject({ topic, format: b.format, length: b.length, style: b.style, output: b.output, seed, mode: MODE });
      bus.send("project", { slug: s.slug });
      startStage(s.slug, "ideas", {});
      return json(res, 201, projectDetail(s.slug));
    }
  }

  if (p === "/api/projects" && m === "GET") return json(res, 200, { projects: store.list() });
  if (p === "/api/projects" && m === "POST") {
    const b = await readBody(req);
    const topic = String(b.topic ?? "").trim();
    if (!b.surprise && !topic) return fail(res, 400, "Type a topic or press Surprise me.");
    if (current()) return fail(res, 409, "Studio is busy with another step. Wait for it or stop it first.");
    if (b.entry === "own") {
      if (!topic) return fail(res, 400, "Write what your video is about first.");
      const bad = safetyIssues(topic);
      if (bad.length) return fail(res, 400, `That touches ${bad.join(", ")}, which Studio does not make videos about.`, { code: "unsafe_topic" });
    }
    const s = store.createProject({ topic, surprise: b.entry === "own" ? false : !!b.surprise, format: b.format, length: b.length, style: b.style, output: b.output, mode: MODE, entry: b.entry });
    bus.send("project", { slug: s.slug });
    if (s.entry === "own") {
      script.seedOwnProject(s.slug, topic);
      bus.send("stage", { slug: s.slug, stage: "script", status: "review" });
    } else startStage(s.slug, "ideas", {});
    return json(res, 201, projectDetail(s.slug));
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)$/.exec(p)) && m === "GET") {
    if (mm[1] !== EXAMPLE_SLUG) await ensureRawShots(mm[1]);
    const d = projectDetail(mm[1]);
    return d ? json(res, 200, d) : fail(res, 404, "No such project");
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)\/hooks$/.exec(p)) && m === "POST") {
    const slug = mm[1];
    const s = store.load(slug);
    if (!s) return fail(res, 404, "No such project");
    if (current()) return fail(res, 409, "Studio is busy with another step. Wait for it or stop it first.");
    const b = await readBody(req);
    if (b.source !== "idea" && b.source !== "line") return fail(res, 400, 'source must be "idea" or "line".');
    let input;
    if (b.source === "idea") {
      const list = store.readJson(path.join(episodeDir(slug), "ideas.json"))?.ideas ?? [];
      const it = list[s.pick ?? 0];
      if (!it) return fail(res, 409, "Pick an idea first.");
      input = { title: it.title, premise: it.premise, hook: it.hook };
    } else {
      const ls = store.readJson(path.join(episodeDir(slug), "lines.json"));
      if (!Array.isArray(ls) || !ls[0]?.text) return fail(res, 409, "Write the script first.");
      input = { line: ls[0].text };
    }
    return json(res, 200, await hooks({ ...input, topic: s.title || s.topic }, { mode: MODE }));
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)\/lines$/.exec(p)) && m === "POST") {
    const s = store.load(mm[1]);
    if (!s) return fail(res, 404, "No such project");
    if (s.stages.script.status !== "review") return fail(res, 409, "The script can be edited while it is waiting for approval.");
    const b = await readBody(req);
    const v = script.saveLines(mm[1], b.lines, s.length);
    if (v.saved) store.update(mm[1], (x) => (x.stages.script.words = v.words));
    return json(res, v.saved ? 200 : 400, v);
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)\/shots\/edits$/.exec(p)) && m === "POST") {
    const slug = mm[1];
    const s = store.load(slug);
    if (!s) return fail(res, 404, "No such project");
    if (!["review", "approved"].includes(s.stages.shots.status)) return fail(res, 409, "The storyboard can be edited once it has been drawn.");
    if (current()) return fail(res, 409, "Studio is busy with another step. Wait for it or stop it first.");
    const b = await readBody(req);
    const lines = store.readJson(path.join(episodeDir(slug), "lines.json")) ?? [];
    let raw;
    try { raw = (await loadShots(path.join(episodeDir(slug), "build", "shots.ts"))).SHOTS; } catch { return fail(res, 409, "This project has no saved shots yet."); }
    const v = await validateEdits(b.edits ?? null, { raw, lines });
    if (v.errors.length) return fail(res, 400, `Fix the edits first: ${v.errors[0]}`, { errors: v.errors });
    store.writeJson(editsFile(slug), v.edits);
    store.writeJson(rawFile(slug), summarizeRaw(raw));
    store.update(slug, (x) => {
      if (x.stages.shots.status === "approved") store.resetFrom(x, "voice");
      x.stages.shots.status = "review";
    });
    bus.send("stage", { slug, stage: "shots", status: "review" });
    startTask(slug, "edits", "shots", async (ctx) => {
      checkout(slug);
      writeFileSync(EDITS_JSON, JSON.stringify(v.edits) + "\n");
      const applied = v.applied;
      ctx.activity(`Rendering ${applied.length} stills with your edits`, { tool: "server" });
      const sb = await storyboard(applied.length, { onProgress: (f, l) => ctx.progress(f, l), onCancel: ctx.onCancel });
      ctx.checkAborted();
      if (!sb.ok) throw Object.assign(new Error("The storyboard render failed."), { code: "storyboard", tail: sb.tail });
      const ep = episodeDir(slug);
      copyStoryboard(slug, sb.stills);
      copyFileSync(path.join(OUT, "storyboard.png"), path.join(ep, "storyboard.png"));
      store.writeJson(path.join(ep, "shots.json"), applied.map((x) => ({ id: x.id, line: x.line, scene: x.scene, weight: x.weight })));
      store.update(slug, (x) => (x.stages.shots.shots = applied.length));
      ctx.artifact("storyboard", rel(path.join(ep, "storyboard.png")), { stills: sb.tiles });
    });
    return json(res, 202, { started: true, edits: v.edits, timing: timingFor(slug) });
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)\/stages\/(ideas|script|shots|voice|render)\/(run|approve|cancel)$/.exec(p)) && m === "POST") {
    const [, slug, stage, action] = mm;
    const b = await readBody(req);
    if (action === "run") return json(res, 202, startStage(slug, stage, { resume: !!b.resume, voiceId: b.voiceId, provider: b.provider }));
    if (action === "approve") return json(res, 200, await approve(slug, stage, b));
    if (action === "cancel") return json(res, 200, { cancelled: cancel(slug) });
  }
  if ((mm = /^\/api\/projects\/([a-z0-9-]+)\/verify$/.exec(p)) && m === "POST") {
    const s = store.load(mm[1]);
    if (!s) return fail(res, 404, "No such project");
    if (!["review", "approved"].includes(s.stages.script.status)) return fail(res, 409, "Write the script first.");
    startTask(mm[1], "verify", "script", (ctx) => verifyFacts(ctx));
    return json(res, 202, { started: true });
  }
  if (p === "/api/cancel" && m === "POST") return json(res, 200, { cancelled: cancel() });

  if (p === "/api/elevenlabs/key" && m === "POST") {
    const b = await readBody(req);
    setElevenKey(b.key);
    return json(res, 200, { keySource: elevenKeySource() });
  }
  if (p === "/api/voices" && m === "GET") return json(res, 200, { voices: voice.VOICES, model: voice.MODEL, fallback: voice.FALLBACK_MODEL, keySource: elevenKeySource(), placeholder: voice.placeholderEngine() });

  if (p === "/api/skills" && m === "GET") return json(res, 200, { skills: skillList() });
  if ((mm = /^\/api\/skills\/([a-z0-9-]+)$/.exec(p)) && m === "GET") {
    const f = path.join(SKILLS, mm[1], "SKILL.md");
    return existsSync(f) ? json(res, 200, { id: mm[1], markdown: readFileSync(f, "utf8") }) : fail(res, 404, "No such skill");
  }
  if (p === "/api/assets" && m === "GET") return json(res, 200, assets());
  if (p === "/api/activity" && m === "GET") return json(res, 200, { events: bus.recent() });

  if (p.startsWith("/files/") && (m === "GET" || m === "HEAD")) {
    const abs = resolveServed(p.slice("/files/".length));
    if (!abs) return fail(res, 403, "Not allowed");
    return sendFile(req, res, abs);
  }
  return fail(res, 404, "Not found");
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  if (process.env.STUDIO_DEBUG_HTTP) {
    const t0 = Date.now();
    console.log(`→ ${req.method} ${url.pathname}`);
    res.on("finish", () => console.log(`← ${res.statusCode} ${req.method} ${url.pathname} ${Date.now() - t0} ms`));
  }
  try {
    if (!hostOk(req)) return fail(res, 421, "Wrong host");
    // The UI shell itself holds no data; everything behind it needs the token.
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) return sendFile(req, res, path.join(UI, "index.html"));
    if (req.method === "GET" && url.pathname.startsWith("/ui/")) {
      const f = path.resolve(UI, "." + url.pathname.slice(3));
      if (!f.startsWith(UI + path.sep)) return fail(res, 403, "Not allowed");
      return sendFile(req, res, f);
    }
    if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
    if (!tokenOk(req, url)) return fail(res, 401, "Missing or wrong token. Open the link printed in the terminal.");
    if (req.method !== "GET" && req.method !== "HEAD" && !originOk(req)) return fail(res, 403, "Cross-origin request refused");
    await routes(req, res, url);
  } catch (e) {
    const status = e.status ?? 500;
    if (status >= 500) console.error(e);
    if (!res.headersSent) fail(res, status, redact(e.message), e.errors ? { errors: e.errors } : {});
  }
});

// A stage that was running when Studio stopped is shown as paused (resumable), never as running.
// Only this server's mode, and only when no other Studio server of the same mode is alive
// (app/.runtime/server-<mode>.json holds its pid), so a second server never "recovers" a live job.
const LOCK = path.join(RUNTIME, `server-${MODE}.json`);
const otherServerAlive = () => {
  const l = store.readJson(LOCK);
  if (!l?.pid || l.pid === process.pid) return false;
  try { process.kill(l.pid, 0); return true; } catch { return false; }
};
const recoverInterrupted = () => {
  if (otherServerAlive()) { console.log(`  Note: another Studio server (${MODE}) is already running; leaving its jobs alone.`); return; }
  store.writeJson(LOCK, { pid: process.pid, startedAt: new Date().toISOString() });
  for (const p of store.list()) {
    if (p.example || (p.mode ?? "live") !== MODE) continue;
    const s = store.load(p.slug);
    let changed = false;
    for (const k of store.STAGES) if (s.stages[k].status === "running") { s.stages[k].status = "paused"; s.stages[k].error = { code: "interrupted", message: "Studio was closed during this step. Press Resume." }; changed = true; }
    if (changed) store.save(s);
  }
};

const openBrowser = (u) => {
  if (process.env.STUDIO_NO_OPEN || process.argv.includes("--no-open")) return;
  const [cmd, args] = process.platform === "win32" ? ["cmd.exe", ["/c", "start", '""', `"${u}"`]] : process.platform === "darwin" ? ["open", [u]] : ["xdg-open", [u]];
  execFile(cmd, args, { windowsVerbatimArguments: true }, () => {});
};

// Ctrl+C / kill: stop the running Claude job (children run in their own process group, so they would
// not see the terminal's Ctrl+C), drop the lock, then exit.
let stopping = false;
const shutdown = (sig) => {
  if (stopping) return process.exit(1);
  stopping = true;
  const busy = cancel();
  if (busy) console.log(`\n  ${sig}: stopping the running step (its state is kept; Resume it next time)…`);
  try { if (store.readJson(LOCK)?.pid === process.pid) rmSync(LOCK, { force: true }); } catch { /* ignore */ }
  setTimeout(() => process.exit(0), busy ? 1500 : 0);
};
// Last resort: an unexpected async error is logged, never fatal for the whole studio.
process.on("unhandledRejection", (e) => console.error("Unexpected error:", e));

export const start = () =>
  new Promise((resolve) => {
    if (!process.env.NODE_TEST_CONTEXT) for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => shutdown(sig));
    ensureExampleSnapshot();
    recoverInterrupted();
    checkNow(true).catch(() => {}); // locate claude once and warm the pill before the browser asks
    const tryListen = (attempt) => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && attempt < 10) { PORT += 1; tryListen(attempt + 1); }
        else { console.error(e.message); process.exit(1); }
      });
      server.listen(PORT, HOST, () => {
        const link = `http://${HOST}:${PORT}/?t=${TOKEN}`;
        console.log(`\n  Studio is running (${MODE === "replay" ? "REPLAY mode: recorded runs, no Claude calls" : "live mode"})`);
        console.log(`  Open: ${link}\n  Local only (127.0.0.1). Keep this link private. Ctrl+C to stop.\n`);
        openBrowser(link);
        resolve({ server, port: PORT, token: TOKEN, link });
      });
    };
    tryListen(0);
  });

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) start();
export { server };
