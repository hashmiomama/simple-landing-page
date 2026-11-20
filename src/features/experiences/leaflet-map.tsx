import { Link } from "@tanstack/react-router";
import { icon, latLngBounds } from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import marker from "leaflet/dist/images/marker-icon.png?url";
import markerRetina from "leaflet/dist/images/marker-icon-2x.png?url";
import shadow from "leaflet/dist/images/marker-shadow.png?url";

import { karachi } from "./data";
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

function FitPins({ pins }: { pins: ExperiencePin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 1) map.setView(pins[0]!.position, 14);
    else if (pins.length)
      map.fitBounds(latLngBounds(pins.map(({ position }) => position)), {
        padding: [24, 24],
        maxZoom: 14,
      });
  }, [map, pins]);
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
}: {
  pins: ExperiencePin[];
  onPick?: ((latitude: number, longitude: number) => void) | undefined;
  label: string;
}) {
  const [tileError, setTileError] = useState(false);
  return (
    <section aria-label={label}>
      <MapContainer
        center={onPick ? (pins[0]?.position ?? karachi) : karachi}
        zoom={12}
        scrollWheelZoom={false}
        className="isolate z-0 h-72 w-full rounded-2xl border sm:h-80"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setTileError(true), load: () => setTileError(false) }}
        />
        {onPick ? <Picker onPick={onPick} /> : <FitPins pins={pins} />}
        {pins.map(({ id, position, title, city }) => (
          <Marker key={id ?? title} position={position} icon={pinIcon} title={title} alt={title}>
            <Popup>
              <strong>{title}</strong>
              {city && <div>{city}</div>}
              {id && (
                <Link to="/experiences/$id" params={{ id }}>
                  View experience
                </Link>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {tileError && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Map tiles couldn’t load. You can still use the location details.
        </p>
      )}
    </section>
  );
}
