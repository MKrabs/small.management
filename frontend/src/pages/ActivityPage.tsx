import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity, FeedItem, Member } from "@/api/types";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import ActivityFeed from "@/components/feed/ActivityFeed";
import ActivityHeader from "@/components/layout/ActivityHeader";
import CreatePollSheet from "@/components/sheets/CreatePollSheet";

export default function ActivityPage() {
  const { id = "" } = useParams();
  const api = useApi();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const activityQ = useQuery({
    queryKey: ["activity", id],
    // pass id so session token header is sent → is_member is accurate
    queryFn: () => api.get<Activity>(`/activities/${id}/`, id),
  });

  const feedQ = useQuery({
    queryKey: ["feed", id],
    queryFn: () => api.get<FeedItem[]>(`/activities/${id}/feed/`, id),
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
      <ActivityHeader activity={activity} activityId={id} />
      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {feedQ.isPending && <p className="text-muted-foreground text-sm">Loading feed…</p>}
        {feedQ.data && <ActivityFeed items={feedQ.data} activityId={id} />}
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 text-2xl p-0"
          onClick={() => setShowCreate(true)}
        >
          +
        </Button>
      </div>

      {showCreate && (
        <CreatePollSheet
          activityId={id}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["feed", id] });
          }}
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

      <div className="flex flex-col gap-3">
        {activity.has_pin && (
          <input
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        )}
        {!user && (
          <input
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
        )}
        {user && (
          <p className="text-sm text-muted-foreground">
            Joining as <strong>{user.display_name}</strong>
          </p>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          {activity.has_pin ? "Wrong PIN or something went wrong." : "Something went wrong."}
        </p>
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
