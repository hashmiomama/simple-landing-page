import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";
import { myPoints } from "@/features/points/data";

import { PreferencesSection } from "./preferences-section";
import { PrivateProfileSection } from "./private-profile-section";
import { PublicProfileSection } from "./public-profile-section";

export function ProfilePage() {
  const { user } = useAuth();
  return user ? <ProfileContent key={user.id} userId={user.id} /> : null;
}

function ProfileContent({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const points = useQuery(myPoints(userId));
  const [active, setActive] = useState<string | null>(null);
  const access = (section: string) => ({
    userId,
    locked: active !== null && active !== section,
    onEditing: (editing: boolean) => setActive(editing ? section : null),
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-5 py-9 sm:px-8 sm:py-12">
      <header className="mb-7 space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">My profile</h1>
        <div className="flex flex-wrap items-center gap-2">
          {profile?.username && <span className="font-medium">{profile.username}</span>}
          {points.data && <Badge variant="secondary">{points.data.level_name}</Badge>}
        </div>
      </header>
      <PublicProfileSection {...access("public")} />
      <PrivateProfileSection {...access("private")} />
      <PreferencesSection {...access("preferences")} />
    </div>
  );
}
