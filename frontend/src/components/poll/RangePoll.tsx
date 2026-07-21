import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, RotateCcw } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Member, Poll, Slot } from "@/api/types";
import { borderColor } from "@/components/UserAvatar";
import Crown from "@/components/Crown";
import MonthGrid, { datesBetween, type MonthBar } from "./MonthGrid";
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

  // spotlight: hovering a member's bar (or their legend entry), one of my
  // chips, "You" in the legend, or my pill on the calendar shows that
  // range/member normally and desaturates the other bars
  const [barHover, setBarHover] = useState<string | null>(null);
  const [chipHover, setChipHover] = useState<number | null>(null);
  const [meHover, setMeHover] = useState(false);
  const pillSlot =
    !pending && !active && !barHover && !chipHover && !meHover && hover
      ? myRanges.find((s) => hover >= s.date! && hover <= s.date_end!) ?? null
      : null;
  const spot = chipHover
    ? { slot: myRanges.find((s) => s.id === chipHover) ?? null }
    : barHover
      ? { member: barHover }
      : meHover
        ? { mine: true as const }
        : pillSlot
          ? { slot: pillSlot }
          : null;
  const spotRange = spot && "slot" in spot ? spot.slot : null;
  const spotMine = !!spot && "mine" in spot;

  // clicking a name in the legend hides their bars from the calendar
  // (stacks — multiple members can be hidden at once); doesn't touch votes
  const [hiddenMembers, setHiddenMembers] = useState<Set<string>>(new Set());
  const toggleHidden = (id: string) =>
    setHiddenMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  const busy = createMut.isPending || moveMut.isPending || deleteMut.isPending;
  // crown the leading day(s) — needs a real lead, not everyone's lone vote
  const maxVoters = Math.max(0, ...[...countByDay.values()].map((s) => s.size));

  const myMember = activity?.me ?? null;

  // continuous multi-day bars for MonthGrid's overlay: everyone else's saved
  // ranges, mine, the live drag preview, and the tap–tap ghost — one
  // mechanism for all of them instead of a separate per-day fill/lane
  // system. Lanes are packed by MonthGrid itself, from actual date overlap
  // — not reserved per member — so this only needs to supply colors.
  const bars: MonthBar[] = useMemo(() => {
    const list: MonthBar[] = [];
    for (const s of slots) {
      if (!s.date || !s.date_end || s.member.id === myId || hiddenMembers.has(s.member.id)) continue;
      list.push({
        key: `slot-${s.id}`,
        startDate: s.date,
        endDate: s.date_end,
        color: memberColor(s.member),
        dimmed: !!spot && !("member" in spot && spot.member === s.member.id),
        onPointerEnter: (e) => e.pointerType === "mouse" && setBarHover(s.member.id),
        onPointerLeave: () => setBarHover(null),
      });
    }
    const meHidden = !!myId && hiddenMembers.has(myId);
    // while previewing a move for a slot (active + hovering), its normal
    // bar is replaced by the ghost preview below instead of showing both
    const previewingSlotId = active && hover ? active.slotId : null;
    if (!meHidden) {
      for (const s of myRanges) {
        if (s.id === previewingSlotId) continue;
        list.push({
          key: `mine-${s.id}`,
          startDate: s.date!,
          endDate: s.date_end!,
          // your own real color (avatar/name), same mechanism as everyone
          // else — a legend row below the calendar spells out who's who
          color: memberColor(s.member),
          dimmed: !!spot && !spotMine && !(spotRange && spotRange.id === s.id),
          // hovering your own bar spotlights it the same way hovering its chip does
          onPointerEnter: (e) => e.pointerType === "mouse" && setChipHover(s.id),
          onPointerLeave: () => setChipHover(null),
        });
      }
    }
    // the live drag preview / tap–tap ghost stay visible even if you've
    // hidden your own saved votes — it's active feedback, not a saved vote
    if (myMember && preview && preview.length) {
      list.push({ key: "preview", startDate: preview[0], endDate: preview[preview.length - 1], color: memberColor(myMember) });
    }
    if (myMember && pending && hover) {
      const [lo, hi] = hover <= pending ? [hover, pending] : [pending, hover];
      list.push({ key: "ghost", startDate: lo, endDate: hi, color: memberColor(myMember), variant: "ghost" });
    }
    // same preview, for moving an endpoint: hovering the calendar while a
    // date is activated for editing previews where that move would land
    if (myMember && active && hover) {
      const slot = myRanges.find((s) => s.id === active.slotId);
      if (slot) {
        const other = active.which === "date" ? slot.date_end! : slot.date!;
        const [lo, hi] = hover <= other ? [hover, other] : [other, hover];
        list.push({ key: "ghost", startDate: lo, endDate: hi, color: memberColor(myMember), variant: "ghost" });
      }
    }
    return list;
  }, [slots, myId, myRanges, myMember, preview, pending, hover, active, spot, spotRange, spotMine, hiddenMembers]);

  // color key so bars are actually decodable at a glance, not just "mine vs
  // everyone else" — dedup by member, mine first
  const legend = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; isMe: boolean }>();
    for (const s of slots) {
      if (!s.date || !s.date_end || map.has(s.member.id)) continue;
      map.set(s.member.id, {
        id: s.member.id,
        name: s.member.id === myId ? "You" : s.member.display_name,
        color: memberColor(s.member),
        isMe: s.member.id === myId,
      });
    }
    return [...map.values()].sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : a.name.localeCompare(b.name)));
  }, [slots, myId]);

  // hover/hide state can end up pointing at a member or slot a vote deletion
  // (yours or, live, someone else's) just removed. The element that would've
  // cleared it via onMouseLeave is gone before the pointer can actually
  // leave it, so without this the reference sticks forever: spotlight stays
  // permanently on (dimming everyone else with nothing to show), and a
  // hidden member can vanish from the legend while still counting toward
  // hiddenMembers, leaving the reset icon stuck with nothing left to reset.
  useEffect(() => {
    const memberIds = new Set(legend.map((m) => m.id));
    if (barHover !== null && !memberIds.has(barHover)) setBarHover(null);
    if (chipHover !== null && !myRanges.some((s) => s.id === chipHover)) setChipHover(null);
    if (meHover && myRanges.length === 0) setMeHover(false);
    setHiddenMembers((prev) => {
      const next = new Set([...prev].filter((id) => memberIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [legend, myRanges, barHover, chipHover, meHover]);

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
        bars={bars}
        dayCell={(day) => {
          const voters = countByDay.get(day)?.size ?? 0;
          const top = maxVoters >= 2 && voters === maxVoters;
          return {
            // armed start day: outline, not filled — it isn't a vote yet
            className: cn(day === pending && "ring-2 ring-primary ring-inset font-medium"),
            content: top && <Crown className="absolute top-0.5 right-1 h-2.5 w-3.5 text-amber-500" />,
          };
        }}
      />

      {legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {legend.map((m) => {
            const hidden = hiddenMembers.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={cn("flex items-center gap-1 transition-opacity duration-200", hidden && "opacity-40 line-through")}
                onMouseEnter={() => (m.isMe ? setMeHover(true) : setBarHover(m.id))}
                onMouseLeave={() => (m.isMe ? setMeHover(false) : setBarHover(null))}
                onClick={() => toggleHidden(m.id)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.name}
              </button>
            );
          })}
          {hiddenMembers.size > 0 && (
            <button
              type="button"
              aria-label="Show everyone"
              className="text-muted-foreground hover:text-foreground"
              style={{ animation: "bar-fade-in 200ms ease-out" }}
              onClick={() => setHiddenMembers(new Set())}
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>
      )}

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
        <span
          key={s.id}
          className="flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-xs"
          onMouseEnter={() => setChipHover(s.id)}
          onMouseLeave={() => setChipHover(null)}
        >
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

/** Bar color for a member: their avatar's border color, else the same
 * name-hash hue UserAvatar's fallback uses, at matching saturation. */
function memberColor(m: Member): string {
  if (m.avatar) return borderColor(m.avatar.border);
  let hue = 0;
  for (const c of m.display_name) hue = (hue * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${hue} 45% 60%)`;
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
