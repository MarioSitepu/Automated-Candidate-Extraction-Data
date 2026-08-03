"use client";

import { useEffect, useState } from "react";
import { 
  Bell, 
  Search, 
  User, 
  Video, 
  Hourglass, 
  CheckSquare, 
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import Link from "next/link";
import { getDashboardStats } from "../actions/candidate";
import { useUpload } from "../context/UploadContext";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    ready: 0,
    verified: 0,
    recentLogs: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const res = await getDashboardStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  const barData = [
    { name: 'Queued', value: 0 },
    { name: 'Processing', value: stats.processing },
    { name: 'Ready', value: stats.ready },
    { name: 'Verified', value: stats.verified },
    { name: 'Total', value: stats.total },
  ];

  const pieData = [
    { name: 'Terverifikasi', value: stats.verified || 1, color: '#115E59' }, // Dark Teal
    { name: 'Siap Evaluasi', value: stats.ready || 1, color: '#0369A1' }, // Blue
    { name: 'Diproses AI', value: stats.processing || 1, color: '#38BDF8' }, // Light Blue
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short"
    });
  };

  const { currentTask } = useUpload();

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Monitoring View</h2>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search ID or Name..." 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="relative cursor-pointer group" title={currentTask ? currentTask.progressText : "Notifikasi Sistem"}>
            <Bell className="w-5 h-5 text-gray-600" />
            {currentTask && (
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                currentTask.status === "completed" ? "bg-teal-500" :
                currentTask.status === "error" ? "bg-red-500" : "bg-teal-500 animate-ping"
              }`}></span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center cursor-pointer font-bold text-xs">
            A
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 pt-2">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">TOTAL KANDIDAT<br/>WAWANCARA</h3>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Video className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="flex items-end space-x-2 mt-4">
              <span className="text-3xl font-bold text-gray-800">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600 inline" /> : stats.total}
              </span>
              <span className="text-xs text-teal-600 font-medium pb-1">Data Real Supabase</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">ANTREAN<br/>DIPROSES</h3>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Hourglass className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div>
              <div className="flex items-end space-x-2 mt-2 mb-3">
                <span className="text-3xl font-bold text-gray-800">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600 inline" /> : stats.processing}
                </span>
                <span className="text-xs text-gray-400 pb-1.5">Processing AI</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.total > 0 ? (stats.processing / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">SIAP<br/>DIVALIDASI</h3>
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 font-bold">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-end space-x-2 mt-2 mb-3">
                <span className="text-3xl font-bold text-gray-800">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600 inline" /> : stats.ready}
                </span>
                <span className="text-xs text-amber-600 font-semibold tracking-wider pb-1.5">READY TO<br/>REVIEW</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${stats.total > 0 ? (stats.ready / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">KANDIDAT<br/>TERVERIFIKASI</h3>
              <div className="p-1.5 bg-teal-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <div>
              <div className="flex items-end space-x-2 mt-2 mb-3">
                <span className="text-3xl font-bold text-gray-800">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600 inline" /> : stats.verified}
                </span>
                <span className="text-xs text-teal-600 font-semibold tracking-wider pb-1.5">VERIFIED</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-6">Status Pipeline Ekstraksi AI (Database Real)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        index === 0 ? '#BAE6FD' : // Queued
                        index === 1 ? '#3B82F6' : // Processing
                        index === 2 ? '#F59E0B' : // Ready
                        index === 3 ? '#0F766E' : // Verified
                        '#115E59'                 // Total
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-6">Proporsi Status Kandidat Terkini</h3>
            <div className="flex items-center justify-between h-64">
              <div className="w-1/2 h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
                  <span className="text-[10px] text-gray-400">Kandidat</span>
                </div>
              </div>
              <div className="w-1/2 pl-4">
                <ul className="space-y-4">
                  {pieData.map((item, index) => (
                    <li key={index} className="flex items-center text-xs text-gray-600">
                      <span 
                        className="w-3 h-3 rounded-sm mr-3 flex-shrink-0" 
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="flex-1">{item.name}</span>
                      <span className="font-semibold text-gray-500">({item.value})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-800">Aktivitas Kandidat Terbaru (Database)</h3>
            <Link href="/dashboard/candidates" className="text-teal-600 text-sm font-medium flex items-center hover:text-teal-700">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Waktu Masuk</th>
                  <th className="px-6 py-4 font-medium tracking-wider">ID Kandidat</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Nama</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Memuat data aktivitas terbaru...</span>
                      </div>
                    </td>
                  </tr>
                ) : stats.recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      Belum ada data aktivitas.
                    </td>
                  </tr>
                ) : (
                  stats.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{formatDate(log.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-teal-700 font-mono text-xs font-semibold">{log.candidateCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{log.nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          log.status === 'Verified' ? 'bg-teal-50 text-teal-700' :
                          log.status === 'Processing' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/dashboard/candidates/${log.id}`}>
                          <button className="px-2.5 py-1 text-xs border border-teal-600 text-teal-700 rounded hover:bg-teal-50 transition-colors font-medium">
                            Periksa
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
