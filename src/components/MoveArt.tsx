/* Ilustrasi animasi gerakan: stick-figure SVG + SMIL.
   100% offline, tanpa aset/gambar luar. Sudut dunia (derajat, searah jarum jam):
   torso 0 = tegak; armU/thigh 0 = ke bawah; elbow/knee positif = tekuk ke belakang. */
import type { ReactNode } from "react";
export const MOVE_LABEL: Record<string, string> = {
  squat: "Squat",
  lunge: "Lunge",
  "pushup": "Push Up",
  "pushup-knee": "Push Up Lutut",
  incline: "Incline Push Up",
  wall: "Wall Push Up",
  crunch: "Crunch",
  situp: "Sit Up",
  twist: "Russian Twist",
  plank: "Plank",
  "side-plank": "Side Plank",
  "glute-bridge": "Glute Bridge",
  calf: "Calf Raise",
  climber: "Mountain Climber",
  jack: "Jumping Jack",
  deadbug: "Dead Bug",
  birddog: "Bird Dog",
  "chin-tuck": "Chin Tuck",
  "wall-angel": "Wall Angel",
  thoracic: "Thoracic Extension",
  "hip-stretch": "Hip Flexor Stretch",
  "chest-stretch": "Chest Stretch",
  superman: "Superman",
  walk: "Jalan Cepat",
  "leg-swing": "Leg Swing",
  "shoulder-tap": "Shoulder Tap",
};

export const MOVE_IDS = Object.keys(MOVE_LABEL);

interface MoveDef {
  dur: string;
  hip: [number, number];
  torso: [number, number];
  armU: [number, number];
  elbow: [number, number];
  thigh: [number, number];
  knee: [number, number];
  thighB?: [number, number];
  kneeB?: [number, number];
  armB?: [number, number];
  altB?: boolean;
  wall?: number;
  box?: { x: number; y: number; w: number; h: number };
  headShift?: [number, number];
}

const MOVES: Record<string, MoveDef> = {
  squat: { dur: "2s", hip: [0, 14], torso: [5, 22], armU: [-10, -65], elbow: [5, 10], thigh: [-5, -55], knee: [-8, -50] },
  lunge: { dur: "2s", hip: [8, 11], torso: [6, 9], armU: [8, 12], elbow: [10, 12], thigh: [-45, -42], knee: [-45, -42], thighB: [22, 25], kneeB: [-22, -20] },
  calf: { dur: "1.2s", hip: [0, -5], torso: [2, 2], armU: [5, 5], elbow: [5, 5], thigh: [0, 0], knee: [3, 3] },
  jack: { dur: "1s", hip: [0, 3], torso: [0, 0], armU: [15, 165], armB: [15, 165], elbow: [5, 5], thigh: [5, 28], thighB: [5, 28], altB: true, knee: [3, 3], kneeB: [3, 3] },
  walk: { dur: "1.1s", hip: [0, 4], torso: [3, 5], armU: [-25, 25], armB: [25, -25], elbow: [15, 20], thigh: [-25, 25], thighB: [25, -25], knee: [10, 15], kneeB: [15, 10] },
  "leg-swing": { dur: "1.2s", hip: [0, 0], torso: [3, 3], armU: [5, 5], elbow: [5, 5], thigh: [-30, 40], knee: [5, 8], thighB: [0, 0], kneeB: [5, 5] },
  pushup: { dur: "1.8s", hip: [28, 32], torso: [-70, -68], armU: [-10, -9], elbow: [10, 50], thigh: [-63, -61], knee: [-13, -11] },
  "pushup-knee": { dur: "1.8s", hip: [26, 30], torso: [-67, -65], armU: [-9, -8], elbow: [10, 50], thigh: [-16, -14], knee: [100, 105] },
  incline: { dur: "1.8s", hip: [8, 12], torso: [-58, -55], armU: [-42, -38], elbow: [10, 45], thigh: [-60, -58], knee: [-30, -28], box: { x: 96, y: 116, w: 28, h: 24 } },
  wall: { dur: "1.8s", hip: [26, 28], torso: [22, 25], armU: [-44, -39], elbow: [5, 30], thigh: [0, 0], knee: [3, 3], wall: 148 },
  crunch: { dur: "1.6s", hip: [50, 50], torso: [-80, -62], armU: [-105, -100], elbow: [10, 12], thigh: [-140, -138], knee: [-140, -138] },
  situp: { dur: "2s", hip: [50, 50], torso: [-80, -30], armU: [-60, -55], elbow: [100, 100], thigh: [-140, -138], knee: [-140, -138] },
  twist: { dur: "1.2s", hip: [28, 28], torso: [-12, -8], armU: [-85, -55], elbow: [5, 5], thigh: [-85, -85], knee: [-85, -85] },
  plank: { dur: "2s", hip: [22, 24], torso: [-82, -81], armU: [-14, -13], elbow: [74, 74], thigh: [-75, -74], knee: [-35, -34] },
  "side-plank": { dur: "2s", hip: [32, 34], torso: [-82, -81], armU: [170, 175], elbow: [5, 5], thigh: [-78, -76], knee: [-18, -16] },
  "glute-bridge": { dur: "2.2s", hip: [44, 32], torso: [-85, -82], armU: [-100, -98], elbow: [5, 5], thigh: [-118, -112], knee: [-90, -88] },
  climber: { dur: "0.7s", hip: [22, 24], torso: [-82, -80], armU: [-14, -13], elbow: [74, 74], thigh: [-70, -30], knee: [-20, 5], thighB: [-65, -63], kneeB: [-12, -8] },
  "shoulder-tap": { dur: "1.2s", hip: [22, 24], torso: [-82, -80], armU: [-14, 60], elbow: [74, 40], thigh: [-75, -74], knee: [-35, -34] },
  deadbug: { dur: "1.6s", hip: [50, 50], torso: [-85, -85], armU: [170, 170], armB: [170, 170], elbow: [5, 5], thigh: [-150, -95], knee: [-40, -2], thighB: [-140, -140], kneeB: [-50, -50] },
  birddog: { dur: "2s", hip: [30, 32], torso: [86, 86], armU: [-90, -88], elbow: [5, 5], armB: [45, 45], thigh: [88, 86], knee: [5, 5], thighB: [-20, -18], kneeB: [-105, -103] },
  "chin-tuck": { dur: "1.6s", hip: [0, 0], torso: [0, 0], armU: [5, 5], elbow: [5, 5], thigh: [0, 0], knee: [3, 3], headShift: [0, -5] },
  "wall-angel": { dur: "2.2s", hip: [0, 0], torso: [2, 2], armU: [115, 155], armB: [115, 155], elbow: [75, 15], thigh: [0, 0], knee: [3, 3], wall: 80 },
  thoracic: { dur: "2.2s", hip: [15, 15], torso: [-12, -24], armU: [35, 35], elbow: [105, 105], thigh: [-85, -85], knee: [-85, -85], box: { x: 60, y: 86, w: 14, h: 54 } },
  "hip-stretch": { dur: "2s", hip: [18, 21], torso: [4, 8], armU: [160, 170], elbow: [10, 10], thigh: [-68, -64], knee: [-68, -64], thighB: [-22, -20], kneeB: [-82, -80] },
  "chest-stretch": { dur: "2s", hip: [0, 0], torso: [4, 9], armU: [45, 50], elbow: [10, 10], thigh: [0, 0], knee: [3, 3] },
  superman: { dur: "2s", hip: [46, 42], torso: [-95, -82], armU: [105, 105], elbow: [5, 5], thigh: [-95, -85], knee: [5, 5] },
};

