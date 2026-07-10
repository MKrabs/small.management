import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pie, PieChart } from "recharts";
import { Archive, ArchiveRestore, CalendarPlus, Pencil } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Event, Member, RSVP } from "@/api/types";
import BottomSheet from "@/components/layout/BottomSheet";
import DetailShell from "@/components/layout/DetailShell";
import CommentSection from "@/components/comments/CommentSection";
import ConfirmDelete from "@/components/ConfirmDelete";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_TEXT, STATUS_TOGGLE, type VoteStatus } from "@/lib/status";
import { cn, downloadIcs, formatDay, formatTime, isEventPast, timeAgo } from "@/lib/utils";

type RsvpStatus = RSVP["status"];

const RSVP_LABEL: Record<RsvpStatus, string> = {
  going: "going",
  maybe: "maybe",
  not_going: "not going",
};
// RSVP statuses reuse the yes/maybe/no palette.
const RSVP_STATUS: Record<RsvpStatus, VoteStatus> = {
  going: "yes",
  maybe: "maybe",
  not_going: "no",
};
const RSVP_TOGGLE: Record<RsvpStatus, string> = {
  going: STATUS_TOGGLE.yes,
  maybe: STATUS_TOGGLE.maybe,
  not_going: STATUS_TOGGLE.no,
};

const chartConfig = {
  count: { label: "RSVPs" },
  going: { label: "Going", color: "var(--color-green-600)" },
  maybe: { label: "Maybe", color: "var(--color-yellow-500)" },
  not_going: { label: "Not going", color: "var(--color-red-500)" },
} satisfies ChartConfig;

