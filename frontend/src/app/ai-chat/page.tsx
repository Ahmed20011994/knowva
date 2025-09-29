"use client";
import { useAuth } from "@/libs/auth";
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
  ToggleLeft,
  ToggleRight,
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

interface VflProjectData {
  executive_summary: string;
  key_metrics: {
    total_issues: number;
    avg_cycle_time_days: number;
    top_status: string[];
    top_types: string[];
    top_priorities: string[];
    top_assignees: string[];
  };
  insights: string[];
  risks: string[];
  recommendations: string[];
  near_term_focus: string[];
  alerts: string[];
}

// ChatInput
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}> = ({ onSendMessage, isLoading, placeholder = "How can I help?" }) => {
  const [isIntegrationsDropdownOpen, setIsIntegrationsDropdownOpen] =
    useState(false);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(
    []
  );
  const [prompt, setPrompt] = useState("");

  const { integrations: integrationsList, loading: integrationsLoading } =
    useAllowedIntegrations();

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto">
      <div className="relative rounded-xl border-2 border-gray-200 bg-white shadow-lg hover:border-purple-300 focus-within:border-purple-400 transition-all duration-200">
        <textarea
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-6 py-4 pr-16 text-gray-800 placeholder-gray-500 bg-transparent focus:outline-none resize-none text-base leading-relaxed"
          rows={1}
          style={{
            minHeight: "56px",
            maxHeight: "200px",
            overflowY: prompt.split("\n").length > 3 ? "auto" : "hidden",
          }}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`p-3 rounded-lg transition-all duration-200 transform ${
              prompt.trim() && !isLoading
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:scale-105 shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center mt-2 text-xs text-gray-400">
        <span>Press Enter to send, Shift+Enter for new line</span>
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
  <aside className="w-72 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col h-full shadow-sm">
    <div className="p-4 border-b border-gray-100">
      <button
        onClick={onNewChat}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md transform hover:scale-105"
      >
        <Plus size={18} /> New Chat
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>💬</span>
        <span>Recent Conversations</span>
      </h3>
      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                activeSessionId === session.id
                  ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-medium border border-purple-200 shadow-sm"
                  : "hover:bg-gray-100 text-gray-700 hover:shadow-sm"
              }`}
            >
              <div className="truncate">{session.title}</div>
              {session.messages.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {session.messages.length} message
                  {session.messages.length !== 1 ? "s" : ""}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  </aside>
);

