import type { ReactNode } from "react";

/** Fixed action bar at the bottom of detail pages. */
export default function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4">
      <div className="mx-auto max-w-2xl px-4 flex gap-2">{children}</div>
    </div>
  );
}
