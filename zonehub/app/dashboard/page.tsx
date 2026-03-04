import DashboardLayout from "../components/layout/DashboardLayout";
import ZoneCard from "../components/dashboard/ZoneCard";
import { mockZones } from "../../lib/mockData";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Zone Overview</h1>

      <div className="grid grid-cols-3 gap-6">
        {mockZones.map((zone) => (
          <ZoneCard key={zone.id} zone={zone} />
        ))}
      </div>
    </DashboardLayout>
  );
}