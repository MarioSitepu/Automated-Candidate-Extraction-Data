"use client";

import React, { createContext, useContext, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { extractDataFromTranscript, runVideoToText, getDeepgramClientKey } from "../actions/extract";
import { createCandidate } from "../actions/candidate";
import { compressAudioInBrowser, formatDeepgramUtterances } from "../utils/clientAudio";

interface ExtractedCandidateData {
  nama?: string;
  umur?: string;
  jenisKelamin?: string;
  ringkasan?: string;
  ekonomi?: string;
  motivasi?: string;
  assessmentJson?: string;
}

export type UploadStatus = "idle" | "transcribing" | "extracting" | "saving" | "completed" | "error";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "error";
  candidateId?: string;
  candidateCode?: string;
  read: boolean;
}

interface UploadTask {
  fileName: string;
  status: UploadStatus;
  progressText: string;
  errorMsg?: string;
  candidateId?: string;
  candidateCode?: string;
  candidateName?: string;
}

interface UploadContextType {
  currentTask: UploadTask | null;
  notifications: NotificationItem[];
  unreadCount: number;
  startUpload: (file: File) => Promise<void>;
  startGDriveUpload: (fileIdOrUrl: string) => Promise<void>;
  dismissTask: () => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notif: { title: string; message: string; type: "info" | "success" | "error"; candidateId?: string; candidateCode?: string }) => void;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: "init-1",
    title: "Database Cloud Terhubung",
    message: "Aplikasi berhasil terhubung ke Supabase PostgreSQL.",
    timestamp: "Baru saja",
    type: "info",
    read: false,
  },
  {
    id: "init-2",
    title: "Kandidat Terverifikasi",
    message: "Kandidat Budi Santoso [KB-2024-001] telah diverifikasi.",
    timestamp: "10 menit lalu",
    type: "success",
    candidateId: "KB-2024-001",
    read: false,
  },
];

const UploadContext = createContext<UploadContextType>({
  currentTask: null,
  notifications: defaultNotifications,
  unreadCount: defaultNotifications.length,
  startUpload: async () => {},
  startGDriveUpload: async () => {},
  dismissTask: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  addNotification: () => {},
});

