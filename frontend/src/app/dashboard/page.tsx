"use client";
import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRight, Zap, Plus, Check, X, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TeamCard from '@/components/TeamCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/libs/auth';
import { apiService, Team, TeamCreateRequest } from '@/libs/api';
import { useAllowedIntegrations } from '@/hooks/useAllowedIntegrations';
import { useChatContext } from '@/context/ChatContext';

import { ChatMessage, ChatSession } from '@/types/chat';

type Integration = {
  id: string;
  name: string;
  selected: boolean;
};

export default function Dashboard() {
  // Chat state
  const [prompt, setPrompt] = useState("");
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const { addSession } = useChatContext();
  
  // Handle sending message from dashboard
  const handleSendMessage = async () => {
    if (!prompt.trim() || isMessageLoading || !USER_ID) return;
    setIsMessageLoading(true);

    try {
      // Create a new chat session
      const newSession: ChatSession = {
        id: Date.now(),
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        messages: []
      };

      // Make the API call to start conversation
      const response = await fetch(`${API_URL}/conversations/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: prompt,
          user_id: USER_ID
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      // Update the session with conversation ID and messages
      newSession.conversationId = data.conversation_id;
      newSession.messages = [
        {
          id: Date.now(),
          type: "user",
          content: prompt
        },
        {
          id: Date.now() + 1,
          type: "ai",
          content: data.response || "No response from AI.",
          followUps: data.followUps || [],
        }
      ];

      // Add the session to global state
      addSession(newSession);

      // Clear the prompt and redirect to AI chat
      setPrompt("");
      router.push('/ai-chat');

    } catch (error) {
      console.error("Error starting conversation:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsMessageLoading(false);
    }
  };

  // Team management state
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTeamsLoading, setIsTeamsLoading] = useState(true);
  
  const { token, user } = useAuth();
  const router = useRouter();
  
  // Available integrations list - loaded from API
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const { integrations: allowedIntegrations, loading: integrationsLoading } = useAllowedIntegrations();

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

  // Update integrations when allowed integrations change
  useEffect(() => {
    if (allowedIntegrations.length > 0) {
      const integrationsData = allowedIntegrations.map((integration: string) => ({
        id: integration.toLowerCase(),
        name: integration,
        selected: false
      }));
      
      setIntegrations(integrationsData);
    }
  }, [allowedIntegrations]);

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
  const handleEdit = (team: { id: string; name: string; integrations: string[] }) => {
    const fullTeam = teams.find(t => t.id === team.id);
    if (!fullTeam) return;
    
    setEditingTeam(fullTeam);
    setCurrentName(team.name);
    setIntegrations(
      integrations.map(int => ({
        ...int,
        selected: team.integrations.includes(int.id)
      }))
    );
    setIsModalOpen(true);
  };

  // Delete team
  const handleDelete = async (id: string) => {
    if (!token) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this team?');
    if (!confirmDelete) return;
    
    try {
      await apiService.deleteTeam(id, token);
      setTeams((prev) => prev.filter((team) => team.id !== id));
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team. Please try again.');
    }
  };



  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: any) => {
    switch (suggestion.action) {
      case 'navigate':
        router.push(suggestion.data.path);
        break;
      case 'create-team':
        handleAddNew();
        break;

      case 'team-updates':
      case 'team-progress':
        // Navigate to teams page with focus on specific team
        router.push('/teams');
        break;
      case 'jira-review':
      case 'confluence-update':
        // Navigate to AI chat with pre-filled query
        const query = suggestion.action === 'jira-review' 
          ? 'Show me my recent Jira tickets and their status'
          : 'Help me update my Confluence documentation';
        router.push(`/ai-chat?q=${encodeURIComponent(query)}`);
        break;
      case 'admin-review':
        router.push('/users');
        break;
      default:
        console.log('Suggestion clicked:', suggestion);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
      <main className="flex-1 p-8 md:p-12 space-y-12">
        {/* Welcome Section */}
        <section className="text-center max-w-4xl mx-auto">
          {/* Combined Heading and Logo */}
              <div className="flex items-center justify-center mb-4">
                {" "}
                {/* Added flex, items-center, justify-center for horizontal alignment and vertical centering */}
                <h2 className="text-4xl font-bold text-[#202020]">Meet</h2>
                {/* Logo Image */}
                <img
                  src="https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/4be4d70d-b665-8547-1b92-c162f1a99aa2.png"
                  alt="Knowva Logo"
                  className="w-[120px] aspect-[89/20] ml-2" // Added ml-2 for spacing
                />
              </div>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
            Say hello to your connected brain. Knowva helps you search, explore, and understand everything across your tools — all from one place.
          </p>
        </section>

        {/* Input Field Section */}
        <section className="relative max-w-3xl mx-auto">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }} className="relative p-4 rounded-xl border border-purple-300 bg-white shadow-md focus-within:ring-2 focus-within:ring-purple-500 transition-all duration-200">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What is the update on Project X?"
              rows={4}
              className="w-full text-lg text-gray-800 placeholder-gray-400 bg-white focus:outline-none resize-none pb-12"
            ></textarea>

            <div className="absolute bottom-4 right-4">
              {/* Send Button */}
              <button 
                type="submit"
                disabled={isMessageLoading || !prompt.trim()}
                className={`flex-shrink-0 p-3 rounded-full transition-colors ${
                  prompt.trim() && !isMessageLoading
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isMessageLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowRight size={24} />
                )}
              </button>
            </div>
          </form>
        </section>
        
        {/* Your Teams Section */}
        <section className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Your Teams
            </h2>
            <button 
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 font-medium rounded-lg border border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create
            </button>
          </div>
          
          {isTeamsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {teams.map((team) => (
                <TeamCard 
                  key={team.id}
                  id={team.id}
                  name={team.name} 
                  users={team.members_count} 
                  integrations={team.integrations}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
    
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
    </ProtectedRoute>
  );
}