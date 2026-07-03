import { Link } from "react-router-dom";
import type { Poll } from "@/api/types";
import { timeAgo } from "@/lib/utils";

type Props = { poll: Poll; activityId: string; memberCount?: number };

export default function PollCard({ poll, memberCount }: Props) {
  const deleted = !!poll.deleted_at;

  return (
    <Link
      to={`poll/${poll.id}`}
      className={`block border rounded-lg bg-card p-4 hover:bg-muted/50 transition-colors ${deleted ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Poll</span>
          <h3 className={`font-medium ${deleted ? "line-through" : ""}`}>{poll.title}</h3>
        </div>
        {poll.my_vote && <MyVoteStatus my={poll.my_vote} />}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {poll.voter_count}
        {memberCount ? ` of ${memberCount}` : ""} shared availability · by{" "}
        {poll.created_by?.display_name ?? "someone"} · {timeAgo(poll.created_at)}
      </p>
    </Link>
  );
}

// "✓ vote · ✓ date · – time" — what the member has already filled in
function MyVoteStatus({ my }: { my: NonNullable<Poll["my_vote"]> }) {
  if (!my.voted) {
    return <span className="text-xs text-muted-foreground shrink-0 mt-1">not voted yet</span>;
  }
  const part = (ok: boolean, label: string) => (
    <span className={ok ? "text-primary" : "text-muted-foreground"}>
      {ok ? "✓" : "–"} {label}
    </span>
  );
  return (
    <span className="text-xs shrink-0 mt-1 flex gap-1.5">
      {part(true, "vote")}
      {part(my.has_date, "date")}
      {part(my.has_time, "time")}
    </span>
  );
}
