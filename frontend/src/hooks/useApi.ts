import { createContext, useContext } from "react";
import { useAuth } from "@/contexts/auth";
import { request } from "@/api/client";

export type Api = {
  get: <T>(path: string, activityId?: string) => Promise<T>;
  post: <T>(path: string, body: unknown, activityId?: string) => Promise<T>;
  patch: <T>(path: string, body: unknown, activityId?: string) => Promise<T>;
  put: <T>(path: string, body: unknown, activityId?: string) => Promise<T>;
  del: <T>(path: string, activityId?: string, body?: unknown) => Promise<T>;
};

/** Lets a subtree (the landing-page demo) redirect every useApi() call to an
 * in-memory fake instead of the real backend. Absent (null) everywhere else. */
export const ApiOverrideContext = createContext<Api | null>(null);

export function useApi(): Api {
  const { token, getSessionToken } = useAuth();
  const override = useContext(ApiOverrideContext);
  if (override) return override;

  return {
    get: <T,>(path: string, activityId?: string) =>
      request<T>(path, {
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    post: <T,>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "POST",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    patch: <T,>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "PATCH",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    put: <T,>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "PUT",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    del: <T,>(path: string, activityId?: string, body?: unknown) =>
      request<T>(path, {
        method: "DELETE",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
  };
}
