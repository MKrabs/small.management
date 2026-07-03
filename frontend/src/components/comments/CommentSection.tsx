import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Comment } from "@/api/types";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/utils";

type Target = { poll?: number; proposal?: number; event?: number };

/** Threaded comments attached to a poll / proposal / event. Collapsed by default. */
export default function CommentSection({ activityId, target }: { activityId: string; target: Target }) {
  const [open, setOpen] = useState(false);
  const api = useApi();

  const params = new URLSearchParams(
    Object.entries(target).map(([k, v]) => [k, String(v)]),
  ).toString();

  const commentsQ = useQuery({
    queryKey: ["comments", activityId, params],
    queryFn: () => api.get<Comment[]>(`/activities/${activityId}/comments/?${params}`, activityId),
    enabled: open,
  });

  return (
    <section className="border-t pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
        Comments
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {commentsQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {commentsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {commentsQ.data?.map((c) => (
            <CommentItem key={c.id} comment={c} activityId={activityId} />
          ))}
          <Composer activityId={activityId} target={target} />
        </div>
      )}
    </section>
  );
}

function CommentItem({ comment, activityId }: { comment: Comment; activityId: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);

  const deleteMut = useMutation({
    mutationFn: (commentId: number) => api.del(`/activities/${activityId}/comments/${commentId}/`, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", activityId] }),
  });

  const repliesQ = useQuery({
    queryKey: ["comments", activityId, `parent=${comment.id}`],
    queryFn: () => api.get<Comment[]>(`/activities/${activityId}/comments/?parent=${comment.id}`, activityId),
    enabled: showReplies,
  });

  const deleted = !!comment.deleted_at;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{comment.member?.display_name ?? "someone"}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
      </div>
      <p className={`text-sm ${deleted ? "text-muted-foreground italic" : ""}`}>
        {deleted ? "Deleted." : comment.body}
      </p>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {comment.reply_count > 0 && (
          <button className="hover:text-foreground" onClick={() => setShowReplies((v) => !v)}>
            {showReplies ? "Hide replies" : `${comment.reply_count} repl${comment.reply_count === 1 ? "y" : "ies"}`}
          </button>
        )}
        {!deleted && (
          <>
            <button className="hover:text-foreground" onClick={() => setReplying((v) => !v)}>
              Reply
            </button>
            <ConfirmDelete
              title="Delete this comment?"
              description="It's deleted for everyone."
              onConfirm={() => deleteMut.mutate(comment.id)}
              trigger={<button className="hover:text-destructive">Delete</button>}
            />
          </>
        )}
      </div>

      {(showReplies || replying) && (
        <div className="ml-4 border-l pl-3 mt-1 flex flex-col gap-2">
          {showReplies &&
            repliesQ.data?.map((r) => (
              <div key={r.id}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{r.member?.display_name ?? "someone"}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
                <p className={`text-sm ${r.deleted_at ? "text-muted-foreground italic" : ""}`}>
                  {r.deleted_at ? "Deleted." : r.body}
                </p>
              </div>
            ))}
          {replying && (
            <Composer
              activityId={activityId}
              target={{}}
              parentId={comment.id}
              onDone={() => {
                setReplying(false);
                setShowReplies(true);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  activityId,
  target,
  parentId,
  onDone,
}: {
  activityId: string;
  target: Target;
  parentId?: number;
  onDone?: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Comment>(
        `/activities/${activityId}/comments/`,
        { body, ...target, ...(parentId ? { parent: parentId } : {}) },
        activityId,
      ),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", activityId] });
      onDone?.();
    },
  });

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        placeholder={parentId ? "Reply…" : "Add a comment…"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && body.trim() && mutation.mutate()}
      />
      <Button
        size="sm"
        className="self-center"
        onClick={() => mutation.mutate()}
        disabled={!body.trim() || mutation.isPending}
      >
        Post
      </Button>
    </div>
  );
}
