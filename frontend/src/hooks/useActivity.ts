import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { Activity } from "@/api/types";

/** Activity from the current route. Cached by react-query, so every
 *  component on the page can call this without extra requests. */
export function useActivity() {
  const { id = "", slug = "" } = useParams();
  const api = useApi();
  const query = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.get<Activity>(`/activities/${id}/`, id),
  });
  return { id, slug, query, activity: query.data ?? null };
}
