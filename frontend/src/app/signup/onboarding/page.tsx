"use client";

import { useState } from "react";
import Link from "next/link";
import { Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/libs/auth";

export default function OrganizationPage() {
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isFormValid = organization.trim().length > 0 && role.trim().length > 0;
  const router = useRouter();
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/onboarding/organization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organization: organization.trim(),
          admin_role: role.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update organization');
      }
      
      router.push("/signup/onboarding/integrations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save organization details");
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

      {/* Organization Form */}
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md px-8">
          <h2 className="text-2xl font-bold text-[#202020] text-center">
            What should we call your organization?
          </h2>
          <p className="mt-2 text-sm text-[#202020] text-center">
            We recommend your company name
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Organization Field */}
            <div>
              <label
                htmlFor="organization"
                className="block mb-1 text-sm font-medium text-[#202020]"
              >
                Organization Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Acme Inc."
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                    organization ? "text-[#202020]" : "text-gray-400"
                  }`}
                />
                <Building
                  className={`absolute right-3 top-2.5 ${
                    organization ? "text-purple-600" : "text-gray-400"
                  }`}
                  size={20}
                />
              </div>
            </div>

            {/* Role Field */}
            <div>
              <label
                htmlFor="role"
                className="block mb-1 text-sm font-medium text-[#202020]"
              >
                What is your role?
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-[#202020] appearance-none bg-white"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="" disabled>
                  Select role
                </option>
                <option value="CEO">CEO</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Product Marketing Manager">Product Marketing Manager</option>
                <option value="Customer Support">Customer Support</option>
              </select>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`w-full py-2 font-semibold rounded-lg transition ${
                isFormValid && !isLoading
                  ? "bg-[#823BE3] text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isLoading ? "Saving..." : "Next →"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center mt-4 text-[#202020]">
            Need help?{" "}
            <Link href="/support" className="text-purple-600 hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
