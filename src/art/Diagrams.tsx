// Code-drawn explanatory cards (all text is live text, >= 34 px at 1080 wide):
//   D1 ice-thickness ladder (MN DNR table, corrected figures) · D3 1-10-1 timer bar · phone 911 insert
//   body-angle meter · title card · Part 2 end card · ice swatch chip.
import { Easing, interpolate } from "remotion";
import { MONO_FONT, UI_FONT } from "./fonts";
import { OUT } from "./kit";

const PLATE = "rgba(15,18,28,0.92)";
const RED = "#E53935";
const GOLD = "#F5C518";
const OK = "#2FD27A";
const INFO = "#4DA3FF";
const PURPLE = "#8e6bd8";
const ELI = "#F26B2A";

const box = (extra: React.CSSProperties = {}): React.CSSProperties => ({ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxSizing: "border-box", fontFamily: UI_FONT, fontWeight: 900, ...extra });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Staggered pop-in: returns 0..1 for an element that appears at frame `at`.
const pop = (f: number, at: number, dur = 9) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
const rise = (p: number) => ({ opacity: p, transform: `translateY(${Math.round((1 - p) * 16)}px)` });

// -------------------------------------------------------------------------------------------------
// Title card (hook): 10 MINUTES / NOT SECONDS
// -------------------------------------------------------------------------------------------------
export const TitleCard = ({ f, len, cont }: { f: number; len: number; cont?: boolean }) => {
  const a = cont ? 1 : pop(f, 0, 8);
  const b = cont ? 1 : pop(f, 12, 8);
  const out = interpolate(f, [len - 12, len], [1, 0], clamp);
  const stroke: React.CSSProperties = { WebkitTextStroke: "10px #12101a", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.4)" };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 292, opacity: out, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: UI_FONT, fontWeight: 900 }}>
      <div style={{ ...stroke, fontSize: 146, color: "#fff", lineHeight: 1, ...rise(a) }}>10 MINUTES</div>
      <div style={{ ...stroke, fontSize: 116, color: "#ff5a52", lineHeight: 1, filter: `drop-shadow(0 0 ${14 + 10 * Math.sin(f / 5)}px rgba(229,57,53,0.85))`, ...rise(b) }}>NOT SECONDS</div>
    </div>
  );
};

// -------------------------------------------------------------------------------------------------
// D1 ice-thickness ladder. Figures = Minnesota DNR table for NEW CLEAR ICE (cm; inches in the 10 cm rung).
// Vehicle rungs stay small and grey: only the red band and the 10 cm rung are bright.
// -------------------------------------------------------------------------------------------------
const VEHICLES: { cm: string; label: string; w: number }[] = [
  { cm: "40-43 CM", label: "HEAVY-DUTY TRUCK", w: 62 },
  { cm: "33 CM", label: "MEDIUM TRUCK", w: 54 },
  { cm: "28-30 CM", label: "MEDIUM SUV / SMALL TRUCK", w: 48 },
  { cm: "23-25 CM", label: "SMALL CAR / SUV", w: 42 },
  { cm: "18-20 CM", label: "SIDE-BY-SIDE", w: 34 },
  { cm: "13-18 CM", label: "SNOWMOBILE / SMALL ATV", w: 30 },
];

const Glyph = ({ w }: { w: number }) => (
  <svg width={70} height={32} viewBox="0 0 70 32">
    <rect x={35 - w / 2} y={8} width={w} height={14} rx={4} fill="#6b7384" />
    <rect x={35 - w / 4} y={2} width={w / 2} height={9} rx={3} fill="#6b7384" />
    <circle cx={35 - w / 2 + 8} cy={24} r={5} fill="#3a404d" />
    <circle cx={35 + w / 2 - 8} cy={24} r={5} fill="#3a404d" />
  </svg>
);

