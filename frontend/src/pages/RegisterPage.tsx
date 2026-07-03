import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
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

        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="register-name" className="sr-only">Display name</FieldLabel>
            <Input
              id="register-name"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="register-password" className="sr-only">Password</FieldLabel>
            <Input
              id="register-password"
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </FieldGroup>

        {mutation.error && (
          <FieldError>That name might already be taken. Try another.</FieldError>
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
