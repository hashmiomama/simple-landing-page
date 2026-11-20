import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/backend";

export function ReviewNotes({ id, userId }: { id: string; userId: string }) {
  const query = useQuery({
    queryKey: ["review-notes", userId, id],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("list_opportunity_review_notes", { p_id: id })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  if (query.isPending)
    return (
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        Loading reviewer notes…
      </p>
    );
  if (query.isError)
    return (
      <p role="alert" className="mt-2 text-sm">
        Couldn’t load the reviewer’s note.{" "}
        <button type="button" className="text-link" onClick={() => void query.refetch()}>
          Try again
        </button>
      </p>
    );
  const note = query.data[0]?.note;
  return (
    <div className="mt-3 rounded-xl bg-lavender-soft p-3 text-sm">
      <p className="font-semibold">Reviewer’s note</p>
      <p className="whitespace-pre-wrap break-words">{note ?? "No note was recorded."}</p>
    </div>
  );
}
