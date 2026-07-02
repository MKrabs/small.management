import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import BottomSheet from "@/components/layout/BottomSheet";
import type { Poll } from "@/api/types";

type Props = {
  activityId: string;
  onClose: () => void;
  onCreated: (poll: Poll) => void;
};

export default function CreatePollSheet({ activityId, onClose, onCreated }: Props) {
  const api = useApi();
  const [title, setTitle] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Poll>(`/activities/${activityId}/polls/`, { title }, activityId),
    onSuccess: onCreated,
  });

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="font-semibold text-lg">New poll</h2>
      <input
        className="border rounded-md px-3 py-2 text-sm bg-background w-full"
        placeholder='What are we deciding? e.g. "Pick a date"'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && title.trim() && mutation.mutate()}
      />
      {mutation.isError && (
        <p className="text-sm text-destructive">Something went wrong.</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!title.trim() || mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Create poll"}
        </Button>
      </div>
    </BottomSheet>
  );
}
