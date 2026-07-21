import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  monthWeeks,
  splitRangeByWeek,
  maxLaneIndexPerRow,
  rowHeightPx,
  packLanes,
  BASE_ROW_PX,
  BAR_PX,
  BAR_GAP_PX,
  toDateStr,
  datesBetween,
  type BarSegment,
} from "./monthBars";

export { toDateStr, datesBetween };

export type DayCell = { className?: string; content?: React.ReactNode };

/** One continuous range (any owner), drawn as a bar spanning the days it
 * covers — split per week-row and packed into a lane by MonthGrid itself. */
export type MonthBar = {
  key: string;
  startDate: string;
  endDate: string;
  color: string;
  /** "ghost" = dashed outline, no fill (mouse hover preview). Default "solid". */
  variant?: "solid" | "ghost";
  dimmed?: boolean;
  onPointerEnter?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
};

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  dayCell: (dateStr: string) => DayCell;
  onTap?: (dateStr: string) => void;
  /** Fired live while dragging and once on release with the covered days. Enables drag selection. */
  onDragMove?: (dates: string[]) => void;
  onDragEnd?: (dates: string[]) => void;
  /** Mouse-only: the day under the cursor, null when leaving the grid or over past days. */
  onHover?: (dateStr: string | null) => void;
  /** "range" spans start→current; "paint" collects only days the pointer touched. */
  dragMode?: "range" | "paint";
  /** Continuous multi-day bars overlaid on the grid (e.g. range-poll votes).
   * Omit entirely for a plain calendar — rows stay a fixed height and no
   * overlay is mounted; pass (even an empty array) to opt into bar layout. */
  bars?: MonthBar[];
};

/**
 * Monday-first month calendar with tap and drag-select via pointer events.
 * Past days are disabled. Consumers style cells through dayCell.
 */
