"use client";

import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Mic, 
  RefreshCw, 
  Cpu, 
  Sparkles, 
  Loader2, 
  Lock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  Radio
} from "lucide-react";
import { useState, useEffect, useRef, use } from "react";
import { getCandidateById, updateCandidate } from "../../../actions/candidate";

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Unwrap params safely
  const unwrappedParams = typeof (params as any).then === "function" ? use(params as Promise<{ id: string }>) : (params as { id: string });
  const candidateIdParam = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form states
  const [nama, setNama] = useState("");
  const [umur, setUmur] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [ekonomi, setEkonomi] = useState("");
  const [motivasi, setMotivasi] = useState("");
  const [hobi, setHobi] = useState("");
  const [status, setStatus] = useState("Ready");

  // Audio Player & Sync states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const isLocked = status === "Verified";

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      const res = await getCandidateById(candidateIdParam);
      if (res.success && res.candidate) {
        const c = res.candidate;
        setCandidate(c);
        setNama(c.nama || "");
        setUmur(c.umur || "");
        setJenisKelamin(c.jenisKelamin || "");
        setRingkasan(c.ringkasan || "");
        setEkonomi(c.ekonomi || "");
        setMotivasi(c.motivasi || "");
        setHobi(c.hobi || "");
        setStatus(c.status || "Ready");
        setTranscript(res.transcriptSegments || []);
      } else {
        setMessage({ text: res.message || "Gagal memuat data kandidat", type: "error" });
      }
      setLoading(false);
    }

    fetchDetail();
  }, [candidateIdParam]);

  // Sync Active Segment based on Audio CurrentTime
  useEffect(() => {
    if (!transcript || transcript.length === 0) return;

    let activeIdx: number | null = null;
    for (let i = 0; i < transcript.length; i++) {
      const seg = transcript[i];
      const start = seg.rawStart !== undefined ? seg.rawStart : i * 15;
      const nextSeg = transcript[i + 1];
      const end = nextSeg ? (nextSeg.rawStart !== undefined ? nextSeg.rawStart : (i + 1) * 15) : start + 30;

      if (currentTime >= start && currentTime < end) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx !== activeSegmentIndex) {
      setActiveSegmentIndex(activeIdx);
      if (activeIdx !== null && segmentRefs.current[activeIdx]) {
        segmentRefs.current[activeIdx]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentTime, transcript, activeSegmentIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatSeconds = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSave = async (lockData: boolean = false) => {
    if (!candidate || isLocked) return;
    setSaving(true);
    setMessage(null);

    const newStatus = lockData ? "Verified" : status;

    const res = await updateCandidate(candidate.id, {
      nama,
      umur,
      jenisKelamin,
      ringkasan,
      ekonomi,
      motivasi,
      hobi,
      status: newStatus,
    });

    setSaving(false);
    if (res.success) {
      if (lockData) setStatus("Verified");
      setMessage({
        text: lockData ? "Data kandidat telah disetujui & dikunci!" : "Perubahan berhasil disimpan ke database!",
        type: "success",
      });
    } else {
      setMessage({ text: res.message || "Gagal menyimpan perubahan", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center space-x-3 text-teal-700 font-medium">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat profil kandidat...</span>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] p-8 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Kandidat Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">{message?.text || "Data dengan ID ini tidak ada di database."}</p>
        <Link href="/dashboard/candidates">
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors">
            Kembali ke Daftar Kandidat
          </button>
        </Link>
      </div>
    );
  }

  // Sample fallback audio URL for interactive player demo
  const sampleAudioUrl = candidate?.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC]">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={sampleAudioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleTimeUpdate}
      />

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
                ID: {candidate.candidateCode}
              </span>
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${
                isLocked ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{nama || candidate.nama}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {message && (
            <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${
              message.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </span>
          )}

          {isLocked ? (
            <div className="flex items-center space-x-2 px-4 py-2 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-sm font-semibold shadow-sm">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>Data Telah Disetujui & Dikunci</span>
            </div>
          ) : (
            <button 
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#0F766E] text-white rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Setujui & Kunci Data</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Two Columns */}
      <div className="flex-1 flex overflow-hidden border-t border-gray-200 bg-[#F8FAFC]">
        
        {/* Left Column: Interview Transcript & Interactive Audio Player */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 overflow-hidden bg-[#F8FAFC] p-6">
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex-1 flex flex-col overflow-hidden">
            {/* Header Left Panel */}
            <div className="p-6 pb-4 border-b border-gray-50 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Mic className="w-5 h-5 text-teal-700" />
                  <h2 className="text-lg font-bold text-gray-900">Interview Transcript</h2>
                </div>
                <p className="text-[11px] text-gray-500 font-mono">Click any text line to seek audio timestamp</p>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-full">
                <Radio className={`w-3 h-3 ${isPlaying ? "text-teal-600 animate-pulse" : "text-gray-400"}`} />
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
                  {isPlaying ? "Live Playing" : "Click-to-Seek"}
                </span>
              </div>
            </div>

            {/* Click-to-Seek Audio Player Control Bar */}
            <div className="bg-teal-900 text-white px-6 py-3.5 flex items-center space-x-4 shadow-inner">
              <button 
                onClick={togglePlay}
                className="w-9 h-9 bg-teal-500 hover:bg-teal-400 text-white rounded-full flex items-center justify-center transition-colors shadow-md shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-teal-200">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatSeconds(currentTime)}</span>
                  </span>
                  <span>{formatSeconds(duration || (transcript.length * 15))}</span>
                </div>
                <input 
                  type="range"
                  min={0}
                  max={duration || (transcript.length * 15)}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full h-1.5 bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <button 
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="text-teal-300 hover:text-white p-1 rounded transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Transcript Scrollable Area with Interactive Click-to-Seek */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {transcript.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-10">
                  Tidak ada transkrip wawancara yang tersimpan untuk kandidat ini.
                </div>
              ) : (
                transcript.map((segment: any, index: number) => {
                  const segTime = segment.rawStart !== undefined ? segment.rawStart : index * 15;
                  const isActive = activeSegmentIndex === index;

                  return (
                    <div 
                      key={segment.id || index} 
                      ref={(el) => { segmentRefs.current[index] = el; }}
                      onClick={() => seekTo(segTime)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start space-x-3 ${
                        isActive 
                          ? "bg-teal-50 border-teal-300 shadow-sm ring-1 ring-teal-400/50" 
                          : "bg-white border-transparent hover:bg-gray-50/80 hover:border-gray-200"
                      }`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); seekTo(segTime); }}
                        className={`text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0 transition-colors ${
                          isActive 
                            ? "bg-teal-600 text-white" 
                            : "bg-gray-100 text-gray-500 group-hover:bg-teal-100 group-hover:text-teal-800"
                        }`}
                        title="Klik untuk putar audio dari detik ini"
                      >
                        [{segment.startStr ? segment.startStr.split(',')[0].split(':').slice(1).join(':') : formatSeconds(segTime)}]
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold text-xs ${index % 2 === 0 ? "text-teal-800" : "text-[#1E3A8A]"}`}>
                            {index % 2 === 0 ? "Interviewer: " : `${nama ? nama.split(" ")[0] : "Kandidat"}: `}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest bg-teal-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-ping"></span>
                              <span>PLAYING</span>
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed transition-colors ${
                          isActive ? "text-gray-900 font-medium" : "text-gray-700"
                        }`}>
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
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
                <p className="text-[11px] text-gray-500 font-mono">
                  {isLocked ? "Data ini telah dikunci dan tidak dapat diubah lagi." : "Review and refine AI-extracted clinical data before locking."}
                </p>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">Confidence: 94%</span>
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
                      value={nama} 
                      disabled={isLocked}
                      onChange={(e) => setNama(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Umur</label>
                    <input 
                      type="text" 
                      value={umur} 
                      disabled={isLocked}
                      onChange={(e) => setUmur(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Jenis Kelamin</label>
                    <select 
                      value={jenisKelamin} 
                      disabled={isLocked}
                      onChange={(e) => setJenisKelamin(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      <option value="">Pilih</option>
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
                    value={ringkasan}
                    disabled={isLocked}
                    onChange={(e) => setRingkasan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Hobi & Aktivitas Spesifik</label>
                  <input 
                    type="text"
                    value={hobi}
                    disabled={isLocked}
                    onChange={(e) => setHobi(e.target.value)}
                    placeholder="Contoh: Otomotif, Mekanik, Memasak"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Kondisi Ekonomi & Finansial</label>
                  <textarea 
                    rows={2} 
                    value={ekonomi}
                    disabled={isLocked}
                    onChange={(e) => setEkonomi(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                    value={motivasi}
                    disabled={isLocked}
                    onChange={(e) => setMotivasi(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
