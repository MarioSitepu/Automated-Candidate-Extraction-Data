"use client";

import { 
  Bell, 
  Search, 
  User, 
  Video, 
  Hourglass, 
  CheckSquare, 
  ShieldCheck,
  ArrowRight
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

const barData = [
  { name: 'Queued', value: 200 },
  { name: 'Extracting', value: 380 },
  { name: 'Analyzing', value: 600 },
  { name: 'Failed', value: 100 },
  { name: 'Complete', value: 480 },
];

const pieData = [
  { name: 'Raga Arm Type A', value: 45, color: '#115E59' }, // Dark Teal
  { name: 'Raga Arm Type B', value: 30, color: '#0369A1' }, // Blue
  { name: 'Custom Build', value: 20, color: '#38BDF8' }, // Light Blue
  { name: 'Pending Eval', value: 5, color: '#CBD5E1' }, // Gray
];

const logs = [
  { timestamp: "2023-10-27 14:32:01", driveId: "1A2b3C4d5E6f7G8h9I0j_Vid_001", status: "Success", duration: "4m 12s", action: "" },
  { timestamp: "2023-10-27 14:30:45", driveId: "xyz987abc654def321_Audio_09", status: "Processing", duration: "--", action: "" },
  { timestamp: "2023-10-27 14:28:10", driveId: "corrpt_file_889900_Vid", status: "Failed", duration: "0m 4s", action: "" },
  { timestamp: "2023-10-27 14:15:22", driveId: "valid_cand_0044_IntView", status: "Success", duration: "5m 30s", action: "" },
];

export default function DashboardPage() {
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
          <div className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 pt-2">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">TOTAL VIDEO<br/>WAWANCARA</h3>
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Video className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="flex items-end space-x-2 mt-4">
              <span className="text-3xl font-bold text-gray-800">1,248</span>
              <span className="text-sm text-teal-500 font-medium pb-1 flex items-center">↑12%</span>
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
                <span className="text-3xl font-bold text-gray-800">84</span>
                <span className="text-xs text-gray-400 pb-1.5">Processing AI</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">SIAP<br/>DIVALIDASI</h3>
              <div className="p-1.5 bg-red-50 rounded-lg text-red-500 font-bold">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-end space-x-2 mt-2 mb-3">
                <span className="text-3xl font-bold text-gray-800">32</span>
                <span className="text-xs text-red-500 font-semibold tracking-wider pb-1.5">READY TO<br/>REVIEW</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '30%' }}></div>
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
                <span className="text-3xl font-bold text-gray-800">412</span>
                <span className="text-xs text-teal-500 font-semibold tracking-wider pb-1.5">VERIFIED</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-6">Status Pipeline Ekstraksi AI</h3>
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
                        index === 0 ? '#BAE6FD' : // Queued (Light blue)
                        index === 1 ? '#3B82F6' : // Extracting (Blue)
                        index === 2 ? '#0F766E' : // Analyzing (Dark teal)
                        index === 3 ? '#14B8A6' : // Failed (Teal)
                        '#115E59'                 // Complete (Darkest teal)
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-6">Distribusi Kebutuhan Prostetik Kandidat</h3>
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
                  <span className="text-2xl font-bold text-gray-800">1.2k</span>
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
                      <span className="font-semibold text-gray-500">({item.value}%)</span>
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
            <h3 className="text-base font-bold text-gray-800">Recent Pipeline Logs</h3>
            <button className="text-teal-600 text-sm font-medium flex items-center hover:text-teal-700">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Drive File ID</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors text-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-blue-500 font-mono text-xs">{log.driveId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        log.status === 'Success' ? 'bg-teal-50 text-teal-700' :
                        log.status === 'Processing' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {log.status === 'Processing' ? (
                          <span className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                            Processing
                          </span>
                        ) : log.status === 'Success' ? (
                          <span className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-1.5"></span>
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                            Failed
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
