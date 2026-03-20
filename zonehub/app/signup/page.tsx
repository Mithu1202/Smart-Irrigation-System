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
    // Add real authentication logic
    router.push("/dashboard");
  };

  const EyeIcon = ({ show }: { show: boolean }) => (
    show ? (
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
    )
  );

  return (
    <AuthLayout>
      <div className="w-full max-w-[600px] mx-auto">
        {/* Header */}
        <div className="mb-8 text-center lg:text-left">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">SignUp</h2>
          <p className="text-gray-500 font-medium text-lg">
            SignUp to continue to your dashboard
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#f7f8f7] rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="fullName">
                  Full name *
                </label>
                <input
                  id="fullName"
                  {...register("fullName", { required: true })}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="email">
                  Email address <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400"
                />
              </div>

              {/* Mobile NO */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="mobile">
                  Mobile NO *
                </label>
                <input
                  id="mobile"
                  {...register("mobile", { required: true })}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400"
                />
              </div>

              {/* Device ID */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="deviceId">
                  Device ID *
                </label>
                <input
                  id="deviceId"
                  {...register("deviceId", { required: true })}
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
                    <EyeIcon show={showPassword} />
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-800 font-bold mb-2 text-sm" htmlFor="confirmPassword">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword", { required: true })}
                    placeholder="XXXXXX"
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-white border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-[#3cc15a] focus:outline-none transition-all shadow-sm placeholder:text-gray-400 tracking-[0.2em]"
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

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#3CC15A] hover:bg-[#34A853] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                SignUp
              </button>
            </div>
          </form>
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center text-gray-600 font-medium">
          Already have an account?{" "}
          <Link href="/login" className="text-gray-900 font-bold hover:text-[#34A853] transition-colors">
            Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
