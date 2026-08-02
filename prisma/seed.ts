import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const existingCount = await prisma.candidate.count();
  if (existingCount === 0) {
    await prisma.candidate.createMany({
      data: [
        {
          candidateCode: "KB-2024-001",
          nama: "Budi Santoso",
          umur: "45",
          jenisKelamin: "Laki-laki",
          ringkasan: "Mantan buruh bangunan, kehilangan lengan kanan akibat kecelakaan kerja 1 tahun lalu. Saat ini beraktivitas terbatas membantu istri mengelola warung kecil di rumah.",
          ekonomi: "Prasejahtera pasca-kecelakaan. Pendapatan harian dari warung minim (Rp30.000 - Rp50.000). Memiliki dua anak sekolah.",
          motivasi: "Ingin kembali bekerja di sektor konstruksi (mandor) untuk membiayai sekolah anak.",
          hobi: "Otomotif, Mekanik Dasar",
          status: "Verified",
          transcriptJson: JSON.stringify([
            { id: 1, startStr: "00:00:00,000", text: "Selamat pagi, Pak Budi. Terima kasih sudah meluangkan waktu. Bisa ceritakan sedikit tentang keseharian Bapak setelah kecelakaan tahun lalu?", rawStart: 0 },
            { id: 2, startStr: "00:00:15,000", text: "Pagi, Mas. Ya... semenjak tangan kanan saya diamputasi, aktivitas jadi serba terbatas. Saya dulunya buruh bangunan, sekarang bantu-bantu istri jaga warung kecil di depan rumah.", rawStart: 15 },
            { id: 3, startStr: "00:01:05,000", text: "Untuk warung itu, apakah cukup untuk memenuhi kebutuhan sehari-hari keluarga, Pak?", rawStart: 65 },
            { id: 4, startStr: "00:01:18,000", text: "Jujur aja, ngepas banget, Mas. Malah seringnya kurang. Pendapatan warung paling sehari bersih 30-50 ribu.", rawStart: 78 }
          ])
        },
        {
          candidateCode: "KB-2024-002",
          nama: "Siti Rahmawati",
          umur: "32",
          jenisKelamin: "Perempuan",
          ringkasan: "Ibu rumah tangga dengan keterbatasan gerak pada jaringan tangan pasca infeksi.",
          ekonomi: "Keluarga pekerja harian lepas.",
          motivasi: "Membantu usaha katering skala kecil dari rumah.",
          hobi: "Memasak, Menjahit",
          status: "Processing",
          transcriptJson: JSON.stringify([
            { id: 1, startStr: "00:00:05,000", text: "Halo Bu Siti, bisa dijelaskan kendala utama saat beraktivitas sehari-hari?", rawStart: 5 },
            { id: 2, startStr: "00:00:20,000", text: "Saya kesulitan memegang alat masak berat, jadi usaha katering agak terhambat.", rawStart: 20 }
          ])
        },
        {
          candidateCode: "KB-2024-003",
          nama: "Agus Yudhoyono",
          umur: "28",
          jenisKelamin: "Laki-laki",
          ringkasan: "Teknisi reparasi elektronik muda yang membutuhkan bantuan prostetik presisi.",
          ekonomi: "Menengah ke bawah.",
          motivasi: "Bisa kembali melakukan solder dan perbaikan komponen mikro elektronik.",
          hobi: "Elektronika, Komputer",
          status: "Ready",
          transcriptJson: JSON.stringify([])
        },
        {
          candidateCode: "KB-2024-004",
          nama: "Dewi Lestari",
          umur: "51",
          jenisKelamin: "Perempuan",
          ringkasan: "Guru sekolah dasar yang mengalami musibah kecelakaan lalu lintas.",
          ekonomi: "Cukup.",
          motivasi: "Kembali mengajar di depan kelas dengan percaya diri.",
          hobi: "Membaca, Menulis",
          status: "Verified",
          transcriptJson: JSON.stringify([])
        }
      ]
    });
    console.log("Seeded initial candidate data.");
  }

  // Ensure default admin user exists
  const bcrypt = await import("bcryptjs");
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      password: adminPassword,
    },
  });
  console.log("Default admin user checked/created.");
}

main().catch(console.error);
