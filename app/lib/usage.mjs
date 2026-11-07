// Daily usage meter: sums the cost Claude reports per run (API-equivalent dollars; on a subscription
// this is plan usage, not a bill) and keeps the latest rate-limit window utilisation.
import path from "node:path";
import { RUNTIME } from "./paths.mjs";
import { readJson, writeJson } from "./store.mjs";

const FILE = path.join(RUNTIME, "usage.json");
// local calendar day (not UTC), so "today" resets at the user's midnight
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export const get = () => {
  const u = readJson(FILE, { days: {}, rate: null });
  const d = u.days[today()] ?? { cost: 0, runs: 0 };
  return { today: d.cost, runs: d.runs, rate: u.rate };
};

export const addRun = (cost) => {
  const u = readJson(FILE, { days: {}, rate: null });
  const d = (u.days[today()] ??= { cost: 0, runs: 0 });
  d.cost = Math.round((d.cost + (Number(cost) || 0)) * 10000) / 10000;
  d.runs += 1;
  writeJson(FILE, u);
  return get();
};

export const setRate = (r) => {
  const u = readJson(FILE, { days: {}, rate: null });
  const w = r.windows ?? {};
  u.rate = {
    status: r.status,
    resetsAt: r.resetsAt ?? null,
    fiveHour: w.five_hour?.utilization ?? null,
    sevenDay: w.seven_day?.utilization ?? null,
    at: Date.now(),
  };
  writeJson(FILE, u);
  return u.rate;
};
