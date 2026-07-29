"use client";

import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const candidates = [
  { id: "KB-2024-001", name: "Budi Santoso", age: 45, gender: "L", date: "12 Okt 2024", status: "Verified", action: "Periksa Data" },
  { id: "KB-2024-002", name: "Siti Rahmawati", age: 32, gender: "P", date: "15 Okt 2024", status: "Processing", action: "Periksa Data" },
  { id: "KB-2024-003", name: "Agus Yudhoyono", age: 28, gender: "L", date: "18 Okt 2024", status: "Ready", action: "Periksa Data" },
  { id: "KB-2024-004", name: "Dewi Lestari", age: 51, gender: "P", date: "20 Okt 2024", status: "Verified", action: "Periksa Data" },
];

export default function CandidateListPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Area */}
      <header className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Daftar Calon Penerima Prostetik</h2>
          <span className="bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center justify-center">
            143
          </span>
        </div>

        {/* Search Bar & Filters */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
              placeholder="Cari nama kandidat..."
            />
          </div>
          
          <select className="py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>Status: All</option>
            <option>Verified</option>
            <option>Processing</option>
            <option>Ready</option>
          </select>
          
          <select className="py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>Gender: Semua</option>
            <option>Laki-laki (L)</option>
            <option>Perempuan (P)</option>
          </select>
        </div>
      </header>

      {/* Table Section */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-28">ID</th>
                  <th className="px-6 py-4">NAMA KANDIDAT</th>
                  <th className="px-6 py-4 w-20">UMUR</th>
                  <th className="px-6 py-4 w-32">JENIS KELAMIN</th>
                  <th className="px-6 py-4 w-36">TANGGAL MASUK</th>
                  <th className="px-6 py-4 w-36">STATUS PIPELINE</th>
                  <th className="px-6 py-4 w-32">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 text-xs">
                {candidates.map((candidate, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {candidate.id.split('-').map((part, i, arr) => (
                        <span key={i}>
                          {part}{i < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{candidate.name}</td>
                    <td className="px-6 py-4">{candidate.age}</td>
                    <td className="px-6 py-4">{candidate.gender}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {candidate.date.split(' ').slice(0,2).join(' ')}<br/>
                      {candidate.date.split(' ')[2]}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        candidate.status === 'Verified' ? 'bg-teal-50 text-teal-700' :
                        candidate.status === 'Processing' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/candidates/${candidate.id}`}>
                        <button className="px-3 py-1.5 bg-white border border-teal-600 text-teal-700 rounded text-xs font-semibold hover:bg-teal-50 transition-colors">
                          {candidate.action}
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination */}
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-white">
            <p className="text-[11px] text-gray-500 font-medium">
              Showing 1 to 4 of 143 entries
            </p>
            <div className="flex items-center space-x-1">
              <button className="p-1 border border-gray-200 rounded text-gray-400 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
