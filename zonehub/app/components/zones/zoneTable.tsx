import Link from "next/link";
import { Zone } from "../../../types";
import Card from "../ui/Card";

export default function ZoneTable({ zones }: { zones: Zone[] }) {
  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Zone</th>
            <th className="p-2">Soil</th>
            <th className="p-2">Temp</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone.id} className="border-b">
              <td className="p-2">{zone.name}</td>
              <td className="p-2">{zone.soilMoisture}%</td>
              <td className="p-2">{zone.temperature}°C</td>
              <td className="p-2">
                <Link
                  href={`/zones/${zone.id}`}
                  className="text-green-600"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}