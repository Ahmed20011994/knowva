"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/libs/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signup, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // If user has completed onboarding, go to dashboard
      // Otherwise, let them continue with signup/onboarding
      if (user.onboarding_completed) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, authLoading, router, user]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Don't render if authenticated and onboarding completed (will redirect)
  if (isAuthenticated && user?.onboarding_completed) {
    return null;
  }

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid =
    email &&
    isValidEmail(email) &&
    password &&
    confirmPassword &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      await signup(email, password, confirmPassword, ""); // No organization in initial signup
      router.push("/signup/onboarding"); // Redirect to onboarding instead of dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <h1 className="text-xl font-bold text-purple-600">Knowva</h1>
      </header>
      <hr />

      {/* Signup Form */}
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md px-8">
          <h2 className="text-2xl font-bold text-[#202020] text-center">
            Smarter Knowledge. <br /> Fewer Silos.
          </h2>
          <p className="mt-2 text-sm text-[#202020] text-center">
            Knowva connects tools, syncs context, and helps everyone stay
            aligned.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block mb-1 text-sm font-medium text-[#202020]"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Johndoe@@gmail.com"
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none ${email ? "text-black" : "text-gray-400"
                    }`}
                />
                {email ? (
                  isValidEmail(email) ? (
                    <CheckCircle
                      className="absolute right-3 top-2.5 text-green-500"
                      size={20}
                    />
                  ) : null
                ) : (
                  <Mail
                    className="absolute right-3 top-2.5 text-gray-400"
                    size={20}
                  />
                )}
              </div>
            </div>


            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block mb-1 text-sm font-medium text-[#202020]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none ${password ? "text-black" : "text-gray-400"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block mb-1 text-sm font-medium text-[#202020]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none ${confirmPassword ? "text-black" : "text-gray-400"
                    }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`w-full py-2 font-semibold rounded-lg transition ${
                isFormValid && !isLoading
                  ? "bg-[#823BE3] text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center mt-4 text-[#202020]">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
