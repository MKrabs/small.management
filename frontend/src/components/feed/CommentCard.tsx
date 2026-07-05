import type { Comment } from "@/api/types";
import { cn, isWarning, timeAgo } from "@/lib/utils";

type Props = { comment: Comment };

export default function CommentCard({ comment }: Props) {
  const archived = !!comment.deleted_at;
  const warning = !archived && isWarning(comment.body);

  return (
    <div
      className={cn(
        "border rounded-lg p-4 flex flex-col gap-1",
        archived && "opacity-40",
        warning && "bg-yellow-500/10",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium truncate">
          {comment.member?.display_name ?? (warning ? "System" : "someone")}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm">{archived ? "Archived." : comment.body}</p>
      {comment.reply_count > 0 && (
        <p className="text-xs text-muted-foreground">{comment.reply_count} replies</p>
      )}
    </div>
  );
}
