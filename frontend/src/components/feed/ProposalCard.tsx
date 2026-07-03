import { Link } from "react-router-dom";
import type { Proposal } from "@/api/types";
import { formatDay, formatTime, timeAgo } from "@/lib/utils";

type Props = { proposal: Proposal; activityId: string };

export default function ProposalCard({ proposal }: Props) {
  const deleted = !!proposal.deleted_at;
  const active = proposal.votes.filter((v) => !v.deleted_at);
  const yes = active.filter((v) => v.status === "yes").length;
  const maybe = active.filter((v) => v.status === "maybe").length;
  const no = active.filter((v) => v.status === "no").length;

  return (
    <Link
      to={`proposal/${proposal.id}`}
      className={`block border rounded-lg bg-card p-4 hover:bg-muted/50 transition-colors ${deleted ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Proposal</span>
          <h3 className={`font-medium ${deleted ? "line-through" : ""}`}>
            {formatDay(proposal.proposed_date)}
            {proposal.proposed_time && (
              <span className="text-muted-foreground"> · {formatTime(proposal.proposed_time)}</span>
            )}
          </h3>
        </div>
        <div className="text-xs flex gap-2 shrink-0">
          <span className="text-green-600">{yes} yes</span>
          <span className="text-yellow-600">{maybe} maybe</span>
          <span className="text-red-500">{no} no</span>
        </div>
      </div>
      {proposal.note && <p className="text-sm text-muted-foreground mt-1">{proposal.note}</p>}
      <p className="text-xs text-muted-foreground mt-1">
        proposed by {proposal.created_by?.display_name ?? "someone"} · {timeAgo(proposal.created_at)}
      </p>
    </Link>
  );
}