export const useUpload = () => useContext(UploadContext);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [currentTask, setCurrentTask] = useState<UploadTask | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(defaultNotifications);

  const addNotification = (notif: { title: string; message: string; type: "info" | "success" | "error"; candidateId?: string; candidateCode?: string }) => {
    const newItem: NotificationItem = {
      id: "notif-" + Date.now(),
      title: notif.title,
      message: notif.message,
      timestamp: "Baru saja",
      type: notif.type,
      candidateId: notif.candidateId,
      candidateCode: notif.candidateCode,
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const startUpload = async (file: File) => {
    if (
      currentTask &&
      (currentTask.status === "transcribing" ||
        currentTask.status === "extracting" ||
        currentTask.status === "saving")
    ) {
      return;
    }

    setCurrentTask({
      fileName: file.name,
      status: "transcribing",
      progressText: "Mengekstrak trek audio dari file...",
    });

    addNotification({
      title: "Transkripsi AI Dimulai",
      message: `Memproses file ${file.name} dengan Deepgram Nova-3 AI.`,
      type: "info",
    });

    try {
      // Step 1: Extract AAC audio in browser (turns 1 GB video into ~10-20 MB in seconds)
      let fileToSend: File = file;
      try {
        fileToSend = await compressAudioInBrowser(file, (progressText) => {
          setCurrentTask((prev) => prev ? { ...prev, progressText } : null);
        });
      } catch (audioErr) {
        console.warn("Client audio extraction fell back to source file:", audioErr);
      }

      const sizeMb = (fileToSend.size / (1024 * 1024)).toFixed(1);
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              progressText: `Mentranskripsi audio (${sizeMb} MB) via Deepgram Nova-3 AI...`,
            }
          : null
      );

      // Step 2: Direct browser-to-Deepgram upload (CORS-supported, up to 2 GB, bypasses Vercel 4.5 MB limit)
      let deepgramKey = "";
      try {
        const keyApi = await fetch("/api/deepgram-key");
        const keyJson = await keyApi.json();
        if (keyJson.success && keyJson.key) {
          deepgramKey = keyJson.key;
        } else {
          throw new Error(keyJson.message || "Gagal mendapatkan DEEPGRAM_API_KEY.");
        }
      } catch (keyErr: unknown) {
        // Fallback to Server Action
        const actionRes = await getDeepgramClientKey();
        if (actionRes.success && actionRes.key) {
          deepgramKey = actionRes.key;
        } else {
          throw new Error(
            (keyErr instanceof Error ? keyErr.message : "") ||
            actionRes.message ||
            "DEEPGRAM_API_KEY belum dikonfigurasi di Environment Variables Vercel."
          );
        }
      }

      const dgUrl = "https://api.deepgram.com/v1/listen?model=nova-3&language=id&smart_format=true&punctuate=true&utterances=true&diarize=true";

      const dgRes = await fetch(dgUrl, {
        method: "POST",
        headers: {
          "Authorization": `Token ${deepgramKey}`,
          "Content-Type": fileToSend.type || "application/octet-stream",
        },
        body: fileToSend,
      });

      if (!dgRes.ok) {
        const errJson = await dgRes.json().catch(() => ({}));
        throw new Error(errJson.err_msg || errJson.message || `Gagal transkripsi Deepgram (Status HTTP ${dgRes.status}).`);
      }

      const dgData = await dgRes.json();
      const segments = formatDeepgramUtterances(dgData);
      const fullText = segments.map((s: { text: string }) => s.text).join("\n");

      // Step 3: Extract Data via LLaMA 3
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              status: "extracting",
              progressText: "Mengekstrak data kandidat dari transkrip...",
            }
          : null
      );

      const aiResult = await extractDataFromTranscript(fullText);
      const extractedData: ExtractedCandidateData = aiResult.success && aiResult.data ? aiResult.data : {};

      // Step 4: Save to Supabase DB
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              status: "saving",
              progressText: "Menyimpan kandidat baru ke Supabase PostgreSQL...",
            }
          : null
      );

      const candidateName = extractedData?.nama || "Kandidat Baru";
      const dbRes = await createCandidate({
        nama: candidateName,
        umur: extractedData?.umur || "-",
        jenisKelamin: extractedData?.jenisKelamin || "-",
        ringkasan: extractedData?.ringkasan || "-",
        ekonomi: extractedData?.ekonomi || "-",
        motivasi: extractedData?.motivasi || "-",
        status: "Ready",
        transcriptSegments: segments,
        assessmentJson: extractedData?.assessmentJson || undefined,
      });

      if (!dbRes.success || !dbRes.candidate) {
        throw new Error(dbRes.message || "Gagal menyimpan kandidat ke database.");
      }

      // Step 5: Completed
      setCurrentTask({
        fileName: file.name,
        status: "completed",
        progressText: "Proses transkripsi & ekstraksi AI selesai!",
        candidateId: dbRes.candidate.id,
        candidateCode: dbRes.candidate.candidateCode,
        candidateName,
      });

      addNotification({
        title: "Transkripsi & Ekstraksi Sukses",
        message: `Kandidat ${candidateName} (${dbRes.candidate.candidateCode}) tersimpan di Supabase.`,
        type: "success",
        candidateId: dbRes.candidate.id,
        candidateCode: dbRes.candidate.candidateCode,
      });

    } catch (error: unknown) {
      console.error("Background upload error:", error);
      const formattedMsg = error instanceof Error ? error.message : "Gagal memproses file.";

      setCurrentTask({
        fileName: file.name,
        status: "error",
        progressText: "Gagal memproses file lokal.",
        errorMsg: formattedMsg,
      });

      addNotification({
        title: "Gagal Upload File Lokal",
        message: formattedMsg,
        type: "error",
      });
    }
  };

  const startGDriveUpload = async (fileIdOrUrl: string) => {
    if (
      currentTask &&
      (currentTask.status === "transcribing" ||
        currentTask.status === "extracting" ||
        currentTask.status === "saving")
    ) {
      return;
    }

    setCurrentTask({
      fileName: `Google Drive (${fileIdOrUrl.slice(0, 18)}...)`,
      status: "transcribing",
      progressText: "Mengunduh & mentranskripsi video dari Google Drive...",
    });

    addNotification({
      title: "Ekstraksi Google Drive Dimulai",
      message: "Mengambil file dari Google Drive dan memproses dengan Whisper AI.",
      type: "info",
    });

    try {
      const extractRes = await runVideoToText(fileIdOrUrl);

      if (!extractRes.success) {
        throw new Error(extractRes.message || "Gagal memproses file Google Drive.");
      }

      const segments = extractRes.segments || [];
      const fullText = segments.map((s: { text: string }) => s.text).join("\n");

      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              status: "extracting",
              progressText: "Mengekstrak data psikososial dengan LLaMA 3...",
            }
          : null
      );

      const aiResult = await extractDataFromTranscript(fullText);
      const extractedData: ExtractedCandidateData = aiResult.success && aiResult.data ? aiResult.data : {};

      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              status: "saving",
              progressText: "Menyimpan kandidat baru ke Supabase PostgreSQL...",
            }
          : null
      );

      const candidateName = extractedData?.nama || "Kandidat GDrive";
      const dbRes = await createCandidate({
        nama: candidateName,
        umur: extractedData?.umur || "-",
        jenisKelamin: extractedData?.jenisKelamin || "-",
        ringkasan: extractedData?.ringkasan || "-",
        ekonomi: extractedData?.ekonomi || "-",
        motivasi: extractedData?.motivasi || "-",
        status: "Ready",
        audioUrl: extractRes.audioUrl || undefined,
        transcriptSegments: segments,
        assessmentJson: extractedData?.assessmentJson || undefined,
      });

      if (!dbRes.success || !dbRes.candidate) {
        throw new Error(dbRes.message || "Gagal menyimpan kandidat ke database.");
      }

      setCurrentTask({
        fileName: `GDrive: ${candidateName}`,
        status: "completed",
        progressText: "Proses ekstraksi Google Drive selesai!",
        candidateId: dbRes.candidate.id,
        candidateCode: dbRes.candidate.candidateCode,
        candidateName,
      });

      addNotification({
        title: "Ekstraksi GDrive Sukses",
        message: `Kandidat ${candidateName} (${dbRes.candidate.candidateCode}) tersimpan di Supabase.`,
        type: "success",
        candidateId: dbRes.candidate.id,
        candidateCode: dbRes.candidate.candidateCode,
      });

    } catch (error: unknown) {
      console.error("GDrive upload error:", error);
      const errorMsg = error instanceof Error ? error.message : "Gagal memproses link Google Drive.";
      setCurrentTask({
        fileName: "Google Drive Video",
        status: "error",
        progressText: "Terjadi kesalahan saat memproses Google Drive.",
        errorMsg,
      });

      addNotification({
        title: "Gagal Memproses Google Drive",
        message: errorMsg,
        type: "error",
      });
    }
  };

  const dismissTask = () => {
    setCurrentTask(null);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <UploadContext.Provider
      value={{
        currentTask,
        notifications,
        unreadCount,
        startUpload,
        startGDriveUpload,
        dismissTask,
        markAllAsRead,
        clearNotifications,
        addNotification,
      }}
    >
      {children}
      <FloatingUploadWidget />
    </UploadContext.Provider>
  );
}

