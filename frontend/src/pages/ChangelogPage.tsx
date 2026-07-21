import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useApi } from "@/hooks/useApi";
import type { User } from "@/api/types";
import { ArrowUp } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { CHANGELOG, LATEST_VERSION } from "@/changelog";

export default function ChangelogPage() {
  const { user, updateUser } = useAuth();
  const api = useApi();

  // captured once on mount, BEFORE the mark-as-seen PATCH rewrites it —
  // this is the position the "you were here" marker points at
  const [lastSeen] = useState(() => user?.seen_changelog_version);
  // entries are newest-first: everything above the last-seen entry is unread
  const markerIdx = lastSeen ? CHANGELOG.findIndex((e) => e.version === lastSeen) : -1;

  // opening the page is what "seen" means — clears the nav dot
  useEffect(() => {
    if (user && user.seen_changelog_version !== LATEST_VERSION) {
      api
        .patch<User>("/auth/me/", { seen_changelog_version: LATEST_VERSION })
        .then(updateUser)
        .catch(() => {}); // ponytail: dot just stays lit until the next visit
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Changelog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What changed, in plain words. Newest first.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-xs">
        {CHANGELOG.map((e) => (
          <a
            key={e.version}
            href={`#${e.version}`}
            className="rounded-full border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {e.version}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-8">
        {CHANGELOG.map((e, i) => (
          <div key={e.version} className="flex flex-col gap-8">
            {i === markerIdx && i > 0 && (
              <Marker variant="separator" className="text-xs">
                <MarkerIcon>
                  <ArrowUp />
                </MarkerIcon>
                <MarkerContent>New since your last visit</MarkerContent>
              </Marker>
            )}
            <section id={e.version} className="flex flex-col gap-2 scroll-mt-16">
            <div className="flex items-baseline gap-3">
              <h2 className="font-semibold">{e.title}</h2>
              <span className="text-xs text-muted-foreground">
                {e.version} ·{" "}
                {new Date(e.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              {e.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}
