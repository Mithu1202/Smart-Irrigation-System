"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Zone {
  zoneId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  status: string;
  soilMoisture?: number;
  temperature?: number;
  pumpActive?: boolean;
  crop?: string;
}

interface LeafletMapProps {
  zones: Zone[];
  selectedZone?: string;
  onZoneSelect?: (zoneId: string) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

// Custom marker icons for different statuses
const createMarkerIcon = (status: string, isSelected: boolean) => {
  const colors: Record<string, string> = {
    Optimal: "#3CC15A",
    Dry: "#EF4444",
    Wet: "#3B82F6",
  };
  const color = colors[status] || "#3CC15A";
  const size = isSelected ? 40 : 30;
  const borderWidth = isSelected ? 4 : 2;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: ${size * 0.4}px;
          height: ${size * 0.4}px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export default function LeafletMap({
  zones,
  selectedZone,
  onZoneSelect,
  center = [6.9271, 79.8612],
  zoom = 15,
  className = "",
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
    });

    // Add tile layer
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    }).addTo(map);

    // Add custom CSS
    const style = document.createElement("style");
    style.id = "leaflet-custom-styles";
    style.textContent = `
      .custom-marker {
        background: transparent !important;
        border: none !important;
      }
    `;
    if (!document.getElementById("leaflet-custom-styles")) {
      document.head.appendChild(style);
    }

    mapRef.current = map;
    setIsMapReady(true);

    // Cleanup
    return () => {
      setIsMapReady(false);
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
  }, []);

  // Update markers when zones change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current.clear();

    // Add new markers
    zones.forEach((zone) => {
      if (!zone.coordinates?.lat || !zone.coordinates?.lng) return;
      
      const isSelected = selectedZone === zone.zoneId;
      const marker = L.marker([zone.coordinates.lat, zone.coordinates.lng], {
        icon: createMarkerIcon(zone.status, isSelected),
      });

      const popupContent = `
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 14px;">${zone.name}</strong>
            <span style="
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              background: ${zone.status === "Optimal" ? "#EEFBF2" : zone.status === "Dry" ? "#FEE2E2" : "#DBEAFE"};
              color: ${zone.status === "Optimal" ? "#3CC15A" : zone.status === "Dry" ? "#EF4444" : "#3B82F6"};
            ">${zone.status}</span>
          </div>
          <div style="font-size: 12px; color: #666; line-height: 1.6;">
            <div>🌱 Moisture: <strong>${zone.soilMoisture ?? 0}%</strong></div>
            <div>🌡️ Temp: <strong>${zone.temperature ?? 0}°C</strong></div>
            <div>💧 Pump: <strong>${zone.pumpActive ? "ON" : "OFF"}</strong></div>
            ${zone.crop ? `<div>🌾 Crop: <strong>${zone.crop}</strong></div>` : ""}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => {
        onZoneSelect?.(zone.zoneId);
      });

      marker.addTo(map);
      markersRef.current.set(zone.zoneId, marker);
    });
  }, [zones, selectedZone, onZoneSelect, isMapReady]);

  // Handle selected zone changes (pan to zone)
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !selectedZone) return;

    const zone = zones.find((z) => z.zoneId === selectedZone);
    if (zone?.coordinates?.lat && zone?.coordinates?.lng) {
      mapRef.current.setView(
        [zone.coordinates.lat, zone.coordinates.lng],
        17,
        { animate: true }
      );
      markersRef.current.get(selectedZone)?.openPopup();
    }
  }, [selectedZone, zones, isMapReady]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: "200px" }}
    />
  );
}
