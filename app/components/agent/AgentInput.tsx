"use client";

import { useState } from "react";

type Props = {
  onSubmit: (query: string) => void;
  placeholder?: string;
  buttonLabel?: string;
};

export default function AgentInput({
  onSubmit,
  placeholder = "Type your question here...",
  buttonLabel = "Ask",
}: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const query = value.trim();
    if (!query) return;
    onSubmit(query);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        className="flex-1 rounded-[14px] border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <button
        type="button"
        onClick={submit}
        className="rounded-[14px] bg-[#39B54A] px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#2ea33e]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
