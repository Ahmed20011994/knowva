"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/libs/auth";

type Integration = {
  id: string;
  name: string;
  selected: boolean;
};

type Team = {
  id: string;
  name: string;
  integrations: string[];
};

export default function CreateTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const { token } = useAuth();
  
  // Available integrations list - will be fetched from backend
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "jira", name: "Jira", selected: false },
    { id: "confluence", name: "Confluence", selected: false },
    { id: "zendesk", name: "Zendesk", selected: false },
  ]);

  // Load user's integrations on component mount
  useEffect(() => {
    const loadUserIntegrations = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://134.33.240.184:8000'}/auth/integrations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userIntegrations = await response.json();
          const userIntegrationTypes = userIntegrations.map((int: any) => int.integration_type);
          
          // Update integrations to show which ones user has added
          setIntegrations(prev => 
            prev.map(int => ({
              ...int,
              // Only show integrations that user has actually configured
              selected: false // Reset selection for new team creation
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load integrations:', error);
      }
    };

    if (token) {
      loadUserIntegrations();
    }
  }, [token]);

  // Open modal for new team
  const handleAddNew = () => {
    setCurrentName("");
    setEditingTeam(null);
    setIntegrations(integrations.map(int => ({ ...int, selected: false })));
    setIsModalOpen(true);
  };

  // Toggle integration selection
  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === id ? { ...int, selected: !int.selected } : int
      )
    );
  };

  // Save team (add or edit)
  const handleSave = async () => {
    if (!currentName.trim() || isLoading) return;

    const selectedIntegrations = integrations
      .filter(int => int.selected)
      .map(int => int.id); // Use id instead of name

    setIsLoading(true);
    setError("");

    try {
      if (editingTeam) {
        // Edit team - for now, just update locally since backend doesn't have update endpoint
        setTeams((prev) =>
          prev.map((team) =>
            team.id === editingTeam.id 
              ? { ...team, name: currentName, integrations: selectedIntegrations } 
              : team
          )
        );
      } else {
        // Add new team via API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://134.33.240.184:8000'}/auth/onboarding/teams`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: currentName.trim(),
            integrations: selectedIntegrations
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create team');
        }

        const newTeam = await response.json();
        setTeams((prev) => [...prev, {
          id: newTeam.id,
          name: newTeam.name,
          integrations: newTeam.integrations
        }]);
      }

      setIsModalOpen(false);
      setCurrentName("");
      setEditingTeam(null);
      setIntegrations(integrations.map(int => ({ ...int, selected: false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit team
  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setCurrentName(team.name);
    setIntegrations(
      integrations.map(int => ({
        ...int,
        selected: team.integrations.includes(int.name)
      }))
    );
    setIsModalOpen(true);
  };

  // Delete team
  const handleDelete = (id: string) => {
    // For now, just delete locally since we don't have a delete API endpoint
    setTeams((prev) => prev.filter((team) => team.id !== id));
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
            Organize your work with Teams
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Create teams to group related role base integrations. Invite teammates to specific teams to give them focused access and keep work secure.
          </p>

          {/* Teams List */}
          <div className="flex flex-col gap-4 mt-10">
            {/* Existing Teams */}
            {teams.map((team) => (
              <div
                key={team.id}
                className="w-full border rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  {/* Team Name */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#202020]">{team.name}</h3>
                    {team.integrations.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Integrations: {team.integrations.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-gray-600 hover:text-purple-600"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Team Box */}
            <div
              onClick={handleAddNew}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition"
            >
              <span className="text-3xl text-purple-600 font-bold">+</span>
              <span className="mt-2 text-sm text-[#202020] font-medium">Add New Team</span>
            </div>
          </div>

          {/* Validation message */}
          {!(teams.length > 0 && teams.some(team => team.integrations.length > 0)) && (
            <div className="flex justify-center mt-6">
              <p className="text-sm text-gray-600 text-center max-w-md">
                Please create at least one team with integrations to continue. Teams help organize your work and connect the right tools.
              </p>
            </div>
          )}

          {/* Next button */}
          <div className="flex justify-center mt-4">
            {teams.length > 0 && teams.some(team => team.integrations.length > 0) ? (
              <Link
                href="/signup/onboarding/invite"
                className="w-full bg-[#823BE3] text-white px-8 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                Next →
              </Link>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 px-8 py-2 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                title="Please create at least one team with integrations to continue"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[#202020]">
                {editingTeam ? "Edit Team" : "New Team"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#202020] mb-2">
                Name
              </label>
              <input
                type="text"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-[#202020]"
              />
              <p className="text-xs text-gray-500 mt-1">
                E.g Customer Feedback, Product Insights, Marketing.
              </p>
            </div>

            {/* Select Integrations */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#202020] mb-2">
                Select Integrations
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Users in this team will have data access from the following integrations.
              </p>
              
              {/* Integration Pills */}
              <div className="flex flex-wrap gap-2">
                {integrations.map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => toggleIntegration(integration.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      flex items-center gap-1.5
                      ${integration.selected 
                        ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {integration.selected && <Check size={14} />}
                    {!integration.selected && <Plus size={14} className="text-gray-400" />}
                    {integration.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!currentName.trim() || !integrations.some(int => int.selected) || isLoading}
                className={`
                  px-6 py-2 rounded-lg font-medium flex items-center gap-2
                  ${currentName.trim() && integrations.some(int => int.selected) && !isLoading
                    ? 'bg-[#823BE3] text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
                title={!integrations.some(int => int.selected) ? "Please select at least one integration" : ""}
              >
                <Plus size={18} />
                {isLoading ? "Saving..." : editingTeam ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}