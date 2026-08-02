import "dotenv/config";
import prisma from "../lib/prisma";
import { createCandidate, getCandidates, getCandidateById, updateCandidate } from "../app/actions/candidate";

async function runTests() {
  console.log("==========================================");
  console.log("🚀 MEMULAI PENGUJIAN OTOMATIS LENGKAP");
  console.log("==========================================\n");

  try {
    // 1. Test Koneksi Database Direct (Prisma Query)
    console.log("1. Testing Koneksi Database Supabase...");
    const userCount = await prisma.user.count();
    const candidateCount = await prisma.candidate.count();
    console.log(`   ✅ Supabase Terhubung! User count: ${userCount}, Candidate count: ${candidateCount}\n`);

    // 2. Test Server Action: createCandidate
    console.log("2. Testing Server Action: createCandidate()...");
    const testCandidateData = {
      nama: "Testing Candidate AutoTest",
      umur: "30",
      jenisKelamin: "Laki-laki",
      ringkasan: "Kandidat uji coba sistem otomatis.",
      ekonomi: "Menengah",
      motivasi: "Pengujian integrasi end-to-end.",
      hobi: "Testing, Coding",
      status: "Verified",
      transcriptSegments: [
        { id: 1, startStr: "00:00:01,000", text: "Halo ini teks wawancara uji coba.", rawStart: 1 }
      ]
    };
    const createRes = await createCandidate(testCandidateData);
    if (!createRes.success || !createRes.candidate) {
      throw new Error("Gagal membuat kandidat: " + createRes.message);
    }
    const createdId = createRes.candidate.id;
    console.log(`   ✅ Kandidat baru berhasil dibuat! ID: ${createdId}, Code: ${createRes.candidate.candidateCode}\n`);

    // 3. Test Server Action: getCandidates & Filtering
    console.log("3. Testing Server Action: getCandidates()...");
    const fetchRes = await getCandidates("AutoTest", "Verified", "L");
    if (!fetchRes.success || fetchRes.candidates.length === 0) {
      throw new Error("Pencarian kandidat gagal!");
    }
    console.log(`   ✅ getCandidates() Berhasil! Ditemukan: ${fetchRes.candidates.length} kandidat sesuai pencarian.\n`);

    // 4. Test Server Action: getCandidateById
    console.log("4. Testing Server Action: getCandidateById()...");
    const detailRes = await getCandidateById(createdId);
    if (!detailRes.success || !detailRes.candidate) {
      throw new Error("Gagal mengambil detail kandidat: " + detailRes.message);
    }
    console.log(`   ✅ getCandidateById() Berhasil! Nama: ${detailRes.candidate.nama}, Segmen Transkrip: ${detailRes.transcriptSegments.length}\n`);

    // 5. Test Server Action: updateCandidate
    console.log("5. Testing Server Action: updateCandidate()...");
    const updateRes = await updateCandidate(createdId, {
      nama: "Testing Candidate Updated Name",
      status: "Verified"
    });
    if (!updateRes.success || !updateRes.candidate) {
      throw new Error("Gagal memperbarui data kandidat: " + updateRes.message);
    }
    console.log(`   ✅ updateCandidate() Berhasil! Nama Terkini: ${updateRes.candidate.nama}\n`);

    // 6. Cleanup Data Testing
    console.log("6. Membersihkan Data Testing...");
    await prisma.candidate.delete({ where: { id: createdId } });
    console.log("   ✅ Data testing berhasil dibersihkan dari Supabase.\n");

    console.log("==========================================");
    console.log("🎉 SEMUA UJI COBA BERHASIL 100%! DATABASE & LOGIK SERVER SEHAT.");
    console.log("==========================================");

  } catch (error: any) {
    console.error("❌ TESTING GAGAL:", error.message);
    process.exit(1);
  }
}

runTests();
