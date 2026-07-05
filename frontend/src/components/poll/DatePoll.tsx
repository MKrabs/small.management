import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, Slot } from "@/api/types";
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
  const disabled = !!poll.deleted_at || !myId;

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

  return (
    <MonthGrid
      month={month}
      onMonthChange={setMonth}
      onTap={(day) => commit([day])}
      onDragMove={disabled ? undefined : setPreview}
      onDragEnd={disabled ? undefined : commit}
      dayCell={(day) => {
        const mine = mySlotByDay.has(day);
        const count = countByDay.get(day) ?? 0;
        const others = count - (mine ? 1 : 0);
        return {
          className: cn(
            mine && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
            !mine && others > 0 && (others >= 3 ? "bg-primary/25" : "bg-primary/10"),
            previewSet.has(day) && "ring-2 ring-primary ring-inset",
          ),
          content:
            count > 0 ? (
              <span className={cn("text-[9px] leading-none mt-0.5", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {count}
              </span>
            ) : undefined,
        };
      }}
    />
  );
}
