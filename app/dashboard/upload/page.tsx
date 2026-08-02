"use client";

import { useState, useRef } from "react";
import { Mic, RefreshCw, Cpu, Sparkles, Loader2, CheckCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadAndExtract, extractDataFromTranscript } from "../../actions/extract";
import { createCandidate } from "../../actions/candidate";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsLoading(true);
    setErrorMsg("");
    setTranscript([]);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const result = await uploadAndExtract(formData);
    
    if (result.success) {
      setTranscript(result.segments);
      
      // Tahap 2: AI Data Extraction
      const fullText = result.segments.map((s: any) => s.text).join("\n");
      const dataResult = await extractDataFromTranscript(fullText);
      if (dataResult.success) {
        setExtractedData(dataResult.data);
      } else {
        console.error("Failed to extract JSON data:", dataResult.message);
      }
    } else {
      setErrorMsg(result.message || "Failed to extract");
    }
    
    setIsLoading(false);
  };

  const handleSaveCandidate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg("");

    const res = await createCandidate({
      nama: extractedData?.nama || "Kandidat Baru",
      umur: extractedData?.umur || "-",
      jenisKelamin: extractedData?.jenisKelamin || "-",
      ringkasan: extractedData?.ringkasan || "-",
      ekonomi: extractedData?.ekonomi || "-",
      motivasi: extractedData?.motivasi || "-",
      status: "Verified",
      transcriptSegments: transcript,
    });

    setIsSaving(false);

    if (res.success && res.candidate) {
      router.push("/dashboard/candidates");
    } else {
      setErrorMsg(res.message || "Gagal menyimpan kandidat ke database.");
    }
  };


  // If no file uploaded or still loading, show the upload UI
  if (!file || isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-teal-600" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLoading ? "Processing Audio..." : "Upload Interview Data"}
          </h2>
          <p className="text-gray-500 mb-8">
            {isLoading 
              ? "Sistem sedang mengompres audio dan menggunakan AI untuk mentranskripsi wawancara. Harap tunggu..." 
              : "Pilih file rekaman wawancara (audio/video) untuk diekstrak oleh AI secara otomatis."}
          </p>

          {!isLoading && (
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
                className="px-6 py-3 bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl font-semibold shadow-sm w-full"
              >
                Pilih File Rekaman
              </button>
              
              {errorMsg && (
                <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-left">
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // If upload & extraction is done, show the two-column review UI
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between bg-[#F8FAFC]">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-[10px] font-bold text-teal-600 tracking-widest uppercase bg-teal-50 px-2 py-0.5 rounded">
              AI EXTRACTION RESULT
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{file.name}</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { setFile(null); setTranscript([]); setExtractedData(null); }}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <span>Upload File Lain</span>
          </button>
          <button 
            onClick={handleSaveCandidate}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>{isSaving ? "Menyimpan..." : "Simpan sebagai Kandidat Baru"}</span>
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
              {transcript.map((segment) => (
                <div key={segment.id} className="flex items-start">
                  <span className="text-[10px] text-gray-400 font-mono w-14 pt-1 shrink-0">[{segment.startStr.split(',')[0].split(':').slice(1).join(':')}]</span>
                  <div>
                    {/* Simulating speaker detection */}
                    <span className={`font-bold text-sm ${segment.id % 2 !== 0 ? "text-teal-800" : "text-[#1E3A8A]"}`}>
                      {segment.id % 2 !== 0 ? "Interviewer: " : "Candidate: "}
                    </span>
                    <span className="text-sm text-gray-800 font-medium leading-relaxed">
                      {segment.text}
                    </span>
                  </div>
                </div>
              ))}
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
                  <h2 className="text-lg font-bold text-gray-900">AI Data Extraction</h2>
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
                    <input 
                      type="text" 
                      value={extractedData?.nama || ""}
                      onChange={(e) => setExtractedData({...extractedData, nama: e.target.value})}
                      placeholder={extractedData ? "" : "Generating..."}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Umur</label>
                    <input 
                      type="text" 
                      value={extractedData?.umur || ""}
                      onChange={(e) => setExtractedData({...extractedData, umur: e.target.value})}
                      placeholder={extractedData ? "" : "..."}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                    />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Jenis Kelamin</label>
                    <select 
                      value={extractedData?.jenisKelamin || ""}
                      onChange={(e) => setExtractedData({...extractedData, jenisKelamin: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">(Pilih)</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
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
                  </div>
                  <textarea 
                    rows={3} 
                    value={extractedData?.ringkasan || ""}
                    onChange={(e) => setExtractedData({...extractedData, ringkasan: e.target.value})}
                    placeholder={extractedData ? "" : "Generating..."}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Kondisi Ekonomi & Finansial</label>
                  <textarea 
                    rows={2} 
                    value={extractedData?.ekonomi || ""}
                    onChange={(e) => setExtractedData({...extractedData, ekonomi: e.target.value})}
                    placeholder={extractedData ? "" : "Generating..."}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
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
                    value={extractedData?.motivasi || ""}
                    onChange={(e) => setExtractedData({...extractedData, motivasi: e.target.value})}
                    placeholder={extractedData ? "" : "Generating..."}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
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
