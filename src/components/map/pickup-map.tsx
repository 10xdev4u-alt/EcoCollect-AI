import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Next.js
const customIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22C55E"/>
          <stop offset="100%" style="stop-color:#06B6D4"/>
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#22C55E" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"
            fill="url(#g)" filter="url(#shadow)"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
});

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-pan to new center
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

interface PickupMapProps {
  center: [number, number];
  markerPosition: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  zoom?: number;
}

export default function PickupMap({
  center,
  markerPosition,
  onMapClick,
  zoom = 13,
}: PickupMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: "260px", width: "100%", borderRadius: "1rem" }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Dark-themed map tiles — CartoDB Dark Matter (FREE) */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      <MapClickHandler onMapClick={onMapClick} />
      <MapUpdater center={center} zoom={zoom} />

      {markerPosition && (
        <Marker position={markerPosition} icon={customIcon}>
          <Popup className="glass-popup">
            <span className="text-sm font-medium">Pickup Location</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
