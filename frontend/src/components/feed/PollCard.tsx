import type { Poll } from "@/api/types";

type Props = { poll: Poll; activityId: string };

export default function PollCard({ poll }: Props) {
  const deleted = !!poll.deleted_at;

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-2 ${deleted ? "opacity-40 line-through" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Poll</span>
          <h3 className="font-medium">{poll.title}</h3>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {poll.specific_slot_count} votes
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        by {poll.created_by?.display_name ?? "someone"}
      </p>
    </div>
  );
}
