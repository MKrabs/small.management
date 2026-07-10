import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/api/client";
import type { AvatarConfig, AvatarShape, PaletteToken, User } from "@/api/types";
import UserAvatar, { PALETTE_HUES, SHAPE_PATHS, bgColor, borderColor, nameColor, textColor } from "@/components/UserAvatar";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const TOKENS = Object.keys(PALETTE_HUES) as PaletteToken[];
const SHAPES = Object.keys(SHAPE_PATHS) as AvatarShape[];

const DEFAULT_AVATAR: AvatarConfig = {
  chars: "",
  bg: "teal",
  border: "teal",
  name_color: "teal",
  shape: "circle",
  rotation: 0,
};

/** First field error message out of a DRF 400 body, or a generic fallback. */
function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.data && typeof e.data === "object") {
    const first = Object.values(e.data as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return "Something went wrong.";
}

/** Cap free-text avatar chars at 2 grapheme clusters (emoji-safe). */
function capGraphemes(s: string): string {
  const segs = [...new Intl.Segmenter().segment(s)];
  return segs.slice(0, 2).map((g) => g.segment).join("");
}

function Swatches({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: (t: PaletteToken) => string;
  selected: PaletteToken;
  onSelect: (t: PaletteToken) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            aria-label={`${label}: ${t}`}
            aria-pressed={t === selected}
            onClick={() => onSelect(t)}
            className={cn(
              "size-6 rounded-full transition-transform hover:scale-110",
              t === selected && "ring-2 ring-foreground ring-offset-1",
            )}
            style={{ backgroundColor: color(t) }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, updateUser, logout } = useAuth();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.display_name ?? "");
  const [avatar, setAvatar] = useState<AvatarConfig | null>(user?.avatar ?? null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => api.patch<User>("/auth/me/", { display_name: name.trim(), avatar }),
    onSuccess: (u) => {
      updateUser(u);
      qc.invalidateQueries(); // member avatars appear in every feed payload
      toast.success("Profile saved");
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const passwordMut = useMutation({
    mutationFn: () => api.patch<User>("/auth/me/", { current_password: currentPassword, password: newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed — other sessions were signed out");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.del("/auth/me/", undefined, { password: deletePassword }),
    onSuccess: () => {
      logout();
      navigate("/");
      toast.success("Account deleted");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) return null;
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    setAvatar((a) => ({ ...(a ?? DEFAULT_AVATAR), [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        {/* live preview */}
        <div className="flex flex-col items-center gap-2 py-2">
          <UserAvatar name={name || user.display_name} avatar={avatar} className="size-16" textClassName="text-xl" />
          <span className="text-sm font-medium" style={{ color: nameColor(avatar) }}>
            {name || user.display_name}
          </span>
        </div>

        {avatar ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Letters</span>
              <Input
                value={avatar.chars}
                onChange={(e) => set("chars", capGraphemes(e.target.value))}
                placeholder="Initials"
                className="w-24"
              />
            </div>
            <Swatches label="Fill" color={bgColor} selected={avatar.bg} onSelect={(t) => set("bg", t)} />
            <Swatches label="Border" color={borderColor} selected={avatar.border} onSelect={(t) => set("border", t)} />
            <Swatches label="Name" color={textColor} selected={avatar.name_color} onSelect={(t) => set("name_color", t)} />
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">Shape</span>
              <div className="flex flex-wrap gap-1.5">
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-label={`Shape: ${s}`}
                    aria-pressed={s === avatar.shape}
                    onClick={() => set("shape", s)}
                    className={cn(
                      "rounded-md p-1 transition-colors hover:bg-muted",
                      s === avatar.shape && "bg-muted ring-2 ring-foreground",
                    )}
                  >
                    <svg viewBox="0 0 100 100" className="size-6">
                      <path d={SHAPE_PATHS[s]} fill={bgColor(avatar.bg)} stroke={borderColor(avatar.border)} strokeWidth={6} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="avatar-rotation" className="w-16 shrink-0 text-xs font-normal text-muted-foreground">
                Rotation
              </Label>
              <input
                id="avatar-rotation"
                type="range"
                min={0}
                max={345}
                step={15}
                value={avatar.rotation}
                onChange={(e) => set("rotation", Number(e.target.value))}
                className="w-full accent-foreground"
              />
            </div>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setAvatar(null)}>
              Reset to default look
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="self-center" onClick={() => setAvatar(DEFAULT_AVATAR)}>
            Customize avatar
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !name.trim()}
          >
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Change password</h3>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
            autoComplete="new-password"
          />
          <Button
            variant="outline"
            className="self-end"
            onClick={() => passwordMut.mutate()}
            disabled={passwordMut.isPending || !currentPassword || newPassword.length < 6}
          >
            {passwordMut.isPending ? "Changing…" : "Change password"}
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-destructive">Delete account</h3>
          <p className="text-xs text-muted-foreground">
            Your votes and comments in activities stay, without your account attached.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            <Button
              variant="destructive"
              onClick={() => setConfirmingDelete(true)}
              disabled={deleteMut.isPending || !deletePassword}
            >
              Delete
            </Button>
          </div>
        </div>

        <ConfirmDelete
          title="Delete your account?"
          description="This can't be undone. Your account and its sessions are removed permanently."
          actionLabel="Delete account"
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          onConfirm={() => deleteMut.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}
