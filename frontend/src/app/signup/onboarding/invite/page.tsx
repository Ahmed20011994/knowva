"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/libs/auth";

type Team = {
  id: string;
  name: string;
  integrations: string[];
};

type Invite = {
  id: string;
  email: string;
  role: string;
  team: string;
  team_id: string;
};

export default function InviteTeammatesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CEO");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState("");

  const { token } = useAuth();

  // Load teams from backend
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userTeams = await response.json();
          console.log("Loaded teams:", userTeams);
          setTeams(userTeams);
          
          // Set first team as default
          if (userTeams.length > 0) {
            setSelectedTeam(userTeams[0].id);
          }
        } else {
          console.log("Failed to load teams, response status:", response.status);
          const errorText = await response.text();
          console.log("Error response:", errorText);
          // Fallback to dummy data if API fails
          const dummyTeams: Team[] = [
            { id: "1", name: "Connect", integrations: ["jira", "confluence"] },
            { id: "2", name: "Product Team", integrations: ["zendesk"] },
          ];
          setTeams(dummyTeams);
          if (dummyTeams.length > 0) {
            setSelectedTeam(dummyTeams[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
        // Fallback to dummy data
        const dummyTeams: Team[] = [
          { id: "1", name: "Connect", integrations: ["jira", "confluence"] },
          { id: "2", name: "Product Team", integrations: ["zendesk"] },
        ];
        setTeams(dummyTeams);
        if (dummyTeams.length > 0) {
          setSelectedTeam(dummyTeams[0].id);
        }
      }
    };

    if (token) {
      loadTeams();
    }
  }, [token]);

  const handleSendInvite = async () => {
    if (!email.trim() || !selectedTeam || inviteLoading) return;

    setInviteLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/onboarding/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          role,
          team_id: selectedTeam
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send invitation');
      }

      const inviteResponse = await response.json();
      const selectedTeamData = teams.find(t => t.id === selectedTeam);
      
      const newInvite: Invite = {
        id: inviteResponse.id,
        email: inviteResponse.email,
        role: inviteResponse.role,
        team: selectedTeamData?.name || "Unknown Team",
        team_id: selectedTeam,
      };

      setInvites((prev) => [...prev, newInvite]);
      setEmail("");
      setRole("CEO");
      // Keep the selected team as is for next invite
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Call the onboarding complete API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'}/auth/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete onboarding');
      }

      // Navigate to the dashboard after successful completion
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
      setIsLoading(false);
    }
  };

  // If loading, show the setup screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <Loader2 className="h-16 w-16 text-purple-600 animate-spin" />
        <h2 className="mt-8 text-2xl font-bold text-[#202020]">
          Setting up your workspace
        </h2>
        <p className="mt-2 max-w-lg text-gray-600">
          We’re connecting your tools, organizing your projects, and preparing your
          AI-powered knowledge base. This will only take a moment.
        </p>
      </div>
    );
  }

  // If not loading, show the main invite page
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
            Invite your teammates to the space
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Send invites to your teammates and assign roles so Knowva can
            surface the right documents, tasks, and context for each person.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Invite form */}
          <div className="mt-10">
            {/* Form Fields Row */}
            <div className="flex gap-4">
              {/* Email Field */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#202020] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Johndoe@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 h-[48px] focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020]"
                />
              </div>

              {/* Role Dropdown */}
              <div className="w-40">
                <label className="block text-sm font-medium text-[#202020] mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 h-[48px] focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020] appearance-none bg-white"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.5rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                  }}
                >
                  <option value="CEO">CEO</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="Product Marketing Manager">Product Marketing Manager</option>
                  <option value="Customer Support">Customer Support</option>
                </select>
              </div>

              {/* Assign Team Dropdown */}
              <div className="w-40">
                <label className="block text-sm font-medium text-[#202020] mb-1">
                  Assign Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 h-[48px] focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#202020] appearance-none bg-white"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.5rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                  }}
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Helper text below email */}
            <p className="text-xs text-gray-500 mt-1">
              Invited Members will receive an email with instructions.
            </p>
          </div>

          {/* Send Invite Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSendInvite}
              disabled={!email.trim() || !selectedTeam || inviteLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition
                ${
                  email.trim() && selectedTeam && !inviteLoading
                    ? "bg-[#823BE3] text-white hover:bg-purple-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              <Mail size={18} />
              {inviteLoading ? "Sending..." : "Send Invite"}
            </button>
          </div>

          {/* Divider + Heading after Send Invite */}
          {invites.length > 0 && (
            <div className="mt-8">
              <hr className="mb-6" />
              <h3 className="text-lg font-semibold text-[#202020] mb-4">
                Invited Members
              </h3>

              {/* Invites list */}
              <div className="flex flex-col gap-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="w-full border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      {/* Email and Team left side */}
                      <div>
                        <div className="font-medium text-[#202020]">{invite.email}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Team: {invite.team}
                        </div>
                      </div>
                      {/* Role right side */}
                      <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-md">
                        {invite.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finish button */}
          <div className="mt-10">
            <button
              onClick={handleFinish} // Use the new handler
              className="w-full bg-[#823BE3] text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              Finish
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}