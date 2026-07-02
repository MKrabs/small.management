import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { Activity } from "@/api/types";
import PageShell from "@/components/layout/PageShell";
import { buttonVariants } from "@/components/ui/button";

function useAnonActivityIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("session_")) ids.push(key.slice(8));
  }
  return ids;
}

function AnonActivityList({ ids }: { ids: string[] }) {
  const api = useApi();
  const queries = ids.map((id) =>
    // ponytail: one request per activity, fine for the small counts expected here
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["activity", id],
      queryFn: () => api.get<Activity>(`/activities/${id}/`, id),
    })
  );

  const loaded = queries.flatMap((q) => (q.data ? [q.data] : []));

  if (ids.length === 0) {
    return <p className="text-muted-foreground text-sm">No activities yet.</p>;
  }

  return <ActivityList activities={loaded} />;
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <ul className="flex flex-col gap-2">
      {activities.map((a) => (
        <li key={a.id}>
          <Link
            to={`/activity/${a.short_id}/${a.slug}`}
            className="block border rounded-lg p-4 hover:bg-muted transition-colors"
          >
            <p className="font-medium">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {a.member_count} member{a.member_count !== 1 ? "s" : ""}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function MyActivitiesPage() {
  const { user } = useAuth();
  const api = useApi();
  const anonIds = useAnonActivityIds();

  const loggedInQ = useQuery({
    queryKey: ["my-activities"],
    queryFn: () => api.get<Activity[]>("/activities/"),
    enabled: !!user,
  });

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My activities</h1>
          <Link to="/new" className={buttonVariants({ size: "sm" })}>
            New
          </Link>
        </div>

        {user ? (
          loggedInQ.isPending ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <ActivityList activities={loggedInQ.data ?? []} />
          )
        ) : (
          <AnonActivityList ids={anonIds} />
        )}

        {!user && (
          <p className="text-xs text-muted-foreground border-t pt-4">
            <Link to="/login" className="underline underline-offset-2">Log in</Link>
            {" to keep your activities across devices."}
          </p>
        )}
      </div>
    </PageShell>
  );
}
