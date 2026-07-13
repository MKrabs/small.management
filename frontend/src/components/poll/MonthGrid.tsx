import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export type DayCell = { className?: string; content?: React.ReactNode };

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
};

/**
 * Monday-first month calendar with tap and drag-select via pointer events.
 * Past days are disabled. Consumers style cells through dayCell.
 */
export default function MonthGrid({ month, onMonthChange, dayCell, onTap, onDragMove, onDragEnd, onHover, dragMode = "range" }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoBack = month > currentMonth;

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  const drag = useRef<{ start: string; current: string; painted: string[] } | null>(null);

  // grace period before a hover ghost disappears when the mouse leaves the grid
  const HOVER_CLEAR_MS = 200;
  const hoverClear = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(hoverClear.current), []);

  const dayAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-date]");
    const date = el?.getAttribute("data-date") ?? null;
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
        className="grid grid-cols-7 gap-1"
        style={{ touchAction: onDragEnd ? "none" : undefined }}
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
                "relative h-11 rounded-md text-sm flex flex-col items-center justify-center transition-colors",
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
      </div>
    </div>
  );
}
