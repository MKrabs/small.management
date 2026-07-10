import type { Comment } from "@/api/types";
import { nameColor } from "@/components/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { cn, isWarning, timeAgo } from "@/lib/utils";

/** Read-only newest comments on a feed card — replies indented; the dedicated page has the full tree. */
export default function CommentPreview({ comments, total }: { comments: Comment[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <Separator className="mb-1" />
      {comments.map((c) => {
        const warning = isWarning(c.body);
        return (
          <p
            key={c.id}
            className={cn(
              "flex items-baseline gap-2 text-xs",
              c.parent_id && "pl-4",
              warning && "rounded bg-yellow-500/10 px-1.5 py-0.5",
            )}
          >
            {c.parent_id && <span className="text-muted-foreground/60 shrink-0">↳</span>}
            <span className="truncate flex-1">
              <span className="font-medium" style={{ color: nameColor(c.member?.avatar) }}>
                {c.member?.display_name ?? (warning ? "System" : "someone")}
              </span>{" "}
              <span className="text-muted-foreground">{c.body}</span>
            </span>
            <span className="text-muted-foreground/60 shrink-0">{timeAgo(c.created_at)}</span>
          </p>
        );
      })}
      {total > comments.length && (
        <p className="text-xs text-muted-foreground">View all {total} comments</p>
      )}
    </div>
  );
}
