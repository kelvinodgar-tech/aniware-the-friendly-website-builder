import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, User as UserIcon, LogOut, Shield, Heart, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { isMyAdmin } from "@/lib/user.functions";
import logoMark from "@/assets/animerewa-logo.png";

export function Header() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const checkAdmin = useServerFn(isMyAdmin);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    checkAdmin().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, checkAdmin]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src={logoMark}
            alt="animerewa"
            width={36}
            height={36}
            className="w-9 h-9 rounded-lg shadow-glow"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            anime<span className="text-primary">rewa</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          <Link to="/" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/browse" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Browse
          </Link>
          <Link to="/genres" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Genres
          </Link>
          <Link to="/schedule" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Schedule
          </Link>
        </nav>

        <form
          className="ml-auto flex-1 max-w-md hidden sm:flex"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) navigate({ to: "/browse", search: { q: q.trim() } });
          }}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anime…"
              className="pl-9 bg-surface/60 border-border/50 focus-visible:ring-primary"
            />
          </div>
        </form>

        <div className="ml-auto sm:ml-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserIcon className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/watchlist"><Heart className="w-4 h-4 mr-2" />Watchlist</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/history"><History className="w-4 h-4 mr-2" />Continue watching</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserIcon className="w-4 h-4 mr-2" />Profile</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><Shield className="w-4 h-4 mr-2" />Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
