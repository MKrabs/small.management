import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Activity, Member } from "@/api/types";
import { Button } from "@/components/ui/button";
import BottomSheet from "@/components/layout/BottomSheet";
import { timeAgo } from "@/lib/utils";

type Props = {
  activity: Activity;
  activityId: string;
  showLog: boolean;
  onToggleLog: () => void;
};

export default function ActivityHeader({ activity, activityId, showLog, onToggleLog }: Props) {
  const api = useApi();
  const [membersOpen, setMembersOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const membersQ = useQuery({
    queryKey: ["members", activityId],
    queryFn: () => api.get<Member[]>(`/activities/${activityId}/members/`, activityId),
  });

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-1">
        <h1 className="font-semibold flex-1 truncate">{activity.title}</h1>
        {activity.has_pin && (
          <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 mr-1">PIN</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => setMembersOpen(true)}>
          <Users data-icon="inline-start" />
          {membersQ.data?.length ?? activity.member_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={copyLink}>
          {copied ? <Check data-icon="inline-start" className="text-green-600" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Share"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleLog} className={showLog ? "text-primary bg-muted" : ""}>
          Log
        </Button>
      </div>
    </header>

    {/* outside <header>: its backdrop-blur would trap position:fixed descendants */}
    {membersOpen && (
      <BottomSheet onClose={() => setMembersOpen(false)}>
        <h2 className="font-semibold text-lg">Members</h2>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {(membersQ.data ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{m.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {m.is_anonymous ? "guest · " : ""}joined {timeAgo(m.joined_at)}
              </span>
            </div>
          ))}
        </div>
      </BottomSheet>
    )}
    </>
  );
}
