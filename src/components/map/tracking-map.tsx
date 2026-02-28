import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
      <defs>
        <linearGradient id="pickup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22C55E"/>
          <stop offset="100%" style="stop-color:#06B6D4"/>
        </linearGradient>
      </defs>
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="url(#pickup)"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [32, 48],
  iconAnchor: [16, 48],
});

const collectorIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <defs>
        <filter id="glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#22C55E" flood-opacity="0.6"/>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill="#22C55E" filter="url(#glow)"/>
      <circle cx="16" cy="16" r="10" fill="#0A0A0B"/>
      <circle cx="16" cy="16" r="6" fill="#22C55E"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Fit bounds to show both markers
function MapFitter({ 
  pickupLocation, 
  collectorLocation 
}: { 
  pickupLocation: [number, number]; 
  collectorLocation: [number, number] | null;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (collectorLocation) {
      const bounds = L.latLngBounds([
        pickupLocation,
        collectorLocation,
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView(pickupLocation, 15);
    }
  }, [map, pickupLocation, collectorLocation]);

  return null;
}

interface TrackingMapProps {
  pickupLocation: [number, number];
  collectorLocation: [number, number] | null;
}

export default function TrackingMap({
  pickupLocation,
  collectorLocation,
}: TrackingMapProps) {
  return (
    <MapContainer
      center={pickupLocation}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      <MapFitter pickupLocation={pickupLocation} collectorLocation={collectorLocation} />

      {/* Pickup location marker */}
      <Marker position={pickupLocation} icon={pickupIcon} />

      {/* Collector location marker (if available) */}
      {collectorLocation && (
        <Marker position={collectorLocation} icon={collectorIcon} />
      )}
    </MapContainer>
  );
}
