import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import BottomSheet from "@/components/layout/BottomSheet";

export default function NewCycleSheet({
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
  const [name, setName] = useState("");

  const mutation = useMutation({
    // empty name → backend defaults to "Title #N"
    mutationFn: () => api.post(`/activities/${activityId}/cycles/`, { name: name.trim() }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", activityId] });
      onCreated();
    },
  });

  return (
    <BottomSheet onClose={onClose}>
        <div>
          <h2 className="font-semibold text-lg">Start a new cycle</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Folds the current planning round away and starts fresh — same activity, same people.
          </p>
        </div>
        <input
          className="border rounded-md px-3 py-2 text-sm bg-background"
          placeholder="Leave empty for an automatic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {mutation.isError && <p className="text-sm text-destructive">Something went wrong.</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Starting…" : "Start cycle"}
          </Button>
        </div>
    </BottomSheet>
  );
}
