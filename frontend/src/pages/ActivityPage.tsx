import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity, FeedItem, Member } from "@/api/types";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import ActivityFeed from "@/components/feed/ActivityFeed";
import ActivityHeader from "@/components/layout/ActivityHeader";
import AddToActivitySheet from "@/components/sheets/AddToActivitySheet";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

export default function ActivityPage() {
  const { id = "", slug = "" } = useParams();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activityQ = useQuery({
    queryKey: ["activity", id],
    // pass id so session token header is sent → is_member is accurate
    queryFn: () => api.get<Activity>(`/activities/${id}/`, id),
  });

  const feedQ = useQuery({
    queryKey: ["feed", id, showLog],
    queryFn: () => api.get<FeedItem[]>(`/activities/${id}/feed/${showLog ? "?include_logs=true" : ""}`, id),
    enabled: !!activityQ.data?.is_member,
  });

  if (activityQ.isPending) return <PageShell><p className="text-muted-foreground">Loading…</p></PageShell>;
  if (activityQ.isError) return <PageShell><p className="text-destructive">Activity not found.</p></PageShell>;

  const activity = activityQ.data;

  if (!activity.is_member) {
    return (
      <PageShell>
        <JoinScreen
          activity={activity}
          activityId={id}
          onJoined={() => qc.invalidateQueries({ queryKey: ["activity", id] })}
        />
      </PageShell>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <ActivityHeader
        activity={activity}
        activityId={id}
        showLog={showLog}
        onToggleLog={() => setShowLog((v) => !v)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((v) => !v)}
      />
      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {feedQ.isPending && <p className="text-muted-foreground text-sm">Loading feed…</p>}
        {feedQ.data && (
          <ActivityFeed items={feedQ.data} activityId={id} memberCount={activity.member_count} showArchived={showArchived} />
        )}
      </main>

      {/* FAB — aligned to the content column, not the viewport corner */}
      <div className="fixed bottom-6 inset-x-0 z-20 pointer-events-none">
        <div className="mx-auto max-w-2xl px-4 flex justify-end">
          <Button
            size="lg"
            className="pointer-events-auto rounded-full shadow-lg h-14 w-14 text-2xl p-0"
            onClick={() => setSheetOpen(true)}
          >
            +
          </Button>
        </div>
      </div>

      {sheetOpen && (
        <AddToActivitySheet
          activityId={id}
          onClose={() => setSheetOpen(false)}
          onPollCreated={(p) => {
            qc.invalidateQueries({ queryKey: ["feed", id] });
            navigate(`/activity/${id}/${slug}/poll/${p.id}`);
          }}
          onEventCreated={() => setSheetOpen(false)}
          onCommentCreated={() => {
            setSheetOpen(false);
            qc.invalidateQueries({ queryKey: ["feed", id] });
          }}
          onCycleCreated={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function JoinScreen({
  activity,
  activityId,
  onJoined,
}: {
  activity: Activity;
  activityId: string;
  onJoined: () => void;
}) {
  const api = useApi();
  const { user, setSessionToken } = useAuth();
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Member & { session_token?: string }>(`/activities/${activityId}/join/`, {
        ...(activity.has_pin ? { pin } : {}),
        ...(!user ? { display_name: displayName } : {}),
      }),
    onSuccess: (data) => {
      if (data.session_token) setSessionToken(activityId, data.session_token);
      onJoined();
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto pt-8">
      <div>
        <p className="text-sm text-muted-foreground">You've been invited to</p>
        <h1 className="text-2xl font-semibold mt-1">{activity.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{activity.member_count} member{activity.member_count !== 1 ? "s" : ""} already in</p>
      </div>

      <FieldGroup className="gap-3">
        {activity.has_pin && (
          <Field>
            <FieldLabel htmlFor="join-pin" className="sr-only">PIN</FieldLabel>
            <Input id="join-pin" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          </Field>
        )}
        {!user && (
          <Field>
            <FieldLabel htmlFor="join-name" className="sr-only">Your display name</FieldLabel>
            <Input
              id="join-name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </Field>
        )}
        {user && (
          <p className="text-sm text-muted-foreground">
            Joining as <strong>{user.display_name}</strong>
          </p>
        )}
      </FieldGroup>

      {mutation.isError && (
        <FieldError>
          {activity.has_pin ? "Wrong PIN or something went wrong." : "Something went wrong."}
        </FieldError>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || (!user && !displayName.trim()) || (activity.has_pin && !pin)}
      >
        {mutation.isPending ? "Joining…" : "Join"}
      </Button>
    </div>
  );
}
