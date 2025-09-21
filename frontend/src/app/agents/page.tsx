"use client";
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, MessageCircle, X, Copy, ChevronDown, Trash2 } from 'lucide-react';
import { useRouter } from "next/navigation";
import Link from "next/link";
interface Agent {
  id: number;
  name: string;
  description: string;
  identifier: string;
  icon: string;
  integration: string;
  llm: string;
  customKnowledge: string;
  exposure: boolean;
  greeting: string;
  prompt: string;
}

interface Conversation {
  id: number;
  agent: string;
  dateTime: string;
  user: string;
}

export default function AgentPage() {
  const [agents, setAgents] = useState([
    {
      id: 1,
      name: 'Support Agent',
      description: 'Automatically prioritizes support tickets and highlights the most urgent issues for faster resolution.',
      identifier: 'support-agent-afsr1251fqt32t32r12431rf12yt65uh5',
      icon: '🎯',
      integration: 'ZenDesk',
      llm: 'Claude-3-5-Sonnet',
      customKnowledge: 'i.e feature x is in beta and only has limited number of interactions, any feedback related can be stored for review.',
      exposure: true,
      greeting: 'How can I help?',
      prompt: 'Identify tickets and issues related to support through the enabled integrations. Provide solutions and suggestions resolve customer pain points. Keep a friendly and helpful tone.'
    },
    {
      id: 2,
      name: 'GTM Strategy Agent',
      description: 'Automatically prioritizes support tickets and highlights the most urgent issues for faster resolution.',
      identifier: 'gtm-strategy-agent-afsr1251fqt32t32r12431rf12yt65uh5',
      icon: '🎯',
      integration: 'ZenDesk',
      llm: 'Claude-3-5-Sonnet',
      customKnowledge: 'Marketing strategies and campaign data.',
      exposure: true,
      greeting: 'How can I help?',
      prompt: 'Focus on go-to-market strategies and provide insights.'
    }
  ]);

  const [conversations] = useState<Conversation[]>([
    {
      id: 1,
      agent: 'Support Agent',
      dateTime: '20 Sep, 25 at 04:30',
      user: 'Johndoe@gmail.com'
    },
    {
      id: 2,
      agent: 'Support Agent',
      dateTime: '21 Sep, 25 at 09:15',
      user: 'janesmith@email.com'
    },
    {
      id: 3,
      agent: 'Support Agent',
      dateTime: '22 Sep, 25 at 11:00',
      user: 'alexbrown@techmail.com'
    },
    {
      id: 4,
      agent: 'Support Agent',
      dateTime: '23 Sep, 25 at 15:45',
      user: 'maryjohnson@service.com'
    },
    {
      id: 5,
      agent: 'Support Agent',
      dateTime: '24 Sep, 25 at 12:30',
      user: 'davidlee@designhub.com'
    }
  ]);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    identifier: '',
    icon: '🎯',
    integration: 'ZenDesk',
    llm: 'Claude-3-5-Sonnet',
    customKnowledge: '',
    exposure: true,
    greeting: 'How can I help?',
    prompt: ''
  });

  const [integrationDropdownOpen, setIntegrationDropdownOpen] = useState(false);
  const integrations = ['ZenDesk', 'Jira', 'Confluence', 'Notion', 'Slack'];

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      identifier: '',
      icon: '🎯',
      integration: 'ZenDesk',
      llm: 'Claude-3-5-Sonnet',
      customKnowledge: '',
      exposure: true,
      greeting: 'How can I help?',
      prompt: ''
    });
    setIsModalOpen(true);
  };

  const handleViewAgent = (agentId: number) => {
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
        customKnowledge: agent.customKnowledge,
        exposure: agent.exposure,
        greeting: agent.greeting,
        prompt: agent.prompt
      });
      setIsModalOpen(true);
    }
  };

  const handleDeleteAgent = (agentId: number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this agent? This action cannot be undone.');
    if (confirmDelete) {
      setAgents(agents.filter(a => a.id !== agentId));
    }
  };

  const handleSaveAgent = () => {
    if (editingAgent) {
      // Update existing agent
      setAgents(agents.map(agent =>
        agent.id === editingAgent.id
          ? { ...agent, ...formData }
          : agent
      ));
    } else {
      // Create new agent
      const newAgent = {
        id: Date.now(),
        ...formData,
        identifier: `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
      };
      setAgents([...agents, newAgent]);
    }
    setIsModalOpen(false);
  };

  const handleStartConversation = (agentId: number) => {
    console.log('Start conversation with agent:', agentId);
  };

  const handleViewTranscript = (conversationId: number) => {
    console.log('View transcript:', conversationId);
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
                  onClick={() => router.push("/agents/talk")}
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
                        href={`/agents/talk?id=${conversation.id}`}
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
                        value={formData.customKnowledge}
                        onChange={(e) => setFormData({ ...formData, customKnowledge: e.target.value })}
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