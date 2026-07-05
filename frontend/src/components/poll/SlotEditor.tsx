import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Slot } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MonthGrid from "./MonthGrid";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_TOGGLE, type VoteStatus } from "@/lib/status";
import { cn, formatTime, parseLocalDate } from "@/lib/utils";

type Entry = {
  key: string; // stable local list key
  id?: number; // backend id when the entry already exists
  date: string; // "YYYY-MM-DD"
  status: VoteStatus;
  time_start: string; // "HH:MM" or "" = all day
  time_end: string;
  note: string;
  showNote: boolean;
};

type Props = {
  activityId: string;
  pollId: string;
  mySlots: Slot[];
  onClose: () => void;
};

const STATUS_DOT: Record<VoteStatus, string> = {
  yes: "bg-green-500",
  maybe: "bg-orange-400",
  no: "bg-red-500",
};

let localKey = 0;

export default function SlotEditor({ activityId, pollId, mySlots, onClose }: Props) {
  const api = useApi();
  const qc = useQueryClient();

  const [entries, setEntries] = useState<Entry[]>(() =>
    mySlots
      .filter((s) => s.date) // general (no-date) votes aren't calendar entries
      .map((s) => ({
        key: `slot-${s.id}`,
        id: s.id,
        date: s.date!,
        status: s.status,
        time_start: s.time_start ? formatTime(s.time_start) : "",
        time_end: s.time_end ? formatTime(s.time_end) : "",
        note: s.note,
        showNote: !!s.note,
      })),
  );
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      map.set(e.date, [...(map.get(e.date) ?? []), e]);
    }
    return map;
  }, [entries]);

  const dates = [...byDate.keys()].sort();

  const toggleDay = (dateStr: string) => {
    setEntries((prev) =>
      prev.some((e) => e.date === dateStr)
        ? prev.filter((e) => e.date !== dateStr)
        : [...prev, newEntry(dateStr)],
    );
  };

  const addSlot = (dateStr: string) => setEntries((prev) => [...prev, newEntry(dateStr)]);

  const updateEntry = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const removeEntry = (key: string) => setEntries((prev) => prev.filter((e) => e.key !== key));

  const save = async () => {
    setSaving(true);
    setError(false);
    const base = `/activities/${activityId}/polls/${pollId}/slots/`;
    const originals = new Map(mySlots.filter((s) => s.date).map((s) => [s.id, s]));
    try {
      for (const e of entries) {
        const body = {
          status: e.status,
          date: e.date,
          time_start: e.time_start && e.time_end ? e.time_start : null,
          time_end: e.time_start && e.time_end ? e.time_end : null,
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
      setError(true);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-4 pb-28 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Your availability</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <MonthGrid
          month={month}
          onMonthChange={setMonth}
          onTap={toggleDay}
          dayCell={(dateStr) => {
            const statuses = [...new Set((byDate.get(dateStr) ?? []).map((e) => e.status))];
            return {
              className: statuses.length > 0 ? "bg-muted font-medium" : undefined,
              content: (
                <span className="flex gap-0.5 h-1.5 mt-0.5">
                  {statuses.map((s) => (
                    <span key={s} className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />
                  ))}
                </span>
              ),
            };
          }}
        />

        <div className="flex flex-col gap-3">
          {dates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tap days on the calendar to add your availability.
            </p>
          )}
          {dates.map((date) => (
            <DayCard
              key={date}
              date={date}
              entries={byDate.get(date)!}
              onUpdate={updateEntry}
              onRemove={removeEntry}
              onAddSlot={() => addSlot(date)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-destructive">Saving failed — try again.</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4">
        <div className="mx-auto max-w-2xl px-4">
          <Button className="w-full" size="lg" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function newEntry(dateStr: string): Entry {
  return {
    key: `new-${localKey++}`,
    date: dateStr,
    status: "yes",
    time_start: "",
    time_end: "",
    note: "",
    showNote: false,
  };
}

// ─── Day entry card ──────────────────────────────────────────────────────────

function DayCard({
  date,
  entries,
  onUpdate,
  onRemove,
  onAddSlot,
}: {
  date: string;
  entries: Entry[];
  onUpdate: (key: string, patch: Partial<Entry>) => void;
  onRemove: (key: string) => void;
  onAddSlot: () => void;
}) {
  return (
    <div className="border rounded-lg p-3 flex flex-col gap-3">
      <p className="text-sm font-medium">
        {parseLocalDate(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {entries.map((e) => (
        <div key={e.key} className="flex flex-col gap-2 border-l-2 pl-3">
          <div className="flex items-center justify-between gap-2">
            {/* Status pills */}
            <ToggleGroup
              value={[e.status]}
              onValueChange={(v) => v.length && onUpdate(e.key, { status: v[0] as VoteStatus })}
              variant="outline"
              size="sm"
              spacing={1}
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
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onUpdate(e.key, { showNote: !e.showNote })}
                className={e.note ? "text-primary" : "text-muted-foreground"}
                aria-label="Note"
              >
                <MessageSquare />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(e.key)}
                className="text-muted-foreground"
                aria-label="Remove slot"
              >
                <X />
              </Button>
            </div>
          </div>

          {/* Time range — empty = all day */}
          <div className="flex items-center gap-2 text-sm">
            <Input
              type="time"
              step={1800}
              className="h-8 w-auto"
              value={e.time_start}
              onChange={(ev) => onUpdate(e.key, { time_start: ev.target.value })}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              step={1800}
              className="h-8 w-auto"
              value={e.time_end}
              onChange={(ev) => onUpdate(e.key, { time_end: ev.target.value })}
            />
            {!e.time_start && !e.time_end && (
              <span className="text-xs text-muted-foreground">all day</span>
            )}
          </div>

          {e.showNote && (
            <Input
              className="h-8"
              placeholder="Note — e.g. “only after work”"
              value={e.note}
              onChange={(ev) => onUpdate(e.key, { note: ev.target.value })}
            />
          )}
        </div>
      ))}

      <button
        onClick={onAddSlot}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <Plus className="size-3" /> add another slot
      </button>
    </div>
  );
}
