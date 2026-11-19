import { supabase } from "@/integrations/supabase/client";

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("The app is not connected to its backend yet.");
    this.name = "BackendNotConfiguredError";
  }
}

export const isBackendConfigured = Boolean(supabase);

/** Returns the Supabase client, or throws a friendly error when it is not configured. */
export function requireSupabase() {
  if (!supabase) throw new BackendNotConfiguredError();
  return supabase;
}
