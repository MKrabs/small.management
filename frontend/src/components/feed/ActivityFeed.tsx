import type { FeedItem } from "@/api/types";
import PollCard from "./PollCard";
import ProposalCard from "./ProposalCard";
import EventCard from "./EventCard";
import CommentCard from "./CommentCard";

type Props = { items: FeedItem[]; activityId: string };

export default function ActivityFeed({ items, activityId }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Nothing here yet. Use the + button to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {items.map((item) => {
        switch (item.type) {
          case "cycle":
            return (
              <div key={`cycle-${item.data.id}`} className="text-xs text-muted-foreground border-t pt-3 mt-1">
                ↑ {item.data.name}
              </div>
            );
          case "poll":
            return <PollCard key={`poll-${item.data.id}`} poll={item.data} activityId={activityId} />;
          case "proposal":
            return <ProposalCard key={`proposal-${item.data.id}`} proposal={item.data} activityId={activityId} />;
          case "event":
            return <EventCard key={`event-${item.data.id}`} event={item.data} activityId={activityId} />;
          case "comment":
            return <CommentCard key={`comment-${item.data.id}`} comment={item.data} />;
          case "log":
            return (
              <p key={`log-${item.data.id}`} className="text-xs text-muted-foreground px-1">
                {item.data.member?.display_name ?? "Someone"} · {item.data.action_type}
              </p>
            );
        }
      })}
    </div>
  );
}
