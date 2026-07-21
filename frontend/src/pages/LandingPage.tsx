import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import ChatIllustration from "@/components/landing/ChatIllustration";
import DemoFeed from "@/components/landing/DemoFeed";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity, User } from "@/api/types";
import UserAvatar, { nameColor } from "@/components/UserAvatar";
import { CHANGELOG } from "@/changelog";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

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
  const active = (activitiesQ.data ?? []).filter((a) => !a.archived_at);
  const archived = (activitiesQ.data ?? []).filter((a) => a.archived_at);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <UserAvatar name={user.display_name} avatar={user.avatar} className="size-12" textClassName="text-lg" />
        <div>
          <p className="font-semibold" style={{ color: nameColor(user.avatar) }}>{user.display_name}</p>
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
          <Empty className="border border-dashed p-8">
            <EmptyHeader>
              <EmptyTitle className="text-muted-foreground font-normal">No activities yet.</EmptyTitle>
              <EmptyDescription>
                <Link to="/new">Create your first one</Link>
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {active.length > 0 && <ActivityList activities={active} />}

        {archived.length > 0 && (
          <Collapsible className="flex flex-col gap-2">
            <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
              Archived ({archived.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ActivityList activities={archived} className="opacity-60" />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function ActivityList({ activities, className }: { activities: Activity[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {activities.map((a) => (
        <li key={a.id}>
          <Link
            to={`/activity/${a.short_id}/${a.slug}`}
            className="flex items-center justify-between gap-3 border rounded-lg bg-card px-4 py-3 hover:bg-muted transition-colors"
          >
            <span className="font-medium truncate">{a.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {a.member_count} member{a.member_count !== 1 ? "s" : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
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

      {/* Live demo */}
      <section className="py-10 flex flex-col gap-6 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="text-xl font-semibold mt-1">Try it right here</h2>
          <p className="text-sm text-muted-foreground mt-2">
            These are the real cards from an activity feed, filled with sample
            data. Vote away — nothing is saved.
          </p>
        </div>
        <DemoFeed />
      </section>

      {/* What it is */}
      <section className="py-10 flex flex-col gap-4 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            What it is
          </p>
          <h2 className="text-xl font-semibold mt-1">
            Find a date your whole group can make
          </h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          small.management helps groups pick dates and make small decisions
          together — like Doodle or When2Meet, but private, self-hostable, and
          built for phones. Create an activity, drop the link in your group
          chat, and everyone can vote right away: no sign-up, no email, no app
          to install.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          It's made for the recurring chaos of real groups: the friend circle
          planning a getaway, the board-game round looking for its next slot,
          the club picking a tournament weekend, the family sorting out the
          holidays.
        </p>
      </section>

      {/* What's new — latest release only; the full history lives at /changelog */}
      <section className="py-10 flex flex-col gap-4 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            What's new
          </p>
          <h2 className="text-xl font-semibold mt-1">{CHANGELOG[0].title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {CHANGELOG[0].version} ·{" "}
            {new Date(CHANGELOG[0].date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          {CHANGELOG[0].items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <Link
          to="/changelog"
          className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          See all changes
        </Link>
      </section>

      {/* Principles */}
      <section className="py-10 flex flex-col gap-6 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Principles
          </p>
          <h2 className="text-xl font-semibold mt-1">Built on a few opinions</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Principle title="No accounts required">
            Guests join with the link, pick a name, and vote. An account is
            optional — it only adds access from other devices.
          </Principle>
          <Principle title="No admin">
            Every member has equal power: anyone can add options, finish a
            vote, or archive a card. The activity log keeps the group
            accountable to itself.
          </Principle>
          <Principle title="Private by default">
            Activities are invite-link only, optionally PIN-protected. No
            trackers, no ads, no data mining.
          </Principle>
          <Principle title="Yours to host">
            Open source and fair-code licensed. Run it on your own server and
            your group's plans never leave it.
          </Principle>
        </div>
      </section>

      {/* Small features */}
      <section className="py-10 flex flex-col gap-6 border-t">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            The small things
          </p>
          <h2 className="text-xl font-semibold mt-1">
            Details that carry their weight
          </h2>
        </div>
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
          <Feature title="Paint your days">
            Drag across the calendar to vote many days at once — built for
            thumbs, not tiny checkboxes.
          </Feature>
          <Feature title="Crowned leaders">
            The option or day currently winning wears a little crown, so the
            group sees where it's heading.
          </Feature>
          <Feature title="Finish voting, reversibly">
            Anyone can close a poll when it's decided — and anyone can reopen
            it. No deadlines are ever enforced.
          </Feature>
          <Feature title="Nothing is deleted">
            Cards are archived, not destroyed, and every action lands in the
            activity log for everyone to see.
          </Feature>
          <Feature title="Threads on everything">
            Every poll and event has its own comments with replies, so the
            discussion stays next to the decision.
          </Feature>
          <Feature title="Cycles">
            Groups that meet again and again start a fresh round while keeping
            the whole history one scroll away.
          </Feature>
          <Feature title="Add to calendar">
            Events export as .ics files, generated right in your browser — no
            calendar account linked.
          </Feature>
          <Feature title="One link is the invite">
            Share the activity link anywhere. Whoever has it is in — add a PIN
            if you want a lock on the door.
          </Feature>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="py-12 border-t flex flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-semibold">Ready when your group is</h2>
        <p className="text-sm text-muted-foreground">
          Creating an activity takes seconds and doesn't ask for anything.
        </p>
        <Link to="/new" className={cn(buttonVariants({ size: "lg" }), "mt-2")}>
          Create an activity
        </Link>
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

// ─── Copy blocks ──────────────────────────────────────────────────────────────

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground leading-relaxed">{children}</span>
    </li>
  );
}
