import { useAuth } from "@/contexts/auth";
import { request } from "@/api/client";

export function useApi() {
  const { token, getSessionToken } = useAuth();

  return {
    get: <T>(path: string, activityId?: string) =>
      request<T>(path, {
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    post: <T>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "POST",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    patch: <T>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "PATCH",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    put: <T>(path: string, body: unknown, activityId?: string) =>
      request<T>(path, {
        method: "PUT",
        body,
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
    del: <T>(path: string, activityId?: string) =>
      request<T>(path, {
        method: "DELETE",
        token,
        sessionToken: activityId ? getSessionToken(activityId) : null,
      }),
  };
}
