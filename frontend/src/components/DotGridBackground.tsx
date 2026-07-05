import { useEffect, useMemo, useState } from "react";

// A letterpress-printed dot grid: regular halftone screen (offset rows),
// ink weight varies with slow noise, the plate loses pressure toward the
// bottom-left, and the ink thins out under the centered content column.
// Static, deterministic, one <path>.

const SPACING = 30;
const BASE_R = 1.6;

// position-stable hash so the pattern doesn't reshuffle on resize
function hash(col: number, row: number, k: number): number {
  const s = Math.sin(col * 127.1 + row * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function buildPath(w: number, h: number): string {
  const diag = Math.hypot(w, h);
  const inner = Math.min(320, w * 0.28); // half-width of the content column
  const parts: string[] = [];
  for (let row = 0; row * SPACING < h + SPACING; row++) {
    const y = row * SPACING;
    const xOff = row % 2 ? SPACING / 2 : 0;
    for (let col = 0; col * SPACING + xOff < w + SPACING; col++) {
      let x = col * SPACING + xOff;
      if (hash(col, row, 1) < 0.004) continue; // worn plate: a few dots never print
      if (hash(col, row, 2) < 0.002)
        x += SPACING * (hash(col, row, 3) - 0.5) * 0.9; // one mis-set dot here and there
      // uneven ink rollers: two slow sine octaves
      const ink =
        0.74 +
        0.26 * Math.sin(x * 0.013 + 1.7) * Math.sin(y * 0.011 + 4.2) +
        0.16 * Math.sin((x * 0.7 - y) * 0.008 + 2.9);
      // impression ghosts out toward the bottom-left corner
      const press = Math.min(1, 0.18 + Math.hypot(x, h - y) / (0.55 * diag));
      // ink refuses to print where something's already written
      const colDist = Math.abs(x - w / 2);
      const column =
        0.45 + 0.55 * Math.min(1, Math.max(0, (colDist - inner) / 260));
      const r = BASE_R * ink * press * column;
      if (r < 0.35) continue; // too little ink to leave a mark
      const rr = r.toFixed(2);
      parts.push(
        `M${(x - r).toFixed(2)},${y}a${rr},${rr} 0 1 0 ${(2 * r).toFixed(2)},0a${rr},${rr} 0 1 0 ${(-2 * r).toFixed(2)},0`,
      );
    }
  }
  return parts.join("");
}

// snap height so mobile url-bar resizes don't rebuild the path
const snap = () => ({
  w: window.innerWidth,
  h: Math.ceil(window.innerHeight / 240) * 240,
});

export default function DotGridBackground() {
  const [dims, setDims] = useState(snap);
  useEffect(() => {
    const on = () =>
      setDims((d) => {
        const n = snap();
        return n.w === d.w && n.h === d.h ? d : n;
      });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const d = useMemo(() => buildPath(dims.w, dims.h), [dims]);
  return (
    <svg
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none text-background/50"
      width={dims.w}
      height={dims.h}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
