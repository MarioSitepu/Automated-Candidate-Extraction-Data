"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud, CheckCircle2, HardDrive, Link as LinkIcon, Sparkles, AlertCircle, X } from "lucide-react";
import { useUpload } from "../../context/UploadContext";
import Link from "next/link";

export default function UploadPage() {
  const { currentTask, startUpload, startGDriveUpload, dismissTask } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "gdrive">("file");
  const [gdriveInput, setGdriveInput] = useState("");
  const [gdriveError, setGdriveError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const maxSizeBytes = 500 * 1024 * 1024; // 500 MB
    if (selectedFile.size > maxSizeBytes) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(0);
      alert(`⚠️ Peringatan Ukuran File:\nUkuran file Anda (${sizeMb} MB) melebihi batas upload langsung (500 MB).\n\nSilakan beralih ke tab "Google Drive (Bebas Ukuran)" di atas untuk memproses file video berukuran besar tanpa hambatan!`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    startUpload(selectedFile);
  };

  const handleGDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdriveInput.trim()) {
      setGdriveError("Silakan masukkan Link atau File ID Google Drive.");
      return;
    }
    setGdriveError("");
    startGDriveUpload(gdriveInput.trim());
  };

  const isProcessing =
    currentTask &&
    (currentTask.status === "transcribing" ||
      currentTask.status === "extracting" ||
      currentTask.status === "saving");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        
        {/* Header Icon */}
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8 text-teal-600" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isProcessing ? "Memproses Transkripsi & AI..." : "Upload Data Wawancara"}
        </h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          {isProcessing 
            ? "Sistem sedang mengompres audio, mentranskripsi wawancara, dan mengekstrak data psikososial di background. Anda bebas berpindah ke halaman lain!" 
            : "Pilih file rekaman atau masukkan link Google Drive untuk diekstrak oleh AI secara otomatis ke Supabase."}
        </p>

        {/* Processing / Result Status Cards */}
        {isProcessing ? (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">Background Status</span>
              <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded font-bold">
                {currentTask.status === "transcribing" ? "WHISPER AI" : currentTask.status === "extracting" ? "LLAMA 3 AI" : "SUPABASE"}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800">{currentTask.fileName}</p>
            <p className="text-xs text-gray-600">{currentTask.progressText}</p>
            <div className="w-full bg-teal-200/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-teal-600 h-1.5 rounded-full animate-pulse transition-all duration-500"
                style={{
                  width: currentTask.status === "transcribing" ? "35%" :
                         currentTask.status === "extracting" ? "70%" : "90%"
                }}
              ></div>
            </div>
            <p className="text-[11px] text-teal-700 font-medium italic">
              💡 Tip: Anda bisa membuka menu Candidate List atau Dashboard tanpa membatalkan proses ini.
            </p>
          </div>
        ) : currentTask?.status === "completed" ? (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center space-x-2 text-teal-700 font-bold">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <span>Transkripsi & Ekstraksi Berhasil!</span>
            </div>
            <p className="text-xs text-gray-600">
              Kandidat <strong className="text-gray-900">{currentTask.candidateName}</strong> ({currentTask.candidateCode}) telah berhasil disimpan ke database Supabase.
            </p>
            <div className="pt-2 flex items-center space-x-3">
              <Link 
                href={`/dashboard/candidates/${currentTask.candidateId}`}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors shadow-sm"
              >
                Lihat Detail Kandidat
              </Link>
              <button 
                onClick={() => {
                  dismissTask();
                  setGdriveInput("");
                }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Proses File Lain
              </button>
            </div>
          </div>
        ) : currentTask?.status === "error" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-800 font-bold">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Pemberitahuan Sistem</span>
              </div>
              <button
                onClick={dismissTask}
                className="text-amber-700 hover:text-amber-900 p-1 rounded-md hover:bg-amber-100/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-amber-900 whitespace-pre-line leading-relaxed font-medium">
              {currentTask.errorMsg}
            </p>
            <div className="pt-1 flex items-center space-x-2">
              <button
                onClick={dismissTask}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
              >
                Tutup & Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tab Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("file")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === "file" 
                    ? "bg-white text-teal-800 shadow-sm" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Upload File Lokal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("gdrive")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === "gdrive" 
                    ? "bg-white text-teal-800 shadow-sm" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Google Drive (Bebas Ukuran)</span>
              </button>
            </div>

            {/* Tab 1: Local File */}
            {activeTab === "file" && (
              <div className="space-y-4">
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3.5 bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl font-semibold shadow-sm w-full cursor-pointer flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="w-5 h-5" />
                  <span>Pilih File Rekaman (Audio/Video)</span>
                </button>
                <p className="text-[11px] text-gray-400">Dukungan format MP3, WAV, MP4, MOV, WebM (&lt; 500 MB)</p>
              </div>
            )}

            {/* Tab 2: Google Drive Link / ID */}
            {activeTab === "gdrive" && (
              <form onSubmit={handleGDriveSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Link Share atau File ID Google Drive
                  </label>
                  <input 
                    type="text" 
                    value={gdriveInput}
                    onChange={(e) => setGdriveInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {gdriveError && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{gdriveError}</p>
                  )}
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-[11px] text-teal-800 space-y-1">
                  <p className="font-bold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Keunggulan Google Drive:</span>
                  </p>
                  <p>• Cocok untuk video berukuran raksasa (&gt; 500 MB hingga beberapa GB).</p>
                  <p>• Bebas hambatan kuota upload browser &amp; tidak ada risiko timeout.</p>
                </div>

                <button 
                  type="submit"
                  className="px-6 py-3 bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl font-semibold shadow-sm w-full cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Ekstraksi AI dari Google Drive</span>
                </button>
              </form>
            )}
          </div>
        )}

        {currentTask?.status === "error" && (
          <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-left">
            {currentTask.errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
