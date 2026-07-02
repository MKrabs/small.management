import { useMemo, useState } from "react";
import type { Slot } from "@/api/types";
import { STATUS_ICON, STATUS_TEXT } from "@/lib/status";
import { cn, formatDay, parseLocalDate } from "@/lib/utils";

/**
 * Group availability heatmap. Days as columns; 30-min rows when any slot has
 * a time range, otherwise one cell per day. Darker = more people available
 * (yes + maybe). "no" votes and general (no-date) votes are not counted.
 * Tapping a cell lists who is available then.
 */
export default function Heatmap({ slots }: { slots: Slot[] }) {
  const dated = useMemo(() => slots.filter((s) => s.date), [slots]);
  const [selected, setSelected] = useState<{ day: string; minute: number | null } | null>(null);

  const days = useMemo(() => [...new Set(dated.map((s) => s.date!))].sort(), [dated]);

  const timed = dated.filter((s) => s.time_start && s.time_end);
  const hasTime = timed.length > 0;

  // 30-min row range across all timed slots
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const minuteRows = useMemo(() => {
    if (!hasTime) return [];
    const start = Math.min(...timed.map((s) => toMin(s.time_start!)));
    const end = Math.max(...timed.map((s) => toMin(s.time_end!)));
    const rows = [];
    for (let m = start; m < end; m += 30) rows.push(m);
    return rows;
  }, [hasTime, timed]);

  if (days.length === 0) return null;

  // Members available for a given cell (minute === null → whole day)
  const availableAt = (day: string, minute: number | null): Slot[] => {
    const byMember = new Map<string, Slot>();
    for (const s of dated) {
      if (s.date !== day) continue;
      const covers =
        minute === null ||
        !s.time_start ||
        !s.time_end ||
        (toMin(s.time_start) <= minute && minute < toMin(s.time_end));
      if (!covers) continue;
      // one member can have several slots on a day; the one covering this cell wins,
      // later (more specific, timed) entries override all-day ones
      const prev = byMember.get(s.member.id);
      if (!prev || (!prev.time_start && s.time_start)) byMember.set(s.member.id, s);
    }
    return [...byMember.values()];
  };

  const countAt = (day: string, minute: number | null) =>
    availableAt(day, minute).filter((s) => s.status !== "no").length;

  const max = Math.max(
    1,
    ...days.flatMap((d) =>
      hasTime ? minuteRows.map((m) => countAt(d, m)) : [countAt(d, null)],
    ),
  );

  const fmtMin = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const cell = (day: string, minute: number | null) => {
    const count = countAt(day, minute);
    const isSelected = selected?.day === day && selected?.minute === minute;
    return (
      <button
        key={`${day}-${minute}`}
        onClick={() => setSelected(isSelected ? null : { day, minute })}
        className={cn(
          "h-7 min-w-11 flex-1 rounded-sm text-xs flex items-center justify-center transition-colors",
          isSelected && "ring-2 ring-ring",
          count === 0 && "text-muted-foreground/40",
        )}
        style={{ backgroundColor: `color-mix(in srgb, var(--color-green-500) ${(count / max) * 85}%, var(--muted))` }}
      >
        {count > 0 ? count : ""}
      </button>
    );
  };

  const selectedSlots = selected ? availableAt(selected.day, selected.minute) : [];

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Group availability</h2>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5 min-w-full">
          {/* Day headers */}
          <div className="flex gap-0.5">
            {hasTime && <span className="w-11 shrink-0" />}
            {days.map((d) => (
              <span key={d} className="min-w-11 flex-1 text-center text-xs text-muted-foreground py-0.5">
                {parseLocalDate(d).toLocaleDateString(undefined, { weekday: "short" })}
                <br />
                {parseLocalDate(d).getDate()}
              </span>
            ))}
          </div>

          {hasTime ? (
            minuteRows.map((m) => (
              <div key={m} className="flex gap-0.5 items-center">
                <span className="w-11 shrink-0 text-[10px] text-muted-foreground text-right pr-1 tabular-nums">
                  {m % 60 === 0 ? fmtMin(m) : ""}
                </span>
                {days.map((d) => cell(d, m))}
              </div>
            ))
          ) : (
            <div className="flex gap-0.5">{days.map((d) => cell(d, null))}</div>
          )}
        </div>
      </div>

      {selected && (
        <div className="border rounded-lg p-3 text-sm flex flex-col gap-1">
          <p className="font-medium">
            {formatDay(selected.day)}
            {selected.minute !== null && (
              <span className="text-muted-foreground"> · {fmtMin(selected.minute)}</span>
            )}
          </p>
          {selectedSlots.length === 0 && <p className="text-muted-foreground">Nobody yet.</p>}
          {selectedSlots.map((s) => (
            <p key={s.id} className="flex items-baseline gap-2">
              <span className={`font-semibold w-3 text-center shrink-0 ${STATUS_TEXT[s.status]}`}>
                {STATUS_ICON[s.status]}
              </span>
              {s.member.display_name}
              {s.note && <span className="text-muted-foreground truncate">“{s.note}”</span>}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
