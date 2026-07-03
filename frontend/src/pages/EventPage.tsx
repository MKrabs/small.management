import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Event, Member, RSVP } from "@/api/types";
import DetailShell from "@/components/layout/DetailShell";
import StickyBar from "@/components/layout/StickyBar";
import CommentSection from "@/components/comments/CommentSection";
import NewCycleSheet from "@/components/sheets/NewCycleSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";
import { STATUS_CHIP } from "@/lib/status";
import { cn, formatDay, formatTime, isEventPast, timeAgo } from "@/lib/utils";

type RsvpStatus = RSVP["status"];

const RSVP_LABEL: Record<RsvpStatus, string> = {
  going: "going",
  maybe: "maybe",
  not_going: "not going",
};
const RSVP_CHIP: Record<RsvpStatus, string> = {
  going: STATUS_CHIP.yes,
  maybe: STATUS_CHIP.maybe,
  not_going: STATUS_CHIP.no,
};

export default function EventPage() {
  const { eventId = "" } = useParams();
  const { id, slug, activity } = useActivity();
  const api = useApi();
  const navigate = useNavigate();
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [filter, setFilter] = useState<RsvpStatus | null>(null);

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

  const tally = (s: RsvpStatus) => rsvps.filter((r) => r.status === s).length;

  return (
    <DetailShell>
      {eventQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {eventQ.isError && <p className="text-sm text-destructive">Event not found.</p>}
      {event && (
        <div className={`flex flex-col gap-6 ${past ? "opacity-80" : ""}`}>
          {/* Header */}
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Event</span>
            <h1 className="text-3xl font-semibold">
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

          {/* RSVP tally — tap to filter */}
          <div className="flex gap-2">
            {(["going", "maybe", "not_going"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? null : s)}
                className={cn(
                  "border rounded-lg px-4 py-2 text-sm flex-1 text-center transition-colors",
                  filter === s ? RSVP_CHIP[s] : "hover:bg-muted",
                )}
              >
                <span className="text-lg font-semibold block">{tally(s)}</span>
                {RSVP_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Member RSVPs */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">RSVPs</h2>
            {(membersQ.data ?? [])
              .map((m) => ({ member: m, rsvp: rsvps.find((r) => r.member.id === m.id) }))
              .filter(({ rsvp }) => (filter ? rsvp?.status === filter : true))
              .map(({ member, rsvp }) => (
                <div key={member.id} className={`flex items-center gap-3 ${rsvp ? "" : "opacity-40"}`}>
                  <span className="text-sm font-medium flex-1 truncate">{member.display_name}</span>
                  {rsvp?.comment && (
                    <span className="text-xs text-muted-foreground truncate max-w-[40%]">“{rsvp.comment}”</span>
                  )}
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border shrink-0",
                      rsvp ? RSVP_CHIP[rsvp.status] : "text-muted-foreground",
                    )}
                  >
                    {rsvp ? RSVP_LABEL[rsvp.status] : "no answer"}
                  </span>
                </div>
              ))}
          </section>

          <Button
            variant="outline"
            className="self-start"
            onClick={() => downloadIcs(event, activity?.title ?? "Event")}
          >
            <CalendarPlus data-icon="inline-start" />
            Add to calendar
          </Button>

          <CommentSection activityId={id} target={{ event: Number(eventId) }} />
        </div>
      )}

      {event && (
        <StickyBar>
          <Button
            variant={past ? "outline" : "default"}
            className="flex-1"
            size="lg"
            onClick={() => setRsvpOpen(true)}
          >
            {myRsvp ? "Change RSVP" : "RSVP"}
          </Button>
          <Button
            variant={past ? "default" : "outline"}
            className="flex-1"
            size="lg"
            onClick={() => setCycleOpen(true)}
          >
            Start new cycle
          </Button>
        </StickyBar>
      )}

      {rsvpOpen && event && (
        <RsvpSheet activityId={id} eventId={event.id} myRsvp={myRsvp} onClose={() => setRsvpOpen(false)} />
      )}
      {cycleOpen && (
        <NewCycleSheet
          activityId={id}
          onClose={() => setCycleOpen(false)}
          onCreated={() => navigate(`/activity/${id}/${slug}`)}
        />
      )}
    </DetailShell>
  );
}

// Standard .ics file, generated client-side — no account or server needed.
function downloadIcs(event: Event, title: string) {
  const d = event.date.replaceAll("-", "");
  const t = (time: string) => time.slice(0, 5).replace(":", "") + "00";
  const dtstart = event.time_start ? `DTSTART:${d}T${t(event.time_start)}` : `DTSTART;VALUE=DATE:${d}`;
  const dtend = event.time_start && event.time_end ? `DTEND:${d}T${t(event.time_end)}` : "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//small.management//EN",
    "BEGIN:VEVENT",
    `UID:event-${event.id}@small.management`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    dtstart,
    ...(dtend ? [dtend] : []),
    `SUMMARY:${title}`,
    ...(event.note ? [`DESCRIPTION:${event.note.replace(/\n/g, "\\n")}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function RsvpSheet({
  activityId,
  eventId,
  myRsvp,
  onClose,
}: {
  activityId: string;
  eventId: number;
  myRsvp: RSVP | undefined;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<RsvpStatus | null>(myRsvp?.status ?? null);
  const [comment, setComment] = useState(myRsvp?.comment ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/activities/${activityId}/events/${eventId}/rsvps/`, { status, comment }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", activityId] });
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onClose();
    },
  });

  return (
    <BottomSheet onClose={onClose} title="Your RSVP">
        <h2 className="font-semibold text-lg">Your RSVP</h2>
        <div className="flex gap-2">
          {(["going", "maybe", "not_going"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "border rounded-lg px-4 py-2 text-sm flex-1 transition-colors",
                status === s ? RSVP_CHIP[s] : "hover:bg-muted",
              )}
            >
              {RSVP_LABEL[s]}
            </button>
          ))}
        </div>
        <Input placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        {mutation.isError && <FieldError>Something went wrong.</FieldError>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!status || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
    </BottomSheet>
  );
}
