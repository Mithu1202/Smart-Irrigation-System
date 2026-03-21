import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-700 text-white">
      <h1 className="text-4xl font-bold mb-6">ZoneHub</h1>
      <Link
        href="/login"
        className="bg-white text-green-700 px-6 py-2 rounded-md font-semibold"
      >
        Go to Login
      </Link>
    </div>
  );
}