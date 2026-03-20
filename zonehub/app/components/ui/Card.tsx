export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-[18px] p-6 shadow-sm border border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}