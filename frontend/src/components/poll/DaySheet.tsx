import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import type { Slot } from "@/api/types";
import BottomSheet from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_ICON, STATUS_TEXT, STATUS_TOGGLE, type VoteStatus } from "@/lib/status";
import { cn, formatTime, parseLocalDate } from "@/lib/utils";

const CELLS = 48; // 24h × 30min
const CELL_W = 24; // px

const PAINT: Record<VoteStatus, string> = {
  yes: "bg-green-500/80",
  maybe: "bg-yellow-400/80",
  no: "bg-red-500/80",
};
const DOT: Record<VoteStatus, string> = {
  yes: "bg-green-500",
  maybe: "bg-yellow-400",
  no: "bg-red-500",
};

type Entry = {
  key: string;
  id?: number;
  status: VoteStatus;
  start: number | null; // minutes since midnight; null = all day
  end: number | null;
  note: string;
  showNote: boolean;
};

let localKey = 0;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fmtMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Adjacent same-status spans become one; their comments join up.
function mergeEntries(list: Entry[]): Entry[] {
  const allDay = list.filter((e) => e.start === null);
  const timed = [...list.filter((e) => e.start !== null)].sort((a, b) => a.start! - b.start!);
  const out: Entry[] = [];
  for (const e of timed) {
    const prev = out[out.length - 1];
    if (prev && prev.end === e.start && prev.status === e.status) {
      prev.end = e.end;
      prev.note = [prev.note, e.note].filter(Boolean).join(" · ");
      prev.showNote = prev.showNote || e.showNote;
    } else {
      out.push({ ...e });
    }
  }
  return [...allDay, ...out];
}

/**
 * Per-day availability editor: pick yes/maybe/no, then drag across the
 * timeline to paint 30-min slots (empty ranges only). Painted slots are
 * listed below with an optional comment each; touching same-status slots
 * merge. Other members' votes for the day are shown read-only.
 */
