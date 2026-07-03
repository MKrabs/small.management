import { Link, useNavigate } from "react-router-dom";
import { Menu } from "@base-ui/react/menu";
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
        <Menu.Root>
          <Menu.Trigger className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
            {user.display_name}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end">
              <Menu.Popup className="min-w-32 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
                <Menu.Item
                  onClick={handleLogout}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-destructive outline-none data-[highlighted]:bg-muted"
                >
                  Log out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      )}
    </div>
  );
}
