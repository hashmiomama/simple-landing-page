import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const LeafletMap = lazy(() => import("./leaflet-map"));

export type ExperiencePin = {
  id?: string;
  position: [number, number];
  title: string;
  city?: string;
};
export function ExperienceMap({
  pins,
  onPick,
  label,
}: {
  pins: ExperiencePin[];
  onPick?: (latitude: number, longitude: number) => void;
  label: string;
}) {
  const fallback = (
    <div role="status">
      <span className="sr-only">Loading map</span>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LeafletMap pins={pins} onPick={onPick} label={label} />
      </Suspense>
    </ClientOnly>
  );
}
