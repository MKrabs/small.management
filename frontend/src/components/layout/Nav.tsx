import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { useApi } from "@/hooks/useApi";

export default function Nav() {
  const { user, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.del("/auth/logout/");
    } catch {
      // token may already be invalid; still clear local session
    }
    logout();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-sm font-semibold tracking-tight">
        small.management
      </Link>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
            {user.display_name}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      )}
    </div>
  );
}
