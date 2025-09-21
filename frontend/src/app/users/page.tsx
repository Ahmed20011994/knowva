"use client";
import React, { useState,useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, MoreHorizontal, Search, X, Mail } from 'lucide-react';
import { useAuth } from '@/libs/auth';
import { apiService, User } from '@/libs/api';
interface Member {
  id: string;
  email: string;
  role: string;
  teams: string[];
}

interface Team {
  id: number;
  name: string;
}

export default function UsersPage() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();

  const [availableTeams] = useState<Team[]>([
    { id: 1, name: 'Connect' },
    { id: 2, name: 'Core' },
    { id: 3, name: 'Marketing' },
    { id: 4, name: 'Support' },
    { id: 5, name: 'Product' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'Developer',
    team: 'Connect'
  });

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      if (!token) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const usersData = await apiService.getUsers(token);
        setMembers(usersData);
      } catch (error) {
        console.error('Failed to load users:', error);
        setError('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !event.composedPath().some((el: any) => el?.classList?.contains('dropdown-menu'))) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const [searchQuery, setSearchQuery] = useState('');


  const roles = ['Product Designer', 'Product Manager', 'Developer', 'Marketing', 'Support', 'Admin'];

  const handleInvite = () => {
    if (newMember.email && newMember.role && newMember.team) {
      const member: Member = {
        id: Date.now().toString(),
        email: newMember.email,
        role: newMember.role,
        teams: [newMember.team]
      };
      setMembers([...members, member]);
      setNewMember({ email: '', role: 'Developer', team: 'Connect' });
      setIsModalOpen(false);
    }
  };

  const handleAction = (action: string, member: Member) => {
    switch(action) {
      case 'view':
        console.log('View member:', member);
        break;
      case 'edit':
        console.log('Edit member:', member);
        break;
      case 'delete':
        const confirmDelete = window.confirm('Are you sure you want to delete this member?');
        if (confirmDelete) {
          setMembers(members.filter(m => m.id !== member.id));
        }
        break;
    }
    setActiveDropdown(null);
  };

  const filteredMembers = members.filter(member =>
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <main className="flex-1 p-8 md:p-12">
        {/* Page Header */}
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Members</h1>
              <p className="text-gray-600 max-w-2xl">
                View all members of your organization in one place. See their roles, assigned teams, and access levels to keep collaboration organized and secure.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
              </div>
              {/* Invite Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                <Plus size={18} />
                Invite
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-purple-50 border-b border-gray-200">
              <div className="col-span-4 text-sm font-medium text-gray-700">Emails</div>
              <div className="col-span-3 text-sm font-medium text-gray-700">Role</div>
              <div className="col-span-4 text-sm font-medium text-gray-700">Teams</div>
              <div className="col-span-1 text-sm font-medium text-gray-700 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading members...</p>
                </div>
              ) : error ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading members</h3>
                  <p className="text-gray-500">{error}</p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                <div key={member.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Email */}
                  <div className="col-span-4">
                    <span className="text-gray-900">{member.email}</span>
                  </div>

                  {/* Role */}
                  <div className="col-span-3">
                    <span className="text-gray-700">{member.role}</span>
                  </div>

                  {/* Teams */}
                  <div className="col-span-4">
                    <div className="flex gap-2">
                      {member.teams.map((team, index) => (
                        <span key={index} className="text-gray-700">
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeDropdown === member.id && (
                      <div className="dropdown-menu absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-36 z-10">
                        <button
                          onClick={() => handleAction('view', member)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleAction('edit', member)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAction('delete', member)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>

            {/* Empty State */}
            {!isLoading && !error && filteredMembers.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Mail size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Invite your first team member to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Plus size={18} />
                    Invite Member
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invite Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ 
              background: 'rgba(0, 0, 0, 0.30)',
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Role Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Assign Team Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Team
                </label>
                <select
                  value={newMember.team}
                  onChange={(e) => setNewMember({ ...newMember, team: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!newMember.email}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    newMember.email 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Mail size={18} />
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}