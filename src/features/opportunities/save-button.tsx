import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

import { bookmarkIds, savedListings, setSaved } from "./data";

export function SaveButton({ id, title, saved }: { id: string; title: string; saved?: boolean }) {
  const { status, user } = useAuth();
  const href = useLocation({ select: (location) => location.href });
  if (status === "loading")
    return (
      <Button variant="outline" size="sm" disabled>
        Save
      </Button>
    );
  return user ? (
    <AccountSave id={id} title={title} userId={user.id} initialSaved={saved} />
  ) : (
    <Button variant="outline" size="sm" asChild>
      <Link to="/login" search={{ redirect: href }}>
        Sign in to save
      </Link>
    </Button>
  );
}

function AccountSave({
  id,
  title,
  userId,
  initialSaved,
}: {
  id: string;
  title: string;
  userId: string;
  initialSaved: boolean | undefined;
}) {
  const bookmarks = useQuery({ ...bookmarkIds(userId), enabled: initialSaved === undefined });
  const saved = initialSaved ?? bookmarks.data?.includes(id) ?? false;
  const toggle = useSaveAction(userId, id);

  if (initialSaved === undefined && bookmarks.isError) {
    return (
      <Button size="sm" variant="outline" onClick={() => void bookmarks.refetch()}>
        Retry saved status
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant={saved ? "soft" : "outline"}
      aria-label={`Save ${title}`}
      aria-pressed={saved}
      disabled={toggle.isPending || (initialSaved === undefined && bookmarks.isPending)}
      onClick={() => toggle.mutate(!saved)}
    >
      <Bookmark aria-hidden className={saved ? "fill-current" : ""} />{" "}
      {toggle.isPending ? "Updating…" : saved ? "Saved" : "Save"}
    </Button>
  );
}

export function useSaveAction(userId: string, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (saved: boolean) => setSaved(userId, id, saved),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: bookmarkIds(userId).queryKey }),
        client.invalidateQueries({ queryKey: savedListings(userId).queryKey }),
        client.invalidateQueries({ queryKey: ["opportunity-detail", id, userId] }),
        client.invalidateQueries({ queryKey: ["dashboard-summary", userId] }),
      ]);
    },
    onError: () => toast.error("We couldn’t update your saved opportunities. Try again."),
  });
}
