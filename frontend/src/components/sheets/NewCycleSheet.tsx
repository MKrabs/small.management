import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";

export default function NewCycleSheet({
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
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
