import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
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
  });

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="font-semibold text-lg">New comment</h2>
      <textarea
        className="border rounded-md px-3 py-2 text-sm bg-background w-full min-h-24 resize-none"
        placeholder="Say something to the group…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      {mutation.isError && <p className="text-sm text-destructive">Something went wrong.</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!body.trim() || mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </BottomSheet>
  );
}
