"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";

export default function SignupPage() {
  const { register, handleSubmit } = useForm();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = (data: any) => {
    console.log(data);
    router.push("/dashboard");
  };

  const EyeIcon = ({ show }: { show: boolean }) => (
    show ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
    )
  );

  return (
    <AuthLayout>
      {/* Top Header */}
      <div className="px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#3CC15A] w-[38px] h-[38px] rounded-xl flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 22C12 22 4 16 4 9C4 5.5 6.5 3 10 3C17 3 20 8 20 8C20 8 12 14 12 22Z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">Zone<span className="text-[#3CC15A] font-semibold">Hub</span></span>
        </div>
        <button className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </button>
      </div>

      <form id="signup-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-32">
          {/* Titles */}
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-gray-900 mb-1.5">Welcome to ZoneHub</h1>
            <p className="text-[13px] text-gray-500 font-medium tracking-tight">Manage your farm with precision irrigation control.</p>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="fullName">
                Full name *
              </label>
              <input
                id="fullName"
                {...register("fullName", { required: true })}
                placeholder="XXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="email">
                Email address <span className="text-gray-500 font-normal"> (Optional)</span>
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="XXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
              />
            </div>

            {/* Mobile NO */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="mobile">
                Mobile NO *
              </label>
              <input
                id="mobile"
                {...register("mobile", { required: true })}
                placeholder="XXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
              />
            </div>

            {/* Device ID */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="deviceId">
                Device ID *
              </label>
              <input
                id="deviceId"
                {...register("deviceId", { required: true })}
                placeholder="XXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="password">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: true })}
                  placeholder="XXXXXX"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm" htmlFor="confirmPassword">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword", { required: true })}
                  placeholder="XXXXXX"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-transparent border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 placeholder:text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <EyeIcon show={showConfirmPassword} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Drawer */}
        <div className="bg-white px-6 pt-4 pb-8 rounded-t-[30px] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.08)] mt-auto shrink-0 relative z-20">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"></div>
          <div className="text-center text-[13px] text-gray-500 mb-5 font-medium tracking-tight">
            Already have an account? <Link href="/login" className="text-gray-900 font-extrabold ml-1">Login</Link>
          </div>
          <button
            form="signup-form"
            type="submit"
            className="w-full bg-[#3CC15A] hover:bg-[#34A853] text-white py-4 rounded-xl font-bold text-[15px] shadow-sm transition-all active:scale-[0.98]"
          >
            SignUp
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