export default function MonthGrid({ month, onMonthChange, dayCell, onTap, onDragMove, onDragEnd, onHover, dragMode = "range", bars }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoBack = month > currentMonth;

  const weeks = monthWeeks(month);
  const cells = weeks.flat();

  // bar segments (week-split, lane-packed by actual date overlap — not by
  // owner) + per-row heights, only when a consumer opts in
  const laneByKey = bars ? packLanes(bars) : new Map<string, number>();
  const allSegments: (BarSegment & { bar: MonthBar; lane: number })[] = bars
    ? bars.flatMap((bar) =>
        splitRangeByWeek(weeks, bar.startDate, bar.endDate).map((seg) => ({ ...seg, bar, lane: laneByKey.get(bar.key)! })),
      )
    : [];
  const gridTemplateRows = bars
    ? maxLaneIndexPerRow(
        weeks.length,
        allSegments.map((s) => ({ weekRow: s.weekRow, lane: s.lane })),
      )
        .map((h) => `${rowHeightPx(h)}px`)
        .join(" ")
    : undefined;

  const drag = useRef<{ start: string; current: string; painted: string[] } | null>(null);

  // grace period before a hover ghost disappears when the mouse leaves the grid
  const HOVER_CLEAR_MS = 200;
  const hoverClear = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverClear.current), []);

  // once bar segments are pointer-events:auto (for hover), a pointer can land
  // on a bar pixel that isn't nested inside the day button — elementFromPoint
  // alone would miss the day underneath, so walk the full paint-order stack
  const dayAt = (x: number, y: number): string | null => {
    const el = document.elementsFromPoint(x, y).find((e) => e.closest("[data-date]"));
    const date = el?.closest("[data-date]")?.getAttribute("data-date") ?? null;
    return date && date >= todayStr ? date : null;
  };

  const covered = () => {
    const d = drag.current!;
    return dragMode === "paint" ? d.painted : datesBetween(d.start, d.current);
  };

  const handleDown = (e: React.PointerEvent) => {
    const day = dayAt(e.clientX, e.clientY);
    if (!day) return;
    drag.current = { start: day, current: day, painted: [day] };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (drag.current && onDragEnd) {
      const day = dayAt(e.clientX, e.clientY);
      if (day && day !== drag.current.current) {
        drag.current.current = day;
        if (!drag.current.painted.includes(day)) drag.current.painted.push(day);
        onDragMove?.(covered());
      }
      return;
    }
    if (onHover && e.pointerType === "mouse") {
      // sticky: gaps between cells (and past days) report null — keep the last
      // hovered day so range ghosts don't flicker while crossing them
      const day = dayAt(e.clientX, e.clientY);
      if (day) {
        clearTimeout(hoverClear.current);
        onHover(day);
      }
    }
  };

  const handleUp = () => {
    if (!drag.current) return;
    const { start } = drag.current;
    const days = covered();
    drag.current = null;
    if (days.length === 1 && days[0] === start) onTap?.(start);
    else onDragEnd?.(days);
  };

  return (
    <div className="border rounded-lg p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canGoBack}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>

      {/* ponytail: touch-action none blocks page scroll over the grid; long-press-to-drag if that grates */}
      <div
        className={cn("grid grid-cols-7 gap-1", bars && "relative transition-[grid-template-rows] duration-200 ease-out")}
        style={{ touchAction: onDragEnd ? "none" : undefined, gridTemplateRows }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => {
          if (!onHover) return;
          clearTimeout(hoverClear.current);
          hoverClear.current = window.setTimeout(() => onHover(null), HOVER_CLEAR_MS);
        }}
      >
        {cells.map((d, i) => {
          if (!d) return <span key={`blank-${i}`} />;
          const dateStr = toDateStr(d);
          const past = dateStr < todayStr;
          const cell = dayCell(dateStr);
          return (
            <button
              key={dateStr}
              data-date={dateStr}
              disabled={past}
              className={cn(
                "relative rounded-md text-sm flex flex-col items-center transition-colors",
                bars ? "justify-start pt-1" : "h-11 justify-center",
                past ? "text-muted-foreground/40" : "hover:bg-muted",
                cell.className,
              )}
            >
              {dateStr === todayStr ? (
                <span className="grid size-6 place-items-center rounded-full bg-red-500 text-white">
                  {d.getDate()}
                </span>
              ) : (
                d.getDate()
              )}
              {cell.content}
            </button>
          );
        })}
        {/* absolutely positioned INSIDE the same pointer-handling container
         * (not a sibling wrapper) so bar hover/pointerdown still bubbles up
         * into handleDown/handleMove for drag + day-hover tracking */}
        {bars && (
          <div
            className="absolute inset-0 grid grid-cols-7 gap-1 pointer-events-none transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows }}
          >
            {allSegments.map((seg) => (
              <span
                key={`${seg.bar.key}-${seg.weekRow}`}
                className={cn(
                  "self-start pointer-events-auto transition-[margin-top,opacity] duration-200 ease-out",
                  seg.roundedStart && "rounded-l-full",
                  seg.roundedEnd && "rounded-r-full",
                  seg.bar.variant === "ghost" && "border border-dashed",
                )}
                style={{
                  gridColumn: `${seg.startCol} / ${seg.endCol + 1}`,
                  gridRow: seg.weekRow + 1,
                  marginTop: BASE_ROW_PX + seg.lane * (BAR_PX + BAR_GAP_PX),
                  height: BAR_PX,
                  backgroundColor: seg.bar.variant === "ghost" ? undefined : seg.bar.color,
                  borderColor: seg.bar.variant === "ghost" ? seg.bar.color : undefined,
                  opacity: seg.bar.dimmed ? 0.2 : 1,
                  // a transition only animates a value CHANGING on an
                  // existing node — a brand-new bar (new vote, or a member
                  // un-hidden) needs this to not just snap into existence
                  animation: "bar-fade-in 200ms ease-out",
                }}
                onPointerEnter={seg.bar.onPointerEnter}
                onPointerLeave={seg.bar.onPointerLeave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
