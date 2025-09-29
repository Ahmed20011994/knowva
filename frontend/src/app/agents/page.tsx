"use client";
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, MessageCircle, X, Copy, ChevronDown, Trash2 } from 'lucide-react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/libs/auth";

interface Agent {
  id: string;
  name: string;
  description: string;
  identifier: string;
  icon: string;
  integration: string;
  llm: string;
  custom_knowledge: string;
  exposure: boolean;
  greeting: string;
  prompt: string;
  created_at?: string;
  updated_at?: string;
}

interface Conversation {
  id: string;
  agent: string;
  dateTime: string;
  user: string;
  status?: string;
  message_count?: number;
}

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  const API_URL = "http://134.33.240.184:8000";
  const USER_ID = user?.id || "user-123"; // This should come from your auth context/state

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    identifier: '',
    icon: '🎯',
    integration: 'ZenDesk',
    llm: 'Claude-3-5-Sonnet',
    custom_knowledge: '',
    exposure: true,
    greeting: 'How can I help?',
    prompt: ''
  });

  const [integrationDropdownOpen, setIntegrationDropdownOpen] = useState(false);
  const integrations = ['ZenDesk', 'Jira', 'Confluence', 'Notion', 'Slack'];

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
    fetchConversations();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${USER_ID}/agents`);
      if (response.ok) {
        const agentsData = await response.json();
        setAgents(agentsData);
      } else {
        console.error("Failed to fetch agents:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`${API_URL}/users/${USER_ID}/agent-conversations`);
      if (response.ok) {
        const conversationsData = await response.json();
        setConversations(conversationsData);
      } else {
        console.error("Failed to fetch conversations:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      identifier: '',
      icon: '🎯',
      integration: 'ZenDesk',
      llm: 'Claude-3-5-Sonnet',
      custom_knowledge: '',
      exposure: true,
      greeting: 'How can I help?',
      prompt: ''
    });
    setIsModalOpen(true);
  };

  const handleViewAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description,
        identifier: agent.identifier,
        icon: agent.icon,
        integration: agent.integration,
        llm: agent.llm,
        custom_knowledge: agent.custom_knowledge,
        exposure: agent.exposure,
        greeting: agent.greeting,
        prompt: agent.prompt
      });
      setIsModalOpen(true);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this agent? This action cannot be undone.');
    if (confirmDelete) {
      try {
        const response = await fetch(`${API_URL}/agents/${agentId}?user_id=${USER_ID}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove agent from local state
          setAgents(agents.filter(a => a.id !== agentId));
        } else {
          console.error("Failed to delete agent:", response.statusText);
          alert("Failed to delete agent. Please try again.");
        }
      } catch (error) {
        console.error("Error deleting agent:", error);
        alert("Error deleting agent. Please try again.");
      }
    }
  };

  const handleSaveAgent = async () => {
    try {
      if (editingAgent) {
        // Update existing agent
        const response = await fetch(`${API_URL}/agents/${editingAgent.id}?user_id=${USER_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            integration: formData.integration,
            llm: formData.llm,
            custom_knowledge: formData.custom_knowledge,
            exposure: formData.exposure,
            greeting: formData.greeting,
            prompt: formData.prompt
          })
        });

        if (response.ok) {
          const updatedAgent = await response.json();
          setAgents(agents.map(agent =>
            agent.id === editingAgent.id ? updatedAgent : agent
          ));
        } else {
          throw new Error("Failed to update agent");
        }
      } else {
        // Create new agent
        const response = await fetch(`${API_URL}/agents?user_id=${USER_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            integration: formData.integration,
            llm: formData.llm,
            custom_knowledge: formData.custom_knowledge,
            exposure: formData.exposure,
            greeting: formData.greeting,
            prompt: formData.prompt
          })
        });

        if (response.ok) {
          const newAgent = await response.json();
          setAgents([newAgent, ...agents]);
        } else {
          throw new Error("Failed to create agent");
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Failed to save agent. Please try again.");
    }
  };

  const handleStartConversation = (agentId: string) => {
    router.push(`/agents/talk?agent_id=${agentId}`);
  };

  const handleViewTranscript = (conversationId: string) => {
    router.push(`/agents/talk?conversation_id=${conversationId}`);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(formData.identifier);
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Agents</h1>
              <p className="text-gray-600 max-w-3xl">
                Use prebuilt AI agents to speed up your workflows. Each agent is designed for specific tasks, helping you start focused conversations and get quick, actionable results without setting everything up from scratch.
              </p>
            </div>
            <button
              onClick={handleCreateAgent}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              <Plus size={18} />
              Create New Agent
            </button>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                    {agent.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Agent"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => handleViewAgent(agent.id)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      View Agent
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs text-gray-500">🔗</span>
                  <span className="text-xs text-gray-500 font-mono truncate">{agent.identifier}</span>
                </div>

                <button
                  onClick={() => handleStartConversation(agent.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <MessageCircle size={18} />
                  Start Conversation
                </button>

              </div>
            ))}
          </div>

          {/* Divider */}
          <div
            className="h-px w-full my-10"
            style={{
              background: 'linear-gradient(90deg, #FBFBFB 0%, #823BE3 50%, #FBFBFB 100%)'
            }}
          />

          {/* Conversations Section */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h2>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-purple-50 border-b border-gray-200">
                <div className="col-span-3 text-sm font-medium text-gray-700">Agent</div>
                <div className="col-span-3 text-sm font-medium text-gray-700">Date & Time</div>
                <div className="col-span-4 text-sm font-medium text-gray-700">User</div>
                <div className="col-span-2 text-sm font-medium text-gray-700 text-right">Actions</div>
              </div>

              <div className="divide-y divide-gray-200">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-3">
                      <span className="text-gray-900">{conversation.agent}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-gray-600">{conversation.dateTime}</span>
                    </div>
                    <div className="col-span-4">
                      <span className="text-purple-600">{conversation.user}</span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Link
                        href={`/agents/talk?conversation_id=${conversation.id}`}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Transcript
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Modal - Slide in from right */}
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              style={{
                background: 'rgba(0, 0, 0, 0.30)',
                backdropFilter: 'blur(2px)'
              }}
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Panel */}
            <div className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto transform transition-transform duration-300 ${isModalOpen ? 'translate-x-0' : 'translate-x-full'
              }`}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAgent ? editingAgent.name : 'Create New Agent'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Identity Section */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <span className="text-purple-600">👤</span>
                    Identity
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Support Agent"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Automatically prioritizes support tickets and highlights the most urgent issues for faster resolution."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.identifier}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-[#202020] text-sm font-mono"
                        />
                        <button
                          onClick={handleCopyKey}
                          className="p-2 text-gray-600 hover:text-gray-800"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Knowledge Section */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <span className="text-purple-600">📚</span>
                    Knowledge
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Integrations</label>
                      <p className="text-xs text-gray-500 mb-2">Your agent will only access relevant information from these integrations</p>
                      <div className="relative">
                        <button
                          onClick={() => setIntegrationDropdownOpen(!integrationDropdownOpen)}
                          className="w-full text-gray-500 px-3 py-2 text-left border border-gray-300 rounded-lg flex justify-between items-center hover:bg-gray-50"
                        >
                          <span>{formData.integration}</span>
                          <ChevronDown size={16} className={`transform transition-transform ${integrationDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {integrationDropdownOpen && (
                          <div className="absolute text-gray-500 top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                            {integrations.map(integration => (
                              <button
                                key={integration}
                                onClick={() => {
                                  setFormData({ ...formData, integration });
                                  setIntegrationDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                              >
                                {integration}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agent LLM</label>
                      <p className="text-xs text-gray-500 mb-2">Large language model that will power your agent's intelligence.</p>
                      <input
                        type="text"
                        value={formData.llm}
                        onChange={(e) => setFormData({ ...formData, llm: e.target.value })}
                        className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-[#202020]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Custom Knowledge Input</label>
                      <p className="text-xs text-gray-500 mb-2">Input your text-based knowledge here</p>
                      <textarea
                        value={formData.custom_knowledge}
                        onChange={(e) => setFormData({ ...formData, custom_knowledge: e.target.value })}
                        placeholder="i.e feature x is in beta and only has limited number of interactions, any feedback related can be stored for review."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exposure</label>
                      <p className="text-xs text-gray-500 mb-2">Force the agent to only reply using the content from the knowledge base.</p>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.exposure}
                          onChange={(e) => setFormData({ ...formData, exposure: e.target.checked })}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Yes, only provide answers from knowledge base.</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Behavior Section */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <span className="text-purple-600">🤖</span>
                    Behavior
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agent Greeting</label>
                      <p className="text-xs text-gray-500 mb-2">Your agent will say this message to start every conversation</p>
                      <input
                        type="text"
                        value={formData.greeting}
                        onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                        placeholder="How can I help?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agent Prompt</label>
                      <p className="text-xs text-gray-500 mb-2">Give instructions to your AI about how it should behave and interact with others</p>
                      <textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                        placeholder="Identify tickets and issues related to support through the enabled integrations. Provide solutions and suggestions resolve customer pain points. Keep a friendly and helpful tone."
                        rows={4}
                        className="w-full text-gray-500 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveAgent}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  💾 Save Information
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
