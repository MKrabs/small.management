import type { ReactNode } from "react";
import { cn, timeAgo } from "@/lib/utils";

type Props = {
  /** Kind label, uppercased: "Poll", "Event", "Thread"… */
  type: string;
  /** Yellow marker effect on the kind label (events). */
  marker?: boolean;
  /** Extra label text: "archived", "voting finished"… */
  suffix?: string;
  /** Vote summary shown in the label line, e.g. "3 of 5 voted". */
  votes?: string;
  /** Creator + timestamp byline; omit to hide (off for events). */
  by?: { name?: string; at: string };
  /** Title block under the label line — part of the clickable header. */
  title?: ReactNode;
  /** Header click: open the dedicated page, or another action (e.g. toggle replies). */
  onOpen?: () => void;
  archived?: boolean;
  className?: string;
  children?: ReactNode;
};

/** Common feed card: label line (kind · state · votes | byline), optional
 * clickable header, and whatever body the kind needs as children. */
export default function FeedCard({
  type,
  marker = false,
  suffix,
  votes,
  by,
  title,
  onOpen,
  archived = false,
  className,
  children,
}: Props) {
  const header = (
    <>
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span className={cn("uppercase tracking-wide", marker && "marker-highlight text-foreground")}>
          {type}
          {suffix && ` · ${suffix}`}
          {votes && ` · ${votes}`}
        </span>
        {by && (
          <span className="shrink-0">
            by {by.name ?? "someone"} · {timeAgo(by.at)}
          </span>
        )}
      </div>
      {title}
    </>
  );

  return (
    <div className={cn("bg-card shadow-md rounded-lg p-4 flex flex-col gap-3", archived && "opacity-40", className)}>
      {onOpen ? (
        <button onClick={onOpen} className="text-left hover:opacity-80 transition-opacity">
          {header}
        </button>
      ) : (
        header
      )}
      {children}
    </div>
  );
}
