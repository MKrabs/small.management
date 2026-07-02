import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { User } from "@/api/types";

export default function LoginPage() {
  const navigate = useNavigate();
  const api = useApi();
  const { login } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ user: User; token: string }>("/auth/login/", { display_name: displayName, password }),
    onSuccess: ({ user, token }) => {
      login(user, token);
      navigate("/");
    },
  });

  return (
    <PageShell>
      <div className="flex flex-col gap-6 max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold">Log in</h1>

        <div className="flex flex-col gap-3">
          <input
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mutation.mutate()}
          />
        </div>

        {mutation.error && (
          <p className="text-sm text-destructive">Invalid credentials.</p>
        )}

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Logging in…" : "Log in"}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          No account?{" "}
          <Link to="/register" className="underline underline-offset-2">
            Register
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