// Role Toggle Component
const RoleToggle: React.FC<{
  userRole: "support" | "product_manager";
  onRoleChange: (role: "support" | "product_manager") => void;
}> = ({ userRole, onRoleChange }) => {
  return (
    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Switch Role:</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRoleChange("support")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              userRole === "support"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Zap size={12} className="inline mr-1" />
            Support
          </button>
          <button
            onClick={() => onRoleChange("product_manager")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              userRole === "product_manager"
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <TrendingUp size={12} className="inline mr-1" />
            Product
          </button>
        </div>
      </div>
    </div>
  );
};

// Customer Support Insights
const CustomerSupportInsights: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: CustomerSupportData | null;
  loading: boolean;
  userRole: "support" | "product_manager";
  onRoleChange: (role: "support" | "product_manager") => void;
}> = ({ isOpen, onClose, data, loading, userRole, onRoleChange }) => {
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

      <RoleToggle userRole={userRole} onRoleChange={onRoleChange} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          {/* Enhanced spinner animation */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
            <div
              className="absolute top-2 left-2 w-12 h-12 border-4 border-purple-400 rounded-full border-r-transparent animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
            <div className="absolute top-4 left-4 w-8 h-8 bg-purple-500 rounded-full animate-pulse"></div>
          </div>

          {/* Loading text with typewriter effect */}
          <div className="text-center space-y-3">
            <div className="text-purple-700 font-semibold text-lg">
              Analyzing Support Data
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1 justify-center">
              <div
                className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0s" }}
              ></div>
              <div
                className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>

            {/* Progress indicators */}
            <div className="space-y-2 text-xs text-purple-600">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Fetching support tickets</span>
              </div>
              <div className="flex items-center justify-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                <span>Processing themes</span>
              </div>
              <div className="flex items-center justify-center space-x-2 opacity-50">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Generating insights</span>
              </div>
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

// VFL Project Insights for Product Manager
const VflProjectInsights: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: VflProjectData | null;
  loading: boolean;
  userRole: "support" | "product_manager";
  onRoleChange: (role: "support" | "product_manager") => void;
}> = ({ isOpen, onClose, data, loading, userRole, onRoleChange }) => {
  return (
    <aside className="w-96 bg-blue-50 border-l border-blue-200 p-6 flex-shrink-0 h-full overflow-y-auto block">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600" />
          Project Insights
        </h3>
        <button onClick={onClose} className="lg:hidden text-blue-600">
          <X size={20} />
        </button>
      </div>

      <RoleToggle userRole={userRole} onRoleChange={onRoleChange} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          {/* Enhanced spinner animation */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <div
              className="absolute top-2 left-2 w-12 h-12 border-4 border-blue-400 rounded-full border-r-transparent animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
            <div className="absolute top-4 left-4 w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
          </div>

          {/* Loading text with typewriter effect */}
          <div className="text-center space-y-3">
            <div className="text-blue-700 font-semibold text-lg">
              Analyzing Project Data
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1 justify-center">
              <div
                className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0s" }}
              ></div>
              <div
                className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>

            {/* Progress indicators */}
            <div className="space-y-2 text-xs text-blue-600">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Fetching JIRA issues</span>
              </div>
              <div className="flex items-center justify-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                <span>Processing metrics</span>
              </div>
              <div className="flex items-center justify-center space-x-2 opacity-50">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Generating insights</span>
              </div>
            </div>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4 text-sm">
          {/* Key Metrics */}
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-1">
              <TrendingUp size={14} />
              Key Metrics
            </h4>
            <div className="space-y-1 text-gray-700">
              <div>
                Total Issues:{" "}
                <span className="font-medium">
                  {data.key_metrics.total_issues}
                </span>
              </div>
              <div>
                Avg Cycle Time:{" "}
                <span className="font-medium text-blue-600">
                  {data.key_metrics.avg_cycle_time_days} days
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                <div>
                  Status: {data.key_metrics.top_status.slice(0, 2).join(", ")}
                </div>
                <div>
                  Types: {data.key_metrics.top_types.slice(0, 2).join(", ")}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alerts */}
          {data.alerts.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-red-100 bg-red-50">
              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} />
                Critical Alerts
              </h4>
              <div className="space-y-2">
                {data.alerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className="text-red-800 text-xs">
                    • {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {data.insights.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
              <div className="space-y-2">
                {data.insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="text-gray-700 text-xs">
                    • {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {data.risks.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-yellow-100 bg-yellow-50">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} />
                Risk Factors
              </h4>
              <div className="space-y-2">
                {data.risks.slice(0, 2).map((risk, index) => (
                  <div key={index} className="text-yellow-800 text-xs">
                    • {risk}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-green-100 bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">
                Priority Actions
              </h4>
              <div className="space-y-2">
                {data.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-green-800 text-xs">
                    • {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near Term Focus */}
          {data.near_term_focus.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Sprint Focus</h4>
              <div className="space-y-1">
                {data.near_term_focus.slice(0, 3).map((focus, index) => (
                  <div key={index} className="text-gray-700 text-xs">
                    • {focus}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {data.executive_summary && (
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">
                Executive Summary
              </h4>
              <div className="text-gray-700 text-xs">
                {data.executive_summary}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No project data available</p>
        </div>
      )}
    </aside>
  );
};

// Main Page Component
function AIChatbotPageContent() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const [customerSupportData, setCustomerSupportData] =
    useState<CustomerSupportData | null>(null);
  const [isLoadingSupportData, setIsLoadingSupportData] = useState(false);
  const [vflProjectData, setVflProjectData] = useState<VflProjectData | null>(
    null
  );
  const [isLoadingVflData, setIsLoadingVflData] = useState(false);

  // Cache flags to prevent refetching
  const [supportDataCached, setSupportDataCached] = useState(false);
  const [vflDataCached, setVflDataCached] = useState(false);

  // User role toggle - can be "support" or "product_manager"
  const [userRole, setUserRole] = useState<"support" | "product_manager">(
    "support"
  );

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const hasMessages = !!(activeSession && activeSession.messages.length > 0);

  const suggestions = [
    "What are the recent support tickets?",
    "Generate a roadmap",
  ];

  const API_URL = "http://134.33.240.184:8000";

  const USER_ID = user?.id; // Get actual user ID from auth context
  const USER_ROLE = user?.role; // Get actual user role from auth context

  // Fetch user conversations on component mount
  useEffect(() => {
    // Don't fetch conversations if auth is still loading or user is not available
    if (isAuthLoading || !user || !USER_ID) {
      return;
    }

    const fetchUserConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const response = await fetch(
          `${API_URL}/users/${USER_ID}/conversations`
        );
        if (response.ok) {
          const conversations = await response.json();

          // Transform database conversations to ChatSession format
          const transformedSessions: ChatSession[] = conversations.map(
            (conv: any, index: number) => {
              // Generate a title from the first user message or use a default
              let title = `Chat ${index + 1}`;
              if (conv.messages && conv.messages.length > 0) {
                const firstUserMessage = conv.messages.find(
                  (msg: any) => msg.role === "user"
                );
                if (firstUserMessage) {
                  title =
                    firstUserMessage.content.length > 50
                      ? firstUserMessage.content.substring(0, 50) + "..."
                      : firstUserMessage.content;
                }
              }

              // Transform messages to ChatMessage format
              const transformedMessages: ChatMessage[] = conv.messages.map(
                (msg: any, msgIndex: number) => ({
                  id: msgIndex,
                  type: msg.role === "user" ? "user" : "ai",
                  content: msg.content,
                  sources: msg.sources,
                  followUps: msg.followUps,
                  isThinking: false,
                })
              );

              return {
                id: parseInt(conv.id) || index,
                title: title,
                messages: transformedMessages,
                conversationId: conv.id,
              };
            }
          );

          setSessions(transformedSessions);

          // Set the first session as active if we have sessions
          if (transformedSessions.length > 0) {
            setActiveSessionId(transformedSessions[0].id);
          }
        } else {
          console.error("Failed to fetch conversations:", response.statusText);
          // If no conversations exist, start with an empty session
          setSessions([]);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        // If there's an error, start with an empty session
        setSessions([]);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchUserConversations();
  }, [isAuthLoading, user, USER_ID]);

  // Fetch support data on page load (with caching)
  useEffect(() => {
    if (supportDataCached) return; // Skip if already cached

    const fetchSupportData = async () => {
      setIsLoadingSupportData(true);
      try {
        const response = await fetch(`${API_URL}/customer-support-agent`);
        if (response.ok) {
          const data = await response.json();
          setCustomerSupportData(data);
          setSupportDataCached(true); // Mark as cached
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

    fetchSupportData();
  }, [supportDataCached]); // Only run once on mount or when cache is reset

  // Fetch VFL data only when product manager role is selected (with caching)
  useEffect(() => {
    if (userRole === "product_manager" && !vflDataCached) {
      const fetchVflData = async () => {
        setIsLoadingVflData(true);
        try {
          const response = await fetch(`${API_URL}/vfl-project-agent`);
          if (response.ok) {
            const data = await response.json();
            setVflProjectData(data);
            setVflDataCached(true); // Mark as cached
          } else {
            console.error(
              "Failed to fetch VFL project data:",
              response.statusText
            );
          }
        } catch (error) {
          console.error("Error fetching VFL project data:", error);
        } finally {
          setIsLoadingVflData(false);
        }
      };

      fetchVflData();
    }
  }, [userRole, vflDataCached]); // Re-run when userRole changes or cache is reset

  const handleSendMessage = async (msg: string) => {
    if (!activeSession || !USER_ID) return;
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
      } = { query: msg, user_id: USER_ID };

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

  // Handle creating a new chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
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
        {isLoadingConversations ? (
          <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Chats
              </h3>
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full px-3 py-2 rounded-lg bg-gray-200 animate-pulse h-8"
                  ></div>
                ))}
              </div>
            </div>
          </aside>
        ) : (
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId || 0}
            onSessionSelect={setActiveSessionId}
            onNewChat={handleNewChat}
          />
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          {!hasMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-gradient-to-br from-purple-50 via-white to-blue-50">
              {/* Combined Heading and Logo */}
              <div className="flex items-center justify-center mb-6 animate-in fade-in slide-in-from-bottom duration-700">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Meet
                </h2>
                {/* Logo Image */}
                <img
                  src="https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/4be4d70d-b665-8547-1b92-c162f1a99aa2.png"
                  alt="Knowva Logo"
                  className="w-[140px] aspect-[89/20] ml-3"
                />
              </div>
              <p className="text-gray-700 text-center max-w-3xl mb-10 text-lg leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                Say hello to your connected brain. Search, explore, and
                understand everything across your tools — all from one place.
              </p>
              <div className="w-full animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>
              <div className="w-full max-w-4xl mt-10 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
                <p className="text-sm text-gray-600 mb-6 font-medium flex items-center justify-center space-x-2">
                  <span>✨</span>
                  <span>Suggestions to get started</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(s)}
                      className="group relative text-left px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-300 text-gray-700 hover:text-purple-700 shadow-sm hover:shadow-md transform hover:-translate-y-1"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <span className="font-medium">{s}</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
                {activeSession?.messages.map((msg) =>
                  msg.type === "user" ? (
                    <div
                      key={msg.id}
                      className="flex justify-end animate-in slide-in-from-right duration-300"
                    >
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-br-md px-6 py-4 max-w-2xl shadow-lg">
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className="animate-in slide-in-from-left duration-300"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            AI
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-2xl rounded-tl-md border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                            {msg.isThinking ? (
                              <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                                  <div
                                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                                    style={{ animationDelay: "0.1s" }}
                                  ></div>
                                  <div
                                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                                    style={{ animationDelay: "0.2s" }}
                                  ></div>
                                </div>
                                <span className="text-gray-600 text-sm font-medium">
                                  AI is thinking...
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                                  {msg.content
                                    .split("\n")
                                    .map((line, index) => (
                                      <div
                                        key={index}
                                        className="mb-2 last:mb-0"
                                      >
                                        {line.trim() === "" ? <br /> : line}
                                      </div>
                                    ))}
                                </div>
                                {msg.sources && msg.sources > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-gray-600 font-medium">
                                        {msg.sources} source
                                        {msg.sources !== 1 ? "s" : ""}{" "}
                                        referenced
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {msg.followUps && !msg.isThinking && (
                            <div className="space-y-2 mt-4">
                              <p className="text-sm text-gray-600 font-medium flex items-center space-x-2">
                                {/* <span>💡</span>
                                <span>Follow-up questions:</span> */}
                              </p>
                              <div className="grid gap-2">
                                {msg.followUps.map((q, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSendMessage(q)}
                                    className="text-left px-4 py-3 text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-xl text-sm border border-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-sm"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white p-6">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  placeholder="Ask a follow up..."
                />
              </div>
            </>
          )}
        </main>

        {/* Role-based Insights Sidebar */}
        {userRole === "support" ? (
          <CustomerSupportInsights
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            data={customerSupportData}
            loading={isLoadingSupportData}
            userRole={userRole}
            onRoleChange={setUserRole}
          />
        ) : (
          <VflProjectInsights
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            data={vflProjectData}
            loading={isLoadingVflData}
            userRole={userRole}
            onRoleChange={setUserRole}
          />
        )}
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
