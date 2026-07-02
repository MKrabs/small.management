import { Link } from "react-router-dom";
import type { Event } from "@/api/types";
import { formatDay, formatTime, isEventPast } from "@/lib/utils";

type Props = { event: Event; activityId: string };

export default function EventCard({ event }: Props) {
  const going = event.rsvps.filter((r) => r.status === "going").length;
  const maybe = event.rsvps.filter((r) => r.status === "maybe").length;
  const notGoing = event.rsvps.filter((r) => r.status === "not_going").length;
  const past = isEventPast(event.date);

  return (
    <Link
      to={`event/${event.id}`}
      className={`block border-2 rounded-lg p-4 transition-colors ${
        past ? "opacity-60 hover:bg-muted/50" : "border-primary/30 bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Event</span>
      <h3 className="text-lg font-semibold">
        {formatDay(event.date, { weekday: "long", month: "long", day: "numeric" })}
        {event.time_start && (
          <span className="text-muted-foreground font-normal"> · {formatTime(event.time_start)}</span>
        )}
      </h3>
      {event.note && <p className="text-sm mt-1">{event.note}</p>}
      <div className="text-xs flex gap-3 mt-2">
        <span className="text-green-600">✓ {going} going</span>
        <span className="text-yellow-600">~ {maybe} maybe</span>
        <span className="text-red-500">✗ {notGoing} not going</span>
      </div>
      {past && <p className="text-xs text-muted-foreground mt-2">This event has passed.</p>}
    </Link>
  );
}
