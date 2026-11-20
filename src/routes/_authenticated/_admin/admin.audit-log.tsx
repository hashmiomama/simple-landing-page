import { createFileRoute } from "@tanstack/react-router";
import { AuditLog } from "@/features/admin/pages";

export const Route = createFileRoute("/_authenticated/_admin/admin/audit-log")({
  component: AuditLog,
});
