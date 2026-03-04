import Link from "next/link";
import { Zone } from "../../../types";

export default function ZoneCard({ zone }: { zone: Zone }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="font-bold text-lg">{zone.name}</h2>
      <p className="text-sm text-gray-500">Soil: {zone.soilMoisture}%</p>
      <p className="text-sm text-gray-500">Temp: {zone.temperature}°C</p>

      <Link
        href={`/zones/${zone.id}`}
        className="text-green-600 mt-3 inline-block"
      >
        View Details →
      </Link>
    </div>
  );
}