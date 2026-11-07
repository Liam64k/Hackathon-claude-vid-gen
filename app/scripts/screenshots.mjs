// Screenshot every Studio screen through the Chrome DevTools Protocol, using the headless Chrome that
// Remotion already downloaded (no extra packages). Waits until the app says the screen is ready.
// Usage: node app/scripts/screenshots.mjs <outDir> <port> <token> name=#/hash[@WxH] ...
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { ROOT } from "../lib/paths.mjs";

const findChrome = () => {
  const base = path.join(ROOT, "node_modules", ".remotion", "chrome-headless-shell");
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { const r = walk(p); if (r) return r; }
      else if (/^chrome-headless-shell(\.exe)?$/.test(f.name)) return p;
    }
    return null;
  };
  return existsSync(base) ? walk(base) : null;
};

const [out, port, token, ...specs] = process.argv.slice(2);
if (!out || !port || !token) { console.error("usage: screenshots.mjs <outDir> <port> <token> name=#/hash[@WxH] ..."); process.exit(1); }
mkdirSync(out, { recursive: true });
const chrome = findChrome();
if (!chrome) { console.error("Run `npx remotion browser ensure` first."); process.exit(1); }
const dport = 9300 + Math.floor(Math.random() * 500);
const profile = path.join(os.tmpdir(), `studio-shots-${process.pid}`);
const proc = spawn(chrome, [`--remote-debugging-port=${dport}`, `--user-data-dir=${profile}`, "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${dport}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch { /* starting */ }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;

await send("Page.enable");
for (const spec of specs) {
  const [name, rest] = spec.split("=");
  const [hash, size = "1440x900"] = rest.split("@");
  const [w, h] = size.split("x").map(Number);
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send("Page.navigate", { url: `http://127.0.0.1:${port}/?t=${token}${hash}` });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) { await sleep(150); ready = (await evaluate("document.body?.dataset.ready || ''")) === hash; }
  await sleep(900); // images, fonts, entrance motion
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(out, `${name}.png`), Buffer.from(shot.result.data, "base64"));
  console.log(name, ready ? "ok" : "ok (not ready)", process.env.SHOT_DEBUG ? await evaluate(process.env.SHOT_DEBUG) : "");
}
ws.close();
proc.kill();
