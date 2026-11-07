// Server-Sent Events bus: stage, activity, log, cost, artifact, progress, gate, error, status.
const clients = new Set();
const history = []; // last events, replayed to a reconnecting page so a reload restores the feed
let seq = 0;

export const send = (type, data = {}) => {
  const ev = { id: ++seq, type, at: Date.now(), ...data };
  if (type !== "progress" && type !== "partial" && type !== "now") {
    history.push(ev);
    if (history.length > 300) history.shift();
  }
  const frame = `id: ${ev.id}\nevent: ${type}\ndata: ${JSON.stringify(ev)}\n\n`;
  for (const res of clients) {
    try { res.write(frame); } catch { clients.delete(res); }
  }
  return ev;
};

export const subscribe = (req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
  res.write(`retry: 2000\n\n`);
  const last = Number(req.headers["last-event-id"] ?? 0);
  for (const ev of history) if (ev.id > last) res.write(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
  clients.add(res);
  const ping = setInterval(() => { try { res.write(`: ping\n\n`); } catch { /* closed */ } }, 20000);
  req.on("close", () => { clearInterval(ping); clients.delete(res); });
};

export const recent = (filter = () => true, n = 80) => history.filter(filter).slice(-n);
