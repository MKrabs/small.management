import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";
import type { Comment } from "@/api/types";

type Props = {
  activityId: string;
  onClose: () => void;
  onBack?: () => void;
  onCreated: () => void;
};

/** Standalone thread in the activity feed (not attached to a card). */
export default function CreateCommentSheet({ activityId, onClose, onBack, onCreated }: Props) {
  const api = useApi();
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Comment>(`/activities/${activityId}/comments/`, { body: body.trim() }, activityId),
    onSuccess: onCreated,
  });

  return (
    <BottomSheet onClose={onClose} title="New thread">
      <Textarea
        className="min-h-24 resize-none"
        placeholder="Say something to the group…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      {mutation.isError && <FieldError>Something went wrong.</FieldError>}
      <div className="flex gap-2 justify-between">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        )}
        <Button onClick={() => mutation.mutate()} disabled={!body.trim() || mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </BottomSheet>
  );
}
