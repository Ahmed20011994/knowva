"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/libs/auth";
import {
  SiJira,
  SiConfluence,
  SiZendesk,
} from "react-icons/si";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const integrations: Integration[] = [
  {
    id: "jira",
    name: "Jira",
    description: "Connect tickets and project updates to keep work in sync.",
    icon: "📘",
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Sync specs, notes, and docs for easy access in one place.",
    icon: "📄",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Link support tickets and feedback directly to your projects.",
    icon: "🎧",
  },
];

export default function IntegrationsPage() {
  const [added, setAdded] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { token, user, isAuthenticated } = useAuth();

  const handleOpenModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setSecretKey("");
    setIsModalOpen(true);
  };

  const handleConnect = async () => {
    if (!selectedIntegration) return;
    
    if (!token || !isAuthenticated) {
      setError("Authentication token not found. Please log in again.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/integrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          integration_type: selectedIntegration.id,
          secret_key: secretKey
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add integration');
      }
      
      setAdded((prev) => [...prev, selectedIntegration.id]);
      setIsModalOpen(false);
      setSecretKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add integration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="p-4">
        <h1 className="text-xl font-bold text-purple-600">Knowva</h1>
      </header>
      <hr />

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="max-w-3xl w-full">
          <h2 className="text-2xl font-bold text-center text-[#202020]">
            Bring your knowledge together
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Select the integrations your team relies on — Knowva links your
            docs, chats, and tasks so you can find answers instantly.
          </p>

          {/* Integration grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            {integrations.map((integration) => {
              const isAdded = added.includes(integration.id);
              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="font-semibold text-[#202020]">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {integration.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => !isAdded && handleOpenModal(integration)}
                    className={`px-4 py-1 rounded-lg font-medium text-sm transition ${
                      isAdded
                        ? "bg-[#EBEBEB] text-[#999999] cursor-default"
                        : "bg-[#823BE3] text-white hover:bg-purple-700"
                    }`}
                  >
                    {isAdded ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Validation message */}
          {added.length === 0 && (
            <div className="flex justify-center mt-6">
              <p className="text-sm text-gray-600 text-center max-w-md">
                Please add at least one integration to continue. You can add more integrations later.
              </p>
            </div>
          )}

          {/* Next button */}
          <div className="flex justify-center mt-4">
            {added.length > 0 ? (
              <Link
                href="/signup/onboarding/teams"
                className="w-full bg-[#823BE3] text-white px-8 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                Next →
              </Link>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 px-8 py-2 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                title="Please add at least one integration to continue"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Secret Key Modal */}
      {isModalOpen && selectedIntegration && (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.3)] backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#202020]">
                Connect {selectedIntegration.name}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Error Message (suppress non-actionable admin notice) */}
            {error && error !== "Only admins can create integrations" && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#202020] mb-1">
                Secret Key
              </label>
              <input
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your secret key"
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-[#202020] disabled:bg-gray-100"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg border border-gray-400 text-[#202020] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-white ${
                  !isLoading
                    ? "bg-[#823BE3] hover:bg-purple-700"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {isLoading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
