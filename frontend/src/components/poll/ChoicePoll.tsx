import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Poll, PollOption } from "@/api/types";
import Crown from "@/components/Crown";
import UserAvatar from "@/components/UserAvatar";
import ConfirmDelete from "@/components/ConfirmDelete";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { poll: Poll; activityId: string };

/** Voting UI for choice polls — shared by the feed card and the poll page. */
export default function ChoicePoll({ poll, activityId }: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const options = (poll.options ?? []).filter((o) => !o.deleted_at);
  const disabled = !!poll.deleted_at || !!poll.locked_at;

  const refresh = (updated: Poll) => {
    qc.setQueryData(["poll", activityId, String(poll.id)], updated);
    qc.invalidateQueries({ queryKey: ["feed", activityId] });
  };

  const voteMut = useMutation({
    mutationFn: (opt: PollOption) =>
      opt.my_vote
        ? api.del<Poll>(`/activities/${activityId}/polls/${poll.id}/options/${opt.id}/vote/`, activityId)
        : api.put<Poll>(`/activities/${activityId}/polls/${poll.id}/options/${opt.id}/vote/`, {}, activityId),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't save your vote — try again."),
  });

  const reorderMut = useMutation({
    mutationFn: (order: number[]) =>
      api.patch<Poll>(`/activities/${activityId}/polls/${poll.id}/options/`, { order }, activityId),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't reorder the options — try again."),
    onSettled: () => setDragOrder(null),
  });

  const removeMut = useMutation({
    mutationFn: (opt: PollOption) =>
      api.del<Poll>(`/activities/${activityId}/polls/${poll.id}/options/${opt.id}/`, activityId),
    onSuccess: (updated) => {
      refresh(updated);
      qc.invalidateQueries({ queryKey: ["comments", activityId] });
    },
    onError: () => toast.error("Couldn't remove the option — try again."),
  });

  // ponytail: pointer-based drag — native HTML5 DnD has no touch support and this app is mobile-first
  const [dragOrder, setDragOrder] = useState<number[] | null>(null);
  const shown = dragOrder
    ? [...options].sort((a, b) => dragOrder.indexOf(a.id) - dragOrder.indexOf(b.id))
    : options;

  const dragMove = (e: React.PointerEvent, dragId: number) => {
    if (!dragOrder) return;
    const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-opt]");
    const overId = row ? Number(row.dataset.opt) : null;
    if (overId == null || overId === dragId) return;
    setDragOrder((ids) => {
      if (!ids) return ids;
      const next = [...ids];
      next.splice(next.indexOf(overId), 0, ...next.splice(next.indexOf(dragId), 1));
      return next;
    });
  };

  const dragEnd = () => {
    setDragOrder((ids) => {
      if (!ids) return null;
      if (ids.some((id, i) => id !== options[i].id)) {
        reorderMut.mutate(ids); // onSettled clears dragOrder, avoiding a snap-back flicker
        return ids;
      }
      return null;
    });
  };

  const maxVotes = Math.max(1, ...options.map((o) => o.voters.length));

  if (options.length === 2) {
    return (
      <TwoOptions options={options} disabled={disabled} maxVotes={maxVotes} onVote={(o) => voteMut.mutate(o)}>
        <AddOption poll={poll} activityId={activityId} onAdded={refresh} disabled={disabled} />
      </TwoOptions>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((opt) => (
        <div key={opt.id} data-opt={opt.id} className="flex items-center gap-1">
          {!disabled && (
            <span
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragOrder(options.map((o) => o.id));
              }}
              onPointerMove={(e) => dragMove(e, opt.id)}
              onPointerUp={dragEnd}
              onPointerCancel={dragEnd}
              className="cursor-grab touch-none select-none text-muted-foreground/40 hover:text-muted-foreground -ml-1"
              aria-label={`Drag to reorder ${opt.label}`}
            >
              <GripVertical className="size-4" />
            </span>
          )}
          <button
            disabled={disabled || voteMut.isPending}
            onClick={() => voteMut.mutate(opt)}
            className={cn(
              "relative flex-1 min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
              opt.my_vote ? "border-primary" : "hover:bg-muted/50",
            )}
          >
            <span
              className={cn("absolute inset-y-0 left-0", opt.my_vote ? "bg-primary/15" : "bg-muted")}
              style={{ width: `${(opt.voters.length / maxVotes) * 100}%` }}
            />
            <span className="relative flex items-center justify-between gap-2">
              <span className={cn("flex items-center gap-1.5 min-w-0", opt.my_vote && "font-medium")}>
                <span className="truncate">{opt.label}</span>
                {maxVotes >= 2 && opt.voters.length === maxVotes && (
                  <Crown className="h-3 w-4 shrink-0 text-amber-500" />
                )}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <AvatarRow voters={opt.voters} />
                <span className="text-xs text-muted-foreground w-4 text-right">{opt.voters.length}</span>
              </span>
            </span>
          </button>
          {!disabled && (
            <ConfirmDelete
              title="Remove this option?"
              actionLabel="Remove"
              description={
                opt.voters.length > 0
                  ? `${opt.voters.length} vote${opt.voters.length !== 1 ? "s" : ""} placed on “${opt.label}” will be invalidated.`
                  : `“${opt.label}” is removed for everyone.`
              }
              onConfirm={() => removeMut.mutate(opt)}
              trigger={
                <button
                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                  aria-label={`Remove ${opt.label}`}
                >
                  <X className="size-4" />
                </button>
              }
            />
          )}
        </div>
      ))}
      <AddOption poll={poll} activityId={activityId} onAdded={refresh} disabled={disabled} />
    </div>
  );
}

