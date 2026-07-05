import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, MessageSquare, RefreshCw } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity, FeedItem, Member } from "@/api/types";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import ActivityFeed from "@/components/feed/ActivityFeed";
import ActivityHeader from "@/components/layout/ActivityHeader";
import BottomSheet from "@/components/layout/BottomSheet";
import CreatePollSheet from "@/components/sheets/CreatePollSheet";
import CreateCommentSheet from "@/components/sheets/CreateCommentSheet";
import NewCycleSheet from "@/components/sheets/NewCycleSheet";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

type SheetKind = "menu" | "poll" | "comment" | "cycle" | null;

export default function ActivityPage() {
  const { id = "", slug = "" } = useParams();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [showLog, setShowLog] = useState(false);

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
      <ActivityHeader activity={activity} activityId={id} showLog={showLog} onToggleLog={() => setShowLog((v) => !v)} />
      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {feedQ.isPending && <p className="text-muted-foreground text-sm">Loading feed…</p>}
        {feedQ.data && <ActivityFeed items={feedQ.data} activityId={id} memberCount={activity.member_count} />}
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 text-2xl p-0"
          onClick={() => setSheet("menu")}
        >
          +
        </Button>
      </div>

      {sheet === "menu" && (
        <BottomSheet onClose={() => setSheet(null)} title="Add to activity">
          <div className="flex flex-col gap-1">
            <MenuAction
              icon={<BarChart3 className="size-5" />}
              title="New poll"
              hint="Vote on options, days, or times"
              onClick={() => setSheet("poll")}
            />
            <MenuAction
              icon={<MessageSquare className="size-5" />}
              title="New comment"
              hint="Say something to the group"
              onClick={() => setSheet("comment")}
            />
            <MenuAction
              icon={<RefreshCw className="size-5" />}
              title="Start new cycle"
              hint="Fold this round away and plan the next one"
              onClick={() => setSheet("cycle")}
            />
          </div>
        </BottomSheet>
      )}

      {sheet === "poll" && (
        <CreatePollSheet
          activityId={id}
          onClose={() => setSheet(null)}
          onCreated={(p) => {
            qc.invalidateQueries({ queryKey: ["feed", id] });
            navigate(`/activity/${id}/${slug}/poll/${p.id}`);
          }}
        />
      )}
      {sheet === "comment" && (
        <CreateCommentSheet
          activityId={id}
          onClose={() => setSheet(null)}
          onCreated={() => {
            setSheet(null);
            qc.invalidateQueries({ queryKey: ["feed", id] });
          }}
        />
      )}
      {sheet === "cycle" && (
        <NewCycleSheet
          activityId={id}
          onClose={() => setSheet(null)}
          onCreated={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function MenuAction({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
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
