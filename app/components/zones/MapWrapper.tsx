"use client";

import dynamic from "next/dynamic";
import { ComponentProps } from "react";

// Dynamically import LeafletMap with SSR disabled (Leaflet requires window)
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center animate-pulse">
      <div className="text-gray-400 text-sm font-medium">Loading map...</div>
    </div>
  ),
});

type MapWrapperProps = ComponentProps<typeof LeafletMap>;

export default function MapWrapper(props: MapWrapperProps) {
  return <LeafletMap {...props} />;
}
