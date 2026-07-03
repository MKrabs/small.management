import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Slot } from "@/api/types";
import { Button } from "@/components/ui/button";
import type { VoteStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

// Muted pill when only others voted; my own status tints the pill.
const PILL: Record<VoteStatus, string> = {
  yes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  maybe: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  no: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Month calendar showing everyone's votes per day: a pill with the number of
 * members who voted, tinted with your own status when you voted too.
 * Tapping a (non-past) day opens the day editor.
 */
export default function PollCalendar({
  slots,
  myId,
  onSelectDay,
}: {
  slots: Slot[];
  myId?: string;
  onSelectDay: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, { members: Set<string>; mine: VoteStatus | null }>();
    for (const s of slots) {
      if (!s.date || s.deleted_at) continue;
      const entry = map.get(s.date) ?? { members: new Set<string>(), mine: null };
      entry.members.add(s.member.id);
      if (myId && s.member.id === myId) entry.mine = s.status;
      map.set(s.date, entry);
    }
    return map;
  }, [slots, myId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoBack = month > currentMonth;

  // Monday-first grid
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  return (
    <div className="border rounded-lg bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canGoBack}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
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
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
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

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`blank-${i}`} />;
          const dateStr = toDateStr(d);
          const isToday = dateStr === todayStr;
          const past = d < today;
          const day = byDay.get(dateStr);
          return (
            <button
              key={dateStr}
              disabled={past}
              onClick={() => onSelectDay(dateStr)}
              className={cn(
                "relative h-14 rounded-md text-sm flex flex-col items-center justify-start pt-1.5 gap-1 transition-colors",
                past ? "text-muted-foreground/40" : "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "size-6 grid place-items-center rounded-full leading-none",
                  isToday && "bg-red-500 text-white font-medium",
                )}
              >
                {d.getDate()}
              </span>
              {day && day.members.size > 0 && (
                <span
                  className={cn(
                    "text-[10px] leading-none font-medium rounded-full px-1.5 py-0.5 min-w-5",
                    day.mine ? PILL[day.mine] : "bg-muted text-muted-foreground",
                  )}
                >
                  {day.members.size}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
