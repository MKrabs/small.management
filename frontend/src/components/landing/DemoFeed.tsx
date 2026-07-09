import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Plus, X } from "lucide-react";
import type { Event, RSVP } from "@/api/types";
import Crown from "@/components/Crown";
import FeedCard from "@/components/feed/FeedCard";
import { ROWS } from "@/components/feed/EventCard";
import { AvatarRow } from "@/components/poll/ChoicePoll";
import MonthGrid, { datesBetween, toDateStr } from "@/components/poll/MonthGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, downloadIcs, formatDay, formatTime, parseLocalDate } from "@/lib/utils";

/**
 * Landing-page demo feed: the real card visuals (FeedCard, MonthGrid, AvatarRow)
 * driven by local state and sample members — votable, but nothing leaves the page.
 */

type Person = { id: string; display_name: string };

const ME: Person = { id: "me", display_name: "You" };
const ALEX: Person = { id: "p1", display_name: "Alex" };
const SAM: Person = { id: "p2", display_name: "Sam" };
const PRIYA: Person = { id: "p3", display_name: "Priya" };
const JO: Person = { id: "p4", display_name: "Jo" };
const MAREK: Person = { id: "p5", display_name: "Marek" };

const AGO = new Date(Date.now() - 2 * 3600e3).toISOString(); // byline reads "2h ago"

function shiftDay(day: string, n: number): string {
  const d = parseLocalDate(day);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function daysOfMonth(month: Date): string[] {
  const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => toDateStr(new Date(month.getFullYear(), month.getMonth(), i + 1)));
}

const TABS = [
  { id: "choice", label: "Poll", hint: "Tap an option to vote — and anyone can add options, not just the creator." },
  { id: "date", label: "Day poll", hint: "Tap a day to vote it, or drag across the calendar to paint several at once." },
  { id: "range", label: "Date range", hint: "Drag from–to for a range, tap for a single day. You can vote several ranges." },
  { id: "event", label: "Event", hint: "When a date wins, it becomes an event with RSVPs and a calendar export." },
] as const;

