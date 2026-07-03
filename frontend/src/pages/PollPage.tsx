import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, Proposal, Slot } from "@/api/types";
import DetailShell from "@/components/layout/DetailShell";
import StickyBar from "@/components/layout/StickyBar";
import CommentSection from "@/components/comments/CommentSection";
import ConfirmDelete from "@/components/ConfirmDelete";
import CreateProposalSheet from "@/components/sheets/CreateProposalSheet";
import SlotEditor from "@/components/poll/SlotEditor";
import Heatmap from "@/components/poll/Heatmap";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { STATUS_ICON, STATUS_TEXT } from "@/lib/status";
import { formatDay, formatTime, timeAgo } from "@/lib/utils";

export default function PollPage() {
  const { pollId = "" } = useParams();
  const { id, slug, activity } = useActivity();
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => api.del(`/activities/${id}/polls/${pollId}/`, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poll", id, pollId] });
      qc.invalidateQueries({ queryKey: ["feed", id] });
    },
  });

  const pollQ = useQuery({
    queryKey: ["poll", id, pollId],
    queryFn: () => api.get<Poll>(`/activities/${id}/polls/${pollId}/`, id),
  });
  const slotsQ = useQuery({
    queryKey: ["slots", id, pollId],
    queryFn: () => api.get<Slot[]>(`/activities/${id}/polls/${pollId}/slots/`, id),
  });

  const slots = useMemo(() => slotsQ.data ?? [], [slotsQ.data]);
  const myId = activity?.me?.id;
  const mySlots = useMemo(
    () => sortSlots(slots.filter((s) => s.member.id === myId)),
    [slots, myId],
  );
  const respondedCount = new Set(slots.map((s) => s.member.id)).size;

  return (
    <DetailShell>
      {pollQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {pollQ.isError && <p className="text-sm text-destructive">Poll not found.</p>}
      {pollQ.data && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Poll{pollQ.data.deleted_at && " · deleted"}
              </span>
              {!pollQ.data.deleted_at && (
                <ConfirmDelete
                  title="Delete this poll?"
                  description="It's deleted for everyone but stays visible, struck through."
                  onConfirm={() => deleteMut.mutate()}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label="Delete poll"
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              )}
            </div>
            <h1 className={`text-2xl font-semibold ${pollQ.data.deleted_at ? "line-through opacity-40" : ""}`}>
              {pollQ.data.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              by {pollQ.data.created_by?.display_name ?? "someone"} · {timeAgo(pollQ.data.created_at)}
            </p>
            {activity && (
              <p className="text-sm text-muted-foreground mt-2">
                {respondedCount} of {activity.member_count} member{activity.member_count !== 1 ? "s" : ""} have
                shared availability
              </p>
            )}
          </div>

          <Heatmap slots={slots} />

          {/* Your availability */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Your availability</h2>
            {mySlots.length === 0 && (
              <p className="text-sm text-muted-foreground">You haven't shared anything yet.</p>
            )}
            {mySlots.length > 0 && (
              <button
                className="flex flex-col gap-1.5 text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                onClick={() => setEditorOpen(true)}
              >
                {mySlots.map((s) => (
                  <SlotRow key={s.id} slot={s} />
                ))}
              </button>
            )}
            <Button variant="outline" size="sm" className="self-start" onClick={() => setEditorOpen(true)}>
              <Plus data-icon="inline-start" />
              {mySlots.length > 0 ? "Edit availability" : "Share availability"}
            </Button>
          </section>

          {/* Per-member breakdown */}
          <MemberBreakdown slots={slots} />

          <CommentSection activityId={id} target={{ poll: Number(pollId) }} />
        </div>
      )}

      <StickyBar>
        <Button className="flex-1" size="lg" onClick={() => setProposalOpen(true)}>
          Create proposal
        </Button>
      </StickyBar>

      {editorOpen && (
        <SlotEditor
          activityId={id}
          pollId={pollId}
          mySlots={mySlots}
          onClose={() => setEditorOpen(false)}
        />
      )}
      {proposalOpen && (
        <CreateProposalSheet
          activityId={id}
          pollId={Number(pollId)}
          onClose={() => setProposalOpen(false)}
          onCreated={(p: Proposal) => navigate(`/activity/${id}/${slug}/proposal/${p.id}`)}
        />
      )}
    </DetailShell>
  );
}

function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) =>
    `${a.date ?? ""}${a.time_start ?? ""}`.localeCompare(`${b.date ?? ""}${b.time_start ?? ""}`),
  );
}

function SlotRow({ slot }: { slot: Slot }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      <span className={`font-semibold w-3 text-center shrink-0 ${STATUS_TEXT[slot.status]}`}>
        {STATUS_ICON[slot.status]}
      </span>
      <span>
        {slot.date ? formatDay(slot.date) : <span className="italic">general {slot.status}</span>}
        {slot.time_start && slot.time_end && (
          <span className="text-muted-foreground">
            {" "}· {formatTime(slot.time_start)}–{formatTime(slot.time_end)}
          </span>
        )}
      </span>
      {slot.note && <span className="text-muted-foreground truncate">“{slot.note}”</span>}
    </span>
  );
}

function MemberBreakdown({ slots }: { slots: Slot[] }) {
  const byMember = useMemo(() => {
    const map = new Map<string, { name: string; slots: Slot[] }>();
    for (const s of slots) {
      const entry = map.get(s.member.id) ?? { name: s.member.display_name, slots: [] };
      entry.slots.push(s);
      map.set(s.member.id, entry);
    }
    return [...map.values()].map((m) => ({ ...m, slots: sortSlots(m.slots) }));
  }, [slots]);

  if (byMember.length === 0) return null;

  return (
    <Collapsible render={<section />}>
      <Separator className="mb-4" />
      <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
        See individual responses
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 flex flex-col gap-4">
        {byMember.map((m) => (
          <div key={m.name} className="flex flex-col gap-1">
            <p className="text-sm font-medium">{m.name}</p>
            {m.slots.map((s) => (
              <SlotRow key={s.id} slot={s} />
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
