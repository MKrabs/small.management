import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Event, RSVP } from "@/api/types";
import { AvatarRow } from "@/components/poll/ChoicePoll";
import { Button } from "@/components/ui/button";
import FeedCard from "./FeedCard";
import CommentPreview from "./CommentPreview";
import { cn, downloadIcs, formatDay, formatTime, isEventPast } from "@/lib/utils";

type Props = { event: Event; activityId: string };
type RsvpStatus = RSVP["status"];

export const ROWS: { status: RsvpStatus; icon: string; label: string; bar: string; selected: string }[] = [
  { status: "going", icon: "✓", label: "going", bar: "bg-green-600", selected: "bg-green-100 text-green-700 border-green-300" },
  { status: "maybe", icon: "~", label: "maybe", bar: "bg-yellow-500", selected: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { status: "not_going", icon: "✗", label: "not going", bar: "bg-red-500", selected: "bg-red-100 text-red-700 border-red-300" },
];

/** Feed card: when + what on the left, per-status RSVP bars with voters and vote buttons on the right. */
export default function EventCard({ event, activityId }: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { activity } = useActivity();
  const myRsvp = event.rsvps.find((r) => r.member.id === activity?.me?.id);
  const past = isEventPast(event.date);
  const archived = !!event.deleted_at;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["feed", activityId] });
    qc.invalidateQueries({ queryKey: ["event", activityId, String(event.id)] });
  };
  const rsvpMut = useMutation({
    mutationFn: (status: RsvpStatus) =>
      // keep any comment the member set before the RSVP form was retired
      api.put(`/activities/${activityId}/events/${event.id}/rsvps/`, { status, comment: myRsvp?.comment ?? "" }, activityId),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't save your RSVP — try again."),
  });
  const retractMut = useMutation({
    mutationFn: () => api.del(`/activities/${activityId}/events/${event.id}/rsvps/`, activityId),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't remove your RSVP — try again."),
  });

  const byStatus = (s: RsvpStatus) => event.rsvps.filter((r) => r.status === s);
  const max = Math.max(1, ...ROWS.map((r) => byStatus(r.status).length));
  const busy = rsvpMut.isPending || retractMut.isPending;

  return (
    <FeedCard
      type="Event"
      marker
      suffix={archived ? "archived" : undefined}
      onOpen={() => navigate(`event/${event.id}`)}
      archived={archived}
      className={!archived && past ? "opacity-60" : undefined}
    >
      {/* two columns (date+note | RSVP+calendar) that stack when the card gets narrow */}
      <div className="@container">
      <div className="flex flex-col @md:flex-row gap-4">
        {/* when on top, note pushed to the bottom on wide cards */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 @md:justify-between">
          <Link to={`event/${event.id}`} className="block hover:opacity-80 transition-opacity">
            <h3 className={cn("font-serif text-4xl leading-tight", archived && "line-through")}>
              {formatDay(event.date, { weekday: "long" })}
            </h3>
            <p className="text-3xl leading-tight">
              {formatDay(event.date, { day: "numeric", month: "long" })}
            </p>
            {event.time_start && (
              <p className="text-lg leading-tight">
                {formatTime(event.time_start)}
                {event.time_end && ` – ${formatTime(event.time_end)}`}
              </p>
            )}
          </Link>
          {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
        </div>

        {/* RSVP bars on top, calendar button pushed to the bottom on wide cards */}
        <div className="@md:w-36 shrink-0 flex flex-col gap-4 @md:justify-between">
          <div className="flex flex-col gap-2.5">
            {ROWS.map(({ status, icon, label, bar, selected }) => {
              const voters = byStatus(status);
              const mine = myRsvp?.status === status;
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
                      <AvatarRow voters={voters.map((r) => ({ id: r.member.id, display_name: r.member.display_name }))} />
                    </div>
                  </div>
                  <button
                    disabled={archived || busy}
                    onClick={() => (mine ? retractMut.mutate() : rsvpMut.mutate(status))}
                    aria-label={mine ? `Retract RSVP ${label}` : `RSVP ${label}`}
                    className={cn(
                      "size-7 shrink-0 rounded-full border text-xs font-semibold transition-colors",
                      mine ? selected : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {icon}
                  </button>
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadIcs(event, activity?.title ?? "Event")}
          >
            <CalendarPlus data-icon="inline-start" />
            Add to calendar
          </Button>
        </div>
      </div>
      </div>

      {past && <p className="text-xs text-muted-foreground">This event has passed.</p>}

      {event.comment_count > 0 && (
        <button onClick={() => navigate(`event/${event.id}`)} className="text-left">
          <CommentPreview comments={event.latest_comments} total={event.comment_count} />
        </button>
      )}
    </FeedCard>
  );
}