/* ---------- geometri murni (dipakai render + unit test) ---------- */
export interface Pt {
  x: number;
  y: number;
}
export interface PoseAngles {
  hipDy: number;
  torso: number;
  armU: number;
  elbow: number;
  thigh: number;
  knee: number;
}
export function poseAngles(move: string, phase: number): PoseAngles | null {
  const d = MOVES[move];
  if (!d) return null;
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const L = (p: [number, number]) => p[0] + (p[1] - p[0]) * tri;
  return { hipDy: L(d.hip), torso: L(d.torso), armU: L(d.armU), elbow: L(d.elbow), thigh: L(d.thigh), knee: L(d.knee) };
}

export interface Joints {
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  elbow: Pt;
  hand: Pt;
  knee: Pt;
  foot: Pt;
}
export function jointsOf(a: PoseAngles): Joints {
  const rad = (x: number) => (x * Math.PI) / 180;
  const hip = { x: 100, y: 80 + a.hipDy };
  const tx = Math.sin(rad(a.torso));
  const ty = -Math.cos(rad(a.torso));
  const shoulder = { x: hip.x + 40 * tx, y: hip.y + 40 * ty };
  const head = { x: hip.x + 55 * tx, y: hip.y + 55 * ty };
  const ax = -Math.sin(rad(a.armU));
  const ay = Math.cos(rad(a.armU));
  const elbow = { x: shoulder.x + 24 * ax, y: shoulder.y + 24 * ay };
  const fa = a.armU + a.elbow;
  const hand = { x: elbow.x + 22 * -Math.sin(rad(fa)), y: elbow.y + 22 * Math.cos(rad(fa)) };
  const lx = -Math.sin(rad(a.thigh));
  const ly = Math.cos(rad(a.thigh));
  const knee = { x: hip.x + 30 * lx, y: hip.y + 30 * ly };
  const sw = a.thigh - a.knee;
  const foot = { x: knee.x + 30 * -Math.sin(rad(sw)), y: knee.y + 30 * Math.cos(rad(sw)) };
  return { hip, shoulder, head, elbow, hand, knee, foot };
}

