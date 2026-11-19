import { APP_NAME } from "./app-config";

/** Builds the per-page meta tags every route sets in its head(). */
export function pageMeta(title: string, description: string, options: { noindex?: boolean } = {}) {
  const fullTitle = title === APP_NAME ? title : `${title} · ${APP_NAME}`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(options.noindex ? [{ name: "robots", content: "noindex" }] : []),
  ];
}
