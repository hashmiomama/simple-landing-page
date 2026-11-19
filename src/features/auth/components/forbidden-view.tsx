import { Link } from "@tanstack/react-router";
import { ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ForbiddenView() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-lavender text-primary-strong">
        <ShieldQuestion className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-medium text-primary-strong">Error 403</p>
      <h1 className="mt-2 text-3xl font-bold">This space isn't open to you</h1>
      <p className="mt-3 text-muted-foreground">
        You're signed in, but your account doesn't have access to this page. If you think that's a
        mistake, contact the team and we'll take a look.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/dashboard">Go to my home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/opportunities">Browse opportunities</Link>
        </Button>
      </div>
    </div>
  );
}
