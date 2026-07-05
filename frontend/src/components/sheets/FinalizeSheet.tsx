import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Event, Poll } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";

type Props = {
  activityId: string;
  poll: Poll;
  onClose: () => void;
  onCreated: (event: Event) => void;
};

/** Turn a decision into an Event: pick the winning date (time optional). */
export default function FinalizeSheet({ activityId, poll, onClose, onCreated }: Props) {
  const api = useApi();
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Event>(
        `/activities/${activityId}/polls/${poll.id}/finalize/`,
        {
          date,
          time_start: timeStart || null,
          time_end: timeEnd || null,
          note: note.trim(),
        },
        activityId,
      ),
    onSuccess: onCreated,
  });

  return (
    <BottomSheet onClose={onClose} title="Finalize">
      <h2 className="font-semibold text-lg">Make it official</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Sets the date for “{poll.title}” as an event everyone can RSVP to.
      </p>

      <Field>
        <FieldLabel htmlFor="fin-date">Date</FieldLabel>
        <Input id="fin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
      </Field>
      <div className="flex items-end gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor="fin-start">From (optional)</FieldLabel>
          <Input id="fin-start" type="time" step={1800} value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="fin-end">Until</FieldLabel>
          <Input id="fin-end" type="time" step={1800} value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="fin-note">Note (optional)</FieldLabel>
        <Input id="fin-note" placeholder="e.g. winner: Moon Bar" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {mutation.isError && <FieldError>Something went wrong.</FieldError>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
          {mutation.isPending ? "Finalizing…" : "Finalize event"}
        </Button>
      </div>
    </BottomSheet>
  );
}
