import { Zone } from "../../../types";
import Card from "../ui/Card";
import Toggle from "../ui/Toggle";

export default function ZoneDetails({ zone }: { zone: Zone }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <h2 className="font-bold text-lg mb-4">{zone.name} Overview</h2>
        <p>Soil Moisture: {zone.soilMoisture}%</p>
        <p>Temperature: {zone.temperature}°C</p>
      </Card>

      <Card>
        <h2 className="font-bold text-lg mb-4">Irrigation Control</h2>
        <Toggle />
      </Card>
    </div>
  );
}