import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Page } from "@/features/opportunities/ui";

export const Route = createFileRoute("/_authenticated/_admin/admin/$")({
  component: MissingAdminPage,
});

function MissingAdminPage() {
  return (
    <Page title="Admin page not found">
      <Button asChild variant="outline">
        <Link to="/admin">Admin dashboard</Link>
      </Button>
    </Page>
  );
}
