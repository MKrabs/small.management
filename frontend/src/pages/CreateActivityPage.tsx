import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
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

        <div className="flex flex-col gap-4">
          <input
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Karaoke night, weekend trip…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {!user && (
            <input
              className="border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPin}
                onChange={(e) => setShowPin(e.target.checked)}
              />
              Add a PIN (optional)
            </label>
            {showPin && (
              <input
                className="border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            )}
          </div>
        </div>

        {mutation.error && (
          <p className="text-sm text-destructive">Something went wrong. Try again.</p>
        )}

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
