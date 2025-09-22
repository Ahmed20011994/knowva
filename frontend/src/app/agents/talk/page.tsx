"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowRight, ArrowLeft, Bot, User } from "lucide-react";

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
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  servers_used?: string[];
  tools_called?: string[];
}

interface AgentConversation {
  id: string;
  agent_id: string;
  user_id: string;
  messages: ChatMessage[];
  status: string;
  created_at: string;
}

// Chat Input Component
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}> = ({ onSendMessage, isLoading, placeholder = "Type your message..." }) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSendMessage(prompt);
      setPrompt("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto">
      <div className="relative rounded-lg border border-gray-300 bg-white shadow-sm">
        <textarea
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          className="w-full px-4 py-3 pr-16 text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none resize-none min-h-[50px] max-h-32"
          rows={1}
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`p-2 rounded-md transition-colors ${
              prompt.trim() && !isLoading
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
};

// Main Component
function AgentTalkPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversation, setConversation] = useState<AgentConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = "http://135.222.251.229:8000";
  const USER_ID = "user-123"; // This should come from your auth context/state

  const agentId = searchParams.get("agent_id");
  const conversationId = searchParams.get("conversation_id");

  // Load agent and conversation data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingAgent(true);
        setError(null);

        if (conversationId) {
          // Load existing conversation
          const convResponse = await fetch(
            `${API_URL}/agent-conversations/${conversationId}`
          );
          if (convResponse.ok) {
            const convData = await convResponse.json();
            setConversation(convData);
            setMessages(convData.messages || []);

            // Load the agent for this conversation
            const agentResponse = await fetch(
              `${API_URL}/agents/${convData.agent_id}`
            );
            if (agentResponse.ok) {
              const agentData = await agentResponse.json();
              setAgent(agentData);
            }
          } else {
            setError("Conversation not found");
          }
        } else if (agentId) {
          // Load agent for new conversation
          const agentResponse = await fetch(`${API_URL}/agents/${agentId}`);
          if (agentResponse.ok) {
            const agentData = await agentResponse.json();
            setAgent(agentData);

            // Show agent's greeting as first message
            const greetingMessage: ChatMessage = {
              id: "greeting",
              role: "assistant",
              content: agentData.greeting || "Hello! How can I help you today?",
              timestamp: new Date().toISOString(),
            };
            setMessages([greetingMessage]);
          } else {
            setError("Agent not found");
          }
        } else {
          setError("No agent or conversation specified");
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoadingAgent(false);
      }
    };

    loadData();
  }, [agentId, conversationId]);

  const handleSendMessage = async (messageContent: string) => {
    if (!agent) return;

    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Add thinking indicator
    const thinkingMessage: ChatMessage = {
      id: "thinking",
      role: "assistant",
      content: "...",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const requestBody = {
        query: messageContent,
        user_id: USER_ID,
        user_email: "user@example.com", // This should come from auth
        conversation_id: conversation?.id,
      };

      const response = await fetch(`${API_URL}/agents/${agent.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Remove thinking message and add actual response
      const aiMessage: ChatMessage = {
        id: data.message.id,
        role: "assistant",
        content: data.response,
        timestamp: data.message.timestamp,
        servers_used: data.message.servers_used,
        tools_called: data.message.tools_called,
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "thinking").concat([aiMessage])
      );

      // Update conversation ID if this was the first message
      if (!conversation && data.conversation_id) {
        setConversation({
          id: data.conversation_id,
          agent_id: agent.id,
          user_id: USER_ID,
          messages: [],
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);

      // Remove thinking message and show error
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "thinking").concat([errorMessage])
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push("/agents");
  };

  if (isLoadingAgent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agent...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleGoBack}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go Back to Agents
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Agent not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)] bg-white">
        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoBack}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                  {agent.icon}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {agent.name}
                  </h1>
                  <p className="text-sm text-gray-500">{agent.description}</p>
                </div>
              </div>

              <div className="ml-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {agent.integration}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-purple-600" />
                  </div>
                )}

                <div
                  className={`max-w-2xl ${
                    message.role === "user"
                      ? "bg-purple-600 text-white rounded-lg px-4 py-3"
                      : "bg-gray-50 rounded-lg px-4 py-3"
                  }`}
                >
                  {message.content === "..." ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  ) : (
                    <div
                      className={`whitespace-pre-wrap ${
                        message.role === "user" ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  )}

                  {message.servers_used && message.servers_used.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Connected to: {message.servers_used.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder={`Message ${agent.name}...`}
            />
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

// Wrapper with Suspense boundary
export default function AgentTalkPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <AgentTalkPageContent />
    </Suspense>
  );
}
