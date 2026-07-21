import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileDialog from "@/components/ProfileDialog";
import { useAuth } from "@/contexts/auth";
import { useApi } from "@/hooks/useApi";
import { LATEST_VERSION } from "@/changelog";

export default function Nav() {
  const { user, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  // controlled: the dropdown unmounts before a nested trigger could fire (see ConfirmDelete)
  const [profileOpen, setProfileOpen] = useState(false);

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
        <>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
              {user.display_name}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/changelog")}>
                  Changelog
                  {user.seen_changelog_version !== LATEST_VERSION && (
                    // same yellow as .marker-highlight
                    <span className="ml-auto size-1.5 rounded-full bg-[#FCD34D]" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
        </>
      ) : (
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      )}
    </div>
  );
}
