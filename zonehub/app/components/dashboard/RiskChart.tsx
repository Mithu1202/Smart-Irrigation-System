"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "1 PM", risk: 20 },
  { time: "2 PM", risk: 35 },
  { time: "3 PM", risk: 50 },
  { time: "4 PM", risk: 30 },
];

export default function RiskChart() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Risk Trend</h2>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="risk" stroke="#16a34a" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}