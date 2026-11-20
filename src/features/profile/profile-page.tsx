import { useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";

import { PreferencesSection } from "./preferences-section";
import { PrivateProfileSection } from "./private-profile-section";
import { PublicProfileSection } from "./public-profile-section";

export function ProfilePage() {
  const { user } = useAuth();
  return user ? <ProfileContent key={user.id} userId={user.id} /> : null;
}

function ProfileContent({ userId }: { userId: string }) {
  const [active, setActive] = useState<string | null>(null);
  const access = (section: string) => ({
    userId,
    locked: active !== null && active !== section,
    onEditing: (editing: boolean) => setActive(editing ? section : null),
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-5 py-9 sm:px-8 sm:py-12">
      <h1 className="mb-7 text-3xl font-bold sm:text-4xl">My profile</h1>
      <PublicProfileSection {...access("public")} />
      <PrivateProfileSection {...access("private")} />
      <PreferencesSection {...access("preferences")} />
    </div>
  );
}
