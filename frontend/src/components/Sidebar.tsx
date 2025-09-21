"use client";

import { Home, Search } from "lucide-react";
import Link from "next/link";


export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-50 border-r p-4 space-y-6">
      <h2 className="text-xl font-bold text-blue-600">Dashboard</h2>
      <nav className="space-y-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
      >
        <Home size={18} /> Home
      </Link>

      <Link
        href="/dashboard/search"
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
      >
        <Search size={18} /> Search
      </Link>

    </nav>
    </aside>
  );
}
