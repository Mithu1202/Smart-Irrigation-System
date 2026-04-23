type Props = {
  onSelect: (query: string) => void;
};

const actions = [
  "Which zone needs irrigation?",
  "Which plant is suitable for Zone A soil?",
  "What crop fits this zone best?",
  "Is tomato suitable for Zone A?",
  "Show today's irrigation logs for Zone A.",
  "Explain the moisture trend and risk level.",
  "Show high risk zones",
  "Should I turn on pump?",
];

export default function SuggestedActions({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => onSelect(action)}
          className="rounded-[12px] border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-[12px] font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-100 dark:hover:bg-slate-600"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
