"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Mail, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/libs/auth";

interface InviteDetails {
  email: string;
  company_name: string;
  team_name: string;
  role: string;
  inviter_name: string;
}

function InvitationSignupContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load invitation details
  useEffect(() => {
    const loadInviteDetails = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setLoadingInvite(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/invites/${token}`);
        
        if (!response.ok) {
          throw new Error("Invalid or expired invitation");
        }

        const inviteData = await response.json();
        setInviteDetails(inviteData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invitation details");
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInviteDetails();
  }, [token]);

  const isFormValid = password && confirmPassword && password === confirmPassword && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("NEW handleSubmit called with:", { token, password: password?.length, confirmPassword: confirmPassword?.length, isFormValid });
    
    if (!isFormValid || isLoading || !token) {
      console.log("Form validation failed:", { isFormValid, isLoading, hasToken: !!token });
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/users/signup-from-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: password,
          confirm_password: confirmPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Signup failed');
      }

      const authResponse = await response.json();
      
      // Store token in cookie
      document.cookie = `auth_token=${authResponse.access_token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      
      // Redirect directly to dashboard (invited users skip onboarding)
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication or loading invite
  if (authLoading || loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // Show error if no token or failed to load invite
  if (!token || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="p-4">
          <h1 className="text-xl font-bold text-purple-600">Knowva</h1>
        </header>
        <hr />
        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md px-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "This invitation link is invalid or has expired."}
            </p>
            <Link 
              href="/login"
              className="text-purple-600 hover:underline"
            >
              Go to Login
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
          {inviteDetails && (
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#202020]">
                Welcome to {inviteDetails.company_name}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                You've been invited to join the <strong>{inviteDetails.team_name}</strong> team as a <strong>{inviteDetails.role}</strong>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Email: {inviteDetails.email}
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-[#202020] mb-4">
              Set Your Password
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

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
                    placeholder="Minimum 8 characters"
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
                    placeholder="Confirm your password"
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
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full py-3 font-semibold rounded-lg transition flex items-center justify-center ${isFormValid && !isLoading
                    ? "bg-[#823BE3] text-white hover:bg-purple-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account & Join Team"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-sm text-center mt-6 text-gray-600">
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

export default function InvitationSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <InvitationSignupContent />
    </Suspense>
  );
}
