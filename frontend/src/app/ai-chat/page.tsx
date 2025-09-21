"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Zap,
  ChevronDown,
  ArrowRight,
  Plus,
  X,
  Edit3,
  Share2,
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useAllowedIntegrations } from "@/hooks/useAllowedIntegrations";

// Types
interface ChatMessage {
  id: number;
  type: "user" | "ai";
  content: string;
  sources?: number;
  followUps?: string[];
  isThinking?: boolean;
}
interface ChatSession {
  id: number;
  title: string;
  messages: ChatMessage[];
  conversationId?: string;
}

interface CustomerSupportData {
  executive_summary: string[];
  kpis: {
    total_tickets: number;
    by_status: {
      open: number;
      pending: number;
    };
  };
  themes: Array<{
    theme: string;
    count: number;
    sample_ticket_ids: number[];
  }>;
  bottlenecks: Array<{
    issue: string;
    evidence: string;
    affected_ticket_ids: number[];
  }>;
  recommendations: Array<{
    action: string;
    owner: string;
    eta_days: number;
    impact: string;
    effort: string;
  }>;
}

// ChatInput
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}> = ({ onSendMessage, isLoading, placeholder = "How can I help?" }) => {
  const [isIntegrationsDropdownOpen, setIsIntegrationsDropdownOpen] =
    useState(false);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");

  const { integrations: integrationsList, loading: integrationsLoading } = useAllowedIntegrations();

  // Set initial selected integrations when they load
  useEffect(() => {
    if (integrationsList.length > 0 && selectedIntegrations.length === 0) {
      setSelectedIntegrations([integrationsList[0]]);
    }
  }, [integrationsList, selectedIntegrations.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSendMessage(prompt);
      setPrompt("");
      setIsIntegrationsDropdownOpen(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
      <div className="relative rounded-lg border border-gray-300 bg-white">
        <textarea
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-3 pr-32 text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none resize-none"
          rows={1}
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

// Sidebar
const ChatSidebar: React.FC<{
  sessions: ChatSession[];
  activeSessionId: number;
  onSessionSelect: (id: number) => void;
  onNewChat: () => void;
}> = ({ sessions, activeSessionId, onSessionSelect, onNewChat }) => (
  <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
    <div className="flex-1 overflow-y-auto p-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Chats
      </h3>
      <div className="space-y-1">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionSelect(session.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              activeSessionId === session.id
                ? "bg-purple-100 text-purple-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {session.title}
          </button>
        ))}
      </div>
      <button
        onClick={onNewChat}
        className="w-full mt-3 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg text-sm font-medium flex items-center gap-2"
      >
        <Plus size={16} /> New Chat
      </button>
    </div>
  </aside>
);

// Customer Support Insights
const CustomerSupportInsights: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  hasMessages: boolean;
  data: CustomerSupportData | null;
  loading: boolean;
}> = ({ isOpen, onClose, hasMessages, data, loading }) => {
  if (!hasMessages) return null;

  return (
    <aside
      className={`w-96 bg-purple-50 border-l border-purple-200 p-6 flex-shrink-0 h-full overflow-y-auto ${
        isOpen ? "block" : "hidden lg:block"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <Zap size={18} className="text-purple-600" />
          Support Insights
        </h3>
        <button onClick={onClose} className="lg:hidden text-purple-600">
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <div className="text-purple-700 font-medium mb-2">
              Analyzing Support Data
            </div>
            <div className="flex space-x-1 justify-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <div className="text-xs text-purple-500 mt-2 animate-pulse">
              Processing tickets & insights...
            </div>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4 text-sm">
          {/* KPIs */}
          <div className="p-3 bg-white rounded-lg border border-purple-100">
            <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-1">
              <TrendingUp size={14} />
              Key Metrics
            </h4>
            <div className="space-y-1 text-gray-700">
              <div>
                Total Tickets:{" "}
                <span className="font-medium">{data.kpis.total_tickets}</span>
              </div>
              <div>
                Open:{" "}
                <span className="font-medium text-red-600">
                  {data.kpis.by_status.open}
                </span>
              </div>
              <div>
                Pending:{" "}
                <span className="font-medium text-yellow-600">
                  {data.kpis.by_status.pending}
                </span>
              </div>
            </div>
          </div>

          {/* Top Issues */}
          {data.themes.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <h4 className="font-medium text-purple-900 mb-2">Top Issues</h4>
              <div className="space-y-2">
                {data.themes.slice(0, 3).map((theme, index) => (
                  <div key={index} className="text-gray-700">
                    <div className="font-medium">{theme.theme}</div>
                    <div className="text-xs text-gray-500">
                      {theme.count} tickets
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      IDs: {theme.sample_ticket_ids.slice(0, 3).join(", ")}
                      {theme.sample_ticket_ids.length > 3 && "..."}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Bottlenecks */}
          {data.bottlenecks.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-red-100 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} />
                Critical Issues
              </h4>
              <div className="space-y-2">
                {data.bottlenecks.slice(0, 2).map((bottleneck, index) => (
                  <div key={index} className="text-red-800 text-xs">
                    <div className="font-medium">{bottleneck.issue}</div>
                    <div className="text-red-600 mt-1">
                      {bottleneck.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-green-100 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">
                Priority Actions
              </h4>
              <div className="space-y-2">
                {data.recommendations
                  .filter(
                    (rec) => rec.impact === "high" || rec.impact === "medium"
                  )
                  .slice(0, 2)
                  .map((rec, index) => (
                    <div key={index} className="text-green-800 text-xs">
                      <div className="font-medium">{rec.action}</div>
                      <div className="text-green-600 mt-1">
                        {rec.owner} • {rec.eta_days} days • {rec.impact} impact
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {data.executive_summary.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <h4 className="font-medium text-purple-900 mb-2">Summary</h4>
              <div className="space-y-1">
                {data.executive_summary.slice(0, 2).map((summary, index) => (
                  <div key={index} className="text-gray-700 text-xs">
                    • {summary}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No support data available</p>
        </div>
      )}
    </aside>
  );
};

// Main Page Component
function AIChatbotPageContent() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: 1, title: "What are the recent support tickets?", messages: [] },
    { id: 2, title: "Update on Project X", messages: [] },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const searchParams = useSearchParams();
  const [customerSupportData, setCustomerSupportData] =
    useState<CustomerSupportData | null>(null);
  const [isLoadingSupportData, setIsLoadingSupportData] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const hasMessages = !!(activeSession && activeSession.messages.length > 0);

  const suggestions = [
    "What are the recent support tickets?",
    "Generate a roadmap",
  ];

  const API_URL = "http://135.222.251.229:8000";

  // Fetch customer support data
  useEffect(() => {
    const fetchCustomerSupportData = async () => {
      setIsLoadingSupportData(true);
      try {
        const response = await fetch(`${API_URL}/customer-support-agent`);
        if (response.ok) {
          const data = await response.json();
          setCustomerSupportData(data);
        } else {
          console.error(
            "Failed to fetch customer support data:",
            response.statusText
          );
        }
      } catch (error) {
        console.error("Error fetching customer support data:", error);
      } finally {
        setIsLoadingSupportData(false);
      }
    };

    fetchCustomerSupportData();
  }, []);

  const handleSendMessage = async (msg: string) => {
    if (!activeSession) return;
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      type: "user",
      content: msg,
    };

    // Add thinking message immediately after user message
    const thinkingMessage: ChatMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "",
      isThinking: true,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMessage, thinkingMessage] }
          : s
      )
    );

    try {
      // Prepare request body based on whether this is first message or subsequent
      const requestBody: {
        query: string;
        conversation_id?: string;
        user_id: string;
      } = { query: msg, user_id: "user-123" };

      // If session has conversationId, include it (for subsequent messages)
      if (activeSession.conversationId) {
        requestBody.conversation_id = activeSession.conversationId;
      }

      const res = await fetch(`${API_URL}/conversations/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      // If this was the first message, store the conversation_id
      if (!activeSession.conversationId && data.conversation_id) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, conversationId: data.conversation_id }
              : s
          )
        );
      }

      // Replace thinking message with AI response
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.response || "No response from AI.",
        followUps: data.followUps || [],
        isThinking: false,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((msg) =>
                  msg.isThinking ? aiMessage : msg
                ),
              }
            : s
        )
      );
    } catch (err) {
      console.error("Error calling conversations/query endpoint:", err);

      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: "⚠️ Error: Could not reach the AI service.",
        isThinking: false,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((msg) =>
                  msg.isThinking ? errorMessage : msg
                ),
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pre-filled query from dashboard
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      // Auto-send the query when page loads with a query parameter
      setTimeout(() => {
        handleSendMessage(query);
      }, 500); // Small delay to ensure component is ready
    }
  }, [searchParams, handleSendMessage]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)] bg-white">
        {/* Sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onNewChat={() =>
            setSessions([
              { id: Date.now(), title: "New Chat", messages: [] },
              ...sessions,
            ])
          }
        />

        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          {!hasMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
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
              <p className="text-[#202020] text-center max-w-2xl mb-8">
                Say hello to your connected brain. Search, explore, and
                understand everything across your tools — all from one place.
              </p>
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
              <div className="w-full max-w-3xl mt-8">
                <p className="text-sm text-gray-500 mb-4">
                  Suggestions to get started
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(s)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-purple-600 mb-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {activeSession?.messages.map((msg) =>
                  msg.type === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-2xl">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id}>
                      <div className="bg-white rounded-lg border p-4 mb-2">
                        {msg.isThinking ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <span className="text-gray-500 text-sm">
                              Thinking...
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {msg.content.split("\n").map((line, index) => (
                                <div key={index} className="mb-2 last:mb-0">
                                  {line.trim() === "" ? <br /> : line}
                                </div>
                              ))}
                            </div>
                            {msg.sources && msg.sources > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                  Sources: {msg.sources} reference
                                  {msg.sources !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.followUps && !msg.isThinking && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 font-medium">
                            Follow up questions:
                          </p>
                          {msg.followUps.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(q)}
                              className="block w-full text-left px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg text-sm border border-purple-200 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
              <div className="border-t border-gray-200 p-4">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  placeholder="Ask a follow up..."
                />
              </div>
            </>
          )}
        </main>

        {/* Customer Support Insights Sidebar */}
        <CustomerSupportInsights
          isOpen={isInsightsOpen}
          onClose={() => setIsInsightsOpen(false)}
          hasMessages={hasMessages}
          data={customerSupportData}
          loading={isLoadingSupportData}
        />
      </div>
    </DashboardLayout>
  );
}

// Wrapper with Suspense boundary
export default function AIChatbotPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AIChatbotPageContent />
    </Suspense>
  );
}
