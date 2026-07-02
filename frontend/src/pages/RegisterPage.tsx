import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/auth";
import type { User } from "@/api/types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const api = useApi();
  const { login } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ user: User; token: string }>("/auth/register/", { display_name: displayName, password }),
    onSuccess: ({ user, token }) => {
      login(user, token);
      navigate("/");
    },
  });

  return (
    <PageShell>
      <div className="flex flex-col gap-6 max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="text-sm text-muted-foreground -mt-2">
          Optional — you can also join activities anonymously.
        </p>

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
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mutation.error && (
          <p className="text-sm text-destructive">
            That name might already be taken. Try another.
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!displayName.trim() || password.length < 6 || mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Create account"}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Already have one?{" "}
          <Link to="/login" className="underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