/** Two big side-by-side buttons, voter avatars beneath each side. */
function TwoOptions({
  options,
  disabled,
  maxVotes,
  onVote,
  children,
}: {
  options: PollOption[];
  disabled: boolean;
  maxVotes: number;
  onVote: (opt: PollOption) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex flex-col gap-1.5">
            <button
              disabled={disabled}
              onClick={() => onVote(opt)}
              className={cn(
                "relative rounded-lg border py-4 px-2 text-center font-medium transition-colors",
                opt.my_vote
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted/50",
              )}
            >
              {maxVotes >= 2 && opt.voters.length === maxVotes && (
                <Crown className="absolute top-1.5 right-2 h-3 w-4 text-amber-500" />
              )}
              {opt.label}
              <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                {opt.voters.length} vote{opt.voters.length !== 1 ? "s" : ""}
              </span>
            </button>
            <div className={cn("flex", i === 0 ? "justify-start" : "justify-end")}>
              <AvatarRow voters={opt.voters} max={6} />
            </div>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function AddOption({
  poll,
  activityId,
  onAdded,
  disabled,
}: {
  poll: Poll;
  activityId: string;
  onAdded: (updated: Poll) => void;
  disabled: boolean;
}) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<PollOption>(`/activities/${activityId}/polls/${poll.id}/options/`, { label }, activityId),
    onSuccess: (opt) => {
      setLabel("");
      setEditing(false);
      onAdded({ ...poll, options: [...(poll.options ?? []), opt] });
    },
    onError: () => toast.error("Couldn't add the option — try again."),
  });

  if (disabled) return null;
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Plus className="size-3.5" />
        Add option
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <Input
        className="flex-1 h-8 text-sm"
        placeholder="New option…"
        value={label}
        autoFocus
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) mutation.mutate();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button size="sm" onClick={() => mutation.mutate()} disabled={!label.trim() || mutation.isPending}>
        Add
      </Button>
    </div>
  );
}

/** Overlapping initials avatars with names on hover. */
export function AvatarRow({ voters, max = 4 }: { voters: { id: string; display_name: string }[]; max?: number }) {
  if (voters.length === 0) return null;
  const shown = voters.slice(0, max);
  const extra = voters.length - shown.length;
  return (
    <AvatarGroup>
      {shown.map((v) => (
        <UserAvatar key={v.id} name={v.display_name} className="size-5" textClassName="text-[10px]" />
      ))}
      {extra > 0 && <AvatarGroupCount className="size-5 text-[10px]">+{extra}</AvatarGroupCount>}
    </AvatarGroup>
  );
}
