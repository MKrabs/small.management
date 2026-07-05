import { useState } from "react";
import { Link } from "react-router-dom";
import ChatIllustration from "@/components/landing/ChatIllustration";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity, User } from "@/api/types";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  const { user } = useAuth();
  return user ? <LoggedInHome user={user} /> : <MarketingHome />;
}

// ─── Logged-in home ───────────────────────────────────────────────────────────

function LoggedInHome({ user }: { user: User }) {
  const api = useApi();
  const activitiesQ = useQuery({
    queryKey: ["my-activities"],
    queryFn: () => api.get<Activity[]>("/activities/"),
  });

  const initials = user.display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg select-none shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold">{user.display_name}</p>
          <p className="text-xs text-muted-foreground">
            Member since{" "}
            {new Date(user.created_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your activities</h2>
          <Link to="/new" className={buttonVariants({ size: "sm" })}>
            New activity
          </Link>
        </div>

        {activitiesQ.isPending && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}

        {activitiesQ.data?.length === 0 && (
          <div className="border border-dashed rounded-lg p-8 text-center flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">No activities yet.</p>
            <Link to="/new" className="text-sm underline underline-offset-2">
              Create your first one
            </Link>
          </div>
        )}

        {activitiesQ.data && activitiesQ.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {activitiesQ.data.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/activity/${a.short_id}/${a.slug}`}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.member_count} member{a.member_count !== 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Marketing home ───────────────────────────────────────────────────────────

function MarketingHome() {
  return (
    <div className="mx-auto max-w-2xl px-4 flex flex-col">
      {/* Hero */}
      <section className="flex flex-col md:grid md:grid-cols-2 md:gap-10 md:items-center py-16 min-h-[78svh]">
        {/* Mobile-only title — appears first */}
        <h1 className="md:hidden font-semibold tracking-tight leading-tight whitespace-nowrap mb-4 text-[clamp(1.4rem,7vw,2.25rem)]">
          small.management
        </h1>

        {/* Illustration — second on mobile, right col on desktop */}
        <ChatIllustration />

        {/* Left col on desktop: all copy */}
        <div className="flex flex-col gap-6 mt-6 md:mt-0 md:order-first">
          <div className="flex flex-col gap-4">
            <h1 className="hidden md:block text-4xl font-semibold tracking-tight leading-tight">
              small.management
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              <strong className="text-foreground font-bold">Plan events</strong>{" "}
              with your people.{" "}
              <Squiggle>Polls, dates and decisions</Squiggle> — no accounts
              required, nothing tracked.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs">
            <Link to="/new" className={buttonVariants({ size: "lg" })}>
              Create an activity
            </Link>
            <p className="text-xs text-muted-foreground pl-1">
              Have a link?{" "}
              <span className="italic">Paste it in your browser to join.</span>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="underline underline-offset-2">
              Log in
            </Link>
            {" or "}
            <Link to="/register" className="underline underline-offset-2">
              register
            </Link>
            {" to keep activities across devices."}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 flex flex-col gap-6 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="text-xl font-semibold mt-1">Try it right here</h2>
        </div>
        <div className="flex flex-col gap-4">
          <DemoPoll />
          <DemoProposal />
          <DemoEvent />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-medium">small.management</span>
        <span className="flex gap-4">
          <span>no accounts required</span>
          <span>·</span>
          <span>no tracking</span>
          <span>·</span>
          <span>self-hostable</span>
        </span>
      </footer>
    </div>
  );
}

// ─── Squiggle highlight ───────────────────────────────────────────────────────

function Squiggle({ children }: { children: React.ReactNode }) {
  return <span className="marker-highlight">{children}</span>;
}

// ─── Demo components (local state, no API) ────────────────────────────────────

type Vote = "yes" | "maybe" | "no";

const VOTE_STYLES: Record<Vote, string> = {
  yes: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  maybe:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  no: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

function VoteBar({
  yes,
  maybe,
  no,
  total,
}: {
  yes: number;
  maybe: number;
  no: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="flex rounded-full overflow-hidden h-1.5 bg-muted mt-1.5">
      <div
        className="bg-green-500 transition-all duration-300"
        style={{ width: `${(yes / total) * 100}%` }}
      />
      <div
        className="bg-yellow-400 transition-all duration-300"
        style={{ width: `${(maybe / total) * 100}%` }}
      />
      <div
        className="bg-red-400 transition-all duration-300"
        style={{ width: `${(no / total) * 100}%` }}
      />
    </div>
  );
}

function DemoPoll() {
  const slots = [
    { id: 1, label: "Saturday, Aug 2", base: { yes: 3, maybe: 1, no: 0 } },
    { id: 2, label: "Sunday, Aug 3", base: { yes: 1, maybe: 2, no: 1 } },
    { id: 3, label: "Saturday, Aug 9", base: { yes: 4, maybe: 0, no: 1 } },
  ] as const;
  const [votes, setVotes] = useState<Record<number, Vote | null>>({});

  const toggle = (id: number, v: Vote) =>
    setVotes((p) => ({ ...p, [id]: p[id] === v ? null : v }));

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Poll
        </span>
        <h3 className="font-medium">When works for a weekend getaway?</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          created by Alex · 5 members voted
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {slots.map((slot) => {
          const my = votes[slot.id];
          const yes = slot.base.yes + (my === "yes" ? 1 : 0);
          const maybe = slot.base.maybe + (my === "maybe" ? 1 : 0);
          const no = slot.base.no + (my === "no" ? 1 : 0);
          return (
            <div key={slot.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{slot.label}</span>
                <div className="flex gap-1 shrink-0">
                  {(["yes", "maybe", "no"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => toggle(slot.id, v)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        my === v
                          ? VOTE_STYLES[v]
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {v === "yes"
                        ? `✓ ${yes}`
                        : v === "maybe"
                          ? `~ ${maybe}`
                          : `✗ ${no}`}
                    </button>
                  ))}
                </div>
              </div>
              <VoteBar
                yes={yes}
                maybe={maybe}
                no={no}
                total={yes + maybe + no}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoProposal() {
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const base = { yes: 4, maybe: 1, no: 0 };
  const yes = base.yes + (myVote === "yes" ? 1 : 0);
  const maybe = base.maybe + (myVote === "maybe" ? 1 : 0);
  const no = base.no + (myVote === "no" ? 1 : 0);

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Poll
          </span>
          <h3 className="font-medium">Saturday, Aug 9?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            suggested by Jordan · from the calendar votes
          </p>
        </div>
        <div className="flex gap-2 text-xs shrink-0 mt-1">
          <span className="text-green-600">{yes} yes</span>
          <span className="text-yellow-600">{maybe} maybe</span>
          <span className="text-red-500">{no} no</span>
        </div>
      </div>
      <VoteBar yes={yes} maybe={maybe} no={no} total={yes + maybe + no} />
      <div className="flex gap-2 flex-wrap">
        {(["yes", "maybe", "no"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMyVote(myVote === v ? null : v)}
            className={`text-sm px-3 py-1 rounded-md border transition-colors ${
              myVote === v ? VOTE_STYLES[v] : "border-border hover:bg-muted"
            }`}
          >
            {v === "yes" ? "I'm in" : v === "maybe" ? "Maybe" : "Can't make it"}
          </button>
        ))}
      </div>
    </div>
  );
}

function DemoEvent() {
  type RSVP = "going" | "maybe" | "not_going";
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const base = { going: 4, maybe: 1, not_going: 0 };
  const going = base.going + (rsvp === "going" ? 1 : 0);
  const maybe = base.maybe + (rsvp === "maybe" ? 1 : 0);
  const not_going = base.not_going + (rsvp === "not_going" ? 1 : 0);

  return (
    <div className="border-2 border-primary/20 bg-primary/5 rounded-lg p-4 flex flex-col gap-3">
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Event · it's happening
        </span>
        <h3 className="text-lg font-semibold">Saturday, August 9</h3>
        <p className="text-sm text-muted-foreground">
          Weekend getaway · by the lake
        </p>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-green-600">{going} going</span>
        <span className="text-yellow-600">{maybe} maybe</span>
        <span className="text-muted-foreground">{not_going} not going</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(["going", "maybe", "not_going"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setRsvp(rsvp === v ? null : v)}
            className={`text-sm px-3 py-1 rounded-md border transition-colors ${
              rsvp === v
                ? v === "going"
                  ? VOTE_STYLES.yes
                  : v === "maybe"
                    ? VOTE_STYLES.maybe
                    : VOTE_STYLES.no
                : "border-border hover:bg-muted"
            }`}
          >
            {v === "going"
              ? "Going"
              : v === "maybe"
                ? "Maybe"
                : "Can't make it"}
          </button>
        ))}
      </div>
    </div>
  );
}
