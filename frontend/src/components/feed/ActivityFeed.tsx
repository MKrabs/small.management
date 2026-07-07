import { Fragment, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, MoreHorizontal, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDelete from "@/components/ConfirmDelete";
import { useApi } from "@/hooks/useApi";
import type { Cycle, FeedItem, Log } from "@/api/types";
import PollCard from "./PollCard";
import EventCard from "./EventCard";
import CommentCard from "./CommentCard";
import { timeAgo } from "@/lib/utils";

type Props = { items: FeedItem[]; activityId: string; memberCount?: number; showArchived?: boolean };

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
  if (bucket.length > 0) {
    // items older than the oldest marker fold into the oldest round instead of dangling below it
    const last = segments[segments.length - 1];
    if (last) last.items.push(...bucket);
    else segments.push({ marker: null, items: bucket });
  }
  return segments;
}

export default function ActivityFeed({ items, activityId, memberCount, showArchived = false }: Props) {
  // archived cards are hidden unless "Show archived" is on (then they render struck-through);
  // an archived cycle hides its whole round below
  const visible = showArchived
    ? items
    : items.filter((it) => (it.type === "poll" || it.type === "event" ? !it.data.deleted_at : true));
  const segments = segment(visible).filter(
    (seg, i) => showArchived || i === 0 || !seg.marker?.archived_at,
  );
  // items are newest-first; only the newest cycle can be "undone" (its round is still running)
  const newestCycle = items.find((i) => i.type === "cycle");
  const newestCycleId = newestCycle?.type === "cycle" ? newestCycle.data.id : undefined;
  const hasLogs = items.some((i) => i.type === "log");
  const cycleCount = items.filter((i) => i.type === "cycle").length;

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
      {/* the newest cycle is the running round — no header until a later cycle closes it */}
      {segments.map((seg, i) =>
        i === 0 ? (
          <Fragment key={seg.marker?.id ?? "head"}>
            <Cards items={seg.items} activityId={activityId} memberCount={memberCount} newestCycleId={newestCycleId} />
            {/* with logs hidden, still surface the running cycle's start (and its undo);
                the auto-created first cycle stays invisible */}
            {!hasLogs && cycleCount > 1 && seg.marker && <StartedLine cycle={seg.marker} activityId={activityId} />}
          </Fragment>
        ) : (
          <CycleFold key={seg.marker!.id} segment={seg} activityId={activityId} memberCount={memberCount} />
        ),
      )}
    </div>
  );
}

function Cards({
  items,
  activityId,
  memberCount,
  newestCycleId,
}: {
  items: FeedItem[];
  activityId: string;
  memberCount?: number;
  newestCycleId?: number;
}) {
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
            return <LogLine key={`log-${item.data.id}`} log={item.data} activityId={activityId} newestCycleId={newestCycleId} />;
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
  const api = useApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(marker.name);
  const archived = !!marker.archived_at;
  const started = new Date(marker.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["feed", activityId] });
  const renameMut = useMutation({
    mutationFn: () => api.patch(`/activities/${activityId}/cycles/${marker.id}/`, { name: name.trim() }, activityId),
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });
  const archiveMut = useMutation({
    mutationFn: () => api.patch(`/activities/${activityId}/cycles/${marker.id}/`, { archived: !archived }, activityId),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: () => api.del(`/activities/${activityId}/cycles/${marker.id}/`, activityId),
    onSuccess: invalidate,
  });

  return (
    <Collapsible className="flex flex-col gap-3">
      <Separator />
      <div className="flex items-center gap-1.5">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) renameMut.mutate();
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-8 text-sm" />
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Save name" disabled={renameMut.isPending}>
              <Check />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel rename"
              onClick={() => {
                setEditing(false);
                setName(marker.name);
              }}
            >
              <X />
            </Button>
          </form>
        ) : (
          <>
            <CollapsibleTrigger className="group flex flex-1 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
              <span className={`font-medium ${archived ? "line-through opacity-40" : ""}`}>{marker.name}</span>
              <span>· {started}{archived && " · archived"}</span>
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Cycle actions" className="text-muted-foreground">
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => archiveMut.mutate()}>
                  {archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDelete
              title={`Delete cycle “${marker.name}”?`}
              description="Only the divider is removed — its polls, events, and comments stay and merge into the neighboring round."
              onConfirm={() => deleteMut.mutate()}
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
            />
          </>
        )}
      </div>
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
    case "deleted_cycle": return `deleted cycle “${d.name}”`;
    case "changed_pin": return "changed the PIN";
    case "edited_note": return `edited the note on an ${d.target}`;
    default: return log.action_type;
  }
}

function LogLine({
  log,
  activityId,
  newestCycleId,
}: {
  log: Log;
  activityId: string;
  newestCycleId?: number;
}) {
  const d = log.details as Record<string, unknown>;
  // undo = delete the cycle; offered only while it's still the newest (its round is still running)
  const undoable = log.action_type === "started_cycle" && newestCycleId !== undefined && d.cycle_id === newestCycleId;

  return (
    <p className="text-xs text-muted-foreground px-1">
      {log.member?.display_name ?? "Someone"} {logText(log)} · {timeAgo(log.created_at)}
      {undoable && <UndoCycleStart cycleId={newestCycleId} name={String(d.name)} activityId={activityId} />}
    </p>
  );
}

/** The running cycle's start as a log-style line, for when actual logs are hidden. */
function StartedLine({ cycle, activityId }: { cycle: Cycle; activityId: string }) {
  return (
    <p className="text-xs text-muted-foreground px-1">
      {cycle.created_by?.display_name ?? "Someone"} started cycle “{cycle.name}” · {timeAgo(cycle.created_at)}
      <UndoCycleStart cycleId={cycle.id} name={cycle.name} activityId={activityId} />
    </p>
  );
}

function UndoCycleStart({ cycleId, name, activityId }: { cycleId: number; name: string; activityId: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const undoMut = useMutation({
    mutationFn: () => api.del(`/activities/${activityId}/cycles/${cycleId}/`, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed", activityId] }),
  });
  return (
    <ConfirmDelete
      title={`Undo starting “${name}”?`}
      actionLabel="Undo"
      description="The cycle divider is removed; the previous round becomes the current one again."
      onConfirm={() => undoMut.mutate()}
      trigger={<button className="ml-1.5 underline hover:text-foreground transition-colors">Undo</button>}
    />
  );
}
