import { TimesSquare } from "./TimesSquare";
import { OUT, SignText } from "./kit";

// ECU: a hand holding a phone with the emergency alert, Times Square blurred behind.
export const PhoneScene = ({ frame, ending = false }: { frame: number; ending?: boolean }) => {
  const buzz = frame % 10 < 5 ? 3 : -3;
  return (
    <g>
      <defs>
        <filter id="bgBlur"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <g filter="url(#bgBlur)" transform="translate(-540,-200) scale(1.4)">
        <TimesSquare frame={frame} alert crowd={20} />
      </g>
      <rect x={0} y={0} width={1080} height={1920} fill="#000" opacity={0.25} />
      <g transform={`translate(${540 + buzz},1080) rotate(${-6 + buzz * 0.3})`}>
        {/* hand */}
        <path d="M-250,520 C-260,300 -230,160 -170,120 L170,120 C230,160 260,300 250,520 Z" fill="#f0c39b" stroke={OUT} strokeWidth={8} />
        <path d="M-200,40 q-60,10 -50,70 q10,40 60,30 Z" fill="#f0c39b" stroke={OUT} strokeWidth={8} />
        {/* phone */}
        <rect x={-210} y={-600} width={420} height={820} rx={56} fill="#15161c" stroke={OUT} strokeWidth={10} />
        <rect x={-186} y={-570} width={372} height={760} rx={36} fill={ending ? "#203a5c" : "#1e2230"} />
        <rect x={-60} y={-560} width={120} height={26} rx={13} fill="#000" />
        <SignText x={0} y={-470} size={64} fill="#fff">12:46</SignText>
        <rect x={-170} y={-420} width={340} height={360} rx={26} fill="#f2f2f2" stroke={OUT} strokeWidth={4} />
        <circle cx={-130} cy={-380} r={22} fill="#d90429" />
        <SignText x={-130} y={-370} size={30} fill="#fff">!</SignText>
        <SignText x={-96} y={-370} size={26} fill="#333" anchor="start">EMERGENCY ALERT</SignText>
        <SignText x={-150} y={-310} size={30} fill="#111" anchor="start">BALLISTIC MISSILE</SignText>
        <SignText x={-150} y={-270} size={30} fill="#111" anchor="start">THREAT INBOUND.</SignText>
        <SignText x={-150} y={-220} size={26} fill="#333" anchor="start">SEEK IMMEDIATE</SignText>
        <SignText x={-150} y={-186} size={26} fill="#333" anchor="start">SHELTER.</SignText>
        <SignText x={-150} y={-120} size={30} fill="#d90429" anchor="start">THIS IS NOT A DRILL.</SignText>
        {/* buzz lines */}
        {frame % 10 < 5 &&
          [-1, 1].map((d) => (
            <g key={d} stroke="#fff" strokeWidth={8} strokeLinecap="round">
              <line x1={d * 250} y1={-500} x2={d * 290} y2={-540} />
              <line x1={d * 260} y1={-420} x2={d * 310} y2={-420} />
            </g>
          ))}
      </g>
    </g>
  );
};

// Insert: newspaper clipping about the 2018 Hawaii false alarm.
export const Clipping = ({ frame }: { frame: number }) => (
  <g>
    <rect x={-200} y={-200} width={1500} height={2400} fill="#5b4636" />
    {Array.from({ length: 14 }, (_, k) => (
      <rect key={k} x={-200} y={-200 + k * 170} width={1500} height={8} fill="#4a3829" />
    ))}
    <g transform={`translate(540,960) rotate(${-4 + Math.sin(frame / 20) * 0.5})`}>
      <rect x={-420} y={-560} width={840} height={1060} fill="#efe6d2" stroke={OUT} strokeWidth={6} />
      <SignText x={0} y={-470} size={58} fill="#222">THE DAILY HERALD</SignText>
      <line x1={-380} y1={-440} x2={380} y2={-440} stroke="#222" strokeWidth={4} />
      <SignText x={-380} y={-400} size={26} fill="#555" anchor="start">SUNDAY, JANUARY 14, 2018</SignText>
      <SignText x={0} y={-310} size={76} fill="#111">MISSILE ALERT</SignText>
      <SignText x={0} y={-220} size={76} fill="#c1121f">WAS A MISTAKE</SignText>
      <rect x={-380} y={-170} width={360} height={260} fill="#9fb3c8" stroke={OUT} strokeWidth={4} />
      <path d="M-380,40 L-280,-60 L-200,10 L-120,-80 L-20,40 L-20,90 L-380,90Z" fill="#4f7a5a" />
      <circle cx={-300} cy={-110} r={34} fill="#fff3b0" />
      {Array.from({ length: 9 }, (_, k) => (
        <rect key={k} x={10} y={-160 + k * 30} width={370 - (k % 3) * 40} height={12} fill="#888" />
      ))}
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} x={-380} y={140 + k * 34} width={760 - (k % 4) * 60} height={12} fill="#888" />
      ))}
      <rect x={-200} y={-590} width={140} height={60} fill="#f5e7a1" opacity={0.8} transform="rotate(-10)" />
    </g>
  </g>
);

// Math card: food vs days.
export const MathCard = ({ frame }: { frame: number }) => {
  const row = (t: number) => Math.min(1, Math.max(0, (frame - t) / 10));
  return (
    <g>
      <rect x={-200} y={-200} width={1500} height={2400} fill="#0f1720" />
      <g opacity={0.25} stroke="#2b3a4a" strokeWidth={2}>
        {Array.from({ length: 30 }, (_, k) => (
          <line key={k} x1={-200 + k * 60} y1={-200} x2={-200 + k * 60} y2={2200} />
        ))}
        {Array.from({ length: 40 }, (_, k) => (
          <line key={k} x1={-200} y1={-200 + k * 60} x2={1300} y2={-200 + k * 60} />
        ))}
      </g>
      <g opacity={row(0)}><SignText x={540} y={620} size={110} fill="#ffd23f" stroke={10}>38 CANS</SignText></g>
      <g opacity={row(12)}><SignText x={540} y={790} size={90} fill="#fff" stroke={10}>/ 6 PEOPLE</SignText></g>
      <g opacity={row(24)}><SignText x={540} y={950} size={90} fill="#fff" stroke={10}>/ 1.5 CANS A DAY</SignText></g>
      <g opacity={row(30)}><line x1={240} y1={1010} x2={840} y2={1010} stroke="#fff" strokeWidth={10} /></g>
      <g opacity={row(36)}><SignText x={540} y={1160} size={150} fill="#ff4d4d" stroke={12}>= 4 DAYS</SignText></g>
    </g>
  );
};
