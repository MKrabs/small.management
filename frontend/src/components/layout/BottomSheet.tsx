import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

type Props = { onClose: () => void; title: string; children: ReactNode };

/** Modal bottom sheet backed by shadcn's Drawer (mobile-first bottom panel). */
export default function BottomSheet({ onClose, title, children }: Props) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div className="flex flex-col gap-4 p-6 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
