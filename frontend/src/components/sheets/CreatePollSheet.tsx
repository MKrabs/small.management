import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, CalendarClock, CalendarRange, ListChecks, Plus, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import BottomSheet from "@/components/layout/BottomSheet";
import { cn } from "@/lib/utils";
import type { Poll, PollKind } from "@/api/types";

type Props = {
  activityId: string;
  onClose: () => void;
  onCreated: (poll: Poll) => void;
};

const KINDS: { kind: PollKind; icon: React.ReactNode; label: string; hint: string }[] = [
  { kind: "choice", icon: <ListChecks className="size-5" />, label: "Options", hint: "Vote on choices" },
  { kind: "date", icon: <Calendar className="size-5" />, label: "Day", hint: "Pick days that work" },
  { kind: "range", icon: <CalendarRange className="size-5" />, label: "Date range", hint: "Pick from–to spans" },
  { kind: "datetime", icon: <CalendarClock className="size-5" />, label: "Day & time", hint: "Full availability" },
];

export default function CreatePollSheet({ activityId, onClose, onCreated }: Props) {
  const api = useApi();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PollKind>("choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const valid = title.trim() && (kind !== "choice" || filledOptions.length >= 2);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Poll>(
        `/activities/${activityId}/polls/`,
        {
          title,
          kind,
          ...(kind === "choice" ? { options: filledOptions, allow_multiple: allowMultiple } : {}),
        },
        activityId,
      ),
    onSuccess: onCreated,
  });

  return (
    <BottomSheet onClose={onClose} title="New poll">
      <h2 className="font-semibold text-lg">New poll</h2>
      <Input
        placeholder='What are we deciding? e.g. "Pizza or sushi?"'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(k.kind)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              kind === k.kind ? "border-primary bg-primary/5" : "hover:bg-muted",
            )}
          >
            <span className={kind === k.kind ? "text-primary" : "text-muted-foreground"}>{k.icon}</span>
            <span>
              <span className="block text-sm font-medium">{k.label}</span>
              <span className="block text-xs text-muted-foreground">{k.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {kind === "choice" && (
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove option"
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, ""])}>
              <Plus data-icon="inline-start" />
              Add option
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOptions(["Yes", "No"])}>
              Yes / No
            </Button>
          </div>
          <Label className="flex items-center gap-2 mt-1 text-sm font-normal">
            <Checkbox checked={allowMultiple} onCheckedChange={(v) => setAllowMultiple(v === true)} />
            Allow picking multiple options
          </Label>
        </div>
      )}

      {mutation.isError && <FieldError>Something went wrong.</FieldError>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create poll"}
        </Button>
      </div>
    </BottomSheet>
  );
}
