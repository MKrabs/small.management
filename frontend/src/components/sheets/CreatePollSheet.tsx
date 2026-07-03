import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    onError: () => toast.error("Something went wrong."),
  });

  return (
    <BottomSheet onClose={onClose} title="New poll">
      <h2 className="font-semibold text-lg">New poll</h2>
      <Input
        placeholder='What are we deciding? e.g. "Pick a date"'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && title.trim() && mutation.mutate()}
      />
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
