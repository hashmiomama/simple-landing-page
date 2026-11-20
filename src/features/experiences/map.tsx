import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const LeafletMap = lazy(() => import("./leaflet-map"));

export type ExperiencePin = {
  id?: string;
  position: [number, number];
  title: string;
  city?: string;
  number?: number;
  category?: string;
};
export function ExperienceMap({
  pins,
  onPick,
  label,
  activeId,
  onPinSelect,
  resetView,
}: {
  pins: ExperiencePin[];
  onPick?: (latitude: number, longitude: number) => void;
  label: string;
  activeId?: string | undefined;
  onPinSelect?: (id: string) => void;
  resetView?: number;
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
        <LeafletMap
          pins={pins}
          onPick={onPick}
          label={label}
          activeId={activeId}
          onPinSelect={onPinSelect}
          resetView={resetView}
        />
      </Suspense>
    </ClientOnly>
  );
}
