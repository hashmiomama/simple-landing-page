import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Database } from "@/integrations/supabase/types";
import { isBackendConfigured, requireSupabase } from "@/lib/backend";
import { supabase } from "@/integrations/supabase/client";

import { hasRole as rolesInclude, primaryRole, type AppRole } from "./roles";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AuthStatus = "loading" | "signed_out" | "signed_in";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Every role the user holds, read from the user_roles table. */
  roles: AppRole[];
  /** The user's highest-privilege role. */
  role: AppRole | null;
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  rolesError: Error | null;
  profileError: Error | null;
  /** True after the user arrived through a password-reset link. */
  isPasswordRecovery: boolean;
  isBackendConfigured: boolean;
  hasRole: (role: AppRole) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const authQueryKeys = {
  all: ["auth"] as const,
  profile: (userId: string) => ["auth", "profile", userId] as const,
  roles: (userId: string) => ["auth", "roles", userId] as const,
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await requireSupabase()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setInitialised(true);
      return;
    }
    const client = supabase;
    // Subscribe first so no auth event is missed, then read the stored session.
    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
      }
    });
    client.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setInitialised(true));
    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ?? null;
  const userId = user?.id;

  const profileQuery = useQuery({
    queryKey: authQueryKeys.profile(userId ?? "none"),
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const rolesQuery = useQuery({
    queryKey: authQueryKeys.roles(userId ?? "none"),
    queryFn: () => fetchRoles(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const client = requireSupabase();
    await queryClient.cancelQueries();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    queryClient.clear();
    setIsPasswordRecovery(false);
  }, [queryClient]);

  const status: AuthStatus = !initialised ? "loading" : user ? "signed_in" : "signed_out";

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      profile: profileQuery.data ?? null,
      roles,
      role: primaryRole(roles),
      isProfileLoading: Boolean(userId) && profileQuery.isPending,
      isRolesLoading: Boolean(userId) && rolesQuery.isPending,
      rolesError: rolesQuery.error,
      profileError: profileQuery.error,
      isPasswordRecovery,
      isBackendConfigured,
      hasRole: (role) => rolesInclude(roles, role),
      refresh,
      signOut,
    }),
    [status, session, user, userId, profileQuery.data, profileQuery.isPending, profileQuery.error, roles, rolesQuery.isPending, rolesQuery.error, isPasswordRecovery, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
