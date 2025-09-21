"use client";
import React, { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Users, Check, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from '@/libs/auth';
import { apiService, Team, TeamCreateRequest } from '@/libs/api';

type Integration = {
  id: string;
  name: string;
  selected: boolean;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTeamsLoading, setIsTeamsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { token } = useAuth();
  
  // Available integrations list
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "jira", name: "Jira", selected: false },
    { id: "confluence", name: "Confluence", selected: false },
    { id: "zendesk", name: "Zendesk", selected: false },
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      if (!token) return;
      
      try {
        setIsTeamsLoading(true);
        const teamsData = await apiService.getTeams(token);
        setTeams(teamsData);
      } catch (error) {
        console.error('Failed to load teams:', error);
      } finally {
        setIsTeamsLoading(false);
      }
    };

    loadTeams();
  }, [token]);

  // Integration icons mapping
  const getIntegrationIcon = (integration: string) => {
    const icons: { [key: string]: string } = {
      zendesk: "🎫",
      jira: "🎯",
      confluence: "📘",
      slack: "💬",
      github: "🐙",
    };
    return icons[integration.toLowerCase()] || "📦";
  };

  // Open modal for new team
  const handleCreateTeam = () => {
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
    if (!currentName.trim() || isLoading || !token) return;

    const selectedIntegrations = integrations
      .filter(int => int.selected)
      .map(int => int.id);

    setIsLoading(true);
    setError("");

    try {
      if (editingTeam) {
        // Edit team
        const updatedTeam = await apiService.updateTeam(editingTeam.id, {
          name: currentName.trim(),
          integrations: selectedIntegrations
        }, token);
        
        setTeams((prev) =>
          prev.map((team) =>
            team.id === editingTeam.id ? updatedTeam : team
          )
        );
      } else {
        // Add new team
        const newTeam = await apiService.createTeam({
          name: currentName.trim(),
          integrations: selectedIntegrations
        }, token);
        
        setTeams((prev) => [...prev, newTeam]);
      }

      setIsModalOpen(false);
      setCurrentName("");
      setEditingTeam(null);
      setIntegrations(integrations.map(int => ({ ...int, selected: false })));
    } catch (err) {
      console.error('Error saving team:', err);
      let errorMessage = "Failed to save team";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      } else if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      }
      
      setError(errorMessage);
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
        selected: team.integrations.includes(int.id)
      }))
    );
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  // Delete team
  const handleDelete = async (team: Team) => {
    if (!token) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete the "${team.name}" team?`);
    if (!confirmDelete) return;
    
    try {
      await apiService.deleteTeam(team.id, token);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team. Please try again.');
    }
    setOpenMenuId(null);
  };

  const handleAction = (action: string, team: Team) => {
    if (action === "Edit") {
      handleEdit(team);
    } else if (action === "Delete") {
      handleDelete(team);
    }
    setOpenMenuId(null);
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-8 md:p-12">
        {/* Page Header */}
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Your Teams
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Create teams to manage roles and control access within your
                organization. Limit integrations so each member only sees what's
                relevant to them.
              </p>
            </div>
            <button
              onClick={handleCreateTeam}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              <Plus size={18} />
              Create
            </button>
          </div>

          {/* Teams Table */}
          <div className="bg-white rounded-lg border border-gray-200 ">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-purple-50 border-b border-gray-200">
              <div className="col-span-3 text-sm font-medium text-gray-700">
                Team
              </div>
              <div className="col-span-8 text-sm font-medium text-gray-700">
                Integrations
              </div>
              <div className="col-span-1 text-sm font-medium text-gray-700 text-right">
                Actions
              </div>
            </div>

            {/* Table Body */}
            {isTeamsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors relative"
                  >
                    {/* Team Info */}
                    <div className="col-span-3">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {team.name}
                      </h3>
                      <p className="text-sm text-gray-500">{team.members_count} Members</p>
                    </div>

                    {/* Integrations */}
                    <div className="col-span-8">
                      <div className="flex flex-wrap gap-3">
                        {team.integrations.map((integration) => (
                          <div
                            key={integration}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <span className="text-sm">
                              {getIntegrationIcon(integration)}
                            </span>
                            <span className="text-sm text-gray-700 capitalize">
                              {integration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end relative" ref={menuRef}>
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === team.id ? null : team.id)
                        }
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {/* Dropdown */}
                      {openMenuId === team.id && (
                        <div className="absolute right-0 mt-10 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <button
                            onClick={() => handleAction("Edit", team)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAction("Delete", team)}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isTeamsLoading && teams.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No teams yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first team to get started
                </p>
                <button
                  onClick={handleCreateTeam}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Plus size={18} />
                  Create Team
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Team Modal */}
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
                disabled={!currentName.trim() || isLoading}
                className={`
                  px-6 py-2 rounded-lg font-medium flex items-center gap-2
                  ${currentName.trim() && !isLoading
                    ? 'bg-[#823BE3] text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <Plus size={18} />
                {isLoading ? "Saving..." : editingTeam ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
