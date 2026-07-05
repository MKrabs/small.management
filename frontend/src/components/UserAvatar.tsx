import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Initials avatar with a deterministic per-name color and the full name in a tooltip. */
export default function UserAvatar({
  name,
  className,
  textClassName,
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  let hue = 0;
  for (const c of name) hue = (hue * 31 + c.charCodeAt(0)) % 360;

  return (
    <Tooltip>
      <TooltipTrigger render={<Avatar className={className} />}>
        <AvatarFallback
          className={cn("font-medium select-none", textClassName)}
          // ponytail: fixed light palette — app is light-only for now
          style={{ backgroundColor: `hsl(${hue} 65% 88%)`, color: `hsl(${hue} 50% 30%)` }}
        >
          {initials}
        </AvatarFallback>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
