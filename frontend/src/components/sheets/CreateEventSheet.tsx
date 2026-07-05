import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";

/** Post an event straight to the feed — no poll needed. */
export default function CreateEventSheet({
  activityId,
  onClose,
  onCreated,
}: {
  activityId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post(
        `/activities/${activityId}/events/`,
        { date, time_start: timeStart || null, time_end: timeEnd || null, note: note.trim() },
        activityId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onCreated();
    },
  });

  return (
    <BottomSheet onClose={onClose} title="Post an event">
      <h2 className="font-semibold text-lg">Post an event</h2>
      <Field>
        <FieldLabel htmlFor="event-date">Date</FieldLabel>
        <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
      </Field>
      <div className="flex gap-3">
        <Field>
          <FieldLabel htmlFor="event-start">From (optional)</FieldLabel>
          <Input id="event-start" type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="event-end">Until (optional)</FieldLabel>
          <Input id="event-end" type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {mutation.isError && <FieldError>Something went wrong.</FieldError>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post event"}
        </Button>
      </div>
    </BottomSheet>
  );
}