export const LadderCard = ({ f, len }: { f: number; len: number }) => {
  const slide = pop(f, 0, 12);
  const out = interpolate(f, [len - 8, len], [1, 0], clamp);
  const hdr = pop(f, 2);
  const band = pop(f, 16, 10);
  const ten = pop(f, 26, 10);
  const foot = pop(f, 56, 10);
  const blink = 0.6 + 0.4 * Math.sin(f / 3.2);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 286, opacity: out * slide, transform: `translateY(${Math.round((1 - slide) * 40)}px)`, background: PLATE, border: `5px solid ${INFO}`, borderRadius: 26, padding: "18px 24px 20px", boxShadow: "0 12px 0 rgba(0,0,0,0.35)", fontFamily: UI_FONT, fontWeight: 900, color: "#fff" }}>
      <div style={{ ...box({ justifyContent: "flex-start", fontSize: 38, letterSpacing: 0.5, height: 54, color: "#fff" }), ...rise(hdr) }}>NEW CLEAR ICE · MINNESOTA DNR</div>
      <div style={{ height: 8 }} />
      {VEHICLES.map((v, i) => {
        const p = pop(f, 34 + (5 - i) * 3.5, 9);
        return (
          <div key={v.cm} style={{ ...box({ justifyContent: "flex-start", height: 54, gap: 14, fontSize: 34, fontWeight: 800, color: "#8a93a3" }), ...rise(p) }}>
            <div style={{ width: 210, textAlign: "left" }}>{v.cm}</div>
            <Glyph w={v.w} />
            <div style={{ whiteSpace: "nowrap" }}>{v.label}</div>
          </div>
        );
      })}
      <div style={{ ...box({ justifyContent: "flex-start", height: 74, gap: 16, fontSize: 46, color: "#fff", borderTop: "3px solid #3b4252", marginTop: 6 }), ...rise(ten) }}>
        <div style={{ width: 232, textAlign: "left", color: GOLD }}>10 CM</div>
        <svg width={60} height={50} viewBox="0 0 60 50">
          <path d="M6,8 L22,8 L22,26 L52,32 Q58,34 56,42 L6,42 Z" fill="#cfd6e4" stroke="#12101a" strokeWidth={3} strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 36, color: "#cfd6e4", fontWeight: 800 }}>4 IN · ON FOOT</div>
      </div>
      <div style={{ ...box({ height: 112, background: RED, borderRadius: 16, marginTop: 8, position: "relative", flexDirection: "column", gap: 10, border: "4px solid #ffb3ae" }), ...rise(band) }}>
        <div style={{ fontSize: 46, color: "#fff", letterSpacing: 0.5 }}>UNDER 10 CM · STAY OFF</div>
        <div style={{ ...box({ height: 46, padding: "0 20px", background: ELI, border: `3px solid ${OUT}`, borderRadius: 14, fontSize: 34, color: "#fff", opacity: pop(f, 30, 6) * blink }) }}>6 CM · ELI</div>
      </div>
      <div style={{ ...box({ marginTop: 10, height: 92, flexDirection: "column", gap: 6, fontSize: 34, color: "#ffd9a0", fontWeight: 800, textAlign: "center" }), ...rise(foot) }}>
        <div>NO ICE IS 100% SAFE ·</div>
        <div>THICKNESS VARIES ACROSS A LAKE</div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------------------
