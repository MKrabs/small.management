import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

export default function Nav() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-sm font-semibold tracking-tight">
        small.management
      </Link>
      {user ? (
        <Link to="/activities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {user.display_name}
        </Link>
      ) : (
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      )}
    </div>
  );
}
