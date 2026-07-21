import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiOverrideContext } from "@/hooks/useApi";
import { ActivityOverrideContext } from "@/hooks/useActivity";
import PollCard from "@/components/feed/PollCard";
import EventCard from "@/components/feed/EventCard";
import { createDemoApi, seedDemo, feedSnapshot, DEMO_ACTIVITY_ID, type DemoStore } from "./demoBackend";
import { cn } from "@/lib/utils";

/**
 * Landing-page demo feed: the REAL PollCard/EventCard (and everything they
 * dispatch to — ChoicePoll/DatePoll/RangePoll) driven by an in-memory fake
 * backend instead of the real API, so this can never drift from what those
 * components actually do — see demoBackend.ts for the fake data/mutations.
 */

const TABS = [
  { id: "choice", label: "Poll", hint: "Tap an option to vote — and anyone can add options, not just the creator." },
  { id: "date", label: "Day poll", hint: "Tap a day to vote it, or drag across the calendar to paint several at once." },
  { id: "range", label: "Date range", hint: "Tap a start and end day for a range, or drag. You can vote several ranges." },
  { id: "event", label: "Event", hint: "When a date wins, it becomes an event with RSVPs and a calendar export." },
] as const;

const DWELL_MS = 10_000;
// back-out easing: overshoots a little, so every tab wobbles when the sizes shift
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export default function DemoFeed() {
  const [store] = useState(seedDemo);
  const [api] = useState(() => createDemoApi(store));
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <ApiOverrideContext.Provider value={api}>
      <ActivityOverrideContext.Provider value={{ activity: store.activity }}>
        <QueryClientProvider client={queryClient}>
          {/* PollCard/EventCard call useNavigate()/<Link> for "open poll/
           * event" — react-router forbids nesting a second Router inside
           * the app's real <BrowserRouter>, so those clicks do navigate the
           * real history to a route that doesn't exist; App.tsx's catch-all
           * route falls back to the landing page instead of blanking it */}
          <DemoFeedShell store={store} />
        </QueryClientProvider>
      </ActivityOverrideContext.Provider>
    </ApiOverrideContext.Provider>
  );
}

function DemoFeedShell({ store }: { store: DemoStore }) {
  const { data: feed } = useQuery({
    queryKey: ["feed", DEMO_ACTIVITY_ID],
    queryFn: () => feedSnapshot(store),
    initialData: () => feedSnapshot(store), // synchronous — no loading flash
  });

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

  const cards = [
    <PollCard key="choice" poll={feed.choicePoll} activityId={DEMO_ACTIVITY_ID} memberCount={store.activity.member_count} />,
    <PollCard key="date" poll={feed.datePoll} activityId={DEMO_ACTIVITY_ID} memberCount={store.activity.member_count} />,
    <PollCard key="range" poll={feed.rangePoll} activityId={DEMO_ACTIVITY_ID} memberCount={store.activity.member_count} />,
    <EventCard key="event" event={feed.event} activityId={DEMO_ACTIVITY_ID} />,
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full gap-1.5">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => select(i)}
            className={cn(
              "relative min-w-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap",
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
          {cards.map((panel, i) => (
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
