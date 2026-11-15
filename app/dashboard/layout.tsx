"use client";

import Link from "next/link";
import { LayoutDashboard, Users, LogOut, UploadCloud, Database, RefreshCw } from "lucide-react";
import { logoutUser } from "../actions/auth";
import { getDatabaseStorageStats } from "../actions/candidate";
import { usePathname } from "next/navigation";
import { UploadProvider } from "../context/UploadContext";
import { useEffect, useState, startTransition } from "react";

interface StorageStats {
  dbSizeBytes: number;
  dbSizeMb: number;
  formattedSize: string;
  percentUsed: number;
  maxCapacityMb: number;
  candidateCount: number;
}

function SidebarStorageWidget() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStorage = async () => {
    if (loading) return;
    setLoading(true);
    const res = await getDatabaseStorageStats();
    if (res.success && res.stats) {
      setStorage(res.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    startTransition(async () => {
      setLoading(true);
      const res = await getDatabaseStorageStats();
      if (!ignore) {
        if (res.success && res.stats) {
          setStorage(res.stats);
        }
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const percent = storage?.percentUsed || 0;

  return (
    <div className="mx-4 mb-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-teal-700" />
          <span className="text-xs font-bold text-gray-800">Ruang Penyimpanan</span>
        </div>
        <button 
          onClick={refreshStorage} 
          disabled={loading}
          title="Refresh Storage Status"
          className="text-gray-400 hover:text-teal-700 transition-colors p-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-teal-600" : ""}`} />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] font-medium text-gray-600">
          <span>{storage ? storage.formattedSize : "0 MB"}</span>
          <span className="font-bold text-teal-800">{percent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-1.5 rounded-full transition-all duration-500 ${
              percent > 90 ? "bg-red-500" : percent > 80 ? "bg-amber-500" : "bg-teal-600"
            }`}
            style={{ width: `${Math.max(percent, 2)}%` }}
          ></div>
        </div>

        <p className="text-[10px] text-gray-400 text-right">
          500 MB Capacity
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutUser();
  };

  return (
    <UploadProvider>
      <div className="flex h-screen bg-[#F8FAFC]">
        {/* Sidebar */}
        <aside className="w-64 bg-[#F8FAFC] border-r border-gray-200 flex flex-col justify-between flex-shrink-0">
          <div>
            {/* Logo Section */}
            <div className="p-6 pb-12">
              <h1 className="text-xl font-bold text-teal-800">
                Karla <br />
                <span className="text-teal-600 font-semibold text-sm">
                  Bionics
                </span>
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
              <Link
                href="/dashboard/upload"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  pathname === "/dashboard/upload" 
                    ? "text-teal-800 bg-teal-50 border-l-4 border-teal-600 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                }`}
              >
                <UploadCloud className={`w-5 h-5 ${pathname === "/dashboard/upload" ? "text-teal-600" : ""}`} />
                <span>Upload Data</span>
              </Link>
            </nav>
          </div>

          {/* Bottom Section with Storage Widget */}
          <div className="pt-2 border-t border-gray-200">
            <SidebarStorageWidget />
            <div className="px-4 pb-4">
              <form onSubmit={handleLogout}>
                <button
                  type="submit"
                  disabled={loggingOut}
                  className="flex items-center space-x-3 text-gray-600 hover:text-red-600 px-4 py-2.5 w-full text-left font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{loggingOut ? "Keluar..." : "Logout"}</span>
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </UploadProvider>
  );
}
