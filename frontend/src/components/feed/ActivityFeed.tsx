import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import type { Cycle, FeedItem, Log } from "@/api/types";
import PollCard from "./PollCard";
import EventCard from "./EventCard";
import CommentCard from "./CommentCard";
import { timeAgo } from "@/lib/utils";

type Props = { items: FeedItem[]; activityId: string; memberCount?: number };

/**
 * Items arrive newest-first. Cycle markers split them into rounds: everything
 * newer than the newest marker is the current round (shown expanded); each
 * older marker starts a fold holding that cycle's history, collapsed by default.
 */
type Segment = { marker: Cycle | null; items: FeedItem[] };

function segment(items: FeedItem[]): Segment[] {
  const segments: Segment[] = [];
  let bucket: FeedItem[] = [];
  for (const item of items) {
    if (item.type === "cycle") {
      segments.push({ marker: item.data, items: bucket });
      bucket = [];
    } else {
      bucket.push(item);
    }
  }
  if (bucket.length > 0) segments.push({ marker: null, items: bucket });
  return segments;
}

export default function ActivityFeed({ items, activityId, memberCount }: Props) {
  const segments = segment(items);

  if (items.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyDescription>Nothing here yet. Use the + button to get started.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {segments.map((seg, i) =>
        i === 0 ? (
          <Cards key={seg.marker?.id ?? "head"} items={seg.items} activityId={activityId} memberCount={memberCount} />
        ) : (
          <CycleFold key={seg.marker?.id ?? `seg-${i}`} segment={seg} activityId={activityId} memberCount={memberCount} />
        ),
      )}
    </div>
  );
}

function Cards({ items, activityId, memberCount }: { items: FeedItem[]; activityId: string; memberCount?: number }) {
  return (
    <>
      {items.map((item) => {
        switch (item.type) {
          case "poll":
            return <PollCard key={`poll-${item.data.id}`} poll={item.data} activityId={activityId} memberCount={memberCount} />;
          case "event":
            return <EventCard key={`event-${item.data.id}`} event={item.data} activityId={activityId} />;
          case "comment":
            return <CommentCard key={`comment-${item.data.id}`} comment={item.data} activityId={activityId} />;
          case "log":
            return <LogLine key={`log-${item.data.id}`} log={item.data} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function CycleFold({
  segment: seg,
  activityId,
  memberCount,
}: {
  segment: Segment;
  activityId: string;
  memberCount?: number;
}) {
  const marker = seg.marker!;
  const started = new Date(marker.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <Collapsible className="flex flex-col gap-3">
      <Separator />
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
        <span className="font-medium">{marker.name}</span>
        <span>· {started}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        {seg.items.length > 0 ? (
          <Cards items={seg.items} activityId={activityId} memberCount={memberCount} />
        ) : (
          <p className="text-xs text-muted-foreground pl-6">Nothing happened in this round.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Log lines ───────────────────────────────────────────────────────────────

function logText(log: Log): string {
  const d = log.details as Record<string, string>;
  switch (log.action_type) {
    case "created_activity": return "created the activity";
    case "renamed_activity": return `renamed the activity to “${d.title}”`;
    case "member_joined": return "joined";
    case "created_poll": return `created poll “${d.title}”`;
    case "voted": return "voted";
    case "retracted_vote": return "retracted a vote";
    case "added_option": return `added option “${d.label}”`;
    case "finalized_poll": return `finalized ${d.date} as event`;
    case "created_event": return `posted an event on ${d.date}`;
    case "claimed_member": return `claimed ${d.display_name}'s votes and actions`;
    case "locked_voting": return "finished voting on a poll";
    case "unlocked_voting": return "resumed voting on a poll";
    // legacy log lines from before proposals were folded into polls
    case "created_proposal": return `proposed ${d.date}`;
    case "voted_proposal": return `voted ${d.status} on a proposal`;
    case "finalized_proposal": return "set a proposal as event";
    case "rsvp": return `RSVP'd ${d.status?.replace("_", " ")}`;
    case "retracted_rsvp": return "retracted an RSVP";
    case "created_comment": return "commented";
    case "removed_option": return `removed option “${d.label}”${Number(d.votes) > 0 ? ` (${d.votes} vote${Number(d.votes) !== 1 ? "s" : ""} invalidated)` : ""}`;
    case "archived": return `archived a ${d.target}`;
    case "unarchived": return `unarchived a ${d.target}`;
    // legacy name for "archived" from before the rename
    case "soft_deleted": return `archived a ${d.target}`;
    case "started_cycle": return `started cycle “${d.name}”`;
    case "renamed_cycle": return `renamed a cycle to “${d.name}”`;
    case "changed_pin": return "changed the PIN";
    default: return log.action_type;
  }
}

function LogLine({ log }: { log: Log }) {
  return (
    <p className="text-xs text-muted-foreground px-1">
      {log.member?.display_name ?? "Someone"} {logText(log)} · {timeAgo(log.created_at)}
    </p>
  );
}
