import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, Proposal, Slot } from "@/api/types";
import DetailShell from "@/components/layout/DetailShell";
import StickyBar from "@/components/layout/StickyBar";
import CommentSection from "@/components/comments/CommentSection";
import ConfirmDelete from "@/components/ConfirmDelete";
import DetailHeader from "@/components/layout/DetailHeader";
import CreateProposalSheet from "@/components/sheets/CreateProposalSheet";
import PollCalendar from "@/components/poll/PollCalendar";
import DaySheet from "@/components/poll/DaySheet";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { STATUS_ICON, STATUS_TEXT } from "@/lib/status";
import { formatDay, formatTime } from "@/lib/utils";

export default function PollPage() {
  const { pollId = "" } = useParams();
  const { id, slug, activity } = useActivity();
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
  const respondedCount = new Set(slots.map((s) => s.member.id)).size;

  return (
    <DetailShell>
      {pollQ.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {pollQ.isError && <p className="text-sm text-destructive">Poll not found.</p>}
      {pollQ.data && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <DetailHeader
              label={pollQ.data.deleted_at ? "Poll · deleted" : "Poll"}
              createdBy={pollQ.data.created_by?.display_name}
              createdAt={pollQ.data.created_at}
              action={
                !pollQ.data.deleted_at && (
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
                )
              }
            />
            <h1 className={`text-2xl font-semibold ${pollQ.data.deleted_at ? "line-through opacity-40" : ""}`}>
              {pollQ.data.title}
            </h1>
            {activity && (
              <p className="text-sm text-muted-foreground mt-2">
                {respondedCount} of {activity.member_count} member{activity.member_count !== 1 ? "s" : ""} have
                shared availability
              </p>
            )}
          </div>

          {/* Everyone's votes, day by day — tap a day to add or edit yours */}
          <section className="flex flex-col gap-2">
            <PollCalendar slots={slots} myId={myId} onSelectDay={setSelectedDay} />
            <p className="text-xs text-muted-foreground">
              Tap a day to add or edit your availability. The number shows how many people
              voted; the color is your own answer.
            </p>
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

      {selectedDay && (
        <DaySheet
          activityId={id}
          pollId={pollId}
          date={selectedDay}
          slots={slots}
          myId={myId}
          onClose={() => setSelectedDay(null)}
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
