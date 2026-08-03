"use client";

import { useRef } from "react";
import { Loader2, UploadCloud, CheckCircle2, Mic, Cpu, Sparkles } from "lucide-react";
import { useUpload } from "../../context/UploadContext";
import Link from "next/link";

export default function UploadPage() {
  const { currentTask, startUpload } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    startUpload(selectedFile);
  };

  const isProcessing =
    currentTask &&
    (currentTask.status === "transcribing" ||
      currentTask.status === "extracting" ||
      currentTask.status === "saving");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8 text-teal-600" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isProcessing ? "Memproses Transkripsi & AI..." : "Upload Data Wawancara"}
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          {isProcessing 
            ? "Sistem sedang mengompres audio, mentranskripsi wawancara, dan mengekstrak data psikososial di background. Anda bebas berpindah ke halaman lain!" 
            : "Pilih file rekaman wawancara (audio/video) untuk diekstrak oleh AI secara otomatis ke Supabase database."}
        </p>

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
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Upload File Lain
              </button>
            </div>
          </div>
        ) : (
          <>
            <input 
              type="file" 
              accept="audio/*,video/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl font-semibold shadow-sm w-full cursor-pointer"
            >
              Pilih File Rekaman
            </button>
          </>
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
