import type { Comment } from "@/api/types";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/utils";

/** Read-only latest top-level comments on a feed card; the dedicated page has the full tree. */
export default function CommentPreview({ comments, total }: { comments: Comment[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <Separator className="mb-1" />
      {comments.map((c) => (
        <p key={c.id} className="text-xs truncate">
          <span className="font-medium">{c.member?.display_name ?? "someone"}</span>{" "}
          <span className="text-muted-foreground">{c.body}</span>
        </p>
      ))}
      {total > comments.length && (
        <p className="text-xs text-muted-foreground">View all {total} comments</p>
      )}
      {comments.length > 0 && total <= comments.length && (
        <p className="text-xs text-muted-foreground/60">{timeAgo(comments[comments.length - 1].created_at)}</p>
      )}
    </div>
  );
}
