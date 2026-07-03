import { useState, type ReactNode } from "react";
import { relativeDay } from "@/lib/utils";

/**
 * One-line header for poll / proposal / event detail pages:
 * label left, "created by X · <relative time>" right (tap toggles the exact
 * datetime), plus an optional trailing action (e.g. delete).
 */
export default function DetailHeader({
  label,
  createdBy,
  createdAt,
  action,
}: {
  label: string;
  createdBy?: string | null;
  createdAt: string;
  action?: ReactNode;
}) {
  const [exact, setExact] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="flex items-center gap-1 min-w-0">
        <button
          onClick={() => setExact((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
        >
          created by {createdBy ?? "someone"} ·{" "}
          {exact ? new Date(createdAt).toLocaleString() : relativeDay(createdAt)}
        </button>
        {action}
      </span>
    </div>
  );
}
