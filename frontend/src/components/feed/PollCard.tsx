import { useNavigate } from "react-router-dom";
import type { Poll, PollKind } from "@/api/types";
import ChoicePoll from "@/components/poll/ChoicePoll";
import DatePoll from "@/components/poll/DatePoll";
import RangePoll from "@/components/poll/RangePoll";
import FeedCard from "./FeedCard";
import CommentPreview from "./CommentPreview";

type Props = { poll: Poll; activityId: string; memberCount?: number };

const KIND_LABEL: Record<PollKind, string> = {
  choice: "Poll",
  date: "Day poll",
  range: "Date range poll",
};

/** Interactive feed card: every poll kind takes votes right on the card. */
export default function PollCard({ poll, activityId, memberCount }: Props) {
  const navigate = useNavigate();
  const deleted = !!poll.deleted_at;
  const open = () => navigate(`poll/${poll.id}`);

  return (
    <FeedCard
      type={KIND_LABEL[poll.kind]}
      suffix={!deleted && poll.locked_at ? "voting finished" : undefined}
      votes={`${poll.voter_count}${memberCount ? ` of ${memberCount}` : ""} voted`}
      by={{ name: poll.created_by?.display_name, at: poll.created_at }}
      onOpen={open}
      archived={deleted}
      title={<h3 className={`font-medium ${deleted ? "line-through" : ""}`}>{poll.title}</h3>}
    >
      {poll.kind === "choice" && !deleted && <ChoicePoll poll={poll} activityId={activityId} />}
      {poll.kind === "date" && !deleted && <DatePoll poll={poll} activityId={activityId} slots={poll.slots ?? []} />}
      {poll.kind === "range" && !deleted && <RangePoll poll={poll} activityId={activityId} slots={poll.slots ?? []} />}

      {poll.comment_count > 0 && (
        <button onClick={open} className="text-left">
          <CommentPreview comments={poll.latest_comments} total={poll.comment_count} />
        </button>
      )}
    </FeedCard>
  );
}