const DWELL_MS = 10_000;
// back-out easing: overshoots a little, so every tab wobbles when the sizes shift
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export default function DemoFeed() {
  const [tab, setTab] = useState(0);
  const [gen, setGen] = useState(0); // bumping restarts the dwell timer + progress fill
  const [paused, setPaused] = useState(false); // pointer inside the cards freezes the carousel
  const select = (i: number) => {
    setTab(i);
    setGen((g) => g + 1);
  };

  // auto-advance, unless the visitor is on the cards
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => select((tab + 1) % TABS.length), DWELL_MS);
    return () => clearTimeout(id);
  }, [tab, gen, paused]);

  // like the share button's width, the panel window's height follows the active card
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = panels.current[tab];
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [tab]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full gap-1.5">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => select(i)}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-full border px-3 py-1 text-sm whitespace-nowrap",
              "transition-[flex-grow,color,background-color,border-color] duration-500",
              i === tab
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={{ flexGrow: i === tab ? 1 : 0, transitionTimingFunction: SPRING }}
          >
            {i === tab && (
              <span
                key={gen}
                className="absolute inset-0 origin-left bg-primary-foreground/20"
                style={{
                  animation: `demo-progress ${DWELL_MS}ms linear`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{TABS[tab].hint}</p>

      {/* share-button trick, horizontal: cards scroll in from the side while the
          window's height glides to the incoming card. All four stay mounted so
          demo votes survive the carousel. Outer margin keeps card shadows unclipped. */}
      {/* touch pointers "leave" on lift, so on mobile this pauses per tap-or-drag;
          resuming restarts the full dwell rather than bookkeeping remaining time */}
      <div
        className="overflow-hidden transition-[height] duration-500 -m-2"
        style={{ height }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => {
          setPaused(false);
          setGen((g) => g + 1);
        }}
      >
        <div
          className="flex items-start transition-transform duration-500"
          style={{ transform: `translateX(-${tab * 100}%)`, transitionTimingFunction: SPRING }}
        >
          {[<DemoChoicePoll />, <DemoDayPoll />, <DemoRangePoll />, <DemoEvent />].map((panel, i) => (
            <div
              key={TABS[i].id}
              ref={(el) => {
                panels.current[i] = el;
              }}
              inert={i !== tab}
              className="w-full shrink-0 p-2"
            >
              {panel}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Choice poll ──────────────────────────────────────────────────────────────

function DemoChoicePoll() {
  const [multiple, setMultiple] = useState(false);
  const [options, setOptions] = useState<{ label: string; voters: Person[] }[]>([
    { label: "Pizza night at Sam's", voters: [ALEX, SAM] },
    { label: "Ramen bar downtown", voters: [PRIYA, JO, MAREK] },
    { label: "Picnic in the park", voters: [] },
  ]);
  const [myVotes, setMyVotes] = useState<Set<number>>(new Set());

  const vote = (i: number) =>
    setMyVotes((prev) => {
      if (prev.has(i)) {
        const next = new Set(prev);
        next.delete(i);
        return next;
      }
      return multiple ? new Set(prev).add(i) : new Set([i]);
    });

  const switchMode = (m: boolean) => {
    setMultiple(m);
    // single choice keeps at most one of my votes, like the server would
    if (!m) setMyVotes((prev) => new Set([...prev].slice(0, 1)));
  };

  const votersOf = (i: number) => (myVotes.has(i) ? [...options[i].voters, ME] : options[i].voters);
  const max = Math.max(1, ...options.map((_, i) => votersOf(i).length));
  const voterCount = 5 + (myVotes.size > 0 ? 1 : 0);

  return (
    <FeedCard
      type="Poll"
      votes={`${voterCount} of 6 voted`}
      by={{ name: "Alex", at: AGO }}
      title={<h3 className="font-medium">Where should we celebrate the season finale?</h3>}
    >
      <div className="flex gap-1.5 text-xs">
        {([false, true] as const).map((m) => (
          <button
            key={String(m)}
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-full border px-2 py-0.5 transition-colors",
              multiple === m ? "border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m ? "multiple choice" : "single choice"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => {
          const voters = votersOf(i);
          const mine = myVotes.has(i);
          return (
            <button
              key={i}
              onClick={() => vote(i)}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
                mine ? "border-primary" : "hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 transition-[width] duration-300",
                  mine ? "bg-primary/15" : "bg-muted",
                )}
                style={{ width: `${(voters.length / max) * 100}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className={cn("flex items-center gap-1.5 min-w-0", mine && "font-medium")}>
                  <span className="truncate">{opt.label}</span>
                  {max >= 2 && voters.length === max && <Crown className="h-3 w-4 shrink-0 text-amber-500" />}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <AvatarRow voters={voters} />
                  <span className="text-xs text-muted-foreground w-4 text-right">{voters.length}</span>
                </span>
              </span>
            </button>
          );
        })}
        <DemoAddOption onAdd={(label) => setOptions((p) => [...p, { label, voters: [] }])} />
      </div>
    </FeedCard>
  );
}

function DemoAddOption({ onAdd }: { onAdd: (label: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const submit = () => {
    if (!label.trim()) return;
    onAdd(label.trim());
    setLabel("");
    setEditing(false);
  };
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Plus className="size-3.5" />
        Add option
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <Input
        className="flex-1 h-8 text-sm"
        placeholder="New option…"
        value={label}
        autoFocus
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button size="sm" onClick={submit} disabled={!label.trim()}>
        Add
      </Button>
    </div>
  );
}

// ─── Day poll ─────────────────────────────────────────────────────────────────

function DemoDayPoll() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string[] | null>(null);
  const todayStr = toDateStr(new Date());

  // fake crowd: upcoming weekends look popular
  const others = (day: string): number =>
    day <= todayStr ? 0 : ({ 5: 1, 6: 3, 0: 2 } as Record<number, number>)[parseLocalDate(day).getDay()] ?? 0;
  const count = (day: string) => others(day) + (mine.has(day) ? 1 : 0);

  const commit = (days: string[]) => {
    setPreview(null);
    setMine((prev) => {
      const next = new Set(prev);
      const unvoted = days.filter((d) => !prev.has(d));
      if (unvoted.length > 0) unvoted.forEach((d) => next.add(d));
      else days.forEach((d) => next.delete(d));
      return next;
    });
  };

  const previewSet = new Set(preview ?? []);
  const maxCount = Math.max(0, ...daysOfMonth(month).map(count));

  return (
    <FeedCard
      type="Day poll"
      votes={`${3 + (mine.size > 0 ? 1 : 0)} of 6 voted`}
      by={{ name: "Sam", at: AGO }}
      title={<h3 className="font-medium">When works for the weekend getaway?</h3>}
    >
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        onTap={(day) => commit([day])}
        onDragMove={setPreview}
        onDragEnd={commit}
        dragMode="paint"
        dayCell={(day) => {
          const isMine = mine.has(day);
          const filled = isMine || previewSet.has(day);
          const c = count(day);
          const othersN = c - (isMine ? 1 : 0);
          const top = maxCount >= 2 && c === maxCount;
          return {
            className: cn(
              filled && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
              !filled && othersN > 0 && (othersN >= 3 ? "bg-primary/25" : "bg-primary/10"),
            ),
            content: (
              <>
                {top && <Crown className={cn("absolute top-0.5 right-1 h-2.5 w-3.5", filled ? "text-primary-foreground" : "text-amber-500")} />}
                {c > 0 && (
                  <span className={cn("text-[9px] leading-none mt-0.5", filled ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {c}
                  </span>
                )}
              </>
            ),
          };
        }}
      />
    </FeedCard>
  );
}

// ─── Range poll ───────────────────────────────────────────────────────────────

function DemoRangePoll() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [myRanges, setMyRanges] = useState<{ date: string; date_end: string }[]>([]);
  const [preview, setPreview] = useState<string[] | null>(null);

  // two fake availabilities just ahead of today
  const fake = useMemo(() => {
    const today = toDateStr(new Date());
    return [
      new Set(datesBetween(shiftDay(today, 3), shiftDay(today, 7))),
      new Set(datesBetween(shiftDay(today, 5), shiftDay(today, 10))),
    ];
  }, []);

  const myDays = useMemo(() => {
    const s = new Set<string>();
    for (const r of myRanges) datesBetween(r.date, r.date_end).forEach((d) => s.add(d));
    return s;
  }, [myRanges]);

  const count = (day: string) => fake.filter((f) => f.has(day)).length + (myDays.has(day) ? 1 : 0);

  const add = (days: string[]) => {
    setPreview(null);
    setMyRanges((p) => [...p, { date: days[0], date_end: days[days.length - 1] }]);
  };

  const previewSet = new Set(preview ?? []);
  const maxVoters = Math.max(0, ...daysOfMonth(month).map(count));

  return (
    <FeedCard
      type="Date range poll"
      votes={`${2 + (myRanges.length > 0 ? 1 : 0)} of 6 voted`}
      by={{ name: "Priya", at: AGO }}
      title={<h3 className="font-medium">Which week for the cabin trip?</h3>}
    >
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        onTap={(day) => add([day])}
        onDragMove={setPreview}
        onDragEnd={add}
        dayCell={(day) => {
          const isMine = myDays.has(day);
          const inPreview = previewSet.has(day);
          const filled = isMine || inPreview;
          const c = count(day);
          const othersN = c - (isMine ? 1 : 0);
          const top = maxVoters >= 2 && c === maxVoters;
          return {
            className: cn(
              filled && "bg-primary text-primary-foreground font-medium hover:bg-primary/90",
              ((isMine && myDays.has(shiftDay(day, -1))) || (inPreview && previewSet.has(shiftDay(day, -1)))) && "rounded-l-none",
              ((isMine && myDays.has(shiftDay(day, 1))) || (inPreview && previewSet.has(shiftDay(day, 1)))) && "rounded-r-none",
              !filled && othersN > 0 && (othersN >= 3 ? "bg-primary/25" : "bg-primary/10"),
            ),
            content: (
              <>
                {top && <Crown className={cn("absolute top-0.5 right-1 h-2.5 w-3.5", filled ? "text-primary-foreground" : "text-amber-500")} />}
                {c > 0 && (
                  <span className={cn("text-[9px] leading-none mt-0.5", filled ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {c}
                  </span>
                )}
              </>
            ),
          };
        }}
      />
      {myRanges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {myRanges.map((r, i) => (
            <span key={`${r.date}-${i}`} className="flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-xs">
              {formatDay(r.date)}
              {r.date !== r.date_end && (
                <>
                  <span className="text-muted-foreground">–</span>
                  {formatDay(r.date_end)}
                  <span className="text-muted-foreground">({datesBetween(r.date, r.date_end).length} days)</span>
                </>
              )}
              <button
                aria-label="Remove range"
                className="text-muted-foreground hover:text-destructive p-0.5"
                onClick={() => setMyRanges((p) => p.filter((_, j) => j !== i))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </FeedCard>
  );
}

// ─── Event ────────────────────────────────────────────────────────────────────

function DemoEvent() {
  const [my, setMy] = useState<RSVP["status"] | null>(null);

  const event = useMemo<Event>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (((6 - d.getDay()) % 7) || 7)); // next Saturday
    return {
      id: 0,
      cycle_id: null,
      poll_id: null,
      date: toDateStr(d),
      time_start: "15:00:00",
      time_end: null,
      note: "Lakeside cabin — bring board games.",
      created_by: null,
      rsvps: [],
      comment_count: 0,
      latest_comments: [],
      created_at: AGO,
      deleted_at: null,
    };
  }, []);

  const base: Record<RSVP["status"], Person[]> = {
    going: [ALEX, SAM, PRIYA],
    maybe: [JO],
    not_going: [],
  };
  const votersOf = (s: RSVP["status"]) => (my === s ? [...base[s], ME] : base[s]);
  const max = Math.max(1, ...ROWS.map((r) => votersOf(r.status).length));

  return (
    <FeedCard type="Event" marker>
      <div className="@container">
        <div className="flex flex-col @md:flex-row gap-4">
          <div className="flex-1 min-w-0 flex flex-col gap-3 @md:justify-between">
            <div>
              <h3 className="font-serif text-4xl leading-tight">{formatDay(event.date, { weekday: "long" })}</h3>
              <p className="text-3xl leading-tight">{formatDay(event.date, { day: "numeric", month: "long" })}</p>
              <p className="text-lg leading-tight">{formatTime(event.time_start!)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{event.note}</p>
          </div>

          <div className="@md:w-36 shrink-0 flex flex-col gap-4 @md:justify-between">
            <div className="flex flex-col gap-2.5">
              {ROWS.map(({ status, icon, label, bar, selected }) => {
                const voters = votersOf(status);
                const isMine = my === status;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full ml-auto transition-[width] duration-300", bar)}
                          style={{ width: `${(voters.length / max) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <AvatarRow voters={voters} />
                      </div>
                    </div>
                    <button
                      onClick={() => setMy(isMine ? null : status)}
                      aria-label={isMine ? `Retract RSVP ${label}` : `RSVP ${label}`}
                      className={cn(
                        "size-7 shrink-0 rounded-full border text-xs font-semibold transition-colors",
                        isMine ? selected : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {icon}
                    </button>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadIcs(event, "Weekend getaway")}>
              <CalendarPlus data-icon="inline-start" />
              Add to calendar
            </Button>
          </div>
        </div>
      </div>
    </FeedCard>
  );
}
