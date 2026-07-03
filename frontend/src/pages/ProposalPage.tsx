import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Event, Member, Proposal, ProposalVote } from "@/api/types";
import DetailShell from "@/components/layout/DetailShell";
import StickyBar from "@/components/layout/StickyBar";
import CommentSection from "@/components/comments/CommentSection";
import ConfirmDelete from "@/components/ConfirmDelete";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomSheet from "@/components/layout/BottomSheet";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_TOGGLE, type VoteStatus } from "@/lib/status";
import { cn, formatDay, formatTime } from "@/lib/utils";

export default function ProposalPage() {
  const { proposalId = "" } = useParams();
  const { id, slug, activity } = useActivity();
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [voteOpen, setVoteOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [filter, setFilter] = useState<VoteStatus | null>(null);

  const deleteMut = useMutation({
    mutationFn: () => api.del(`/activities/${id}/proposals/${proposalId}/`, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal", id, proposalId] });
      qc.invalidateQueries({ queryKey: ["feed", id] });
    },
  });

  const proposalQ = useQuery({
    queryKey: ["proposal", id, proposalId],
    queryFn: () => api.get<Proposal>(`/activities/${id}/proposals/${proposalId}/`, id),
  });
  const membersQ = useQuery({
    queryKey: ["members", id],
    queryFn: () => api.get<Member[]>(`/activities/${id}/members/`, id),
  });

  const proposal = proposalQ.data;
  const votes = proposal?.votes.filter((v) => !v.deleted_at) ?? [];
  const myVote = votes.find((v) => v.member.id === activity?.me?.id);
  const deleted = !!proposal?.deleted_at;

  const tally = (s: VoteStatus) => votes.filter((v) => v.status === s).length;

  return (
    <DetailShell>
      {proposalQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {proposalQ.isError && <p className="text-sm text-destructive">Proposal not found.</p>}
      {proposal && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <DetailHeader
              label={deleted ? "Proposal · deleted" : "Proposal"}
              createdBy={proposal.created_by?.display_name}
              createdAt={proposal.created_at}
              action={
                !deleted && (
                  <ConfirmDelete
                    title="Delete this proposal?"
                    description="It's deleted for everyone but stays visible, struck through."
                    onConfirm={() => deleteMut.mutate()}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        aria-label="Delete proposal"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                )
              }
            />
            <h1 className={`text-2xl font-semibold ${deleted ? "line-through opacity-40" : ""}`}>
              {formatDay(proposal.proposed_date, { weekday: "long", month: "long", day: "numeric" })}
              {proposal.proposed_time && (
                <span className="text-muted-foreground"> · {formatTime(proposal.proposed_time)}</span>
              )}
            </h1>
            {proposal.note && <p className="text-sm mt-2">{proposal.note}</p>}
          </div>

          {/* Tally — tap a count to filter the member list */}
          <ToggleGroup
            value={filter ? [filter] : []}
            onValueChange={(v) => setFilter((v[0] as VoteStatus) ?? null)}
            variant="outline"
            className="w-full"
          >
            {(["yes", "maybe", "no"] as const).map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className={cn("flex-1 h-auto flex-col gap-0 py-2", STATUS_TOGGLE[s])}
              >
                <span className="text-lg font-semibold">{tally(s)}</span>
                <span className="text-sm font-normal">{s}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Member votes */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Votes</h2>
            {(membersQ.data ?? [])
              .map((m) => ({ member: m, vote: votes.find((v) => v.member.id === m.id) }))
              .filter(({ vote }) => (filter ? vote?.status === filter : true))
              .map(({ member, vote }) => (
                <VoteRow key={member.id} member={member} vote={vote} />
              ))}
          </section>

          <CommentSection activityId={id} target={{ proposal: Number(proposalId) }} />
        </div>
      )}

      {proposal && !deleted && (
        <StickyBar>
          <Button variant="outline" className="flex-1" size="lg" onClick={() => setVoteOpen(true)}>
            {myVote ? "Change vote" : "Vote"}
          </Button>
          <Button className="flex-1" size="lg" onClick={() => setFinalizeOpen(true)}>
            Set as event
          </Button>
        </StickyBar>
      )}

      {voteOpen && proposal && (
        <VoteSheet
          activityId={id}
          proposalId={proposal.id}
          myVote={myVote}
          onClose={() => setVoteOpen(false)}
        />
      )}
      {finalizeOpen && proposal && (
        <FinalizeSheet
          activityId={id}
          proposal={proposal}
          onClose={() => setFinalizeOpen(false)}
          onFinalized={(e: Event) => navigate(`/activity/${id}/${slug}/event/${e.id}`)}
        />
      )}
    </DetailShell>
  );
}

function VoteRow({ member, vote }: { member: Member; vote: ProposalVote | undefined }) {
  return (
    <div className={`flex items-center gap-3 ${vote ? "" : "opacity-40"}`}>
      <span className="text-sm font-medium flex-1 truncate">{member.display_name}</span>
      {vote?.comment && (
        <span className="text-xs text-muted-foreground truncate max-w-[40%]">“{vote.comment}”</span>
      )}
      <Badge variant={vote ? vote.status : "outline"} className={cn(!vote && "text-muted-foreground")}>
        {vote?.status ?? "no vote"}
      </Badge>
    </div>
  );
}

function VoteSheet({
  activityId,
  proposalId,
  myVote,
  onClose,
}: {
  activityId: string;
  proposalId: number;
  myVote: ProposalVote | undefined;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<VoteStatus | null>(myVote?.status ?? null);
  const [comment, setComment] = useState(myVote?.comment ?? "");

  const done = () => {
    qc.invalidateQueries({ queryKey: ["proposal", activityId] });
    qc.invalidateQueries({ queryKey: ["feed", activityId] });
    onClose();
  };

  const save = useMutation({
    mutationFn: () =>
      api.post(`/activities/${activityId}/proposals/${proposalId}/votes/`, { status, comment }, activityId),
    onSuccess: done,
    onError: () => toast.error("Something went wrong."),
  });
  const retract = useMutation({
    mutationFn: () =>
      api.del(`/activities/${activityId}/proposals/${proposalId}/votes/${myVote!.id}/`, activityId),
    onSuccess: done,
    onError: () => toast.error("Something went wrong."),
  });

  return (
    <BottomSheet onClose={onClose} title="Your vote">
        <h2 className="font-semibold text-lg">Your vote</h2>
        <ToggleGroup
          value={status ? [status] : []}
          onValueChange={(v) => setStatus((v[0] as VoteStatus) ?? null)}
          variant="outline"
          className="w-full"
        >
          {(["yes", "maybe", "no"] as const).map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              className={cn("flex-1 h-auto py-2 capitalize font-normal", STATUS_TOGGLE[s])}
            >
              {s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="flex gap-2 justify-between">
          {myVote ? (
            <Button variant="destructive" onClick={() => retract.mutate()} disabled={retract.isPending}>
              Retract vote
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!status || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
    </BottomSheet>
  );
}

function FinalizeSheet({
  activityId,
  proposal,
  onClose,
  onFinalized,
}: {
  activityId: string;
  proposal: Proposal;
  onClose: () => void;
  onFinalized: (e: Event) => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Event>(
        `/activities/${activityId}/proposals/${proposal.id}/finalize/`,
        { note: note.trim() },
        activityId,
      ),
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onFinalized(e);
    },
    onError: () => toast.error("Something went wrong."),
  });

  return (
    <BottomSheet onClose={onClose} title="Set as event">
        <div>
          <h2 className="font-semibold text-lg">Set as event</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDay(proposal.proposed_date, { weekday: "long", month: "long", day: "numeric" })}
            {proposal.proposed_time && ` · ${formatTime(proposal.proposed_time)}`} becomes a fixed event
            everyone can RSVP to.
          </p>
        </div>
        <Input
          placeholder="Note (optional) — e.g. “come earlier if you want”"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create event"}
          </Button>
        </div>
    </BottomSheet>
  );
}
