import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { Pagination } from "@/features/admin/ui";
import { CardsLoading, Page } from "@/features/opportunities/ui";
import { safePath, showDateTime } from "@/features/planning/data";
import { InternalLink } from "@/features/planning/internal-link";

import { inbox, useMarkRead, type Notice } from "./data";

export function NotificationBell() {
  const { user } = useAuth();
  return user ? <AccountBell key={user.id} userId={user.id} /> : null;
}

function AccountBell({ userId }: { userId: string }) {
  const query = useQuery({ ...inbox(userId, 5, 0), refetchInterval: 60_000 });
  const mark = useMarkRead(userId);
  const unread = query.data?.unread_count ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-0 top-0 min-w-4 rounded-full bg-primary-strong px-1 text-center text-xs leading-4 text-primary-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {query.isPending ? (
          <p role="status" className="px-2 py-2 text-sm">
            Loading notifications…
          </p>
        ) : query.isError ? (
          <DropdownMenuItem onSelect={() => void query.refetch()}>
            Retry notifications
          </DropdownMenuItem>
        ) : query.data.notifications.length ? (
          query.data.notifications.map((item) => {
            const path = safePath(item.link_path);
            const markItem = () => {
              if (!item.read_at) mark.mutate(item.id);
            };
            return path ? (
              <DropdownMenuItem key={item.id} asChild>
                <InternalLink href={path} onClick={markItem}>
                  <NoticeSummary item={item} />
                </InternalLink>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={item.id} onSelect={markItem}>
                <NoticeSummary item={item} />
              </DropdownMenuItem>
            );
          })
        ) : (
          <p className="px-2 py-2 text-sm text-muted-foreground">No notifications yet.</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!unread || mark.isPending} onSelect={() => mark.mutate(null)}>
          Mark all as read
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoticeSummary({ item }: { item: Notice }) {
  return (
    <div className="min-w-0 space-y-1 py-1">
      <p className={`break-words ${item.read_at ? "" : "font-bold"}`}>
        {item.title}
        {!item.read_at && <span className="sr-only"> (unread)</span>}
      </p>
      {item.body && (
        <p className="line-clamp-2 break-words text-sm text-muted-foreground">{item.body}</p>
      )}
      <time dateTime={item.created_at} className="text-xs text-muted-foreground">
        {showDateTime(item.created_at)}
      </time>
    </div>
  );
}

const size = 15;
export function NotificationsPage() {
  const { user } = useAuth();
  return user ? <InboxPage userId={user.id} /> : null;
}

function InboxPage({ userId }: { userId: string }) {
  const [unreadOnly, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery(inbox(userId, size, (page - 1) * size, unreadOnly));
  const mark = useMarkRead(userId);
  const count = (unreadOnly ? query.data?.unread_count : query.data?.total_count) ?? 0;
  const unread = query.data?.unread_count ?? 0;
  return (
    <Page
      title="Notifications"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/settings/notifications">Notification settings</Link>
          </Button>
          <Button
            variant="soft"
            disabled={!unread || mark.isPending}
            onClick={() => mark.mutate(null)}
          >
            Mark all as read
          </Button>
        </div>
      }
    >
      <label className="mb-4 inline-flex gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={unreadOnly}
          onChange={(event) => {
            setUnread(event.target.checked);
            setPage(1);
          }}
        />{" "}
        Unread only
      </label>
      {query.isPending ? (
        <CardsLoading label="Loading notifications" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load your notifications."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.notifications.length ? (
            <ul className="space-y-2">
              {query.data.notifications.map((item) => {
                const path = safePath(item.link_path);
                const className = `block w-full rounded-2xl border p-4 text-left hover:border-primary ${item.read_at ? "bg-card" : "bg-lavender-soft"}`;
                const markItem = () => {
                  if (!item.read_at) mark.mutate(item.id);
                };
                return (
                  <li key={item.id}>
                    {path ? (
                      <InternalLink className={className} href={path} onClick={markItem}>
                        <NoticeSummary item={item} />
                      </InternalLink>
                    ) : item.read_at ? (
                      <div className={className}>
                        <NoticeSummary item={item} />
                      </div>
                    ) : (
                      <button type="button" className={className} onClick={markItem}>
                        <NoticeSummary item={item} />
                        <span className="mt-1 block text-sm text-primary-strong">Mark as read</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border bg-card p-4 text-muted-foreground">
              {unreadOnly
                ? "No unread notifications on this page."
                : "No notifications on this page."}
            </p>
          )}
          <Pagination page={page} count={count} pageSize={size} change={setPage} />
        </>
      )}
    </Page>
  );
}
