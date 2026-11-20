import { useRouter } from "@tanstack/react-router";
import type { ComponentPropsWithRef } from "react";

import { safePath } from "./data";

export function InternalLink({
  href,
  onClick,
  children,
  ...props
}: ComponentPropsWithRef<"a"> & { href: string }) {
  const router = useRouter();
  const path = safePath(href);
  if (!path) return <span>{children}</span>;
  return (
    <a
      {...props}
      href={path}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        void router.navigate({ href: path });
      }}
    >
      {children}
    </a>
  );
}