/* ---------- render ---------- */
function rotVals(pair: [number, number], cx: number, cy: number, sign = 1, flip = false): string {
  const p = flip ? [pair[1], pair[0]] : pair;
  return `${p[0] * sign} ${cx} ${cy};${p[1] * sign} ${cx} ${cy};${p[0] * sign} ${cx} ${cy}`;
}

function Rot({
  cx,
  cy,
  pair,
  dur,
  sign = 1,
  flip = false,
  children,
}: {
  cx: number;
  cy: number;
  pair: [number, number];
  dur: string;
  sign?: 1 | -1;
  flip?: boolean;
  children: ReactNode;
}) {
  const base = (flip ? pair[1] : pair[0]) * sign;
  return (
    <g transform={`rotate(${base} ${cx} ${cy})`}>
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={rotVals(pair, cx, cy, sign, flip)}
        dur={dur}
        repeatCount="indefinite"
      />
      {children}
    </g>
  );
}

const LIMB = { stroke: "#f2f2f2", strokeWidth: 5, strokeLinecap: "round" } as const;

export function MoveArt({ move, size = 120 }: { move: string; size?: number }) {
  const def = MOVES[move];
  const label = MOVE_LABEL[move] ?? move;
  if (!def) {
    return (
      <div className="move">
        <div className="move-ph">?</div>
        <span>{label}</span>
      </div>
    );
  }
  const D = def.dur;
  const wallX = def.wall;
  return (
    <div className="move">
      <svg viewBox="0 -30 200 190" style={{ maxWidth: size }} role="img" aria-label={`Ilustrasi ${label}`}>
        <line x1={10} y1={140} x2={190} y2={140} stroke="#555" strokeWidth={2} />
        {wallX !== undefined && (
          <g stroke="#8a8a93" strokeWidth={3}>
            <line x1={wallX} y1={20} x2={wallX} y2={140} />
            {[40, 70, 100, 125].map((y) => (
              <line key={y} x1={wallX} y1={y} x2={wallX - 8} y2={y + 8} />
            ))}
          </g>
        )}
        {def.box && (
          <rect x={def.box.x} y={def.box.y} width={def.box.w} height={def.box.h} fill="#2a2c31" stroke="#8a8a93" strokeWidth={2} />
        )}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 ${def.hip[0]};0 ${def.hip[1]};0 ${def.hip[0]}`}
            dur={D}
            repeatCount="indefinite"
          />
          {/* torso + kepala */}
          <Rot cx={100} cy={80} pair={def.torso} dur={D}>
            <line x1={100} y1={80} x2={100} y2={36} {...LIMB} />
            <g>
              {def.headShift && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`${def.headShift[0]} 0;${def.headShift[1]} 0;${def.headShift[0]} 0`}
                  dur={D}
                  repeatCount="indefinite"
                />
              )}
              <circle cx={100} cy={24} r={11} fill="none" {...LIMB} />
            </g>
            {/* lengan A */}
            <Rot cx={100} cy={40} pair={def.armU} dur={D}>
              <line x1={100} y1={40} x2={100} y2={64} {...LIMB} />
              <Rot cx={100} cy={64} pair={def.elbow} dur={D}>
                <line x1={100} y1={64} x2={100} y2={86} {...LIMB} />
              </Rot>
            </Rot>
            {/* lengan B (opsional) */}
            {def.armB && (
              <Rot cx={100} cy={40} pair={def.armB} dur={D} flip={def.altB}>
                <line x1={100} y1={40} x2={100} y2={64} {...LIMB} />
              </Rot>
            )}
          </Rot>
          {/* kaki A */}
          <Rot cx={100} cy={80} pair={def.thigh} dur={D}>
            <line x1={100} y1={80} x2={100} y2={110} {...LIMB} />
            <Rot cx={100} cy={110} pair={def.knee} dur={D} sign={-1}>
              <line x1={100} y1={110} x2={100} y2={140} {...LIMB} />
              <line x1={100} y1={140} x2={109} y2={140} {...LIMB} />
            </Rot>
          </Rot>
          {/* kaki B (opsional) */}
          {def.thighB && def.kneeB && (
            <Rot cx={100} cy={80} pair={def.thighB} dur={D} flip={def.altB}>
              <line x1={100} y1={80} x2={100} y2={110} {...LIMB} />
              <Rot cx={100} cy={110} pair={def.kneeB} dur={D} sign={-1} flip={def.altB}>
                <line x1={100} y1={110} x2={100} y2={140} {...LIMB} />
                <line x1={100} y1={140} x2={109} y2={140} {...LIMB} />
              </Rot>
            </Rot>
          )}
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function MoveGallery({ moves }: { moves: string[] }) {
  if (moves.length === 0) return null;
  return (
    <div>
      <p className="muted">Ilustrasi gerakan:</p>
      <div className="moves">
        {moves.map((m) => (
          <MoveArt key={m} move={m} />
        ))}
      </div>
    </div>
  );
}
