import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AvatarConfig, AvatarShape, PaletteToken } from "@/api/types";

/** Curated palette: token → hue. Colors are derived with fixed HSL formulas so
 * readability is guaranteed by construction (light-only app). */
export const PALETTE_HUES: Record<PaletteToken, number> = {
  red: 0,
  orange: 25,
  amber: 45,
  lime: 90,
  green: 140,
  teal: 175,
  sky: 200,
  blue: 225,
  violet: 270,
  pink: 330,
};

export const bgColor = (t: PaletteToken) => `hsl(${PALETTE_HUES[t]} 65% 88%)`;
export const borderColor = (t: PaletteToken) => `hsl(${PALETTE_HUES[t]} 45% 60%)`;
export const textColor = (t: PaletteToken) => `hsl(${PALETTE_HUES[t]} 50% 30%)`;

/** Color for rendering the user's display name, or undefined for the default. */
export function nameColor(avatar: AvatarConfig | null | undefined): string | undefined {
  return avatar ? textColor(avatar.name_color) : undefined;
}

/** Hand-authored 100×100 outlines; stroke is inset enough not to clip.
 * Single closed paths so the border stroke has no internal edges. */
export const SHAPE_PATHS: Record<AvatarShape, string> = {
  circle: "M50 4a46 46 0 1 1 0 92 46 46 0 1 1 0-92Z",
  square: "M28 4h44a24 24 0 0 1 24 24v44a24 24 0 0 1-24 24H28A24 24 0 0 1 4 72V28A24 24 0 0 1 28 4Z",
  trapezoid: "M32 4h36a8 8 0 0 1 7.7 5.9l17 66A8 8 0 0 1 85 86H15a8 8 0 0 1-7.7-10.1l17-66A8 8 0 0 1 32 4Z",
  cloud:
    "M22 86C7 86 2 70 11 61C3 43 18 31 30 35C34 17 66 17 70 35C82 31 97 43 89 61C98 70 93 86 78 86Z",
  heart:
    "M50 92C24 72 6 54 6 35 6 20 17 10 30 10c8 0 16 4 20 12 4-8 12-12 20-12 13 0 24 10 24 25 0 19-18 37-44 57Z",
  diamond:
    "M55.7 11.7 88.3 44.3a8 8 0 0 1 0 11.4L55.7 88.3a8 8 0 0 1-11.4 0L11.7 55.7a8 8 0 0 1 0-11.4L44.3 11.7a8 8 0 0 1 11.4 0Z",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Initials avatar with a deterministic per-name color and the full name in a tooltip.
 * When `avatar` is set (the user's custom config), renders their shape/colors/chars instead. */
export default function UserAvatar({
  name,
  avatar,
  className,
  textClassName,
}: {
  name: string;
  avatar?: AvatarConfig | null;
  className?: string;
  textClassName?: string;
}) {
  if (avatar) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "relative inline-flex size-8 shrink-0 items-center justify-center select-none animate-in fade-in zoom-in-75",
                className,
              )}
            />
          }
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            <path
              d={SHAPE_PATHS[avatar.shape]}
              fill={bgColor(avatar.bg)}
              stroke={borderColor(avatar.border)}
              strokeWidth={6}
              transform={avatar.rotation ? `rotate(${avatar.rotation} 50 50)` : undefined}
            />
          </svg>
          {/* chars stay upright — rotation only spins the shape */}
          <span className={cn("relative text-sm font-medium", textClassName)} style={{ color: textColor(avatar.name_color) }}>
            {avatar.chars || initialsOf(name)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    );
  }

  let hue = 0;
  for (const c of name) hue = (hue * 31 + c.charCodeAt(0)) % 360;

  return (
    <Tooltip>
      {/* every avatar animates in on appearance; AvatarRow handles the way out */}
      <TooltipTrigger render={<Avatar className={cn("animate-in fade-in zoom-in-75", className)} />}>
        <AvatarFallback
          className={cn("font-medium select-none", textClassName)}
          // ponytail: fixed light palette — app is light-only for now
          style={{ backgroundColor: `hsl(${hue} 65% 88%)`, color: `hsl(${hue} 50% 30%)` }}
        >
          {initialsOf(name)}
        </AvatarFallback>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
