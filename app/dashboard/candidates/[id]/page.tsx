import Link from "next/link";
import { ArrowLeft, Save, CheckCircle, Mic, RefreshCw, Cpu, Sparkles, X } from "lucide-react";

export default function CandidateProfilePage({ params }: { params: { id: string } }) {
  // Hardcoded for UI demonstration based on the Figma design
  const candidateName = "Budi Santoso";
  const candidateId = "KB-7829A"; // Using ID from the figma design header

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/candidates" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-[10px] font-bold text-teal-600 tracking-widest uppercase bg-teal-50 px-2 py-0.5 rounded">
                CANDIDATE PROFILE
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase border border-gray-200 px-2 py-0.5 rounded">
                ID: {candidateId}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{candidateName}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-teal-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Setujui & Kunci Data</span>
          </button>
        </div>
      </header>

      {/* Main Content: Two Columns */}
      <div className="flex-1 flex overflow-hidden border-t border-gray-200 bg-[#F8FAFC]">
        
        {/* Left Column: Interview Transcript */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 overflow-hidden bg-[#F8FAFC] p-6">
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex-1 flex flex-col overflow-hidden">
            {/* Header Left Panel */}
            <div className="p-6 pb-4 border-b border-gray-50 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Mic className="w-5 h-5 text-teal-700" />
                  <h2 className="text-lg font-bold text-gray-900">Interview Transcript</h2>
                </div>
                <p className="text-[11px] text-gray-500 font-mono">Source: OpenAI Whisper API • Auto-generated</p>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-full">
                <RefreshCw className="w-3 h-3 text-teal-600" />
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Synced</span>
              </div>
            </div>

            {/* Transcript Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Dialogue 1 */}
              <div className="flex items-start">
                <span className="text-[10px] text-gray-400 font-mono w-14 pt-1 shrink-0">[00:00]</span>
                <div>
                  <span className="font-bold text-teal-800 text-sm">Interviewer: </span>
                  <span className="text-sm text-gray-800 font-medium leading-relaxed">
                    Selamat pagi, Pak Budi. Terima kasih sudah meluangkan waktu. Bisa ceritakan sedikit tentang keseharian Bapak setelah kecelakaan tahun lalu?
                  </span>
                </div>
              </div>
              
              {/* Dialogue 2 */}
              <div className="flex items-start">
                <span className="text-[10px] text-gray-400 font-mono w-14 pt-1 shrink-0">[00:15]</span>
                <div>
                  <span className="font-bold text-[#1E3A8A] text-sm">Budi S: </span>
                  <span className="text-sm text-gray-800 font-medium leading-relaxed">
                    Pagi, Mas. Ya... semenjak tangan kanan saya diamputasi, aktivitas jadi serba terbatas. Saya dulunya buruh bangunan, sekarang bantu-bantu istri jaga warung kecil di depan rumah. Susah sih awalnya membiasakan diri pakai tangan kiri aja untuk bungkus-bungkus barang.
                  </span>
                </div>
              </div>

              {/* Dialogue 3 */}
              <div className="flex items-start">
                <span className="text-[10px] text-gray-400 font-mono w-14 pt-1 shrink-0">[01:05]</span>
                <div>
                  <span className="font-bold text-teal-800 text-sm">Interviewer: </span>
                  <span className="text-sm text-gray-800 font-medium leading-relaxed">
                    Untuk warung itu, apakah cukup untuk memenuhi kebutuhan sehari-hari keluarga, Pak? Mengingat Bapak punya dua anak yang masih sekolah.
                  </span>
                </div>
              </div>

              {/* Dialogue 4 */}
              <div className="flex items-start">
                <span className="text-[10px] text-gray-400 font-mono w-14 pt-1 shrink-0">[01:18]</span>
                <div>
                  <span className="font-bold text-[#1E3A8A] text-sm">Budi S: </span>
                  <span className="text-sm text-gray-800 font-medium leading-relaxed">
                    Jujur aja, ngepas banget, Mas. Malah seringnya kurang. Pendapatan warung paling sehari bersih 30-50 ribu. Makanya saya...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Validation */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-[#F8FAFC] p-6">
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex-1 flex flex-col overflow-hidden">
            {/* Header Right Panel */}
            <div className="p-6 pb-4 border-b border-gray-50 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Cpu className="w-5 h-5 text-teal-700" />
                  <h2 className="text-lg font-bold text-gray-900">AI Extraction Validation</h2>
                </div>
                <p className="text-[11px] text-gray-500 font-mono">Review and refine AI-extracted clinical data before locking.</p>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Confidence: 92%</span>
              </div>
            </div>

            {/* Form Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* DEMOGRAPHICS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">DEMOGRAPHICS</span>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Nama Lengkap</label>
                    <input type="text" defaultValue="Budi Santoso" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Umur</label>
                    <input type="text" defaultValue="42" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Jenis Kelamin</label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>Laki-laki</option>
                      <option>Perempuan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PSYCHOSOCIAL PROFILE */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">PSYCHOSOCIAL PROFILE</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-600">Ringkasan Keseharian</label>
                    <button className="flex items-center space-x-1 text-[10px] font-bold text-teal-600 hover:text-teal-700">
                      <RefreshCw className="w-3 h-3" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                  <textarea 
                    rows={3} 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
                    defaultValue="Mantan buruh bangunan, kehilangan lengan kanan akibat kecelakaan kerja 1 tahun lalu. Saat ini beraktivitas terbatas membantu istri mengelola warung kecil di rumah. Kesulitan dalam..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Hobi & Aktivitas Spesifik</label>
                  <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg flex items-center flex-wrap gap-2 focus-within:ring-2 focus-within:ring-teal-500">
                    <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                      <span>Otomotif</span>
                      <button className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                      <span>Mekanik Dasar</span>
                      <button className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                    </div>
                    <input type="text" placeholder="Add tag..." className="flex-1 bg-transparent text-sm min-w-[100px] focus:outline-none text-gray-800 placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Kondisi Ekonomi & Finansial</label>
                  <textarea 
                    rows={2} 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
                    defaultValue="Berada dalam kondisi prasejahtera pasca-kecelakaan. Pendapatan harian dari warung sangat minim (Rp30.000 - Rp50.000). Memiliki dua anak..."
                  />
                </div>
              </div>

              {/* PROSTHETIC REQUIREMENTS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">PROSTHETIC REQUIREMENTS</span>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Motivasi Utama</label>
                  <textarea 
                    rows={2} 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
                    defaultValue="Motivasi ekstrinsik kuat: Ingin kembali bekerja di sektor konstruksi (mandor) untuk membiayai sekolah anak."
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