export default function DaySheet({
  activityId,
  pollId,
  date,
  slots,
  myId,
  onClose,
}: {
  activityId: string;
  pollId: string;
  date: string;
  slots: Slot[];
  myId?: string;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();

  const mine = useMemo(
    () => slots.filter((s) => s.date === date && !s.deleted_at && s.member.id === myId),
    [slots, date, myId],
  );
  const others = useMemo(
    () =>
      slots
        .filter((s) => s.date === date && !s.deleted_at && s.member.id !== myId)
        .sort((a, b) => (a.time_start ?? "").localeCompare(b.time_start ?? "")),
    [slots, date, myId],
  );

  const [entries, setEntries] = useState<Entry[]>(() =>
    mine.map((s) => ({
      key: `slot-${s.id}`,
      id: s.id,
      status: s.status,
      start: s.time_start && s.time_end ? toMin(formatTime(s.time_start)) : null,
      end: s.time_start && s.time_end ? toMin(formatTime(s.time_end)) : null,
      note: s.note,
      showNote: !!s.note,
    })),
  );
  const [paintStatus, setPaintStatus] = useState<VoteStatus>("yes");
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAllDay = entries.some((e) => e.start === null);

  const occupied = (idx: number) =>
    entries.some((e) => e.start === null || (e.start! <= idx * 30 && idx * 30 < e.end!));

  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // start the view at 08:00 — night hours are reachable by scrolling left.
    // rAF: the drawer is still animating in when the effect fires.
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: 16 * CELL_W - 8 });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const cellAt = (clientX: number) => {
    const rect = stripRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(CELLS - 1, Math.floor((clientX - rect.left) / CELL_W)));
  };

  // Extend from the anchor toward the pointer, stopping at occupied cells.
  const clampTo = (from: number, target: number) => {
    const step = target >= from ? 1 : -1;
    let last = from;
    for (let i = from + step; step > 0 ? i <= target : i >= target; i += step) {
      if (occupied(i)) break;
      last = i;
    }
    return last;
  };

  const startPaint = (e: React.PointerEvent) => {
    const idx = cellAt(e.clientX);
    if (occupied(idx) || hasAllDay) return;
    stripRef.current!.setPointerCapture(e.pointerId);
    setDrag({ from: idx, to: idx });
  };
  const movePaint = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ from: drag.from, to: clampTo(drag.from, cellAt(e.clientX)) });
  };
  const endPaint = () => {
    if (!drag) return;
    const lo = Math.min(drag.from, drag.to);
    const hi = Math.max(drag.from, drag.to);
    setEntries((prev) =>
      mergeEntries([
        ...prev,
        {
          key: `new-${localKey++}`,
          status: paintStatus,
          start: lo * 30,
          end: (hi + 1) * 30,
          note: "",
          showNote: false,
        },
      ]),
    );
    setDrag(null);
  };

  const inDrag = (idx: number) =>
    drag && idx >= Math.min(drag.from, drag.to) && idx <= Math.max(drag.from, drag.to);

  const cellColor = (idx: number): string | null => {
    if (inDrag(idx)) return PAINT[paintStatus];
    const e = entries.find(
      (en) => en.start === null || (en.start! <= idx * 30 && idx * 30 < en.end!),
    );
    return e ? PAINT[e.status] : null;
  };

  const addAllDay = () =>
    setEntries((prev) => [
      { key: `new-${localKey++}`, status: paintStatus, start: null, end: null, note: "", showNote: false },
      ...prev,
    ]);

  const updateEntry = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const removeEntry = (key: string) => setEntries((prev) => prev.filter((e) => e.key !== key));

  const save = async () => {
    setSaving(true);
    const base = `/activities/${activityId}/polls/${pollId}/slots/`;
    const originals = new Map(mine.map((s) => [s.id, s]));
    try {
      for (const e of entries) {
        const body = {
          status: e.status,
          date,
          time_start: e.start !== null ? fmtMin(e.start) : null,
          time_end: e.end !== null ? fmtMin(e.end) : null,
          note: e.note.trim(),
        };
        if (e.id === undefined) {
          await api.post(base, body, activityId);
        } else {
          const o = originals.get(e.id)!;
          const changed =
            o.status !== body.status ||
            (o.time_start ? formatTime(o.time_start) : null) !== body.time_start ||
            (o.time_end ? formatTime(o.time_end) : null) !== body.time_end ||
            o.note !== body.note;
          if (changed) await api.patch(`${base}${e.id}/`, body, activityId);
        }
      }
      const keptIds = new Set(entries.map((e) => e.id));
      for (const id of originals.keys()) {
        if (!keptIds.has(id)) await api.del(`${base}${id}/`, activityId);
      }
      qc.invalidateQueries({ queryKey: ["slots", activityId, pollId] });
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onClose();
    } catch {
      toast.error("Saving failed — try again.");
      setSaving(false);
    }
  };

  const sorted = [...entries].sort((a, b) => (a.start ?? -1) - (b.start ?? -1));
  const dayLabel = parseLocalDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <BottomSheet onClose={onClose} title={dayLabel}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">{dayLabel}</h2>
      </div>

      {/* Status to paint with + all-day shortcut */}
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          value={[paintStatus]}
          onValueChange={(v) => v.length && setPaintStatus(v[0] as VoteStatus)}
          variant="outline"
          size="sm"
        >
          {(["yes", "maybe", "no"] as const).map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              className={cn("rounded-full capitalize text-muted-foreground", STATUS_TOGGLE[s])}
            >
              {s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={addAllDay} disabled={entries.length > 0}>
          All day
        </Button>
      </div>

      {/* Timeline — drag across empty cells to paint */}
      <div ref={scrollRef} className="overflow-x-auto -mx-6 px-6 pb-1">
        <div className="w-fit">
          <div
            ref={stripRef}
            className="flex touch-none select-none rounded-md overflow-hidden border"
            onPointerDown={startPaint}
            onPointerMove={movePaint}
            onPointerUp={endPaint}
            onPointerCancel={() => setDrag(null)}
          >
            {Array.from({ length: CELLS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-10 shrink-0 border-r last:border-r-0",
                  i % 2 === 1 ? "border-r-border" : "border-r-border/40",
                  cellColor(i) ?? "bg-muted/40",
                )}
                style={{ width: CELL_W }}
              />
            ))}
          </div>
          <div className="flex text-[10px] text-muted-foreground tabular-nums mt-0.5">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} style={{ width: CELL_W * 4 }} className="shrink-0">
                {String(i * 2).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        {hasAllDay ? "All-day entry covers the whole timeline." : "Drag across the timeline to add a time span."}
      </p>

      {/* Your slots */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-2">
          {sorted.map((e) => (
            <div key={e.key} className="border rounded-lg p-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full shrink-0", DOT[e.status])} />
                <span className="text-sm font-medium flex-1">
                  {e.start !== null ? `${fmtMin(e.start)} – ${fmtMin(e.end!)}` : "All day"}
                  <span className="text-muted-foreground font-normal capitalize"> · {e.status}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => updateEntry(e.key, { showNote: !e.showNote })}
                  className={e.note ? "text-primary" : "text-muted-foreground"}
                  aria-label="Comment"
                >
                  <MessageSquare />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeEntry(e.key)}
                  className="text-muted-foreground"
                  aria-label="Remove slot"
                >
                  <X />
                </Button>
              </div>
              {e.showNote && (
                <Input
                  className="h-8"
                  placeholder="Comment — e.g. “only after work”"
                  value={e.note}
                  onChange={(ev) => updateEntry(e.key, { note: ev.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Everyone else, read-only */}
      {others.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Others</h3>
          {others.map((s) => (
            <p key={s.id} className="text-sm flex items-baseline gap-2">
              <span className={cn("font-semibold w-3 text-center shrink-0", STATUS_TEXT[s.status])}>
                {STATUS_ICON[s.status]}
              </span>
              <span className="truncate">{s.member.display_name}</span>
              <span className="text-muted-foreground shrink-0">
                {s.time_start && s.time_end
                  ? `${formatTime(s.time_start)}–${formatTime(s.time_end)}`
                  : "all day"}
              </span>
              {s.note && <span className="text-xs text-muted-foreground truncate">“{s.note}”</span>}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </BottomSheet>
  );
}
