"use client";

import Link from "next/link";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { logoutUser } from "../actions/auth";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logoutUser();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F8FAFC] border-r border-gray-200 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo Section */}
          <div className="p-6 pb-12">
            <h1 className="text-xl font-bold text-teal-800">
              Karla <br />
              <span className="text-teal-600 font-semibold text-sm">
                biotech
              </span>{" "}
              Bionics
            </h1>
            <p className="text-xs text-gray-500 mt-1">Enterprise Admin</p>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col space-y-2 px-4">
            <Link
              href="/dashboard"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                pathname === "/dashboard" 
                  ? "text-teal-800 bg-teal-50 border-l-4 border-teal-600 shadow-sm" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 ${pathname === "/dashboard" ? "text-teal-600" : ""}`} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/candidates"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                pathname === "/dashboard/candidates" 
                  ? "text-teal-800 bg-teal-50 border-l-4 border-teal-600 shadow-sm" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
            >
              <Users className={`w-5 h-5 ${pathname === "/dashboard/candidates" ? "text-teal-600" : ""}`} />
              <span>Candidate List</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleLogout}>
            <button
              type="submit"
              className="flex items-center space-x-3 text-gray-600 hover:text-red-600 px-4 py-3 w-full text-left font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        {children}
      </main>
    </div>
  );
}
