"use client";

import { useState } from "react";

export default function Toggle() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div
      onClick={() => setEnabled(!enabled)}
      className={`w-12 h-6 flex items-center rounded-full cursor-pointer p-1 ${
        enabled ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
          enabled ? "translate-x-6" : ""
        }`}
      />
    </div>
  );
}