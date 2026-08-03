"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CandidateInput {
  nama: string;
  umur?: string;
  jenisKelamin?: string;
  ringkasan?: string;
  ekonomi?: string;
  motivasi?: string;
  hobi?: string;
  status?: string;
  audioUrl?: string;
  transcriptSegments?: any[];
}

// Generate unique candidate code: KB-2024-001, KB-2024-002, etc.
async function generateCandidateCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.candidate.count();
  const nextNum = (count + 1).toString().padStart(3, "0");
  return `KB-${currentYear}-${nextNum}`;
}

export async function createCandidate(data: CandidateInput) {
  try {
    const candidateCode = await generateCandidateCode();
    const createData: any = {
      candidateCode,
      nama: data.nama || "Tanpa Nama",
      umur: data.umur || "-",
      jenisKelamin: data.jenisKelamin || "-",
      ringkasan: data.ringkasan || "-",
      ekonomi: data.ekonomi || "-",
      motivasi: data.motivasi || "-",
      hobi: data.hobi || "",
      status: data.status || "Ready",
      transcriptJson: data.transcriptSegments ? JSON.stringify(data.transcriptSegments) : null,
    };

    if (data.audioUrl) {
      createData.audioUrl = data.audioUrl;
    }

    const candidate = await prisma.candidate.create({
      data: createData,
    });

    try {
      revalidatePath("/dashboard/candidates");
      revalidatePath("/dashboard");
    } catch (e) {
      // Ignored outside Next.js request context
    }
    return { success: true, candidate };
  } catch (error: any) {
    console.error("Error creating candidate:", error);
    return { success: false, message: error.message || "Gagal menyimpan kandidat" };
  }
}

export async function getCandidates(searchQuery?: string, statusFilter?: string, genderFilter?: string) {
  try {
    const where: any = {};

    if (searchQuery && searchQuery.trim() !== "") {
      where.OR = [
        { nama: { contains: searchQuery } },
        { candidateCode: { contains: searchQuery } },
      ];
    }

    if (statusFilter && statusFilter !== "Status: All" && statusFilter !== "All") {
      where.status = statusFilter;
    }

    if (genderFilter && genderFilter !== "Gender: Semua" && genderFilter !== "Semua") {
      const code = genderFilter.includes("Laki") || genderFilter === "L" ? "L" : genderFilter.includes("Perempuan") || genderFilter === "P" ? "P" : genderFilter;
      where.jenisKelamin = { contains: code };
    }

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, candidates };
  } catch (error: any) {
    console.error("Error fetching candidates:", error);
    return { success: false, candidates: [], message: error.message };
  }
}

export async function getCandidateById(idOrCode: string) {
  try {
    let candidate = await prisma.candidate.findUnique({
      where: { id: idOrCode },
    });

    if (!candidate) {
      candidate = await prisma.candidate.findUnique({
        where: { candidateCode: idOrCode },
      });
    }

    if (!candidate) {
      return { success: false, message: "Kandidat tidak ditemukan" };
    }

    let transcriptSegments: any[] = [];
    if (candidate.transcriptJson) {
      try {
        transcriptSegments = JSON.parse(candidate.transcriptJson);
      } catch (e) {
        console.error("Failed to parse transcript json:", e);
      }
    }

    return { success: true, candidate, transcriptSegments };
  } catch (error: any) {
    console.error("Error fetching candidate detail:", error);
    return { success: false, message: error.message };
  }
}

export async function updateCandidate(id: string, data: Partial<CandidateInput>) {
  try {
    const updateData: any = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.umur !== undefined) updateData.umur = data.umur;
    if (data.jenisKelamin !== undefined) updateData.jenisKelamin = data.jenisKelamin;
    if (data.ringkasan !== undefined) updateData.ringkasan = data.ringkasan;
    if (data.ekonomi !== undefined) updateData.ekonomi = data.ekonomi;
    if (data.motivasi !== undefined) updateData.motivasi = data.motivasi;
    if (data.hobi !== undefined) updateData.hobi = data.hobi;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;
    if (data.transcriptSegments !== undefined) {
      updateData.transcriptJson = JSON.stringify(data.transcriptSegments);
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: updateData,
    });

    try {
      revalidatePath("/dashboard/candidates");
      revalidatePath(`/dashboard/candidates/${id}`);
      revalidatePath("/dashboard");
    } catch (e) {
      // Ignored outside Next.js request context
    }
    return { success: true, candidate: updated };
  } catch (error: any) {
    console.error("Error updating candidate:", error);
    return { success: false, message: error.message || "Gagal mengupdate kandidat" };
  }
}

export async function getDashboardStats() {
  try {
    const totalCandidates = await prisma.candidate.count();
    const processingCount = await prisma.candidate.count({ where: { status: "Processing" } });
    const readyCount = await prisma.candidate.count({ where: { status: "Ready" } });
    const verifiedCount = await prisma.candidate.count({ where: { status: "Verified" } });

    const recentLogs = await prisma.candidate.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        candidateCode: true,
        nama: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      stats: {
        total: totalCandidates,
        processing: processingCount,
        ready: readyCount,
        verified: verifiedCount,
        recentLogs,
      },
    };
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return {
      success: false,
      stats: { total: 0, processing: 0, ready: 0, verified: 0, recentLogs: [] },
    };
  }
}

export async function deleteCandidate(id: string) {
  try {
    await prisma.candidate.delete({
      where: { id },
    });

    try {
      revalidatePath("/dashboard/candidates");
      revalidatePath("/dashboard");
    } catch (e) {
      // Ignored outside Next.js request context
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting candidate:", error);
    return { success: false, message: error.message || "Gagal menghapus kandidat" };
  }
}


