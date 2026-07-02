import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import BottomSheet from "@/components/layout/BottomSheet";
import type { Proposal } from "@/api/types";

type Props = {
  activityId: string;
  pollId?: number;
  onClose: () => void;
  onCreated: (proposal: Proposal) => void;
};

export default function CreateProposalSheet({ activityId, pollId, onClose, onCreated }: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Proposal>(
        `/activities/${activityId}/proposals/`,
        {
          proposed_date: date,
          ...(time ? { proposed_time: time } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(pollId ? { poll: pollId } : {}),
        },
        activityId,
      ),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onCreated(p);
    },
  });

  return (
    <BottomSheet onClose={onClose}>
        <h2 className="font-semibold text-lg">New proposal</h2>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Time <span className="text-muted-foreground text-xs -mt-1">optional</span>
            <input
              type="time"
              step={1800}
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <input
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Note (optional) — e.g. “my place”"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {mutation.isError && <p className="text-sm text-destructive">Something went wrong.</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create proposal"}
          </Button>
        </div>
    </BottomSheet>
  );
}
