import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, Slot } from "@/api/types";
import Crown from "@/components/Crown";
import MonthGrid, { datesBetween } from "./MonthGrid";
import { cn, parseLocalDate } from "@/lib/utils";

type Props = { poll: Poll; activityId: string; slots: Slot[] };
type Endpoint = { slotId: number; which: "date" | "date_end" };

/**
 * Voting calendar for date-range polls: drag from–to creates one range vote,
 * a tap creates a single-day range. Tapping an endpoint of one of your ranges
 * below the calendar activates it; the next day tapped replaces that endpoint.
 */
export default function RangePoll({ poll, activityId, slots }: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const { activity } = useActivity();
  const myId = activity?.me?.id;
  const disabled = !!poll.deleted_at || !!poll.locked_at || !myId;

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [preview, setPreview] = useState<string[] | null>(null);
  const [active, setActive] = useState<Endpoint | null>(null);

  const myRanges = useMemo(
    () => slots.filter((s) => s.member.id === myId && s.date && s.date_end),
    [slots, myId],
  );

  // day → distinct voters covering it (ranges expanded per day; groups are small)
  const countByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of slots) {
      if (!s.date || !s.date_end) continue;
      for (const d of datesBetween(s.date, s.date_end)) {
        map.set(d, (map.get(d) ?? new Set()).add(s.member.id));
      }
    }
    return map;
  }, [slots]);

  const myDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of myRanges) for (const d of datesBetween(s.date!, s.date_end!)) set.add(d);
    return set;
  }, [myRanges]);

  const invalidate = () => {
    setPreview(null);
    qc.invalidateQueries({ queryKey: ["feed", activityId] });
    qc.invalidateQueries({ queryKey: ["slots", activityId, String(poll.id)] });
    qc.invalidateQueries({ queryKey: ["poll", activityId, String(poll.id)] });
  };
  const saveFailed = () => toast.error("Couldn't save your vote — try again.");

  const createMut = useMutation({
    mutationFn: (days: string[]) =>
      api.post(
        `/activities/${activityId}/polls/${poll.id}/slots/`,
        { date: days[0], date_end: days[days.length - 1] },
        activityId,
      ),
    onSettled: invalidate,
    onError: saveFailed,
  });

  const moveMut = useMutation({
    mutationFn: ({ slotId, date, date_end }: { slotId: number; date: string; date_end: string }) =>
      api.patch(`/activities/${activityId}/polls/${poll.id}/slots/${slotId}/`, { date, date_end }, activityId),
    onSettled: invalidate,
    onError: saveFailed,
  });

  const deleteMut = useMutation({
    mutationFn: (slotId: number) =>
      api.del(`/activities/${activityId}/polls/${poll.id}/slots/${slotId}/`, activityId),
    onSettled: invalidate,
    onError: saveFailed,
  });

  const tap = (day: string) => {
    if (disabled) return;
    if (active) {
      // replace the activated endpoint, keeping the range ordered
      const slot = myRanges.find((s) => s.id === active.slotId);
      setActive(null);
      if (!slot) return;
      const other = active.which === "date" ? slot.date_end! : slot.date!;
      const [date, date_end] = day <= other ? [day, other] : [other, day];
      moveMut.mutate({ slotId: slot.id, date, date_end });
    } else {
      createMut.mutate([day]);
    }
  };

  const previewSet = useMemo(() => new Set(preview ?? []), [preview]);
  const busy = createMut.isPending || moveMut.isPending || deleteMut.isPending;
  // crown the leading day(s) — needs a real lead, not everyone's lone vote
  const maxVoters = Math.max(0, ...[...countByDay.values()].map((s) => s.size));

  return (
    <div className="flex flex-col gap-2">
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        onTap={(day) => !busy && tap(day)}
        onDragMove={disabled || active ? undefined : setPreview}
        onDragEnd={disabled || active ? undefined : (days) => !busy && createMut.mutate(days)}
        dayCell={(day) => {
          const mine = myDays.has(day);
          const voters = countByDay.get(day)?.size ?? 0;
          const others = voters - (mine ? 1 : 0);
          const top = maxVoters >= 2 && voters === maxVoters;
          return {
            className: cn(
              mine && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
              // join my range into a pill: square off sides that continue
              mine && myDays.has(prevDay(day)) && "rounded-l-none",
              mine && myDays.has(nextDay(day)) && "rounded-r-none",
              !mine && others > 0 && (others >= 3 ? "bg-primary/25" : "bg-primary/10"),
              previewSet.has(day) && "ring-2 ring-primary ring-inset",
            ),
            content: (
              <>
                {top && <Crown className={cn("absolute top-0.5 right-1 h-2.5 w-3.5", mine ? "text-primary-foreground" : "text-amber-500")} />}
                {voters > 0 && (
                  <span className={cn("text-[9px] leading-none mt-0.5", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {voters}
                  </span>
                )}
              </>
            ),
          };
        }}
      />

      {active && (
        <p className="text-xs text-primary">Tap a day on the calendar to move this date, or tap the date again to cancel.</p>
      )}

      {myRanges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {myRanges.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-xs">
              <EndpointButton slot={s} which="date" active={active} onToggle={setActive} />
              {s.date !== s.date_end && (
                <>
                  <span className="text-muted-foreground">–</span>
                  <EndpointButton slot={s} which="date_end" active={active} onToggle={setActive} />
                </>
              )}
              <button
                aria-label="Remove range"
                className="text-muted-foreground hover:text-destructive p-0.5"
                onClick={() => {
                  setActive(null);
                  deleteMut.mutate(s.id);
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function prevDay(day: string): string {
  const d = parseLocalDate(day);
  d.setDate(d.getDate() - 1);
  return toStr(d);
}
function nextDay(day: string): string {
  const d = parseLocalDate(day);
  d.setDate(d.getDate() + 1);
  return toStr(d);
}
function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EndpointButton({
  slot,
  which,
  active,
  onToggle,
}: {
  slot: Slot;
  which: "date" | "date_end";
  active: Endpoint | null;
  onToggle: (e: Endpoint | null) => void;
}) {
  const isActive = active?.slotId === slot.id && active.which === which;
  const label = parseLocalDate(slot[which]!).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <button
      className={cn(
        "rounded px-0.5 transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "hover:text-primary",
      )}
      onClick={() => onToggle(isActive ? null : { slotId: slot.id, which })}
    >
      {label}
    </button>
  );
}
