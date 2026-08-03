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
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Trash2,
  X
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

  const { currentTask, notifications, unreadCount, markAllAsRead, clearNotifications } = useUpload();
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const toggleNotif = () => {
    if (!showNotifPopover) {
      markAllAsRead();
    }
    setShowNotifPopover(!showNotifPopover);
  };

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

          {/* Bell Notification Button & Popover */}
          <div className="relative">
            <button 
              onClick={toggleNotif}
              className="relative cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
              title="Notifikasi Sistem"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 ? (
                <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              ) : currentTask ? (
                <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                  currentTask.status === "completed" ? "bg-teal-500" :
                  currentTask.status === "error" ? "bg-red-500" : "bg-teal-500 animate-ping"
                }`}></span>
              ) : null}
            </button>

            {/* Popover Dropdown */}
            {showNotifPopover && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-gray-900">Notifikasi & Log Aktivitas</h3>
                    <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearNotifications}
                        title="Bersihkan Log"
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotifPopover(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {currentTask && (
                    <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">SEDANG BERJALAN</span>
                        <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      </div>
                      <p className="text-xs font-semibold text-gray-900 truncate">{currentTask.fileName}</p>
                      <p className="text-[11px] text-gray-600">{currentTask.progressText}</p>
                    </div>
                  )}

                  {notifications.length === 0 && !currentTask ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Belum ada notifikasi aktivitas.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          item.type === "success" ? "bg-teal-50/50 border-teal-100" :
                          item.type === "error" ? "bg-red-50/50 border-red-100" : "bg-gray-50/50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className="pt-0.5 shrink-0">
                            {item.type === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                            ) : item.type === "error" ? (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                              <span className="text-[9px] text-gray-400 shrink-0 ml-1">{item.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed">{item.message}</p>
                            {item.candidateId && (
                              <Link 
                                href={`/dashboard/candidates/${item.candidateId}`}
                                onClick={() => setShowNotifPopover(false)}
                                className="inline-block mt-1.5 text-[10px] font-bold text-teal-700 hover:underline"
                              >
                                Lihat Kandidat ➔
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
