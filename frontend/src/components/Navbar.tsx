"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, Search } from "lucide-react"; // install lucide-react for icons: npm i lucide-react

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white shadow-md px-6 py-3 flex justify-between items-center">
      {/* Logo */}
      <div className="text-xl font-bold text-blue-600">Knowva</div>

      {/* Desktop search */}
      <div className="hidden md:flex items-center gap-4">
        <button className="p-2 text-gray-600 hover:text-blue-600">
          <Search size={20} />
        </button>
        <div className="relative">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </nav>
  );
}
