// Usage: the daily API-equivalent cost meter, and the PLAN GUARD that keeps Studio under the user's
// Claude plan limits.
//
// Claude Code reports plan usage while it runs (stream-json rate_limit_event): the share used of the
// 5-hour and 7-day windows, when each resets, and whether paid extra usage ("overage") is in use.
// Studio never asks for more than the plan allows:
// - before a run: refuse when used + what this kind of run usually takes would pass the cap
//   (default 90 %, STUDIO_PLAN_CAP), with the reset time;
// - during a run: stop when a window passes the cap, the limit is hit, or overage starts;
// - after a run: learn how much of each window that kind of run took (keeps the larger of the default
//   and the last few runs, so estimates only err on the safe side).
// Usage is only known once Claude has reported it; the first run after a reset is checked against the
// last known numbers, and a window whose reset time has passed counts as empty.
import path from "node:path";
import { RUNTIME } from "./paths.mjs";
import { readJson, writeJson } from "./store.mjs";

const FILE = process.env.STUDIO_USAGE_FILE || path.join(RUNTIME, "usage.json"); // override: tests only
const WINDOWS = { fiveHour: "five_hour", sevenDay: "seven_day" };
export const capOf = () => { const c = Number(process.env.STUDIO_PLAN_CAP); return c > 0 && c <= 1 ? c : 0.9; };

// Share of the 5-hour window one run of each kind is assumed to take until Studio has measured it.
// The weekly window moves about a fifth as fast. Deliberately on the high side.
const DEFAULT_COST = { ideas: 0.06, script: 0.1, shots: 0.12, render: 0.02, titles: 0.02, verify: 0.04, hooks: 0.02, weave: 0.02 };
const WEEK_FACTOR = 0.2;

// local calendar day (not UTC), so "today" resets at the user's midnight
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const load = () => ({ days: {}, rate: null, learned: {}, ...readJson(FILE, {}) });
const nowSec = () => Date.now() / 1000;

// A window's current state; one whose reset time has passed is empty again.
const windowNow = (w) => {
  if (!w || w.used == null) return null;
  if (w.resetsAt && w.resetsAt <= nowSec()) return { used: 0, resetsAt: null, stale: true };
  return w;
};

export const plan = () => {
  const u = load();
  const r = u.rate;
  const cap = capOf();
  // "limit reached" lasts until the 5-hour window resets
  const limited = !!r?.status && r.status !== "allowed" && !(r.fiveHour?.resetsAt && r.fiveHour.resetsAt <= nowSec());
  const out = { cap, known: false, at: r?.at ?? null, overage: !!r?.overage, limited };
  for (const k of Object.keys(WINDOWS)) {
    const w = windowNow(r?.[k]);
    out[k] = w ? { used: w.used, left: Math.max(0, 1 - w.used), resetsAt: w.resetsAt ?? null } : null;
    if (w) out.known = true;
  }
  return out;
};

export const get = () => {
  const u = load();
  const d = u.days[today()] ?? { cost: 0, runs: 0 };
  return { today: d.cost, runs: d.runs, plan: plan() };
};

export const addRun = (cost) => {
  const u = load();
  const d = (u.days[today()] ??= { cost: 0, runs: 0 });
  d.cost = Math.round((d.cost + (Number(cost) || 0)) * 10000) / 10000;
  d.runs += 1;
  writeJson(FILE, u);
  return get();
};

// What one run of this kind is expected to take from each window.
export const estimate = (kind) => {
  const l = load().learned[kind];
  const five = Math.max(DEFAULT_COST[kind] ?? 0.1, ...(l?.fiveHour ?? []));
  const week = Math.max((DEFAULT_COST[kind] ?? 0.1) * WEEK_FACTOR, ...(l?.sevenDay ?? []));
  return { fiveHour: five, sevenDay: week };
};

const pct = (x) => `${Math.round(x * 100)} %`;
const when = (sec) => (sec ? new Date(sec * 1000).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "the window resets");
const NAME = { fiveHour: "5-hour", sevenDay: "weekly" };

// null if a run of this kind may start; otherwise { code: "plan_limit", message, resetsAt }.
export const blockReason = (kind) => {
  const p = plan();
  if (p.limited) return { code: "plan_limit", message: "Your Claude plan's usage limit is reached. Studio will not start a run until it resets.", resetsAt: p.fiveHour?.resetsAt ?? null };
  const est = estimate(kind);
  for (const k of Object.keys(WINDOWS)) {
    const w = p[k];
    if (w && w.used + est[k] > p.cap) {
      return {
        code: "plan_limit",
        message: `This step could take your ${NAME[k]} Claude usage past Studio's ${pct(p.cap)} safety cap (used: ${pct(w.used)}, this step: about ${pct(est[k])}). It can run after ${when(w.resetsAt)}.`,
        resetsAt: w.resetsAt ?? null,
      };
    }
  }
  return null;
};

// Record a rate event from a live run. Returns a stop reason when the run must end now, else null.
export const record = (ev) => {
  const u = load();
  const w = ev.windows ?? {};
  const prev = u.rate ?? {};
  const rate = { status: ev.status ?? null, overage: !!ev.isUsingOverage, at: Date.now() };
  for (const [k, key] of Object.entries(WINDOWS)) {
    const x = w[key];
    rate[k] = x?.utilization != null ? { used: x.utilization, resetsAt: x.resetsAt ?? null } : prev[k] ?? null;
  }
  // older events name only the window that triggered them
  if (!w.five_hour && ev.kind === "five_hour" && ev.resetsAt) rate.fiveHour = { ...(rate.fiveHour ?? { used: null }), resetsAt: ev.resetsAt };
  u.rate = rate;
  writeJson(FILE, u);
  const cap = capOf();
  if (rate.overage) return { code: "plan_limit", message: "Claude started using paid extra usage. Studio stopped so it never spends past your plan." };
  if (rate.status && rate.status !== "allowed") return { code: "plan_limit", message: "Your Claude plan's usage limit was reached. The step is paused and its work kept; resume after the reset." };
  for (const k of Object.keys(WINDOWS)) {
    if (rate[k]?.used != null && rate[k].used >= cap) return { code: "plan_limit", message: `Your ${NAME[k]} Claude usage reached Studio's ${pct(cap)} safety cap, so this step was stopped and its work kept. Resume after ${when(rate[k].resetsAt)}.` };
  }
  return null;
};

// Snapshot before a run, then learn() after it: how much of each window that kind of run used.
export const snapshot = () => { const p = plan(); return { fiveHour: p.fiveHour, sevenDay: p.sevenDay }; };
export const learn = (kind, before) => {
  const after = snapshot();
  const u = load();
  const l = (u.learned[kind] ??= { fiveHour: [], sevenDay: [] });
  let changed = false;
  for (const k of Object.keys(WINDOWS)) {
    const a = before?.[k], b = after[k];
    // only when both readings are from the same window (no reset in between)
    if (!a || !b || a.resetsAt !== b.resetsAt || b.used < a.used) continue;
    l[k] = [...(l[k] ?? []), Math.round((b.used - a.used) * 1000) / 1000].slice(-5);
    changed = true;
  }
  if (changed) writeJson(FILE, u);
};
