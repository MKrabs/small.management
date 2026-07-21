import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Activity } from "@/api/types";

export type ActivityOverride = { activity: Activity };
/** Lets a subtree (the landing-page demo) skip the route-driven fetch and
 * supply a fixed activity instead. Absent (null) everywhere else. */
export const ActivityOverrideContext = createContext<ActivityOverride | null>(null);

/** Activity from the current route. Cached by react-query, so every
 *  component on the page can call this without extra requests. */
export function useActivity() {
  const { id = "", slug = "" } = useParams();
  const api = useApi();
  const override = useContext(ActivityOverrideContext);
  const query = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.get<Activity>(`/activities/${id}/`, id),
    enabled: !override, // gate the fetch, not the hook call — rules of hooks
  });
  return { id, slug, query, activity: override?.activity ?? query.data ?? null };
}
