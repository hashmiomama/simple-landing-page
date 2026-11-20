import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RequireRole } from "@/features/auth/guards";
import { AdminShell } from "@/features/admin/layout";

// Every route inside src/routes/_authenticated/_admin/ needs the admin role.
export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequireRole role="admin">
      <AdminShell>
        <Outlet />
      </AdminShell>
    </RequireRole>
  );
}
