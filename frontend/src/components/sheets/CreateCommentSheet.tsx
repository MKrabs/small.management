import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BottomSheet from "@/components/layout/BottomSheet";
import type { Comment } from "@/api/types";

type Props = {
  activityId: string;
  onClose: () => void;
  onCreated: () => void;
};

/** Standalone comment in the activity feed (not attached to a card). */
export default function CreateCommentSheet({ activityId, onClose, onCreated }: Props) {
  const api = useApi();
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Comment>(`/activities/${activityId}/comments/`, { body: body.trim() }, activityId),
    onSuccess: onCreated,
    onError: () => toast.error("Something went wrong."),
  });

  return (
    <BottomSheet onClose={onClose} title="New comment">
      <h2 className="font-semibold text-lg">New comment</h2>
      <Textarea
        className="min-h-24 resize-none"
        placeholder="Say something to the group…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!body.trim() || mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </BottomSheet>
  );
}
