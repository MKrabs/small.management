import type { Proposal } from "@/api/types";

type Props = { proposal: Proposal; activityId: string };

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function ProposalCard({ proposal }: Props) {
  const deleted = !!proposal.deleted_at;
  const yes = proposal.votes.filter((v) => v.status === "yes" && !v.deleted_at).length;
  const maybe = proposal.votes.filter((v) => v.status === "maybe" && !v.deleted_at).length;
  const no = proposal.votes.filter((v) => v.status === "no" && !v.deleted_at).length;

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-2 ${deleted ? "opacity-40 line-through" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Proposal</span>
          <h3 className="font-medium">
            {fmt(proposal.proposed_date)}
            {proposal.proposed_time && <span className="text-muted-foreground"> · {proposal.proposed_time}</span>}
          </h3>
        </div>
        <div className="text-xs flex gap-2 shrink-0">
          <span className="text-green-600">{yes} yes</span>
          <span className="text-yellow-600">{maybe} maybe</span>
          <span className="text-red-500">{no} no</span>
        </div>
      </div>
      {proposal.note && <p className="text-sm text-muted-foreground">{proposal.note}</p>}
      <p className="text-xs text-muted-foreground">by {proposal.created_by?.display_name ?? "someone"}</p>
    </div>
  );
}
