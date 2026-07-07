import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ChevronRight, Lock, LockOpen, Plus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useActivity } from "@/hooks/useActivity";
import type { Poll, PollKind, PollOption, Slot } from "@/api/types";
import UserAvatar from "@/components/UserAvatar";
import DetailShell from "@/components/layout/DetailShell";
import StickyBar from "@/components/layout/StickyBar";
import CommentSection from "@/components/comments/CommentSection";
import ConfirmDelete from "@/components/ConfirmDelete";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import SlotEditor from "@/components/poll/SlotEditor";
import Heatmap from "@/components/poll/Heatmap";
import ChoicePoll from "@/components/poll/ChoicePoll";
import DatePoll from "@/components/poll/DatePoll";
import RangePoll from "@/components/poll/RangePoll";
import { Button } from "@/components/ui/button";
import { STATUS_ICON, STATUS_TEXT } from "@/lib/status";
import { formatDay, formatTime, timeAgo } from "@/lib/utils";

export default function PollPage() {
  const { pollId = "" } = useParams();
  const { id, activity } = useActivity();
  const api = useApi();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);

  const invalidatePoll = () => {
    qc.invalidateQueries({ queryKey: ["poll", id, pollId] });
    qc.invalidateQueries({ queryKey: ["feed", id] });
  };

  const archiveMut = useMutation({
    mutationFn: (archived: boolean) => api.patch(`/activities/${id}/polls/${pollId}/`, { archived }, id),
    onSuccess: invalidatePoll,
  });

  const lockMut = useMutation({
    mutationFn: (locked: boolean) => api.patch(`/activities/${id}/polls/${pollId}/`, { locked }, id),
    onSuccess: invalidatePoll,
  });

  const pollQ = useQuery({
    queryKey: ["poll", id, pollId],
    queryFn: () => api.get<Poll>(`/activities/${id}/polls/${pollId}/`, id),
  });
  const kind = pollQ.data?.kind;
  const slotsQ = useQuery({
    queryKey: ["slots", id, pollId],
    queryFn: () => api.get<Slot[]>(`/activities/${id}/polls/${pollId}/slots/`, id),
    enabled: !!kind && kind !== "choice",
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
              <span className="my-auto text-xs text-muted-foreground uppercase tracking-wide">
                Poll{pollQ.data.deleted_at && " · archived"}
                {!pollQ.data.deleted_at && pollQ.data.locked_at && " · voting finished"}
                {activity &&
                  ` · ${kind === "choice" ? pollQ.data.voter_count : respondedCount} of ${activity.member_count} member${activity.member_count !== 1 ? "s" : ""} voted`}
              </span>
              <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                by {pollQ.data.created_by?.display_name ?? "someone"} · {timeAgo(pollQ.data.created_at)}
                {pollQ.data.deleted_at ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => archiveMut.mutate(false)}
                  >
                    <ArchiveRestore data-icon="inline-start" />
                    Unarchive
                  </Button>
                ) : (
                  <ConfirmDelete
                    title="Archive this poll?"
                    actionLabel="Archive"
                    description="It's archived for everyone but stays visible, struck through. You can unarchive it anytime."
                    onConfirm={() => archiveMut.mutate(true)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        aria-label="Archive poll"
                      >
                        <Archive />
                      </Button>
                    }
                  />
                )}
              </span>
            </div>
            <h1 className={`text-2xl font-semibold ${pollQ.data.deleted_at ? "line-through opacity-40" : ""}`}>
              {pollQ.data.title}
            </h1>
          </div>

          {kind === "choice" && (
            <>
              <ChoicePoll poll={pollQ.data} activityId={id} />
              <ChoiceBreakdown options={pollQ.data.options ?? []} />
            </>
          )}

          {kind === "date" && (
            <>
              <DatePoll poll={pollQ.data} activityId={id} slots={slots} />
              <MemberBreakdown slots={slots} kind={kind} />
            </>
          )}

          {kind === "range" && (
            <>
              <RangePoll poll={pollQ.data} activityId={id} slots={slots} />
              <MemberBreakdown slots={slots} kind={kind} />
            </>
          )}

          {kind === "datetime" && (
            <>
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
                    disabled={!!pollQ.data.locked_at}
                    onClick={() => setEditorOpen(true)}
                  >
                    {mySlots.map((s) => (
                      <SlotRow key={s.id} slot={s} />
                    ))}
                  </button>
                )}
                {!pollQ.data.locked_at && (
                  <Button variant="outline" size="sm" className="self-start" onClick={() => setEditorOpen(true)}>
                    <Plus data-icon="inline-start" />
                    {mySlots.length > 0 ? "Edit availability" : "Share availability"}
                  </Button>
                )}
              </section>

              {/* Per-member breakdown */}
              <MemberBreakdown slots={slots} kind={kind} />
            </>
          )}

          <CommentSection activityId={id} target={{ poll: Number(pollId) }} />
        </div>
      )}

      {pollQ.data && !pollQ.data.deleted_at && (
        <StickyBar>
          {pollQ.data.locked_at ? (
            <Button variant="outline" className="flex-1" size="lg" disabled={lockMut.isPending} onClick={() => lockMut.mutate(false)}>
              <LockOpen data-icon="inline-start" />
              Resume voting
            </Button>
          ) : (
            <Button className="flex-1" size="lg" disabled={lockMut.isPending} onClick={() => lockMut.mutate(true)}>
              <Lock data-icon="inline-start" />
              Close voting for everyone
            </Button>
          )}
        </StickyBar>
      )}

      {editorOpen && (
        <SlotEditor
          activityId={id}
          pollId={pollId}
          mySlots={mySlots}
          onClose={() => setEditorOpen(false)}
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

function SlotRow({ slot, showStatus = true }: { slot: Slot; showStatus?: boolean }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      {showStatus && (
        <span className={`font-semibold w-3 text-center shrink-0 ${STATUS_TEXT[slot.status]}`}>
          {STATUS_ICON[slot.status]}
        </span>
      )}
      <span>
        {slot.date ? formatDay(slot.date) : <span className="italic">general {slot.status}</span>}
        {slot.date_end && slot.date_end !== slot.date && <> – {formatDay(slot.date_end)}</>}
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

/** Per-option voter list — the mobile-friendly way to see who voted what (avatars have no hover). */
function ChoiceBreakdown({ options }: { options: PollOption[] }) {
  const voted = options.filter((o) => !o.deleted_at && o.voters.length > 0);
  if (voted.length === 0) return null;

  return (
    <Collapsible render={<section className="flex flex-col gap-4" />}>
      <Separator />
      <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
        See individual responses
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4">
        {voted.map((o) => (
          <div key={o.id} className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{o.label}</p>
            {o.voters.map((v) => (
              <span key={v.id} className="flex items-center gap-2 text-sm">
                <UserAvatar name={v.display_name} className="size-5" textClassName="text-[10px]" />
                {v.display_name}
              </span>
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MemberBreakdown({ slots, kind }: { slots: Slot[]; kind: PollKind }) {
  const [mode, setMode] = useState<"selection" | "person">("selection");
  // date/range polls only take "yes" votes, so a ✓ says nothing — the avatar identifies the voter
  const showStatus = kind === "datetime";

  const byMember = useMemo(() => {
    const map = new Map<string, { name: string; slots: Slot[] }>();
    for (const s of slots) {
      const entry = map.get(s.member.id) ?? { name: s.member.display_name, slots: [] };
      entry.slots.push(s);
      map.set(s.member.id, entry);
    }
    return [...map.values()].map((m) => ({ ...m, slots: sortSlots(m.slots) }));
  }, [slots]);

  const bySelection = useMemo(() => {
    const map = new Map<string, { label: string; slots: Slot[] }>();
    for (const s of sortSlots(slots)) {
      const key = `${s.date ?? "general"}|${s.date_end ?? ""}`;
      const label = !s.date
        ? "General"
        : s.date_end && s.date_end !== s.date
          ? `${formatDay(s.date)} – ${formatDay(s.date_end)}`
          : formatDay(s.date);
      const entry = map.get(key) ?? { label, slots: [] };
      entry.slots.push(s);
      map.set(key, entry);
    }
    return [...map.values()];
  }, [slots]);

  if (byMember.length === 0) return null;

  return (
    <Collapsible render={<section className="flex flex-col gap-4" />}>
      <Separator />
      <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />
        See individual responses
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4">
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => v[0] && setMode(v[0] as "selection" | "person")}
          variant="outline"
          size="sm"
          className="self-start"
        >
          <ToggleGroupItem value="selection">By selection</ToggleGroupItem>
          <ToggleGroupItem value="person">By person</ToggleGroupItem>
        </ToggleGroup>

        {mode === "person" &&
          byMember.map((m) => (
            <div key={m.name} className="flex flex-col gap-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <UserAvatar name={m.name} className="size-5" textClassName="text-[10px]" />
                {m.name}
              </p>
              {m.slots.map((s) => (
                <SlotRow key={s.id} slot={s} showStatus={showStatus} />
              ))}
            </div>
          ))}

        {mode === "selection" &&
          bySelection.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <p className="text-sm font-medium">{g.label}</p>
              {g.slots.map((s) => (
                <span key={s.id} className="flex items-center gap-2 text-sm">
                  <UserAvatar name={s.member.display_name} className="size-5" textClassName="text-[10px]" />
                  {showStatus && (
                    <span className={`font-semibold w-3 text-center shrink-0 ${STATUS_TEXT[s.status]}`}>
                      {STATUS_ICON[s.status]}
                    </span>
                  )}
                  <span>
                    {s.member.display_name}
                    {s.time_start && s.time_end && (
                      <span className="text-muted-foreground">
                        {" "}· {formatTime(s.time_start)}–{formatTime(s.time_end)}
                      </span>
                    )}
                  </span>
                  {s.note && <span className="text-muted-foreground truncate">“{s.note}”</span>}
                </span>
              ))}
            </div>
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
