"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const router = useRouter();

  const onSubmit = (data: any) => {
    console.log(data);
    router.push("/dashboard");
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 bg-green-700 flex items-center justify-center text-white text-3xl font-bold">
        Welcome to ZoneHub
      </div>

      <div className="w-1/2 flex items-center justify-center">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-8 rounded-lg shadow-lg w-96"
        >
          <h2 className="text-xl font-bold mb-6">Login</h2>

          <input
            {...register("email")}
            placeholder="Email"
            className="w-full mb-4 p-2 border rounded"
          />

          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className="w-full mb-4 p-2 border rounded"
          />

          <button className="w-full bg-green-600 text-white p-2 rounded">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}