import type { Comment } from "@/api/types";

type Props = { comment: Comment };

export default function CommentCard({ comment }: Props) {
  const deleted = !!comment.deleted_at;

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-1 ${deleted ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{comment.member?.display_name ?? "someone"}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">{deleted ? "Deleted." : comment.body}</p>
      {comment.reply_count > 0 && (
        <p className="text-xs text-muted-foreground">{comment.reply_count} replies</p>
      )}
    </div>
  );
}
