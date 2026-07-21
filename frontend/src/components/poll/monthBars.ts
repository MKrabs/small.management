// Pure date/geometry helpers for MonthGrid's continuous multi-day bars.
// Deliberately JSX-free (no React import) so this module — and its
// self-check — can run under plain `node`, no build step.

export const BASE_ROW_PX = 44; // == h-11 (2.75rem), the zero-bar row floor
export const BAR_PX = 6; // ponytail: eyeballed, tune against a screenshot
export const BAR_GAP_PX = 2; // ponytail: same

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Inclusive list of "YYYY-MM-DD" between two dates, in chronological order. */
export function datesBetween(a: string, b: string): string[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  const d = new Date(`${lo}T00:00`);
  while (toDateStr(d) <= hi) {
    out.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Monday-first week rows for `month`; null pads leading/trailing blanks so
 * every row is exactly 7 cells — the single source of truth for the
 * grid layout MonthGrid renders. */
export function monthWeeks(month: Date): (Date | null)[][] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type BarSegment = {
  weekRow: number; // 0-indexed
  startCol: number; // 1-indexed, Mon=1..Sun=7
  endCol: number; // 1-indexed, inclusive
  roundedStart: boolean; // true only on the segment touching the range's true start
  roundedEnd: boolean; // true only on the segment touching the range's true end
};

/** Split one inclusive [startDate, endDate] range into one BarSegment per
 * week-row it touches. A range crossing a week boundary splits into
 * segments square-ended at the wrap — standard month-view calendar
 * behavior (Google Calendar does the same), not a compromise. */
export function splitRangeByWeek(weeks: (Date | null)[][], startDate: string, endDate: string): BarSegment[] {
  const segments: BarSegment[] = [];
  weeks.forEach((week, weekRow) => {
    let startCol = -1;
    let endCol = -1;
    week.forEach((d, col) => {
      if (!d) return;
      const s = toDateStr(d);
      if (s >= startDate && s <= endDate) {
        if (startCol === -1) startCol = col;
        endCol = col;
      }
    });
    if (startCol === -1) return;
    segments.push({
      weekRow,
      startCol: startCol + 1,
      endCol: endCol + 1,
      roundedStart: toDateStr(week[startCol]!) === startDate,
      roundedEnd: toDateStr(week[endCol]!) === endDate,
    });
  });
  return segments;
}

/** Greedy interval partitioning: assign each range to the lowest lane whose
 * last-placed range already ended before this one starts, opening a new
 * lane only when nothing fits. This is owner-agnostic on purpose — two
 * overlapping ranges from the SAME member must land in different lanes
 * (otherwise their fills paint on top of each other and read as one merged
 * bar), while non-overlapping ranges — same or different owner — share a
 * lane whenever they fit, so lane count reflects real overlap, not member
 * count. */
export function packLanes(bars: { key: string; startDate: string; endDate: string }[]): Map<string, number> {
  const sorted = [...bars].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const laneEnds: string[] = []; // laneEnds[i] = endDate of the last range placed in lane i
  const laneOf = new Map<string, number>();
  for (const bar of sorted) {
    let lane = laneEnds.findIndex((end) => end < bar.startDate);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = bar.endDate;
    laneOf.set(bar.key, lane);
  }
  return laneOf;
}

/** Per week-row, the highest lane index with a segment touching that row
 * (-1 if none). This is the max index in use, not a count of active
 * owners — a bar's lane (from packLanes) is fixed for its whole run, so a
 * row must be tall enough for the highest lane touching it that week. */
export function maxLaneIndexPerRow(weekCount: number, segmentsWithLane: { weekRow: number; lane: number }[]): number[] {
  const max = Array.from({ length: weekCount }, () => -1);
  for (const { weekRow, lane } of segmentsWithLane) {
    if (lane > max[weekRow]) max[weekRow] = lane;
  }
  return max;
}

/** Row track height in px. -1 (no bars that week) floors to BASE_ROW_PX —
 * identical to today's row, so calendars with no votes look unchanged. */
export function rowHeightPx(maxLaneIndex: number): number {
  if (maxLaneIndex < 0) return BASE_ROW_PX;
  return BASE_ROW_PX + (maxLaneIndex + 1) * (BAR_PX + BAR_GAP_PX);
}
