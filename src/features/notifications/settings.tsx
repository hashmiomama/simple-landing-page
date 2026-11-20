import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { useAuth } from "@/features/auth/auth-provider";
import { errorText } from "@/features/opportunities/data";
import { CardsLoading, Page, selectClass } from "@/features/opportunities/ui";
import type { Enums } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

import { frequencies, notificationCategories, notificationPreferences } from "./data";

const channels = [
  ["in_app", "In-app"],
  ["email", "Email"],
] as const;
type Category = Enums<"notification_category">;
type Channel = Enums<"notification_channel">;
type Frequency = Enums<"notification_frequency">;

export function NotificationSettings() {
  const { user } = useAuth();
  return user ? <SettingsContent userId={user.id} /> : null;
}

function SettingsContent({ userId }: { userId: string }) {
  const client = useQueryClient();
  const query = useQuery(notificationPreferences(userId));
  const [saved, setSaved] = useState("");
  const change = useMutation({
    mutationFn: async ({
      category,
      channel,
      frequency,
    }: {
      category: Category;
      channel: Channel;
      frequency: Frequency;
    }) => {
      const { data, error } = await requireSupabase()
        .rpc("set_my_notification_preferences", {
          p_category: category,
          p_channel: channel,
          p_frequency: frequency,
        })
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setSaved("");
    },
    onSuccess: (row) => {
      client.setQueryData(notificationPreferences(userId).queryKey, (current) =>
        current?.map((existing) =>
          existing.category === row.category && existing.channel === row.channel ? row : existing,
        ),
      );
      setSaved("Preference saved.");
    },
  });
  return (
    <Page
      title="Notification settings"
      intro="Choose a frequency for each category. Email delivery will be enabled in a later update."
    >
      {query.isPending ? (
        <CardsLoading label="Loading notification settings" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load your notification settings."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border bg-card"
          role="region"
          tabIndex={0}
          aria-label="Notification preferences"
        >
          <table className="w-full min-w-84 text-sm">
            <thead>
              <tr className="bg-lavender-soft">
                <th scope="col" className="p-3 text-left">
                  Category
                </th>
                {channels.map(([key, label]) => (
                  <th key={key} scope="col" className="p-3 text-left">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.entries(notificationCategories) as [Category, string][]).map(
                ([category, label]) => (
                  <tr key={category} className="border-t">
                    <th scope="row" className="p-3 text-left font-medium">
                      {label}
                    </th>
                    {channels.map(([channel, channelLabel]) => {
                      const row = query.data.find(
                        (entry) => entry.category === category && entry.channel === channel,
                      );
                      return (
                        <td key={channel} className="p-2 sm:p-3">
                          <select
                            aria-label={`${label}, ${channelLabel}`}
                            className={selectClass}
                            disabled={!row || change.isPending}
                            value={row?.frequency ?? "off"}
                            onChange={(event) =>
                              change.mutate({
                                category,
                                channel,
                                frequency: event.target.value as Frequency,
                              })
                            }
                          >
                            {Object.entries(frequencies).map(([frequency, text]) => (
                              <option key={frequency} value={frequency}>
                                {text}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      {change.isPending && (
        <p role="status" className="mt-3 text-sm">
          Saving preference…
        </p>
      )}
      {saved && (
        <p role="status" className="mt-3 text-sm text-success">
          {saved}
        </p>
      )}
      {change.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errorText(change.error, "Couldn’t save the preference.")}
        </p>
      )}
    </Page>
  );
}
