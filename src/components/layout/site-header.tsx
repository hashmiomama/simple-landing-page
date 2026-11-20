import { Link } from "@tanstack/react-router";
import { Bookmark, ChevronDown, ClipboardList, LogOut, Plus, Settings, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_LABELS } from "@/features/auth/roles";
import { APP_NAME } from "@/lib/app-config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 sm:px-8">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          {APP_NAME}
          <span className="text-primary" aria-hidden>
            .
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/opportunities"
            className="inline-flex rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-4"
            activeProps={{ className: "text-foreground" }}
          >
            Opportunities
          </Link>
          <AccountArea />
        </nav>
      </div>
    </header>
  );
}

function AccountArea() {
  const { status, profile, role, hasRole } = useAuth();

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (status === "signed_out") {
    return (
      <>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/register">Join</Link>
        </Button>
      </>
    );
  }

  const name = profile?.username ?? "Your account";

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
        <Link to="/dashboard">Home</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
        <Link to="/saved">Saved</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Create" className="px-2.5 sm:px-4">
            <Plus aria-hidden />
            <span className="hidden sm:inline">Create</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild>
            <Link to="/submit-opportunity">Submit an opportunity</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/my-submissions">My submissions</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="soft" size="sm" aria-label={`Account menu for ${name}`}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              aria-hidden
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-28 truncate sm:inline">{name}</span>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl">
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span className="truncate">{name}</span>
            {role && <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="sm:hidden">
              Home
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/saved">
              <Bookmark className="h-4 w-4" aria-hidden /> Saved
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/organisation/register">
              <ClipboardList className="h-4 w-4" aria-hidden /> Organisation registration
            </Link>
          </DropdownMenuItem>
          {hasRole("organisation") && (
            <DropdownMenuItem asChild>
              <Link to="/organisation/listings">My organisation listings</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4" aria-hidden /> Settings
            </Link>
          </DropdownMenuItem>
          {hasRole("admin") && (
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Shield className="h-4 w-4" aria-hidden /> Administration
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/logout">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
