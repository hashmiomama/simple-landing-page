import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LoadingState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { Page } from "@/features/opportunities/ui";

export function CommunityAccess({ children }: { children: (userId: string) => ReactNode }) {
  const { status, user } = useAuth();
  const href = useLocation({ select: (location) => location.href });
  if (status === "loading") return <LoadingState label="Checking your session…" />;
  if (!user) {
    // TODO: Add a public activity preview here when a public summary API is available.
    return (
      <Page
        title="Community"
        intro="Shared activities are for members. Sign in to browse, join and plan together."
      >
        <div className="rounded-3xl border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/login" search={{ redirect: href }}>
                Sign in
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/register" search={{ redirect: href }}>
                Join
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You can still browse{" "}
            <Link className="text-link" to="/opportunities">
              opportunities
            </Link>{" "}
            and{" "}
            <Link className="text-link" to="/experiences">
              experiences
            </Link>
            .
          </p>
        </div>
      </Page>
    );
  }
  return <>{children(user.id)}</>;
}
