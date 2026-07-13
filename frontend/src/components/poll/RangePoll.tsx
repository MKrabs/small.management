import { useEffect, useMemo, useState } from "react";
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
  // tap–tap range entry: first tap arms a start day, second tap completes the
  // range (same day twice = single day). Survives month navigation on purpose,
  // so cross-month ranges work with the chevrons. Drag (≥2 days) still works.
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // a just-committed range: keeps the provisional chip alive (flipping dashed→
  // solid in place) until the created slot arrives in `slots`
  const [committing, setCommitting] = useState<{ lo: string; hi: string } | null>(null);

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
    onError: () => {
      setCommitting(null);
      saveFailed();
    },
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

  const commitRange = (lo: string, hi: string) => {
    setPending(null);
    setCommitting({ lo, hi });
    createMut.mutate([lo, hi]);
  };

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
    } else if (pending) {
      const [lo, hi] = day <= pending ? [day, pending] : [pending, day];
      commitRange(lo, hi);
    } else {
      setPending(day);
    }
  };

  // endpoint editing and tap–tap entry are exclusive modes; activating one drops the other
  const activateEndpoint = (e: Endpoint | null) => {
    setActive(e);
    if (e) setPending(null);
  };

  // once the committed range lands in the data, hide its real chip for the
  // frame the provisional chip still occupies, then swap atomically
  const landedIdx = committing
    ? myRanges.findIndex((s) => s.date === committing.lo && s.date_end === committing.hi)
    : -1;
  useEffect(() => {
    if (landedIdx !== -1) setCommitting(null);
  }, [landedIdx]);

  const previewSet = useMemo(() => new Set(preview ?? []), [preview]);
  // mouse-only ghost of the range the second tap would create
  const ghostSet = useMemo(
    () => new Set(pending && hover ? datesBetween(pending, hover) : []),
    [pending, hover],
  );
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
        onDragEnd={
          disabled || active
            ? undefined
            : (days) => !busy && commitRange(days[0], days[days.length - 1])
        }
        onHover={disabled ? undefined : setHover}
        dayCell={(day) => {
          const mine = myDays.has(day);
          // the drag preview renders as a unified range pill, same as a saved range
          const inPreview = previewSet.has(day);
          const filled = mine || inPreview;
          const ghost = !filled && ghostSet.has(day);
          const ghostEnd = ghost && (day === pending || day === hover);
          const voters = countByDay.get(day)?.size ?? 0;
          const others = voters - (mine ? 1 : 0);
          const top = maxVoters >= 2 && voters === maxVoters;
          return {
            className: cn(
              // while selecting: entering/moving the ghost snaps (transitions
              // apply to the state being entered), leaving it eases out with
              // bg and corners fading together — corners alone snapping is
              // what read as stray rounded blobs
              pending && (ghost ? "transition-none" : "transition-[background-color,border-radius] duration-300"),
              filled && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
              // join the range into a pill: square off sides that continue
              ((mine && myDays.has(prevDay(day))) || (inPreview && previewSet.has(prevDay(day)))) && "rounded-l-none",
              ((mine && myDays.has(nextDay(day))) || (inPreview && previewSet.has(nextDay(day)))) && "rounded-r-none",
              // armed start day: outline, not filled — it isn't a vote yet
              day === pending && "ring-2 ring-primary ring-inset font-medium",
              // ghost preview forms the same pill as a saved range: grey between, darker ends
              ghost && (ghostEnd ? "bg-foreground/20 hover:bg-foreground/25" : "bg-muted"),
              ghost && ghostSet.has(prevDay(day)) && "rounded-l-none",
              ghost && ghostSet.has(nextDay(day)) && "rounded-r-none",
              !filled && !ghost && others > 0 && (others >= 3 ? "bg-primary/25" : "bg-primary/10"),
            ),
            content: (
              <>
                {top && <Crown className={cn("absolute top-0.5 right-1 h-2.5 w-3.5", filled ? "text-primary-foreground" : "text-amber-500")} />}
                {voters > 0 && (
                  <span className={cn("text-[9px] leading-none mt-0.5", filled ? "text-primary-foreground/80" : "text-muted-foreground")}>
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

      {(myRanges.length > 0 || (pending && !active) || committing) && (
        <div className="flex flex-wrap gap-1.5">{chipRow()}</div>
      )}
    </div>
  );

  // slots come back date-sorted, so the provisional chip must sit at its
  // sorted position too — the exact spot where the real chip lands, so the
  // final swap doesn't jump
  function chipRow() {
    const saved = myRanges
      .filter((_, i) => i !== landedIdx)
      .map((s) => (
        <span key={s.id} className="flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-xs">
          <EndpointButton slot={s} which="date" active={active} onToggle={activateEndpoint} />
          {s.date !== s.date_end && (
            <>
              <span className="text-muted-foreground">–</span>
              <EndpointButton slot={s} which="date_end" active={active} onToggle={activateEndpoint} />
              <span className="text-muted-foreground">({datesBetween(s.date!, s.date_end!).length} days)</span>
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
      ));
    const provStart = committing?.lo ?? (pending && !active ? pending : null);
    if (!provStart) return saved;
    const visible = myRanges.filter((_, i) => i !== landedIdx);
    let at = visible.findIndex((s) => s.date! > provStart);
    if (at === -1) at = saved.length;
    saved.splice(
      at,
      0,
      <ProvisionalChip
        key="provisional"
        lo={committing ? committing.lo : pending!}
        hi={committing ? committing.hi : hover && hover !== pending ? hover : null}
        committed={!!committing}
        onCancel={() => setPending(null)}
      />,
    );
    return saved;
  }
}

/** Provisional range chip: "Wed, Jul 15 – ???" while a start day is armed
 * (mouse hover previews the end), morphing dashed→solid in place on commit.
 * Renders the same layout as a saved chip so the final swap is invisible. */
function ProvisionalChip({
  lo,
  hi,
  committed,
  onCancel,
}: {
  lo: string;
  hi: string | null;
  committed: boolean;
  onCancel: () => void;
}) {
  const fmt = (d: string) =>
    parseLocalDate(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const [a, b] = hi && hi !== lo ? (hi < lo ? [hi, lo] : [lo, hi]) : [lo, committed ? null : undefined];
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-xs",
        committed ? "border-solid" : "border-dashed border-primary text-primary",
      )}
    >
      <RollingText text={fmt(a)} />
      {b !== null && (
        <>
          <span className="opacity-60">–</span>
          {b ? (
            <>
              <RollingText text={fmt(b)} />
              <span className="opacity-60">
                <RollingText text={`(${datesBetween(a, b).length} days)`} />
              </span>
            </>
          ) : (
            <span className="opacity-60">???</span>
          )}
        </>
      )}
      {/* disabled after commit but kept for width, so the swap to the real chip doesn't jump */}
      <button
        aria-label="Cancel selection"
        disabled={committed}
        className="hover:text-destructive p-0.5 disabled:pointer-events-none text-muted-foreground"
        onClick={onCancel}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** Text whose characters roll in from below when they change (odometer feel).
 * Keyed per position+char: an unchanged char keeps its node and stays still,
 * a changed one remounts and replays the digit-roll animation. */
function RollingText({ text }: { text: string }) {
  return (
    <span className="inline-flex whitespace-pre">
      {text.split("").map((ch, i) => (
        <span key={`${i}${ch}`} className="inline-block" style={{ animation: "digit-roll 0.25s ease-out" }}>
          {ch}
        </span>
      ))}
    </span>
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
  const label = parseLocalDate(slot[which]!).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
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
