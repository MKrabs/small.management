import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, Slot } from "@/api/types";
import Crown from "@/components/Crown";
import MonthGrid from "./MonthGrid";
import { cn } from "@/lib/utils";

type Props = { poll: Poll; activityId: string; slots: Slot[] };

/**
 * Voting calendar for single-day polls: tap toggles a day, dragging paints
 * many days as individual binary votes. Shared by feed card and poll page.
 */
export default function DatePoll({ poll, activityId, slots }: Props) {
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

  const mySlotByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of slots) if (s.member.id === myId && s.date) map.set(s.date, s.id);
    return map;
  }, [slots, myId]);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of slots) if (s.date) map.set(s.date, (map.get(s.date) ?? 0) + 1);
    return map;
  }, [slots]);

  const saveMut = useMutation({
    mutationFn: async ({ adds, removes }: { adds: string[]; removes: number[] }) => {
      const base = `/activities/${activityId}/polls/${poll.id}/slots/`;
      await Promise.all([
        ...adds.map((date) => api.post(base, { date }, activityId)),
        ...removes.map((id) => api.del(`${base}${id}/`, activityId)),
      ]);
    },
    onSettled: () => {
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      qc.invalidateQueries({ queryKey: ["slots", activityId, String(poll.id)] });
      qc.invalidateQueries({ queryKey: ["poll", activityId, String(poll.id)] });
    },
    onError: () => toast.error("Couldn't save your vote — try again."),
  });

  const commit = (days: string[]) => {
    if (disabled || saveMut.isPending) return setPreview(null);
    const unvoted = days.filter((d) => !mySlotByDay.has(d));
    if (unvoted.length > 0) {
      // painting: add everything not yet voted
      saveMut.mutate({ adds: unvoted, removes: [] });
    } else {
      // whole selection already mine → clear it
      saveMut.mutate({ adds: [], removes: days.map((d) => mySlotByDay.get(d)!) });
    }
  };

  const previewSet = useMemo(() => new Set(preview ?? []), [preview]);
  // crown the leading day(s) — needs a real lead, not everyone's lone vote
  const maxCount = Math.max(0, ...countByDay.values());

  return (
    <MonthGrid
      month={month}
      onMonthChange={setMonth}
      onTap={(day) => commit([day])}
      onDragMove={disabled ? undefined : setPreview}
      onDragEnd={disabled ? undefined : commit}
      dragMode="paint"
      dayCell={(day) => {
        const mine = mySlotByDay.has(day);
        // painted days render as selected immediately, not as a separate preview style
        const filled = mine || previewSet.has(day);
        const count = countByDay.get(day) ?? 0;
        const others = count - (mine ? 1 : 0);
        const top = maxCount >= 2 && count === maxCount;
        return {
          className: cn(
            filled && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
            !filled && others > 0 && (others >= 3 ? "bg-primary/25" : "bg-primary/10"),
          ),
          content: (
            <>
              {top && <Crown className={cn("absolute top-0.5 right-1 h-2.5 w-3.5", filled ? "text-primary-foreground" : "text-amber-500")} />}
              {count > 0 && (
                <span className={cn("text-[9px] leading-none mt-0.5", filled ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {count}
                </span>
              )}
            </>
          ),
        };
      }}
    />
  );
}
