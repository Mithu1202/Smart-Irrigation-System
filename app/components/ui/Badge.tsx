export default function Badge({
  text,
  type = "optimal",
}: {
  text: string;
  type?: "optimal" | "dry" | "wet";
}) {
  const styles =
    type === "optimal"
      ? "bg-green-100 text-green-700"
      : type === "dry"
      ? "bg-red-100 text-red-600"
      : "bg-blue-100 text-blue-600";

  return (
    <span
      className={`text-xs px-3 py-1 rounded-full font-medium ${styles}`}
    >
      {text}
    </span>
  );
}