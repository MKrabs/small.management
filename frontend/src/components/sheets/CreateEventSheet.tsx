import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

/** Post an event straight to the feed — no poll needed. */
export default function CreateEventSheet({
  activityId,
  onBack,
  onCreated,
}: {
  activityId: string;
  onBack?: () => void;
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
    <div className="flex flex-col gap-4">
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
      <div className="flex gap-2 justify-between">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        )}
        <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post event"}
        </Button>
      </div>
    </div>
  );
}
