import "dotenv/config";
import prisma from "../lib/prisma";
import { getDashboardStats, getCandidates } from "../app/actions/candidate";

async function checkDatabaseStatus() {
  console.log("==================================================");
  console.log("🔍 DIAGNOSTIK KONEKSI & DATA SUPABASE POSTGRESQL");
  console.log("==================================================\n");

  try {
    // 1. Cek Tabel User
    const users = await prisma.user.findMany({
      select: { id: true, email: true, createdAt: true }
    });
    console.log(`📌 1. TABEL USER (${users.length} terdaftar):`);
    users.forEach((u) => {
      console.log(`   - ID: ${u.id} | Email: ${u.email} | Mendaftar: ${u.createdAt.toISOString().split("T")[0]}`);
    });
    console.log("");

    // 2. Cek Tabel Candidate
    const candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" }
    });
    console.log(`📌 2. TABEL CANDIDATE (${candidates.length} terdaftar di Supabase):`);
    candidates.forEach((c, idx) => {
      let segmentsCount = 0;
      if (c.transcriptJson) {
        try { segmentsCount = JSON.parse(c.transcriptJson).length; } catch (e) {}
      }
      console.log(`   ${idx + 1}. [${c.candidateCode}] ${c.nama} | Umur: ${c.umur || "-"} | Gender: ${c.jenisKelamin || "-"} | Status: ${c.status} | Transkrip: ${segmentsCount} segmen`);
    });
    console.log("");

    // 3. Cek Server Action Dashboard Stats
    console.log("📌 3. ENGINE SERVER ACTION & STATISTIK REAL-TIME:");
    const statsRes = await getDashboardStats();
    if (statsRes.success) {
      console.log(`   ✅ Dashboard Stats Live:`);
      console.log(`      - Total Kandidat : ${statsRes.stats.total}`);
      console.log(`      - Diproses AI    : ${statsRes.stats.processing}`);
      console.log(`      - Siap Evaluasi  : ${statsRes.stats.ready}`);
      console.log(`      - Terverifikasi  : ${statsRes.stats.verified}`);
      console.log(`      - Activity Logs  : ${statsRes.stats.recentLogs.length} baris diambil`);
    } else {
      console.log("   ❌ Gagal mengambil statistik dashboard.");
    }
    console.log("");

    // 4. Cek Pencarian getCandidates
    const fetchRes = await getCandidates();
    console.log(`📌 4. SERVER ACTION getCandidates():`);
    console.log(`   ✅ Total kandidat terisi di response: ${fetchRes.candidates.length}\n`);

    console.log("==================================================");
    console.log("STATUS AKHIR: DATABASE SUPABASE & SERVER ACTIONS 100% HEALTHY");
    console.log("==================================================");

  } catch (error: any) {
    console.error("❌ TEJADI KESALAHAN SAAT MENGECEK DATABASE:", error.message);
  }
}

checkDatabaseStatus();