export default function EventPage() {
  const { eventId = "" } = useParams();
  const { id, activity } = useActivity();
  const api = useApi();
  const qc = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);

  const eventQ = useQuery({
    queryKey: ["event", id, eventId],
    queryFn: () => api.get<Event>(`/activities/${id}/events/${eventId}/`, id),
  });
  const membersQ = useQuery({
    queryKey: ["members", id],
    queryFn: () => api.get<Member[]>(`/activities/${id}/members/`, id),
  });

  const event = eventQ.data;
  const rsvps = event?.rsvps ?? [];
  const myRsvp = rsvps.find((r) => r.member.id === activity?.me?.id);
  const past = event ? isEventPast(event.date) : false;
  const archived = !!event?.deleted_at;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["event", id, eventId] });
    qc.invalidateQueries({ queryKey: ["feed", id] });
  };

  const rsvpMut = useMutation({
    mutationFn: (status: RsvpStatus) =>
      // keep any comment the member set before the RSVP form was retired
      api.put(`/activities/${id}/events/${eventId}/rsvps/`, { status, comment: myRsvp?.comment ?? "" }, id),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't save your RSVP — try again."),
  });

  const retractMut = useMutation({
    mutationFn: () => api.del(`/activities/${id}/events/${eventId}/rsvps/`, id),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't remove your RSVP — try again."),
  });

  const archiveMut = useMutation({
    mutationFn: (isArchived: boolean) =>
      api.patch(`/activities/${id}/events/${eventId}/`, { archived: isArchived }, id),
    onSuccess: invalidate,
  });

  const tally = (s: RsvpStatus) => rsvps.filter((r) => r.status === s).length;

  return (
    <DetailShell>
      {eventQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {eventQ.isError && <p className="text-sm text-destructive">Event not found.</p>}
      {event && (
        <div className={`flex flex-col gap-6 ${past && !archived ? "opacity-80" : ""}`}>
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="my-auto text-xs text-muted-foreground uppercase tracking-wide">
                Event{archived && " · archived"}
              </span>
              <div className="flex items-center gap-1">
                {!archived && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    aria-label="Edit note"
                    onClick={() => setNoteOpen(true)}
                  >
                    <Pencil />
                  </Button>
                )}
                {archived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => archiveMut.mutate(false)}
                  >
                    <ArchiveRestore data-icon="inline-start" />
                    Unarchive
                  </Button>
                ) : (
                  <ConfirmDelete
                    title="Archive this event?"
                    actionLabel="Archive"
                    description="It's archived for everyone but stays visible, struck through. You can unarchive it anytime."
                    onConfirm={() => archiveMut.mutate(true)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        aria-label="Archive event"
                      >
                        <Archive />
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
            <h1 className={`text-3xl font-semibold ${archived ? "line-through opacity-40" : ""}`}>
              {formatDay(event.date, { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            {event.time_start && (
              <p className="text-xl text-muted-foreground">
                {formatTime(event.time_start)}
                {event.time_end && `–${formatTime(event.time_end)}`}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              finalized by {event.created_by?.display_name ?? "someone"} · {timeAgo(event.created_at)}
            </p>
            {event.note && <p className="text-sm mt-2">{event.note}</p>}
            {past && (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-1.5 mt-3 inline-block">
                This event has passed
              </p>
            )}
          </div>

          {/* RSVP tally as a big half-donut */}
          {rsvps.length > 0 && (
            <ChartContainer config={chartConfig} className="mx-auto -mb-6 aspect-[2/1] w-full max-w-xs">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={(["going", "maybe", "not_going"] as const).map((s) => ({
                    status: s,
                    count: tally(s),
                    fill: `var(--color-${s})`,
                  }))}
                  dataKey="count"
                  nameKey="status"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={70}
                  outerRadius={110}
                  cy="85%"
                />
              </PieChart>
            </ChartContainer>
          )}

          {/* Your RSVP — tap a column to vote, tap again to retract */}
          <ToggleGroup
            value={myRsvp ? [myRsvp.status] : []}
            onValueChange={(v) => (v[0] ? rsvpMut.mutate(v[0] as RsvpStatus) : retractMut.mutate())}
            variant="outline"
            className="w-full"
            disabled={archived || rsvpMut.isPending || retractMut.isPending}
          >
            {(["going", "maybe", "not_going"] as const).map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className={cn("flex-1 h-auto flex-col gap-0 py-2", RSVP_TOGGLE[s])}
              >
                <span className="text-lg font-semibold">{tally(s)}</span>
                <span className="text-sm font-normal">{RSVP_LABEL[s]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Member RSVPs, grouped by answer */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium">RSVPs</h2>
            {(["going", "maybe", "not_going"] as const).map((s) => {
              const group = rsvps.filter((r) => r.status === s);
              if (group.length === 0) return null;
              return (
                <div key={s} className="flex flex-col gap-1.5">
                  <p className={cn("text-sm font-medium", STATUS_TEXT[RSVP_STATUS[s]])}>
                    {RSVP_LABEL[s]} ({group.length})
                  </p>
                  {group.map((r) => (
                    <span key={r.id} className="flex items-center gap-2 text-sm">
                      <UserAvatar name={r.member.display_name} avatar={r.member.avatar} className="size-5" textClassName="text-[10px]" />
                      <span className="truncate">{r.member.display_name}</span>
                      {r.comment && (
                        <span className="text-xs text-muted-foreground truncate">“{r.comment}”</span>
                      )}
                    </span>
                  ))}
                </div>
              );
            })}
            {(() => {
              const noAnswer = (membersQ.data ?? []).filter((m) => !rsvps.some((r) => r.member.id === m.id));
              if (noAnswer.length === 0) return null;
              return (
                <div className="flex flex-col gap-1.5 opacity-40">
                  <p className="text-sm font-medium">no answer ({noAnswer.length})</p>
                  {noAnswer.map((m) => (
                    <span key={m.id} className="flex items-center gap-2 text-sm">
                      <UserAvatar name={m.display_name} avatar={m.avatar} className="size-5" textClassName="text-[10px]" />
                      <span className="truncate">{m.display_name}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
          </section>

          <Marker variant="separator">
            <MarkerContent>
              <Button variant="outline" onClick={() => downloadIcs(event, activity?.title ?? "Event")}>
                <CalendarPlus data-icon="inline-start" />
                Add to calendar
              </Button>
            </MarkerContent>
          </Marker>

          <CommentSection activityId={id} target={{ event: Number(eventId) }} />
        </div>
      )}
      {noteOpen && event && (
        <NoteSheet event={event} activityId={id} eventId={eventId} onClose={() => setNoteOpen(false)} />
      )}
    </DetailShell>
  );
}

function NoteSheet({
  event,
  activityId,
  eventId,
  onClose,
}: {
  event: Event;
  activityId: string;
  eventId: string;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [note, setNote] = useState(event.note ?? "");

  const noteMut = useMutation({
    mutationFn: () => api.patch(`/activities/${activityId}/events/${eventId}/`, { note: note.trim() }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", activityId, eventId] });
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onClose();
    },
  });

  const removing = !note.trim() && !!event.note;
  return (
    <BottomSheet onClose={onClose} title="Event note">
      <h2 className="font-semibold text-lg">Event note</h2>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="A note for the group — leave empty to remove it"
        autoFocus
      />
      {noteMut.isError && <p className="text-sm text-destructive">Something went wrong.</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => noteMut.mutate()}
          disabled={noteMut.isPending || (!note.trim() && !event.note)}
        >
          {noteMut.isPending ? "Saving…" : removing ? "Remove note" : "Save note"}
        </Button>
      </div>
    </BottomSheet>
  );
}
