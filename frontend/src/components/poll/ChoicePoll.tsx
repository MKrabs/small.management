import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Poll, PollOption } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { poll: Poll; activityId: string };

/** Voting UI for choice polls — shared by the feed card and the poll page. */
export default function ChoicePoll({ poll, activityId }: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const options = (poll.options ?? []).filter((o) => !o.deleted_at);
  const disabled = !!poll.deleted_at;

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
  });

  if (options.length === 2) {
    return (
      <TwoOptions options={options} disabled={disabled} onVote={(o) => voteMut.mutate(o)}>
        <AddOption poll={poll} activityId={activityId} onAdded={refresh} disabled={disabled} />
      </TwoOptions>
    );
  }

  const maxVotes = Math.max(1, ...options.map((o) => o.voters.length));
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          disabled={disabled || voteMut.isPending}
          onClick={() => voteMut.mutate(opt)}
          className={cn(
            "relative overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
            opt.my_vote ? "border-primary" : "hover:bg-muted/50",
          )}
        >
          <span
            className={cn("absolute inset-y-0 left-0", opt.my_vote ? "bg-primary/15" : "bg-muted")}
            style={{ width: `${(opt.voters.length / maxVotes) * 100}%` }}
          />
          <span className="relative flex items-center justify-between gap-2">
            <span className={cn("truncate", opt.my_vote && "font-medium")}>{opt.label}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <AvatarRow voters={opt.voters} />
              <span className="text-xs text-muted-foreground w-4 text-right">{opt.voters.length}</span>
            </span>
          </span>
        </button>
      ))}
      <AddOption poll={poll} activityId={activityId} onAdded={refresh} disabled={disabled} />
    </div>
  );
}

/** Two big side-by-side buttons, voter avatars beneath each side. */
function TwoOptions({
  options,
  disabled,
  onVote,
  children,
}: {
  options: PollOption[];
  disabled: boolean;
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
                "rounded-lg border py-4 px-2 text-center font-medium transition-colors",
                opt.my_vote
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted/50",
              )}
            >
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

/** Overlapping initials chips. */
export function AvatarRow({ voters, max = 4 }: { voters: { id: string; display_name: string }[]; max?: number }) {
  if (voters.length === 0) return null;
  const shown = voters.slice(0, max);
  const extra = voters.length - shown.length;
  return (
    <span className="flex -space-x-1.5">
      {shown.map((v) => (
        <span
          key={v.id}
          title={v.display_name}
          className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary ring-2 ring-background text-[10px] font-semibold uppercase"
        >
          {v.display_name.slice(0, 1)}
        </span>
      ))}
      {extra > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background text-[10px] font-medium">
          +{extra}
        </span>
      )}
    </span>
  );
}
