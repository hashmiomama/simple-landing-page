import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authQueryKeys, useAuth } from "@/features/auth/auth-provider";
import { usernamePattern } from "@/features/onboarding/data";
import { requireSupabase } from "@/lib/backend";

import { optionalText, savePublicProfile } from "./data";
import {
  ProfileSection,
  ProfileValue,
  SectionFields,
  SectionStatus,
  useSectionEditor,
  type SectionAccess,
} from "./section-editor";

const labelClass = "mb-1.5 block text-sm font-medium";

function UserAvatar({ username, url }: { username: string; url?: string | null }) {
  return (
    <Avatar className="size-16">
      {url && <AvatarImage src={url} alt="" className="object-cover" />}
      <AvatarFallback className="bg-lavender-soft font-display text-xl font-bold text-primary-strong">
        {username.charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function AvatarPreview({
  username,
  url,
  clear,
}: {
  username: string;
  url: string | null;
  clear: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    const source = file ? URL.createObjectURL(file) : undefined;
    setPreview(source);
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [file]);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <UserAvatar username={username} url={preview ?? url} />
      <div>
        <label htmlFor="avatar-preview" className={labelClass}>
          Preview an avatar
        </label>
        <Input
          id="avatar-preview"
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="mt-1.5 text-sm text-muted-foreground">
          This preview is local. Photo uploads aren’t available yet.
        </p>
        {url && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={clear}>
            Remove saved avatar
          </Button>
        )}
      </div>
    </div>
  );
}

export function PublicProfileSection(access: SectionAccess) {
  const { profile, isProfileLoading, profileError, refresh } = useAuth();
  const queryClient = useQueryClient();
  const editor = useSectionEditor(
    access,
    async (draft: { username: string; bio: string; avatar: string | null }) => {
      const updated = await savePublicProfile(access.userId, {
        username: draft.username,
        bio: optionalText(draft.bio),
        avatar_url: draft.avatar,
      });
      queryClient.setQueryData(authQueryKeys.profile(access.userId), updated);
    },
  );
  const name = editor.draft?.username ?? "";
  const validName = usernamePattern.test(name);
  const changedName = name !== profile?.username;
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(name), 300);
    return () => window.clearTimeout(timer);
  }, [name]);

  const availability = useQuery({
    queryKey: ["profile-username-availability", debounced],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("is_username_available", { p_username: debounced })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
    enabled: editor.editing && changedName && validName && name === debounced,
    retry: false,
  });
  const checked = name === debounced && !availability.isFetching;
  const available = checked && availability.data === true && !availability.isError;
  const nameMessage = !validName
    ? "Use 3–20 lowercase letters, numbers, or underscores."
    : !changedName
      ? "This is your current username."
      : !checked
        ? "Checking availability…"
        : availability.isError
          ? "Couldn’t check availability."
          : available
            ? "Username available."
            : "That username is taken.";

  return (
    <ProfileSection
      id="public-profile"
      title="Public profile"
      description="Your public profile shows only your username, avatar, and bio."
      action={
        !editor.editing &&
        profile && (
          <Button
            type="button"
            variant="outline"
            disabled={access.locked}
            onClick={() =>
              editor.start({
                username: profile.username,
                bio: profile.bio ?? "",
                avatar: profile.avatar_url,
              })
            }
          >
            Edit
          </Button>
        )
      }
    >
      {editor.draft ? (
        <SectionFields
          pending={editor.pending}
          canSave={editor.dirty && validName && (!changedName || available)}
          error={editor.error}
          onSave={editor.save}
          onCancel={editor.cancel}
        >
          <div>
            <label htmlFor="profile-username" className={labelClass}>
              Username
            </label>
            <Input
              id="profile-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={20}
              required
              value={editor.draft.username}
              aria-describedby="profile-username-status"
              onChange={(event) => {
                if (editor.draft)
                  editor.setDraft({ ...editor.draft, username: event.target.value });
              }}
            />
            <p
              id="profile-username-status"
              role="status"
              className="mt-1.5 text-sm text-muted-foreground"
            >
              {nameMessage}
            </p>
            {checked && changedName && validName && availability.isError && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void availability.refetch()}
              >
                Check again
              </Button>
            )}
          </div>
          <AvatarPreview
            username={editor.draft.username}
            url={editor.draft.avatar}
            clear={() => {
              if (editor.draft) editor.setDraft({ ...editor.draft, avatar: null });
            }}
          />
          <div>
            <label htmlFor="profile-bio" className={labelClass}>
              Bio
            </label>
            <Textarea
              id="profile-bio"
              value={editor.draft.bio}
              onChange={(event) => {
                if (editor.draft) editor.setDraft({ ...editor.draft, bio: event.target.value });
              }}
            />
          </div>
        </SectionFields>
      ) : profile ? (
        <div className="flex items-start gap-4">
          <UserAvatar username={profile.username} url={profile.avatar_url} />
          <dl className="min-w-0 space-y-4">
            <ProfileValue label="Username" value={profile.username} />
            <ProfileValue label="Bio" value={profile.bio} />
          </dl>
        </div>
      ) : (
        <SectionStatus
          loading={isProfileLoading}
          error={!!profileError || !profile}
          onRetry={() => void refresh()}
        />
      )}
      {editor.saved && (
        <p role="status" className="mt-4 text-sm font-semibold text-success">
          Public profile saved.
        </p>
      )}
    </ProfileSection>
  );
}
