"use client";
import {
  Home,
  Folder,
  Users,
  Zap,
  Menu,
  LogOut,
  Sparkle,
} from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/libs/auth";
import { useAllowedIntegrations } from "@/hooks/useAllowedIntegrations";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);

  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { integrations, loading: integrationsLoading } = useAllowedIntegrations();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still try to redirect on error
      logout();
    }
  }, [logout]);

  // Close dropdowns when clicking outside and handle keyboard shortcuts
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+L for quick logout
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        handleLogout();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleLogout]);

  // Active route mapping
  const navItems = [
    { href: "/dashboard", icon: Home, key: "dashboard" },
    { href: "/ai-chat", icon: Zap, key: "ai-chat" },
    { href: "/teams", icon: Folder, key: "teams" },
    { href: "/agents", icon: Sparkle, key: "agents" },
    { href: "/users", icon: Users, key: "users" },
  ];

  // Set initial selected integrations when they load
  useEffect(() => {
    if (integrations.length > 0 && selectedIntegrations.length === 0) {
      setSelectedIntegrations([integrations[0]]);
    }
  }, [integrations, selectedIntegrations.length]);

  const toggleIntegration = (name: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <header className="relative flex items-center justify-between p-4 border-b border-gray-200 bg-white md:px-6 lg:px-8">
      {/* Left section: Brand Logo */}
      <div className="flex-shrink-0">
        <Link href="/dashboard" className="text-xl font-bold text-purple-600">
          Knowva
        </Link>
      </div>

      {/* Center section: Navigation Icons */}
      <nav className="hidden md:flex flex-grow justify-center">
        <div className="flex items-center md:space-x-20">
          {navItems.map(({ href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}>
                <button
                  className={`rounded-full transition-colors ${
                    isActive
                      ? "px-6 py-3 bg-purple-100 text-purple-600"
                      : "p-3 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right section: Integrations + User */}
      <div className="flex items-center space-x-4 relative">
        {/* Integrations Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm transition-colors hover:bg-purple-200"
          >
            <Zap size={16} />
            <span className="hidden md:inline">
              Integrations {selectedIntegrations.length}
            </span>
            <span className="md:hidden">{selectedIntegrations.length}</span>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                Integrations Added
              </h4>
              <div className="flex flex-col gap-2">
                {integrations.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIntegrations.includes(item)}
                      onChange={() => toggleIntegration(item)}
                      className="w-4 h-4 accent-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span
                      className={`text-sm ${
                        selectedIntegrations.includes(item)
                          ? "text-purple-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile-only menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 flex justify-center py-4 md:hidden">
          <nav className="flex flex-row items-center space-x-4">
            {navItems.map(({ href, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href}>
                  <button
                    className={`rounded-full transition-colors ${
                      isActive
                        ? "px-6 py-3 bg-purple-100 text-purple-600"
                        : "p-3 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