function FloatingUploadWidget() {
  const { currentTask, dismissTask } = useUpload();

  if (!currentTask) return null;

  const isProcessing =
    currentTask.status === "transcribing" ||
    currentTask.status === "extracting" ||
    currentTask.status === "saving";

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-100 p-5 transition-all animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${
            currentTask.status === "completed" ? "bg-teal-50 text-teal-600 border border-teal-100" :
            currentTask.status === "error" ? "bg-red-50 text-red-600 border border-red-100" :
            "bg-teal-600 text-white shadow-md shadow-teal-600/20"
          }`}>
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentTask.status === "completed" ? (
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {isProcessing ? "AI BACKGROUND TASK" : currentTask.status === "completed" ? "SELESAI" : "ERROR"}
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900 truncate max-w-[220px]">
              {currentTask.fileName}
            </h4>
          </div>
        </div>

        <button 
          onClick={dismissTask}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress & Details */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 font-medium">
          {currentTask.progressText}
        </p>

        {isProcessing && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-teal-600 h-1.5 rounded-full animate-pulse transition-all duration-500"
              style={{
                width: currentTask.status === "transcribing" ? "35%" :
                       currentTask.status === "extracting" ? "70%" : "90%"
              }}
            ></div>
          </div>
        )}

        {currentTask.status === "error" && currentTask.errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
            {currentTask.errorMsg}
          </p>
        )}

        {currentTask.status === "completed" && (
          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-800">
              {currentTask.candidateCode} • {currentTask.candidateName}
            </div>
            <Link 
              href={`/dashboard/candidates/${currentTask.candidateId}`}
              onClick={dismissTask}
              className="flex items-center space-x-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Lihat Kandidat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
