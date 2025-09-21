"use client";
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, MessageCircle, Eye } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  description: string;
  identifier: string;
  icon: string;
}

interface Conversation {
  id: number;
  agent: string;
  dateTime: string;
  user: string;
}

export default function AgentPage() {
  const [agents] = useState([
    {
      id: 1,
      name: 'Support Agent',
      description: 'Automatically prioritizes support tickets and highlights the most urgent issues for faster resolution.',
      identifier: 'support-agent-afsr1251fqt32t32r12431rf12yt65uh5',
      icon: '🎯'
    },
    {
      id: 2,
      name: 'GTM Strategy Agent',
      description: 'Automatically prioritizes support tickets and highlights the most urgent issues for faster resolution.',
      identifier: 'gtm-strategy-agent-afsr1251fqt32t32r12431rf12yt65uh5',
      icon: '🎯'
    }
  ]);

  const [conversations] = useState([
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

  const handleCreateAgent = () => {
    console.log('Navigate to create agent page');
    // Add navigation logic here
  };

  const handleStartConversation = (agentId: number) => {
    console.log('Start conversation with agent:', agentId);
    // Add conversation start logic here
  };

  const handleViewAgent = (agentId: number) => {
    console.log('View agent details:', agentId);
    // Add view agent logic here
  };

  const handleViewTranscript = (conversationId: number) => {
    console.log('View transcript:', conversationId);
    // Add view transcript logic here
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
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                    {agent.icon}
                  </div>
                  <button
                    onClick={() => handleViewAgent(agent.id)}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    View Agent
                  </button>
                </div>

                {/* Agent Info */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
                
                {/* Agent Identifier */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs text-gray-500">🔗</span>
                  <span className="text-xs text-gray-500 font-mono truncate">{agent.identifier}</span>
                </div>

                {/* Start Conversation Button */}
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
            
            {/* Conversations Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-purple-50 border-b border-gray-200">
                <div className="col-span-3 text-sm font-medium text-gray-700">Agent</div>
                <div className="col-span-3 text-sm font-medium text-gray-700">Date & Time</div>
                <div className="col-span-4 text-sm font-medium text-gray-700">User</div>
                <div className="col-span-2 text-sm font-medium text-gray-700 text-right">Actions</div>
              </div>

              {/* Table Body */}
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
                      <button
                        onClick={() => handleViewTranscript(conversation.id)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Transcript
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {conversations.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-500">Start a conversation with an agent to see it here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}