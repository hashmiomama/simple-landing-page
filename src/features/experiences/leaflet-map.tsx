import { Link } from "@tanstack/react-router";
import { divIcon, icon, latLngBounds } from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import marker from "leaflet/dist/images/marker-icon.png?url";
import markerRetina from "leaflet/dist/images/marker-icon-2x.png?url";
import shadow from "leaflet/dist/images/marker-shadow.png?url";

import { karachi, mapCategoryColor } from "./data";
import type { ExperiencePin } from "./map";

const pinIcon = icon({
  iconUrl: marker,
  iconRetinaUrl: markerRetina,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitPins({ pins, resetView }: { pins: ExperiencePin[]; resetView?: number | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 1) map.setView(pins[0]!.position, 14);
    else if (pins.length)
      map.fitBounds(latLngBounds(pins.map(({ position }) => position)), {
        padding: [24, 24],
        maxZoom: 14,
      });
    else map.setView(karachi, 12);
  }, [map, pins, resetView]);
  return null;
}

function Picker({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click: ({ latlng }) => {
      const point = latlng.wrap();
      onPick(Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6)));
    },
  });
  return null;
}

export default function LeafletMap({
  pins,
  onPick,
  label,
  activeId,
  onPinSelect,
  resetView,
}: {
  pins: ExperiencePin[];
  onPick?: ((latitude: number, longitude: number) => void) | undefined;
  label: string;
  activeId?: string | undefined;
  onPinSelect?: ((id: string) => void) | undefined;
  resetView?: number | undefined;
}) {
  const [tileError, setTileError] = useState(false);
  return (
    <section aria-label={label}>
      <MapContainer
        center={onPick ? (pins[0]?.position ?? karachi) : karachi}
        zoom={12}
        scrollWheelZoom={false}
        className={`isolate z-0 h-72 w-full rounded-2xl border sm:h-80 ${onPinSelect ? "md:h-[26rem] [&_.leaflet-tile-pane]:contrast-125 [&_.leaflet-tile-pane]:saturate-125" : ""}`}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setTileError(true), load: () => setTileError(false) }}
        />
        {onPick ? <Picker onPick={onPick} /> : <FitPins pins={pins} resetView={resetView} />}
        {pins.map(({ id, position, title, city, number, category }) => {
          const highlighted = !!id && id === activeId;
          const numbered = number !== undefined && Number.isSafeInteger(number);
          const markerIcon = numbered
            ? divIcon({
                className: "experience-map-number",
                html: `<span class="grid size-8 place-items-center rounded-full border-2 border-background text-sm font-bold shadow-soft ${mapCategoryColor(category ?? "")}${highlighted ? " scale-125 ring-2 ring-foreground ring-offset-2" : ""}">${number}</span>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })
            : pinIcon;
          const markerTitle = numbered ? `${number}. ${title}` : title;
          return (
            <Marker
              key={id ?? title}
              position={position}
              icon={markerIcon}
              title={markerTitle}
              alt={markerTitle}
              zIndexOffset={highlighted ? 1000 : 0}
              eventHandlers={id && onPinSelect ? { click: () => onPinSelect(id) } : {}}
            >
              {!onPinSelect && (
                <Popup>
                  <strong>{title}</strong>
                  {city && <div>{city}</div>}
                  {id && (
                    <Link to="/experiences/$id" params={{ id }}>
                      View experience
                    </Link>
                  )}
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
      {tileError && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Map tiles couldn’t load. You can still use the location details.
        </p>
      )}
    </section>
  );
}
