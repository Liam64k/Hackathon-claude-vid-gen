// Minimal PNG decode/encode (8-bit RGB/RGBA/gray, non-interlaced) + contact sheet, zero dependencies.
// Replaces scripts/contact.swift (macOS only) so the storyboard works on every platform.
import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

export const decode = (buf) => {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let off = 8;
  let w, h, depth, ctype, interlace;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`unsupported PNG (depth ${depth}, interlace ${interlace})`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error(`unsupported PNG colour type ${ctype}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  // normalise to RGB
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (ch >= 3) { rgb[i * 3] = px[i * ch]; rgb[i * 3 + 1] = px[i * ch + 1]; rgb[i * 3 + 2] = px[i * ch + 2]; }
    else rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = px[i * ch];
  }
  return { width: w, height: h, rgb };
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

export const encode = ({ width, height, rgb }) => {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
};

// Lay out stills in a grid (cols wide) with a gap, dark background.
export const contactSheet = (files, outFile, cols = 6, gap = 8, bg = [11, 13, 18]) => {
  const imgs = files.map((f) => decode(readFileSync(f)));
  if (!imgs.length) throw new Error("no stills to lay out");
  const tw = imgs[0].width, th = imgs[0].height;
  const rows = Math.ceil(imgs.length / cols);
  const W = cols * tw + (cols + 1) * gap, H = rows * th + (rows + 1) * gap;
  const rgb = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { rgb[i * 3] = bg[0]; rgb[i * 3 + 1] = bg[1]; rgb[i * 3 + 2] = bg[2]; }
  imgs.forEach((im, k) => {
    const ox = gap + (k % cols) * (tw + gap), oy = gap + Math.floor(k / cols) * (th + gap);
    for (let y = 0; y < Math.min(th, im.height); y++) {
      const src = im.rgb.subarray(y * im.width * 3, y * im.width * 3 + Math.min(tw, im.width) * 3);
      src.copy(rgb, ((oy + y) * W + ox) * 3);
    }
  });
  writeFileSync(outFile, encode({ width: W, height: H, rgb }));
  return { width: W, height: H, tiles: imgs.length };
};
