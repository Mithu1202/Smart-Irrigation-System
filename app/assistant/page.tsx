"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import AgentPanel from "../components/agent/AgentPanel";

export default function AssistantPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col max-h-[calc(100vh-100px)]">
        <h1 className="text-[20px] font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">AI Assistant</h1>
        <p className="text-gray-500 text-[13px] font-medium mb-4">
          Chat with the precision agriculture AI to analyze graph trends and insights.
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto w-full max-w-4xl mx-auto pb-6">
          <AgentPanel compact={false} />
        </div>
      </div>
    </DashboardLayout>
  );
}
