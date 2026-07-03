import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
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
    <BottomSheet onClose={onClose} title="New proposal">
        <h2 className="font-semibold text-lg">New proposal</h2>

        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="proposal-date">Date</FieldLabel>
            <Input
              id="proposal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="proposal-time">
              Time <span className="text-muted-foreground text-xs font-normal">optional</span>
            </FieldLabel>
            <Input
              id="proposal-time"
              type="time"
              step={1800}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="proposal-note" className="sr-only">Note</FieldLabel>
            <Input
              id="proposal-note"
              placeholder="Note (optional) — e.g. “my place”"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </FieldGroup>

        {mutation.isError && <FieldError>Something went wrong.</FieldError>}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create proposal"}
          </Button>
        </div>
    </BottomSheet>
  );
}
