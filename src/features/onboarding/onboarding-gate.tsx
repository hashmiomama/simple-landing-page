import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ErrorState, LoadingState } from "@/components/layout/page-states";
import { useAuth } from "@/features/auth/auth-provider";

import { onboardingPreferences } from "./data";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });

  if (!user) return null;
  return (
    <PreferenceGate userId={user.id} isOnboarding={pathname.replace(/\/$/, "") === "/onboarding"}>
      {children}
    </PreferenceGate>
  );
}

function PreferenceGate({
  userId,
  isOnboarding,
  children,
}: {
  userId: string;
  isOnboarding: boolean;
  children: ReactNode;
}) {
  const preferences = useQuery(onboardingPreferences(userId));

  if (preferences.isPending) return <LoadingState label="Loading your preferences…" />;
  if (!preferences.data) {
    return (
      <ErrorState
        message="We couldn't load your onboarding status. Try again."
        onRetry={() => void preferences.refetch()}
      />
    );
  }
  if (!preferences.data.onboarding_completed && !isOnboarding)
    return <Navigate to="/onboarding" replace />;
  if (preferences.data.onboarding_completed && isOnboarding)
    return <Navigate to="/dashboard" replace />;
  return children;
}
