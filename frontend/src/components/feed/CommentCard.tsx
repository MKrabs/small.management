import { useState } from "react";
import type { Comment } from "@/api/types";
import CommentSection from "@/components/comments/CommentSection";
import FeedCard from "./FeedCard";
import { isWarning } from "@/lib/utils";

type Props = { comment: Comment; activityId: string };

/** Standalone thread on the feed: the opening post plus an expandable reply tree. */
export default function CommentCard({ comment, activityId }: Props) {
  const [open, setOpen] = useState(false);
  const archived = !!comment.deleted_at;
  const warning = !archived && isWarning(comment.body);

  return (
    <FeedCard
      type="Thread"
      suffix={archived ? "archived" : undefined}
      by={{ name: comment.member?.display_name ?? (warning ? "System" : undefined), at: comment.created_at }}
      onOpen={() => setOpen((v) => !v)}
      archived={archived}
      className={warning ? "bg-yellow-500/10" : undefined}
      title={<p className="text-sm mt-1">{archived ? "Archived." : comment.body}</p>}
    >
      {(!archived || comment.reply_count > 0) && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="self-start -mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {open
            ? "Hide replies"
            : comment.reply_count > 0
              ? `${comment.reply_count} repl${comment.reply_count === 1 ? "y" : "ies"}`
              : "Reply"}
        </button>
      )}
      {open && <CommentSection activityId={activityId} target={{ thread: comment.id }} />}
    </FeedCard>
  );
}
