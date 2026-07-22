import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type Props = { onClose: () => void; title: string; bare?: boolean; children: ReactNode };

/** Modal bottom sheet backed by shadcn's Drawer (mobile-first bottom panel).
 * `bare` skips the title/close header entirely — for a picker menu that's
 * only ever dismissed by backdrop-click or swipe. Title stays sr-only for
 * accessibility either way. */
export default function BottomSheet({ onClose, title, bare, children }: Props) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        {bare ? (
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
        ) : (
          <div className="flex items-center justify-between gap-2 px-6 pt-4">
            <DrawerTitle className="truncate font-semibold text-lg">{title}</DrawerTitle>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 shrink-0">
              <X />
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-4 px-6 pt-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
