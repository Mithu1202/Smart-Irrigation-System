"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (data: any) => {
    console.log(data);
    // Add real authentication logic
    router.push("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[450px] mx-auto">
        {/* Header */}
        <div className="mb-10 text-center lg:text-left">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Login</h2>
          <p className="text-gray-500 font-medium text-lg">
            Login to continue to your dashboard
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#f7f8f7] rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Device ID */}
            <div>
              <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="deviceId">
                Device ID *
              </label>
              <input
                id="deviceId"
                {...register("email", { required: true })}
                placeholder="XXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="password">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: true })}
                  placeholder="XXXXXX"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400 tracking-[0.2em]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...register("rememberMe")}
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#34A853] peer-checked:border-[#34A853] transition-colors" />
                  <svg
                    className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                  Remember me
                </span>
              </label>

              <Link 
                href="/forgot-password" 
                className="text-gray-800 font-bold hover:text-[#34A853] underline-offset-4 underline decoration-gray-300 hover:decoration-[#34A853] transition-all"
              >
                Forgot Password ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#3CC15A] hover:bg-[#34A853] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Login
            </button>
          </form>
        </div>

        {/* Sign up Link */}
        <div className="mt-8 text-center text-gray-600 font-medium">
          Don't have an account?{" "}
          <Link href="/signup" className="text-gray-900 font-bold hover:text-[#34A853] transition-colors">
            SignUp
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}