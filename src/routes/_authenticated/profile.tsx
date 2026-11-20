import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/features/profile/profile-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: pageMeta("My profile", "Manage your profile and discovery preferences.", {
      noindex: true,
    }),
  }),
  component: ProfilePage,
});
