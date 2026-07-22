import { useState, type ReactNode } from "react";
import { BarChart3, CalendarPlus, MessageSquare, RefreshCw } from "lucide-react";
import BottomSheet from "@/components/layout/BottomSheet";
import CreatePollSheet from "./CreatePollSheet";
import CreateEventSheet from "./CreateEventSheet";
import CreateCommentSheet from "./CreateCommentSheet";
import NewCycleSheet from "./NewCycleSheet";
import type { Poll } from "@/api/types";

type Page = "menu" | "poll" | "event" | "comment" | "cycle";
const TITLES: Record<Page, string> = {
  menu: "Add to activity",
  poll: "New poll",
  event: "Post an event",
  comment: "New thread",
  cycle: "Start a new cycle",
};

const FADE_MS = 150;

type Props = {
  activityId: string;
  onClose: () => void;
  onPollCreated: (poll: Poll) => void;
  onEventCreated: () => void;
  onCommentCreated: () => void;
  onCycleCreated: () => void;
};

/** Single persistent sheet for the whole "+" flow. Only the current page is
 * ever mounted (plain conditional render, same as a switch statement) —
 * switching pages fades the old content out, swaps it, then fades the new
 * content in. */
export default function AddToActivitySheet({
  activityId,
  onClose,
  onPollCreated,
  onEventCreated,
  onCommentCreated,
  onCycleCreated,
}: Props) {
  const [page, setPage] = useState<Page>("menu");
  const [visible, setVisible] = useState(true);

  function go(next: Page) {
    setVisible(false);
    setTimeout(() => {
      setPage(next);
      setVisible(true);
    }, FADE_MS);
  }
  const goMenu = () => go("menu");

  return (
    <BottomSheet onClose={onClose} title={TITLES[page]} bare={page === "menu"}>
      <div
        className="transition-opacity ease-in-out"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        {page === "menu" && <MenuPanel onSelect={go} />}
        {page === "poll" && <CreatePollSheet activityId={activityId} onBack={goMenu} onCreated={onPollCreated} />}
        {page === "event" && <CreateEventSheet activityId={activityId} onBack={goMenu} onCreated={onEventCreated} />}
        {page === "comment" && (
          <CreateCommentSheet activityId={activityId} onBack={goMenu} onCreated={onCommentCreated} />
        )}
        {page === "cycle" && <NewCycleSheet activityId={activityId} onBack={goMenu} onCreated={onCycleCreated} />}
      </div>
    </BottomSheet>
  );
}

function MenuPanel({ onSelect }: { onSelect: (page: Exclude<Page, "menu">) => void }) {
  return (
    <div className="@container">
      <div className="flex flex-col gap-1 @lg:grid @lg:grid-cols-2 @lg:gap-3">
        <MenuAction
          icon={<BarChart3 className="size-5 @lg:size-8" />}
          title="New poll"
          hint="Vote on options, days, or date ranges"
          onClick={() => onSelect("poll")}
        />
        <MenuAction
          icon={<CalendarPlus className="size-5 @lg:size-8" />}
          title="Post an event"
          hint="A fixed date, no vote needed"
          onClick={() => onSelect("event")}
        />
        <MenuAction
          icon={<MessageSquare className="size-5 @lg:size-8" />}
          title="New thread"
          hint="Say something to the group"
          onClick={() => onSelect("comment")}
        />
        <MenuAction
          icon={<RefreshCw className="size-5 @lg:size-8" />}
          title="Start new cycle"
          hint="Fold this round away and plan the next one"
          onClick={() => onSelect("cycle")}
        />
      </div>
    </div>
  );
}

function MenuAction({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors @lg:flex-col @lg:justify-center @lg:gap-2 @lg:border @lg:px-4 @lg:py-6 @lg:text-center"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
