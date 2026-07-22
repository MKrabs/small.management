import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type Props = { onClose: () => void; title: string; bare?: boolean; children: ReactNode };

/** Modal bottom sheet backed by shadcn's Drawer (mobile-first bottom panel).
 * `bare` skips the title/close header entirely — for a picker menu that's
 * only ever dismissed by backdrop-click or swipe. Title stays sr-only for
 * accessibility either way.
 *
 * We mount conditionally, so Base UI never sees a closed→open edge unless
 * we start `open` false and flip it after mount — and we defer telling the
 * parent to unmount until onOpenChangeComplete confirms the exit transition
 * actually finished, instead of yanking the tree out mid-animation. */
export default function BottomSheet({ onClose, title, bare, children }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Drawer open={open} onOpenChange={setOpen} onOpenChangeComplete={(stillOpen) => !stillOpen && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        {bare ? (
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
        ) : (
          <div className="flex items-center justify-between gap-2 px-6 pt-4">
            <DrawerTitle className="truncate font-semibold text-lg">{title}</DrawerTitle>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)} className="-mr-2 shrink-0">
              <X />
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-4 px-6 pt-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
