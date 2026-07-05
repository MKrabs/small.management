import { useNavigate } from "react-router-dom";
import type { Poll, PollKind } from "@/api/types";
import ChoicePoll from "@/components/poll/ChoicePoll";
import DatePoll from "@/components/poll/DatePoll";
import RangePoll from "@/components/poll/RangePoll";
import CommentPreview from "./CommentPreview";
import { timeAgo } from "@/lib/utils";

type Props = { poll: Poll; activityId: string; memberCount?: number };

const KIND_LABEL: Record<PollKind, string> = {
  choice: "Poll",
  date: "Day poll",
  datetime: "Day & time poll",
  range: "Date range poll",
};

/**
 * Interactive feed card: choice/date/range polls take votes right on the card;
 * datetime polls (and everything else) open the dedicated page.
 */
export default function PollCard({ poll, activityId, memberCount }: Props) {
  const navigate = useNavigate();
  const deleted = !!poll.deleted_at;
  const open = () => navigate(`poll/${poll.id}`);

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 ${deleted ? "opacity-40" : ""}`}>
      <button onClick={open} className="text-left hover:opacity-80 transition-opacity">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{KIND_LABEL[poll.kind]}</span>
            <h3 className={`font-medium ${deleted ? "line-through" : ""}`}>{poll.title}</h3>
          </div>
          {poll.kind === "datetime" && poll.my_vote && <MyVoteStatus my={poll.my_vote} />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {poll.voter_count}
          {memberCount ? ` of ${memberCount}` : ""} voted · by{" "}
          {poll.created_by?.display_name ?? "someone"} · {timeAgo(poll.created_at)}
        </p>
      </button>

      {poll.kind === "choice" && !deleted && <ChoicePoll poll={poll} activityId={activityId} />}
      {poll.kind === "date" && !deleted && <DatePoll poll={poll} activityId={activityId} slots={poll.slots ?? []} />}
      {poll.kind === "range" && !deleted && <RangePoll poll={poll} activityId={activityId} slots={poll.slots ?? []} />}
      {/* datetime stays page-only by design */}

      <button onClick={open} className="text-left">
        <CommentPreview comments={poll.latest_comments} total={poll.comment_count} />
      </button>
    </div>
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
