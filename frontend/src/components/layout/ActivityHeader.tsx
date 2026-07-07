import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Check, Copy, Eye, MoreHorizontal, Pencil, ScrollText, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Activity, Member } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import BottomSheet from "@/components/layout/BottomSheet";
import ConfirmDelete from "@/components/ConfirmDelete";
import UserAvatar from "@/components/UserAvatar";
import { cn, timeAgo } from "@/lib/utils";

type Props = {
  activity: Activity;
  activityId: string;
  showLog: boolean;
  onToggleLog: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
};

export default function ActivityHeader({
  activity,
  activityId,
  showLog,
  onToggleLog,
  showArchived,
  onToggleArchived,
}: Props) {
  const api = useApi();
  const qc = useQueryClient();
  const [membersOpen, setMembersOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // the share button's window resizes to whichever label is scrolled into view
  const shareRef = useRef<HTMLSpanElement>(null);
  const copiedRef = useRef<HTMLSpanElement>(null);
  const [labelWidth, setLabelWidth] = useState<number>();
  useLayoutEffect(() => {
    setLabelWidth((copied ? copiedRef : shareRef).current?.offsetWidth);
  }, [copied]);

  const membersQ = useQuery({
    queryKey: ["members", activityId],
    queryFn: () => api.get<Member[]>(`/activities/${activityId}/members/`, activityId),
  });

  const archiveMut = useMutation({
    mutationFn: (archived: boolean) => api.patch(`/activities/${activityId}/`, { archived }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", activityId] });
      qc.invalidateQueries({ queryKey: ["my-activities"] });
    },
  });

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-2">
        <h1 className="font-semibold flex-1 truncate">{activity.title}</h1>
        {activity.archived_at && (
          <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">Archived</span>
        )}
        <ButtonGroup>
          {activity.has_pin && (
            <Button variant="outline" size="sm" onClick={() => setPinOpen(true)}>
              PIN
            </Button>
          )}
          <Button variant="outline" size="sm" aria-label="Members" onClick={() => setMembersOpen(true)}>
            <Users data-icon="inline-start" />
            {membersQ.data?.length ?? activity.member_count}
          </Button>
          {/* two stacked labels behind a one-row window; copying scrolls up, reset scrolls back,
              and the window's width follows the visible label */}
          <Button variant="outline" size="sm" onClick={copyLink} aria-live="polite">
            <span
              className="h-5 overflow-hidden transition-[width] duration-300"
              style={{ width: labelWidth }}
            >
              <span className={cn("flex flex-col items-start transition-transform duration-300", copied && "-translate-y-5")}>
                <span ref={shareRef} className="flex h-5 items-center gap-1"><Copy /> Share</span>
                <span ref={copiedRef} className="flex h-5 items-center gap-1"><Check className="text-green-600" /> Copied</span>
              </span>
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon-sm" aria-label="Activity menu">
                  <MoreHorizontal />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil /> Rename
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem checked={showLog} onCheckedChange={onToggleLog}>
                  <ScrollText /> Log
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={onToggleArchived}>
                  <Eye /> Show archived
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {activity.archived_at ? (
                  <DropdownMenuItem onClick={() => archiveMut.mutate(false)}>
                    <ArchiveRestore /> Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem variant="destructive" onClick={() => setArchiveConfirmOpen(true)}>
                    <Archive /> Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <ConfirmDelete
          title="Archive this activity?"
          actionLabel="Archive"
          description="It moves to the archived list for everyone. You can unarchive it anytime."
          onConfirm={() => archiveMut.mutate(true)}
          open={archiveConfirmOpen}
          onOpenChange={setArchiveConfirmOpen}
        />
      </div>
    </header>

    {/* outside <header>: its backdrop-blur would trap position:fixed descendants */}
    {membersOpen && (
      <MembersSheet
        activity={activity}
        activityId={activityId}
        members={membersQ.data ?? []}
        onClose={() => setMembersOpen(false)}
      />
    )}
    {pinOpen && <PinSheet activity={activity} activityId={activityId} onClose={() => setPinOpen(false)} />}
    {renameOpen && <RenameSheet activity={activity} activityId={activityId} onClose={() => setRenameOpen(false)} />}
    </>
  );
}

function RenameSheet({
  activity,
  activityId,
  onClose,
}: {
  activity: Activity;
  activityId: string;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [title, setTitle] = useState(activity.title);

  const renameMut = useMutation({
    mutationFn: () => api.patch(`/activities/${activityId}/`, { title: title.trim() }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", activityId] });
      qc.invalidateQueries({ queryKey: ["my-activities"] });
      onClose();
    },
  });

  return (
    <BottomSheet onClose={onClose} title="Rename activity">
      <h2 className="font-semibold text-lg">Rename activity</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      {renameMut.isError && <p className="text-sm text-destructive">Something went wrong.</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => renameMut.mutate()} disabled={renameMut.isPending || !title.trim()}>
          {renameMut.isPending ? "Saving…" : "Rename"}
        </Button>
      </div>
    </BottomSheet>
  );
}

function MembersSheet({
  activity,
  activityId,
  members,
  onClose,
}: {
  activity: Activity;
  activityId: string;
  members: Member[];
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const claimMut = useMutation({
    mutationFn: (memberId: string) =>
      api.post(`/activities/${activityId}/members/${memberId}/claim/`, {}, activityId),
    onSuccess: () => {
      setClaiming(false);
      qc.invalidateQueries(); // votes, feed, members, everything moved
    },
  });

  // guests other than yourself — members whose device/session may be lost
  const zombies = members.filter((m) => m.is_anonymous && m.id !== activity.me?.id);

  return (
    <BottomSheet onClose={onClose} title="Members">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">Members</h2>
        {claiming ? (
          <Button variant="ghost" size="sm" onClick={() => setClaiming(false)}>Cancel</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setClaiming(true)} disabled={zombies.length === 0}>
            Claim user
          </Button>
        )}
      </div>
      {claiming && (
        <p className="text-sm text-muted-foreground">
          Pick a guest whose device or session was lost. Their votes and actions move to you.
        </p>
      )}
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {(claiming ? zombies : members).map((m) => {
          // identical row markup in both modes so the lists line up
          const row = (
            <>
              <UserAvatar name={m.display_name} className="size-6 text-[10px]" />
              <span className="text-sm font-medium flex-1 truncate">
                {m.display_name}
                {m.id === activity.me?.id && (
                  <span className="text-xs font-normal text-muted-foreground"> (you)</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {m.is_anonymous ? "guest · " : ""}joined {timeAgo(m.joined_at)}
              </span>
            </>
          );
          return claiming ? (
            <ConfirmDelete
              key={m.id}
              title={`Claim ${m.display_name}?`}
              actionLabel="Claim"
              description={`All of ${m.display_name}'s votes, RSVPs, and comments become yours, then the member is removed. Where you both voted on the same thing, your own vote is kept. This can't be undone.`}
              onConfirm={() => claimMut.mutate(m.id)}
              trigger={
                <button className="flex w-full items-center gap-2 rounded-md py-1 text-left hover:bg-muted transition-colors">
                  {row}
                </button>
              }
            />
          ) : (
            <div key={m.id} className="flex items-center gap-2 py-1">
              {row}
            </div>
          );
        })}
      </div>
      {claimMut.isError && <p className="text-sm text-destructive">Couldn't claim that member — try again.</p>}
    </BottomSheet>
  );
}

function PinSheet({
  activity,
  activityId,
  onClose,
}: {
  activity: Activity;
  activityId: string;
  onClose: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [newPin, setNewPin] = useState("");
  const [copied, setCopied] = useState(false);

  const pinMut = useMutation({
    mutationFn: (pin: string) => api.patch(`/activities/${activityId}/`, { pin }, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", activityId] });
      onClose();
    },
  });

  const copyPin = async () => {
    if (!activity.pin) return;
    await navigator.clipboard.writeText(activity.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BottomSheet onClose={onClose} title="Activity PIN">
      <h2 className="font-semibold text-lg">Activity PIN</h2>
      <div className="flex items-center justify-center gap-3 py-4">
        <span className="text-4xl font-mono tracking-widest">{activity.pin ?? "····"}</span>
        {activity.pin && (
          <Button variant="ghost" size="icon-sm" aria-label="Copy PIN" onClick={copyPin}>
            {copied ? <Check className="text-green-600" /> : <Copy />}
          </Button>
        )}
      </div>
      {!activity.pin && (
        <p className="text-sm text-muted-foreground text-center">
          This PIN was set before it could be displayed — set a new one below.
        </p>
      )}
      <Input
        placeholder="New PIN — leave empty to remove it"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
      />
      {pinMut.isError && <p className="text-sm text-destructive">Something went wrong.</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={() => pinMut.mutate(newPin.trim())} disabled={pinMut.isPending}>
          {pinMut.isPending ? "Saving…" : newPin.trim() ? "Change PIN" : "Remove PIN"}
        </Button>
      </div>
    </BottomSheet>
  );
}
