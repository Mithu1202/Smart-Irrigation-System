"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

const BACKEND = "http://localhost:5000";

export default function SignupPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ fullName: "", email: "", mobile: "", deviceId: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setFields(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple client-side validation
    if (!fields.fullName.trim()) return setError("Full name is required.");
    if (!fields.mobile.trim()) return setError("Mobile number is required.");
    if (!fields.deviceId.trim()) return setError("Device ID is required.");
    if (!fields.password) return setError("Password is required.");
    if (fields.password !== fields.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fields.fullName,
          email: fields.email,
          mobile: fields.mobile,
          deviceId: fields.deviceId,
          password: fields.password,
          confirmPassword: fields.confirmPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Signup failed. Please try again.");
        return;
      }
      localStorage.setItem("token", json.token);
      localStorage.setItem("user", JSON.stringify(json.user));
      router.push("/dashboard");
    } catch (err) {
      setError("Cannot reach server on port 5000. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-transparent border border-gray-200 text-sm md:text-base font-medium focus:ring-2 focus:ring-[#3cc15a] focus:bg-white focus:outline-none transition-all placeholder:text-gray-400";

  return (
    <AuthLayout>
      {/* Mobile Top Header */}
      <div className="px-6 py-4 flex justify-between items-center shrink-0 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#3CC15A] w-[38px] h-[38px] rounded-xl flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 22C12 22 4 16 4 9C4 5.5 6.5 3 10 3C17 3 20 8 20 8C20 8 12 14 12 22Z" /></svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">Zone<span className="text-[#3CC15A] font-semibold">Hub</span></span>
        </div>
        <button type="button" className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col h-full overflow-hidden text-gray-900 md:justify-center">
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-36 md:pb-0 md:overflow-visible md:flex-none">
          <div className="mb-6 md:mb-10">
            <h1 className="text-[22px] md:text-4xl font-bold text-gray-900 mb-1.5 md:mb-3">Sign Up</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 font-medium">Manage your farm with precision irrigation control.</p>
          </div>

          <div className="space-y-4 md:space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm">Full name *</label>
              <input value={fields.fullName} onChange={set("fullName")} placeholder="John Doe" className={inputClass} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-900 font-bold mb-2 text-sm">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="email" value={fields.email} onChange={set("email")} placeholder="john@example.com" className={inputClass} />
            </div>

            {/* Mobile + Device ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-900 font-bold mb-2 text-sm">Mobile NO *</label>
                <input value={fields.mobile} onChange={set("mobile")} placeholder="+1 234 567 890" className={inputClass} />
              </div>
              <div>
                <label className="block text-gray-900 font-bold mb-2 text-sm">Device ID *</label>
                <input value={fields.deviceId} onChange={set("deviceId")} placeholder="XXXXXX" className={inputClass} />
              </div>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-900 font-bold mb-2 text-sm">Password *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={fields.password} onChange={set("password")} placeholder="••••••••" className={inputClass.replace("px-4", "pl-4 pr-12")} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon show={showPassword} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-900 font-bold mb-2 text-sm">Confirm *</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} value={fields.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" className={inputClass.replace("px-4", "pl-4 pr-12")} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon show={showConfirm} />
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            {/* Desktop Submit */}
            <div className="hidden md:block pt-4">
              <button type="submit" disabled={loading} className="w-full bg-[#3CC15A] hover:bg-[#34A853] disabled:opacity-60 text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2">
                {loading && <Spinner />}
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
              <p className="mt-6 text-center text-gray-600 font-medium text-[15px]">
                Already have an account?{" "}
                <Link href="/login" className="text-gray-900 font-bold hover:text-[#34A853] transition-colors">Login</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Drawer */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white px-6 pt-4 pb-8 rounded-t-[30px] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.12)]">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
          {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg">{error}</div>}
          <p className="text-center text-[13px] text-gray-500 mb-4 font-medium">
            Already have an account? <Link href="/login" className="text-gray-900 font-extrabold ml-1">Login</Link>
          </p>
          <button type="submit" disabled={loading} className="w-full bg-[#3CC15A] hover:bg-[#34A853] disabled:opacity-60 text-white py-4 rounded-xl font-bold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2">
            {loading && <Spinner />}
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
