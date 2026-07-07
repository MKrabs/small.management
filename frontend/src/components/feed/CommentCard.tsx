import { useState } from "react";
import type { Comment } from "@/api/types";
import CommentSection from "@/components/comments/CommentSection";
import { cn, isWarning, timeAgo } from "@/lib/utils";

type Props = { comment: Comment; activityId: string };

/** Standalone thread on the feed: the opening post plus an expandable reply tree. */
export default function CommentCard({ comment, activityId }: Props) {
  const [open, setOpen] = useState(false);
  const archived = !!comment.deleted_at;
  const warning = !archived && isWarning(comment.body);

  return (
    <div
      className={cn(
        "bg-card shadow-md rounded-lg p-4 flex flex-col gap-1",
        archived && "opacity-40",
        warning && "bg-yellow-500/10",
      )}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Thread</span>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium truncate">
          {comment.member?.display_name ?? (warning ? "System" : "someone")}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm">{archived ? "Archived." : comment.body}</p>
      {(!archived || comment.reply_count > 0) && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {open
            ? "Hide replies"
            : comment.reply_count > 0
              ? `${comment.reply_count} repl${comment.reply_count === 1 ? "y" : "ies"}`
              : "Reply"}
        </button>
      )}
      {open && <CommentSection activityId={activityId} target={{ thread: comment.id }} />}
    </div>
  );
}
