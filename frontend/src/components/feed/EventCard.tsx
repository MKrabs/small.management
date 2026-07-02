import type { Event } from "@/api/types";

type Props = { event: Event; activityId: string };

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function EventCard({ event }: Props) {
  const going = event.rsvps.filter((r) => r.status === "going").length;
  const maybe = event.rsvps.filter((r) => r.status === "maybe").length;
  const notGoing = event.rsvps.filter((r) => r.status === "not_going").length;
  const past = new Date(event.date) < new Date();

  return (
    <div className={`border-2 rounded-lg p-4 flex flex-col gap-3 ${past ? "opacity-60" : "border-primary/30 bg-primary/5"}`}>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Event</span>
        <h3 className="text-lg font-semibold">{fmt(event.date)}</h3>
        {event.time_start && (
          <p className="text-sm text-muted-foreground">{event.time_start}</p>
        )}
        {event.note && <p className="text-sm mt-1">{event.note}</p>}
      </div>
      <div className="text-xs flex gap-3">
        <span className="text-green-600">✓ {going} going</span>
        <span className="text-yellow-600">~ {maybe} maybe</span>
        <span className="text-red-500">✗ {notGoing} not going</span>
      </div>
      {past && <p className="text-xs text-muted-foreground">This event has passed.</p>}
    </div>
  );
}