// D3 1-10-1 timer bar (card version). opts: s1 (segment 1 lit), f2a/f2b (segment 2 fill from -> to), meter, chip, s3
// -------------------------------------------------------------------------------------------------
export const OneTenOneCard = ({ f, len, opts }: { f: number; len: number; opts: Record<string, number | string | boolean> }) => {
  const slide = pop(f, 0, 12);
  const out = interpolate(f, [len - 8, len], [1, 0], clamp);
  const lit1 = Boolean(opts.s1);
  const fa = Number(opts.f2a ?? 0);
  const fb = Number(opts.f2b ?? fa);
  const fill2 = interpolate(f, [4, len - 6], [fa, fb], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const meter = Boolean(opts.meter);
  const chip = opts.chip !== false;
  const s3 = Boolean(opts.s3);
  const push = Number(opts.push ?? 0);
  const pan = Number(opts.pan ?? 0);
  const k = interpolate(f, [0, len], [1, 1 + push], clamp);
  const px = Math.round(interpolate(f, [0, len], [0, -pan], clamp));
  const digits = pop(f, 3, 10);
  const bar = pop(f, 12, 10);
  const chipP = pop(f, 22, 10);
  const mval = interpolate(f, [4, len - 6], [100, 6], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const seg = (w: string, bg: string, border: string, children: React.ReactNode, sub: string, subColor: string) => (
    <div style={{ width: w, display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
      <div style={{ ...box({ height: 110, borderRadius: 18, border: `5px solid ${border}`, background: bg, position: "relative", overflow: "hidden", fontSize: 56, color: "#fff" }) }}>{children}</div>
      <div style={{ ...box({ fontSize: 36, color: subColor, fontWeight: 900 }) }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 290, opacity: out * slide, transform: `translate(${px}px,${Math.round((1 - slide) * 40)}px) scale(${k})`, transformOrigin: "50% 0%", background: PLATE, border: `5px solid ${INFO}`, borderRadius: 26, padding: "26px 22px 24px", boxShadow: "0 12px 0 rgba(0,0,0,0.35)", fontFamily: UI_FONT, fontWeight: 900, color: "#fff", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ ...box({ fontSize: 190, height: 190, color: "#fff", letterSpacing: 2 }), ...rise(digits) }}>
        <span>1</span>
        <span style={{ color: "#6b7384", margin: "0 22px" }}>·</span>
        <span style={{ color: GOLD }}>10</span>
        <span style={{ color: "#6b7384", margin: "0 22px" }}>·</span>
        <span>1</span>
      </div>
      <div style={{ display: "flex", gap: 10, ...rise(bar) }}>
        {seg("22%", lit1 ? OK : "#1f3a2c", lit1 ? "#b8f5d2" : "#2c5a43", "1 MIN", "BREATHE", lit1 ? OK : "#7fa592")}
        {seg(
          "44%",
          "#3a2d12",
          "#f0b13a",
          <>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(fill2 * 100)}%`, background: "#F59E0B" }} />
            <div style={{ position: "relative", fontSize: 56 }}>≈10 MIN</div>
          </>,
          "GET OUT",
          "#f0b13a",
        )}
        {seg("34%", "#2a2148", PURPLE, <div style={{ opacity: s3 ? 1 : 0.8, color: "#d9c9ff" }}>≈1 HR</div>, "PASS OUT", "#b9a2f0")}
      </div>
      {meter && (
        <div style={{ ...box({ flexDirection: "column", gap: 10, alignItems: "stretch" }), ...rise(pop(f, 14, 10)) }}>
          <div style={{ ...box({ justifyContent: "space-between", fontSize: 36, color: "#f0b13a" }) }}>
            <span>ARM STRENGTH</span>
            <span style={{ fontFamily: MONO_FONT }}>{Math.round(mval)}%</span>
          </div>
          <div style={{ height: 34, borderRadius: 17, background: "#2b3140", border: "3px solid #4a5266", overflow: "hidden" }}>
            <div style={{ width: `${mval}%`, height: "100%", background: mval > 40 ? "#F59E0B" : RED }} />
          </div>
        </div>
      )}
      {chip && (
        <div style={{ ...box({ alignSelf: "center", padding: "12px 22px", borderRadius: 16, border: `3px solid ${INFO}`, background: "rgba(77,163,255,0.12)", fontSize: 34, color: "#cfe6ff", fontWeight: 800 }), ...rise(chipP) }}>1-10-1 PRINCIPLE · CITED BY MN DNR</div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------------------------------------
// Phone in a zip bag (911) + the lit shack window (get warm)
// -------------------------------------------------------------------------------------------------
export const Phone911Card = ({ f, len }: { f: number; len: number }) => {
  const p = pop(f, 0, 12);
  const out = interpolate(f, [len - 8, len], [1, 0], clamp);
  const s = 0.9 + 0.1 * p;
  const ring = 0.5 + 0.5 * Math.sin(f / 4);
  const lab = pop(f, 14, 10);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 300, height: 760, opacity: out * p, transform: `scale(${s})`, background: PLATE, border: `5px solid ${OK}`, borderRadius: 30, boxShadow: "0 12px 0 rgba(0,0,0,0.35)", fontFamily: UI_FONT, fontWeight: 900, color: "#fff" }}>
      {/* phone in zip bag */}
      <svg width={1000} height={760} viewBox="0 0 1000 760" style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(70,70) rotate(-4,200,300)">
          <rect x={30} y={30} width={380} height={600} rx={46} fill="#1b2030" stroke={OUT} strokeWidth={6} />
          <rect x={52} y={64} width={336} height={530} rx={26} fill="#0f1420" />
          <rect x={150} y={42} width={140} height={12} rx={6} fill="#3a4152" />
          <text x={220} y={290} fontSize={150} fontFamily={UI_FONT} fontWeight={900} textAnchor="middle" fill="#fff">911</text>
          <text x={220} y={360} fontSize={36} fontFamily={UI_FONT} fontWeight={800} textAnchor="middle" fill="#8fe0b3">CALLING…</text>
          <circle cx={220} cy={470} r={54 + ring * 6} fill={OK} opacity={0.25} />
          <circle cx={220} cy={470} r={46} fill={OK} stroke={OUT} strokeWidth={5} />
          <path d="M200,486 q-6,-30 4,-42 l14,10 l-6,12 q8,14 18,18 l12,-6 l10,14 q-22,12 -52,-6 Z" fill="#fff" />
          {/* zip bag over the phone */}
          <rect x={0} y={0} width={440} height={660} rx={28} fill="#bfe8ff" opacity={0.16} stroke="#e8f6ff" strokeWidth={5} />
          <rect x={0} y={0} width={440} height={50} rx={26} fill="#e8f6ff" opacity={0.35} />
          <path d="M20,26 H420" stroke="#fff" strokeWidth={5} strokeDasharray="4 6" opacity={0.8} />
          <rect x={196} y={-6} width={48} height={28} rx={9} fill="#e8f6ff" opacity={0.95} stroke={OUT} strokeWidth={3} />
          <path d="M60,120 L130,60" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.35} />
        </g>
        {/* lit shack window icon */}
        <g transform="translate(590,150)">
          <circle cx={150} cy={170} r={190} fill="#ffc56b" opacity={0.22} />
          <rect x={20} y={70} width={260} height={220} fill="#b8322a" stroke={OUT} strokeWidth={6} />
          <path d="M0,76 L150,30 L300,76 Z" fill="#6e1c1a" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
          <rect x={60} y={120} width={110} height={90} fill="#ffc56b" stroke={OUT} strokeWidth={6} />
          <path d="M115,120 V210 M60,165 H170" stroke={OUT} strokeWidth={5} />
          <rect x={196} y={150} width={62} height={140} fill="#7a211c" stroke={OUT} strokeWidth={5} />
        </g>
      </svg>
      <div style={{ ...box({ position: "absolute", right: 60, bottom: 64, width: 380, fontSize: 56, color: "#ffd98a", flexDirection: "column", gap: 10 }), ...rise(lab) }}>GET WARM</div>
    </div>
  );
};

// -------------------------------------------------------------------------------------------------
// Body angle meter (step 3): `a0` -> `a1` degrees over the card
// -------------------------------------------------------------------------------------------------
export const AngleCard = ({ f, len, opts }: { f: number; len: number; opts: Record<string, number | string | boolean> }) => {
  const p = pop(f, 0, 10);
  const out = interpolate(f, [len - 6, len], [1, 0], clamp);
  const a = interpolate(f, [4, len - 10], [Number(opts.a0 ?? 70), Number(opts.a1 ?? 0)], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const flat = a < 8;
  const col = flat ? OK : "#f0b13a";
  // gauge: ice line + body line rotating about the hip
  return (
    <div style={{ position: "absolute", left: 40, top: 296, width: 520, height: 190, opacity: out * p, transform: `translateY(${Math.round((1 - p) * 20)}px)`, background: PLATE, border: `5px solid ${col}`, borderRadius: 24, boxShadow: "0 10px 0 rgba(0,0,0,0.35)", fontFamily: UI_FONT, fontWeight: 900, color: "#fff" }}>
      <div style={{ position: "absolute", left: 22, top: 18, fontSize: 34, color: "#cfd6e4" }}>BODY ANGLE</div>
      <div style={{ position: "absolute", left: 22, bottom: 14, fontSize: 82, fontFamily: MONO_FONT, color: col, lineHeight: 1 }}>{Math.round(a)}°</div>
      <svg width={520} height={190} viewBox="0 0 520 190" style={{ position: "absolute", inset: 0 }}>
        <path d="M290,150 H490" stroke="#9fc0dc" strokeWidth={8} strokeLinecap="round" />
        <path d={`M290,150 L${290 + 180 * Math.cos((a * Math.PI) / 180)},${150 - 180 * Math.sin((a * Math.PI) / 180)}`} stroke={col} strokeWidth={12} strokeLinecap="round" />
        <path d={`M350,150 A60,60 0 0 0 ${290 + 60 * Math.cos((a * Math.PI) / 180)},${150 - 60 * Math.sin((a * Math.PI) / 180)}`} stroke={col} strokeWidth={5} fill="none" />
        <circle cx={290} cy={150} r={10} fill="#fff" />
      </svg>
    </div>
  );
};

// -------------------------------------------------------------------------------------------------
export const Part2Card = ({ f }: { f: number; len: number }) => {
  const a = pop(f, 0, 12);
  const pulse = 0.5 + 0.5 * Math.sin(f / 7);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", ...rise(a) }}>
      <div style={{ ...box({ padding: "34px 70px", borderRadius: 36, border: "10px solid #fff", background: "rgba(15,18,28,0.9)", fontSize: 168, color: GOLD, letterSpacing: 3, boxShadow: `0 0 ${30 + 30 * pulse}px rgba(245,197,24,0.5), 0 14px 0 rgba(0,0,0,0.4)`, WebkitTextStroke: "0px" }) }}>PART 2</div>
    </div>
  );
};

// Small chip with two ice swatches: clear (blue-black) vs white (milky)
export const SwatchChip = ({ f, len, opts }: { f: number; len: number; opts: Record<string, number | string | boolean> }) => {
  const p = pop(f, 0, 10);
  const out = interpolate(f, [len - 6, len], [1, 0], clamp);
  const x = Number(opts.x ?? 540);
  const y = Number(opts.y ?? 520);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.9 + 0.1 * p})`, opacity: p * out, ...box({ gap: 16, padding: "14px 22px", background: PLATE, border: `5px solid ${GOLD}`, borderRadius: 22, fontSize: 40, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }) }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#2b3a52", border: "3px solid #dfeaf6" }} />
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f4f6fa", border: "3px solid #fff" }} />
      <div>{String(opts.text ?? "WHITE ICE ≈ ½ AS STRONG")}</div>
    </div>
  );
};
