import { Link } from "react-router-dom";
import { Pie, PieChart } from "recharts";
import type { Event } from "@/api/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn, formatDay, formatTime, isEventPast } from "@/lib/utils";

type Props = { event: Event; activityId: string };

const chartConfig = {
  count: { label: "RSVPs" },
  going: { label: "Going", color: "var(--color-green-600)" },
  maybe: { label: "Maybe", color: "var(--color-yellow-500)" },
  not_going: { label: "Not going", color: "var(--color-red-500)" },
} satisfies ChartConfig;

export default function EventCard({ event }: Props) {
  const going = event.rsvps.filter((r) => r.status === "going").length;
  const maybe = event.rsvps.filter((r) => r.status === "maybe").length;
  const notGoing = event.rsvps.filter((r) => r.status === "not_going").length;
  const past = isEventPast(event.date);
  const archived = !!event.deleted_at;

  const chartData = [
    { status: "going", count: going, fill: "var(--color-going)" },
    { status: "maybe", count: maybe, fill: "var(--color-maybe)" },
    { status: "not_going", count: notGoing, fill: "var(--color-not_going)" },
  ];

  return (
    <Link
      to={`event/${event.id}`}
      className={cn(
        "block shadow-md rounded-lg p-4 text-center transition-colors",
        archived && "bg-card opacity-40",
        !archived && (past ? "bg-card opacity-60 hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"),
      )}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        Event{archived && " · archived"}
      </span>
      <h3 className={cn("text-lg font-semibold", archived && "line-through")}>
        {formatDay(event.date, { weekday: "long", month: "long", day: "numeric" })}
        {event.time_start && (
          <span className="text-muted-foreground font-normal"> · {formatTime(event.time_start)}</span>
        )}
      </h3>
      {event.note && <p className="text-sm mt-1">{event.note}</p>}
      {going + maybe + notGoing > 0 && (
        <ChartContainer config={chartConfig} className="mx-auto mt-2 aspect-[2/1] w-40">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              startAngle={180}
              endAngle={0}
              innerRadius={35}
              outerRadius={55}
              cy="80%"
            />
          </PieChart>
        </ChartContainer>
      )}
      <div className="text-xs flex justify-center gap-3 mt-2">
        <span className="text-green-600">✓ {going} going</span>
        <span className="text-yellow-600">~ {maybe} maybe</span>
        <span className="text-red-500">✗ {notGoing} not going</span>
      </div>
      {past && <p className="text-xs text-muted-foreground mt-2">This event has passed.</p>}
    </Link>
  );
}
