import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Activity, Member } from "@/api/types";
import { Button } from "@/components/ui/button";

type Props = { activity: Activity; activityId: string };

export default function ActivityHeader({ activity, activityId }: Props) {
  const api = useApi();
  const [showLog, setShowLog] = useState(false);

  const membersQ = useQuery({
    queryKey: ["members", activityId],
    queryFn: () => api.get<Member[]>(`/activities/${activityId}/members/`, activityId),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
        <h1 className="font-semibold flex-1 truncate">{activity.title}</h1>
        <div className="flex items-center gap-2">
          {activity.has_pin && (
            <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">PIN</span>
          )}
          <span className="text-sm text-muted-foreground">
            {membersQ.data?.length ?? activity.member_count}
          </span>
          <Button variant="ghost" size="sm" onClick={copyLink}>
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLog((v) => !v)}
            className={showLog ? "text-primary" : ""}
          >
            Log
          </Button>
        </div>
      </div>
    </header>
  );
}
