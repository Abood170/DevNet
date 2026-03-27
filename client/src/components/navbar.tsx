import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { LayoutGrid, Briefcase, Rss, User, MessageSquare, FileText, ClipboardList } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (path: string) => location === path;

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {}
        <div className="flex items-center gap-4 min-w-[140px]">
          <Link href={user ? "/feed" : "/"}>
            <a className="font-semibold text-lg">DevNet</a>
          </Link>
        </div>

        {}
        {user && (
          <nav className="flex items-center gap-2">
            <Link href="/feed">
              <a
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                ${isActive("/feed") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                <Rss className="h-4 w-4" />
                Feed
              </a>
            </Link>

            <Link href="/jobs">
              <a
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                ${isActive("/jobs") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                <Briefcase className="h-4 w-4" />
                Jobs
              </a>
            </Link>

            {(user?.role === UserRole.EMPLOYER || user?.role === UserRole.ADMIN) && (
              <Link href="/requests">
                <a
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                  ${isActive("/requests") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <FileText className="h-4 w-4" />
                  Requests
                </a>
              </Link>
            )}

            {user?.role === UserRole.DEVELOPER && (
              <Link href="/my-requests">
                <a
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                  ${isActive("/my-requests") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <ClipboardList className="h-4 w-4" />
                  My Requests
                </a>
              </Link>
            )}

            <Link href="/dashboard">
              <a
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                ${isActive("/dashboard") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                <LayoutGrid className="h-4 w-4" />
                Dashboard
              </a>
            </Link>

            <Link href="/messages">
              <a
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                ${location.startsWith("/messages") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </a>
            </Link>
          </nav>
        )}

        {}
        <div className="flex items-center gap-2 min-w-[220px] justify-end">
          <ThemeToggle />

          {user && <NotificationsBell />}

          {user ? (
            <>
              {}
              <Link href="/profile">
                <a>
                  <Button variant="ghost" size="icon" aria-label="Profile">
                    <User className="h-4 w-4" />
                  </Button>
                </a>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <a>
                <Button size="sm">Sign In</Button>
              </a>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
