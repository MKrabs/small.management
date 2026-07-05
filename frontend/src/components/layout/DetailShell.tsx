import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useActivity } from "@/hooks/useActivity";

/**
 * Shared layout for poll / event detail pages.
 * Fetches the activity, redirects non-members to the join screen,
 * renders a sticky back-header. Children do their own data fetching.
 */
export default function DetailShell({ children }: { children: ReactNode }) {
  const { id, slug, query: activityQ } = useActivity();

  if (activityQ.isPending) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (activityQ.isError) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-destructive">Activity not found.</div>;
  }
  if (!activityQ.data.is_member) {
    return <Navigate to={`/activity/${id}/${slug}`} replace />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            to={`/activity/${id}/${slug}`}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            {activityQ.data.title}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-28">{children}</main>
    </div>
  );
}
