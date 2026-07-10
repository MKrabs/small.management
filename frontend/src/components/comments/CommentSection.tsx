import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import type { Comment } from "@/api/types";
import ConfirmDelete from "@/components/ConfirmDelete";
import { nameColor } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, isWarning, timeAgo } from "@/lib/utils";

type Target = { poll?: number; event?: number; thread?: number };

/** Reddit-style comment tree attached to a poll / event / standalone thread. */
export default function CommentSection({ activityId, target }: { activityId: string; target: Target }) {
  const api = useApi();

  const params = new URLSearchParams(
    Object.entries(target).map(([k, v]) => [k, String(v)]),
  ).toString();

  // one fetch returns the whole tree (replies inherit the target); nest by parent_id
  const commentsQ = useQuery({
    queryKey: ["comments", activityId, params],
    queryFn: () => api.get<Comment[]>(`/activities/${activityId}/comments/?${params}`, activityId),
  });

  const byParent = useMemo(() => {
    const map = new Map<number | null, Comment[]>();
    for (const c of commentsQ.data ?? []) {
      map.set(c.parent_id, [...(map.get(c.parent_id) ?? []), c]);
    }
    return map;
  }, [commentsQ.data]);

  const roots = byParent.get(target.thread ?? null) ?? [];

  return (
    <section className="flex flex-col gap-3">
      <Separator />
      <h2 className="text-sm font-medium">
        {target.thread ? "Replies" : "Comments"}
        {commentsQ.data && commentsQ.data.length > 0 ? ` (${commentsQ.data.length})` : ""}
      </h2>
      {commentsQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {roots.length === 0 && commentsQ.isSuccess && (
        <Empty className="p-4">
          <EmptyHeader>
            <EmptyDescription>{target.thread ? "No replies yet." : "No comments yet."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {roots.map((c) => (
        <CommentNode key={c.id} comment={c} byParent={byParent} activityId={activityId} />
      ))}
      {/* replies to a thread hang off the thread comment itself */}
      <Composer activityId={activityId} target={target.thread ? {} : target} parentId={target.thread} />
    </section>
  );
}

function CommentNode({
  comment,
  byParent,
  activityId,
}: {
  comment: Comment;
  byParent: Map<number | null, Comment[]>;
  activityId: string;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const children = byParent.get(comment.id) ?? [];
  const archived = !!comment.deleted_at;
  const warning = !archived && isWarning(comment.body);

  const archiveMut = useMutation({
    mutationFn: (isArchived: boolean) =>
      api.patch(`/activities/${activityId}/comments/${comment.id}/`, { archived: isArchived }, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", activityId] }),
  });

  return (
    <div className={cn("flex flex-col gap-1", warning && "rounded-md bg-yellow-500/10 p-2 -mx-2")}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium" style={{ color: nameColor(comment.member?.avatar) }}>
          {comment.member?.display_name ?? (warning ? "System" : "someone")}
        </span>
        <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
      </div>
      <p className={`text-sm ${archived ? "text-muted-foreground italic" : ""}`}>
        {archived ? "Archived." : comment.body}
      </p>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {archived ? (
          <button className="hover:text-foreground" onClick={() => archiveMut.mutate(false)}>
            Unarchive
          </button>
        ) : (
          <>
            <button className="hover:text-foreground" onClick={() => setReplying((v) => !v)}>
              Reply
            </button>
            <ConfirmDelete
              title="Archive this comment?"
              actionLabel="Archive"
              description="It's archived for everyone, but can be unarchived anytime. Replies stay."
              onConfirm={() => archiveMut.mutate(true)}
              trigger={<button className="hover:text-destructive">Archive</button>}
            />
          </>
        )}
        {children.length > 0 && (
          <button className="hover:text-foreground" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? `Show ${children.length} repl${children.length === 1 ? "y" : "ies"}` : "Hide replies"}
          </button>
        )}
      </div>

      {(replying || (!collapsed && children.length > 0)) && (
        <div className="ml-3 border-l pl-3 mt-1 flex flex-col gap-3">
          {replying && (
            <Composer
              activityId={activityId}
              target={{}}
              parentId={comment.id}
              onDone={() => setReplying(false)}
            />
          )}
          {!collapsed &&
            children.map((c) => (
              <CommentNode key={c.id} comment={c} byParent={byParent} activityId={activityId} />
            ))}
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
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onDone?.();
    },
    onError: () => toast.error("Couldn't post your comment — try again."),
  });

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        placeholder={parentId ? "Reply…" : "Add a comment…"}
        value={body}
        autoFocus={!!parentId}
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
