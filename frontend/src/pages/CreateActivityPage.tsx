import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity } from "@/api/types";

type CreateResponse = Activity & { session_token?: string };

export default function CreateActivityPage() {
  const navigate = useNavigate();
  const api = useApi();
  const { user, setSessionToken } = useAuth();

  const [title, setTitle] = useState("");
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPin, setShowPin] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<CreateResponse>("/activities/", {
        title,
        ...(pin ? { pin } : {}),
        ...(!user ? { display_name: displayName } : {}),
      }),
    onSuccess: (data) => {
      if (data.session_token) {
        setSessionToken(data.short_id, data.session_token);
      }
      navigate(`/activity/${data.short_id}/${data.slug}`);
    },
  });

  const canSubmit = title.trim() && (user || displayName.trim());

  return (
    <PageShell>
      <div className="flex flex-col gap-6 max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold">What are you planning?</h1>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="activity-title" className="sr-only">Activity title</FieldLabel>
            <Input
              id="activity-title"
              placeholder="Karaoke night, weekend trip…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          {!user && (
            <Field>
              <FieldLabel htmlFor="activity-name" className="sr-only">Your display name</FieldLabel>
              <Input
                id="activity-name"
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
          )}

          <Field className="gap-3">
            <FieldLabel htmlFor="activity-show-pin" className="font-normal text-muted-foreground">
              <Checkbox
                id="activity-show-pin"
                checked={showPin}
                onCheckedChange={(checked) => setShowPin(checked === true)}
              />
              Add a PIN (optional)
            </FieldLabel>
            {showPin && (
              <Field>
                <FieldLabel htmlFor="activity-pin" className="sr-only">PIN</FieldLabel>
                <Input id="activity-pin" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
              </Field>
            )}
          </Field>
        </FieldGroup>

        {mutation.error && <FieldError>Something went wrong. Try again.</FieldError>}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </PageShell>
  );
}
