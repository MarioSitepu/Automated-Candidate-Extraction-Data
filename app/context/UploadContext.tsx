"use client";

import React, { createContext, useContext, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { uploadAndExtract, extractDataFromTranscript, runVideoToText } from "../actions/extract";
import { createCandidate } from "../actions/candidate";

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
    setCurrentTask({
      fileName: file.name,
      status: "transcribing",
      progressText: "Mentranskripsi audio menggunakan AI Whisper...",
    });

    addNotification({
      title: "Transkripsi AI Dimulai",
      message: `Memproses file ${file.name} dengan Groq Whisper API.`,
      type: "info",
    });

    try {
      // Step 1: Compress & Transcribe via Raw Stream Route
      const apiRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-file-name": encodeURIComponent(file.name),
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Gagal mengunggah file ke server (Status HTTP ${apiRes.status}).`);
      }

      const extractRes = await apiRes.json();

      if (!extractRes.success) {
        throw new Error(extractRes.message || "Gagal mentranskripsi file audio.");
      }

      const segments = extractRes.segments || [];
      const fullText = segments.map((s: any) => s.text).join("\n");

      // Step 2: Extract Data via LLaMA 3
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
      const extractedData: any = aiResult.success ? aiResult.data : {};

      // Step 3: Save to Supabase DB
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
        audioUrl: extractRes.audioUrl || undefined,
        transcriptSegments: segments,
        assessmentJson: extractedData?.assessmentJson || undefined,
      });

      if (!dbRes.success || !dbRes.candidate) {
        throw new Error(dbRes.message || "Gagal menyimpan kandidat ke database.");
      }

      // Step 4: Completed
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

    } catch (error: any) {
      console.error("Background upload error:", error);
      let formattedMsg = error.message || "Gagal memproses file.";

      const isSizeError =
        formattedMsg.includes("Unexpected end of form") ||
        formattedMsg.includes("maxBodySize") ||
        formattedMsg.includes("payload") ||
        formattedMsg.includes("413");

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

      if (isSizeError) {
        if (file.size > 500 * 1024 * 1024) {
          formattedMsg = `⚠️ Ukuran file Anda (${sizeMb} MB) melebihi batas upload langsung (500 MB). Harap gunakan tab 'Google Drive' untuk memproses file berukuran besar tanpa hambatan.`;
        } else {
          formattedMsg = `⚠️ Gagal mengunggah file (${sizeMb} MB) ke server. Server Next.js menolak payload request. Silakan muat ulang halaman (F5) atau gunakan tab Google Drive.`;
        }
      }

      setCurrentTask({
        fileName: file.name,
        status: "error",
        progressText: "Gagal mengunggah file lokal.",
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
      const fullText = segments.map((s: any) => s.text).join("\n");

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
      const extractedData: any = aiResult.success ? aiResult.data : {};

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

    } catch (error: any) {
      console.error("GDrive upload error:", error);
      setCurrentTask({
        fileName: "Google Drive Video",
        status: "error",
        progressText: "Terjadi kesalahan saat memproses Google Drive.",
        errorMsg: error.message || "Gagal memproses link Google Drive.",
      });

      addNotification({
        title: "Gagal Memproses Google Drive",
        message: error.message || "File Google Drive gagal diproses.",
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
