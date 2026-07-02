import type { ReactNode } from "react";

/** Modal bottom sheet: dimmed backdrop, panel pinned to the bottom edge. */
export default function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t rounded-t-2xl p-6 pb-8 flex flex-col gap-4 max-w-2xl mx-auto">
        {children}
      </div>
    </>
  );
}
