"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getCandidates, deleteCandidate } from "../../actions/candidate";

export default function CandidateListPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Status: All");
  const [genderFilter, setGenderFilter] = useState("Gender: Semua");

  const loadCandidates = async () => {
    setLoading(true);
    const res = await getCandidates(search, statusFilter, genderFilter);
    if (res.success && res.candidates) {
      setCandidates(res.candidates);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCandidates();
  }, [search, statusFilter, genderFilter]);

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kandidat "${nama}" dari database?`)) {
      return;
    }

    setDeletingId(id);
    const res = await deleteCandidate(id);
    setDeletingId(null);

    if (res.success) {
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(res.message || "Gagal menghapus kandidat.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Area */}
      <header className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Daftar Calon Penerima Prostetik</h2>
          <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center justify-center">
            {candidates.length}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
              placeholder="Cari nama atau ID kandidat..."
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="Status: All">Status: All</option>
            <option value="Verified">Verified</option>
            <option value="Processing">Processing</option>
            <option value="Ready">Ready</option>
          </select>
          
          <select 
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="Gender: Semua">Gender: Semua</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
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
                  <th className="px-6 py-4 w-40">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Memuat data kandidat dari database...</span>
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Belum ada data kandidat. Silakan upload rekaman baru di menu Upload.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500 font-semibold">
                        {candidate.candidateCode}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{candidate.nama}</td>
                      <td className="px-6 py-4">{candidate.umur || "-"}</td>
                      <td className="px-6 py-4">{candidate.jenisKelamin || "-"}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(candidate.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          candidate.status === 'Verified' ? 'bg-teal-50 text-teal-700' :
                          candidate.status === 'Processing' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link href={`/dashboard/candidates/${candidate.id}`}>
                            <button className="px-3 py-1.5 bg-white border border-teal-600 text-teal-700 rounded text-xs font-semibold hover:bg-teal-50 transition-colors">
                              Periksa Data
                            </button>
                          </Link>
                          <button 
                            onClick={() => handleDelete(candidate.id, candidate.nama)}
                            disabled={deletingId === candidate.id}
                            title="Hapus Kandidat"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {deletingId === candidate.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination */}
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-white">
            <p className="text-[11px] text-gray-500 font-medium">
              Menampilkan {candidates.length} kandidat
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
