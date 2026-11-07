// Tiny helpers: DOM builder, API client (token), file URLs, markdown, formatting.

// ---- token: from ?t= once, then sessionStorage (the address bar is cleaned) ----
const params = new URLSearchParams(location.search);
if (params.get("t")) {
  try { sessionStorage.setItem("studio-token", params.get("t")); } catch { /* private mode */ }
  history.replaceState(null, "", "/" + location.hash);
}
let TOKEN = params.get("t") || (() => { try { return sessionStorage.getItem("studio-token"); } catch { return null; } })() || "";
export const token = () => TOKEN;

export const fileUrl = (p) => (p ? `/files/${p.split("/").map(encodeURIComponent).join("/")}?t=${encodeURIComponent(TOKEN)}` : "");
export const eventsUrl = () => `/api/events?t=${encodeURIComponent(TOKEN)}`;

export class ApiError extends Error {}
export const api = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(path, {
    method,
    headers: { "x-studio-token": TOKEN, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const e = new ApiError(data?.error ?? `Request failed (${res.status})`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
};

// ---- DOM ----
export const h = (tag, attrs = {}, ...kids) => {
  const [main, id] = tag.split("#");
  const [name, ...cls] = main.split(".");
  const el = document.createElement(name || "div");
  if (cls.length) el.className = cls.join(" ");
  if (id) el.id = id;
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className += (el.className ? " " : "") + v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v; // only used with md() output, which escapes everything
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
};
export const mount = (el, ...kids) => { el.replaceChildren(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false)); return el; };

// ---- markdown (escape first, then a safe subset) ----
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
export const md = (text) => {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(buf.join("\n"))}</pre>`);
      continue;
    }
    if (/^---+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    const hm = /^(#{1,4})\s+(.*)$/.exec(l);
    if (hm) { out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim());
      const body = rows.filter((r) => !/^\|[\s:|-]+\|?\s*$/.test(r));
      out.push(`<table><thead><tr>${cells(body[0]).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const items = [];
      const ordered = /^\s*\d+\./.test(l);
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||```|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
};

// ---- formatting ----
export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
export const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
};
export const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const words = (t) => String(t ?? "").trim().split(/\s+/).filter(Boolean).length;

// Caption preview: colour the highlighted words like the video does.
export const captionPreview = (text, highlight = []) => {
  const map = new Map(highlight.map((x) => { const [w, c] = String(x).split(":"); return [w.toLowerCase(), c || "gold"]; }));
  return String(text).split(/(\s+)/).map((tok) => {
    const key = tok.toLowerCase().replace(/[^a-z0-9'’-]/g, "");
    const c = map.get(key);
    return c ? h(`span.w-${c === "gold" ? "gold" : c}`, {}, tok) : tok;
  });
};

export const toast = (msg, bad = false) => {
  document.querySelector(".toast")?.remove();
  const t = h(`div.toast${bad ? ".bad" : ""}`, { role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 5200);
};
