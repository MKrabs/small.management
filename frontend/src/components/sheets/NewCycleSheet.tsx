import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";

export default function NewCycleSheet({
  activityId,
  onClose,
  onBack,
  onCreated,
}: {
  activityId: string;
  onClose: () => void;
  onBack?: () => void;
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
    <BottomSheet onClose={onClose} title="Start a new cycle">
        <p className="text-sm text-muted-foreground">
          Folds the current planning round away and starts fresh — same activity, same people.
        </p>
        <Input
          placeholder="Leave empty for an automatic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Starting…" : "Start cycle"}
          </Button>
        </div>
    </BottomSheet>
  );
}
