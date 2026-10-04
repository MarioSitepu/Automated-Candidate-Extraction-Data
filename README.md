# 🦾 Automated Candidate Data Extraction System
> **Sistem Otomasi Ekstraksi & Asesmen Klinis Calon Penerima Tangan Prostetik (Karla Bionics)**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Deepgram](https://img.shields.io/badge/Deepgram-Nova--3_STT-13EF93?style=flat)](https://deepgram.com/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-f55036?style=flat)](https://groq.com/)

---

## 📖 Tentang Aplikasi (About The Web)

**Automated Candidate Data Extraction System** adalah platform web terintegrasi berbasis AI yang dikembangkan untuk mempercepat proses evaluasi dan seleksi calon penerima tangan bionik prostetik (**Raga Arm**) di **Karla Bionics**.

Sebelum adanya sistem ini, tim asesor klinis harus mendengarkan rekaman wawancara kandidat berdurasi panjang secara manual, mencatat transkrip kata-demi-kata, dan mengisi lembar evaluasi psikososial & klinis yang memakan waktu berjam-jam per kandidat.

Aplikasi ini mengotomatiskan seluruh alur kerja tersebut:
1. **Menerima media wawancara** (audio/video lokal maupun tautan Google Drive).
2. **Melakukan kompresi cerdas di browser** sehingga file video ratusan MB dapat diproses secara instan tanpa membebani bandwidth atau terbentur batas ukuran upload serverless.
3. **Menerjemahkan audio menjadi transkrip terstruktur** dengan pembeda pembicara (*Speaker Diarization*) secara presisi menggunakan **Deepgram Nova-3**.
4. **Mengekstrak data klinis 6-Seksi secara otomatis** menggunakan **LLaMA 3.3 70B (Groq SDK)** ke dalam format JSON terstruktur.
5. **Menyediakan studio review interaktif** dengan fitur *click-to-seek audio player* yang tersinkronisasi dua arah dengan teks transkrip.
6. **Memvalidasi & mengunci data kandidat** ke basis data cloud PostgreSQL (Supabase) untuk proses fabrikasi prostetik tahap selanjutnya.

---

## 🌟 Fitur Utama

- 🎙️ **Dual-Mode Media Ingestion**: Mendukung file video/audio lokal (`.mp4`, `.mp3`, `.wav`, `.m4a`, dll.) serta integrasi langsung via URL publik / ID Google Drive dengan sistem multi-tier fallback.
- ⚡ **Client-Side In-Browser Compression**: Ekstraksi dan downsampling trek audio menjadi 16kHz mono WAV via Web Audio API langsung di peramban, mengurangi ukuran upload hingga 95%+.
- 🤖 **Speech-to-Text & Speaker Diarization**: Transkripsi otomatis berbahasa Indonesia dengan pemisahan otomatis antara *Pewawancara (Interviewer)* dan *Kandidat*.
- 🧠 **AI Clinical Data Extraction**: Mengisi otomatis data demografi, riwayat amputasi, motivasi, kesiapan adaptasi, rencana masa depan, kondisi sosial-ekonomi, kesiapan mobilisasi, hingga resiliensi psikologis.
- 🎵 **Click-to-Seek Interactive Player**: Klik pada segmen transkrip mana saja untuk langsung melompat (*seek*) ke detik audio yang sesuai secara presisi, lengkap dengan *auto-scroll highlight*.
- 📋 **Form Asesmen Klinis 6-Seksi & Verification Lock**: Asesor dapat meninjau, mengedit hasil AI, dan menyetujui data kandidat (*Verified & Locked*) agar tidak dapat diubah kembali secara tidak sengaja.
- 📊 **Monitoring Analytics Dashboard**: Ringkasan metrik statistik kandidat, distribusi status asesmen, rasio gender, dan tren pendaftaran menggunakan visualisasi interaktif **Recharts**.
- 🔒 **Enterprise Security & Session**: Autentikasi aman berbasis stateless JWT cookie (`jose`), hashing password `bcryptjs`, dan proteksi rute halaman via Next.js Edge Middleware.
- 💾 **Supabase Database Capacity Tracker**: Indikator real-time penggunaan kuota penyimpanan database dengan peringatan adaptif.

---

## 🧭 Alur Pengguna (User Flow)

Berikut adalah diagram alur perjalanan pengguna (asesor/staf klinis) dalam menggunakan sistem:

```mermaid
flowchart TD
    Start([Mulai]) --> A[1. Masuk ke Halaman Login /login]
    A --> B{Sudah Punya Akun?}
    B -- Belum --> C[Daftar Akun Baru di /register]
    C --> A
    B -- Sudah --> D[Masukkan Email & Password]
    D --> E{Kredensial Valid?}
    E -- Tidak --> A
    E -- Ya --> F[2. Masuk ke Monitoring Dashboard /dashboard]
    
    F --> G{Pilih Tindakan}
    
    %% Alur Upload
    G -- Proses Wawancara Baru --> H[3. Buka Halaman Upload /dashboard/upload]
    H --> I{Pilih Metode Input}
    I -- File Lokal --> J[Pilih File Video/Audio dari Komputer]
    J --> K[Browser Melakukan Kompresi Otomatis ke 16kHz WAV]
    I -- Google Drive --> L[Masukkan Link / File ID Google Drive]
    
    K --> M[Klik Mulai Ekstraksi AI]
    L --> M
    
    M --> N[4. Proses Berjalan di Background via UploadContext]
    N --> O[Asesor Bebas Menavigasi Dashboard / Halaman Lain]
    N --> P[Floating Progress Indicator & Toast Notification]
    
    P --> Q[5. Ekstraksi Selesai: Otomatis Masuk ke Studio Kandidat /dashboard/candidates/id]
    
    %% Alur Review Kandidat
    G -- Lihat Data yang Sudah Ada --> R[Buka Daftar Kandidat /dashboard/candidates]
    R --> S[Filter / Cari Nama Kandidat]
    S --> T[Klik 'Periksa Data']
    T --> Q
    
    %% Alur Studio Review
    Q --> U[6. Asesmen & Review Studio]
    U --> V[Putar Audio & Klik Kalimat Transkrip untuk Memverifikasi]
    U --> W[Koreksi / Lengkapi Form Data Klinis Seksi A s/d F]
    W --> X[Klik 'Simpan Perubahan']
    X --> Y[Klik 'Setujui & Kunci Data' Status: Verified]
    
    Y --> Z[7. Data Tersimpan Permanen & Terkunci di Database]
    Z --> End([Selesai])
```

---

### 📝 Penjelasan Detail Alur Kerja Pengguna

#### 1️⃣ Autentikasi & Masuk (`/login` & `/register`)
- Pengguna mengakses halaman web dan diarahkan ke portal login.
- Pengguna baru dapat mendaftar melalui `/register`.
- Setelah login berhasil, sistem menyematkan token sesi JWT yang aman (*HttpOnly Cookie*) dan mengarahkan ke dashboard utama.

#### 2️⃣ Monitoring & Analitik (`/dashboard`)
- Menampilkan ringkasan metrik: *Total Kandidat*, *Kandidat Terverifikasi*, *Dalam Proses*, dan *Siap Dievaluasi*.
- Menyajikan grafik analitik interaktif mengenai status kandidat dan demografi gender.
- Widget di sidebar memantau kapasitas penyimpanan database Supabase secara real-time.

#### 3️⃣ Ingesti Media & Ekstraksi AI (`/dashboard/upload`)
- Asesor memilih salah satu dari dua metode input:
  - **Upload Lokal**: Unggah video/audio rekaman wawancara. Browser langsung mengekstrak trek audio dan mengompresinya menjadi WAV 16kHz mono dalam hitungan detik.
  - **Google Drive**: Cukup tempel tautan berbagi atau ID file Google Drive.
- Asesor menekan tombol **"Mulai Ekstraksi AI"**.

#### 4️⃣ Eksekusi Background Tanpa Terputus (*Multi-Page Task Persistence*)
- Sistem pemrosesan terisolasi dalam `UploadContext` global.
- Asesor tidak perlu menunggu di halaman upload; mereka dapat kembali ke dashboard atau membuka daftar kandidat.
- Status progres (*Transkripsi Deepgram* ➔ *Ekstraksi LLaMA 3.3* ➔ *Penyimpanan DB*) ditampilkan secara transparan melalui kartu mengambang (*floating widget*) dan notifikasi *toast*.

#### 5️⃣ Peninjauan Transkrip & Evaluasi Klinis (`/dashboard/candidates/[id]`)
- Setelah AI selesai memproses, kandidat baru dibuat dengan kode unik otomatis (format: `KB-YYYY-XXX`).
- Asesor masuk ke **Asesmen Studio** yang terdiri dari dua kolom:
  - **Kolom Kiri (Audio & Transkrip)**: Pemutar audio terintegrasi dengan daftar transkrip percakapan. Asesor dapat mengeklik kalimat mana saja untuk mendengarkan bagian audio tersebut (*Click-to-Seek*).
  - **Kolom Kanan (Form Asesmen 6 Seksi)**: Seluruh data yang diekstrak oleh AI (identitas, riwayat amputasi, motivasi, kondisi ekonomi, kesiapan mobilitas, dan kondisi psikologis) terisi secara otomatis dan dapat disunting manual jika diperlukan koreksi.

#### 6️⃣ Verifikasi & Penguncian Data (*Verification Lock*)
- Asesor menyimpan hasil koreksi dengan tombol **"Simpan Perubahan"**.
- Setelah seluruh data valid, asesor menekan **"Setujui & Kunci Data"**.
- Status kandidat berubah menjadi `Verified` dan form terkunci (`read-only`) untuk menjamin integritas data medis.

#### 7️⃣ Pengelolaan & Pencarian Database (`/dashboard/candidates`)
- Asesor dapat mencari data kandidat berdasarkan nama/kode, memfilter berdasarkan status verifikasi, melihat riwayat tanggal asesmen, atau menghapus entri data yang tidak relevan.

---

## 🧩 Arsitektur Pipeline Pemrosesan AI

```mermaid
flowchart LR
    A[File Video/Audio / GDrive Link] --> B[Client-Side Compression<br/>Web Audio API]
    B --> C[Deepgram Nova-3 API<br/>Speaker Diarization]
    C --> D[Transkrip Terstruktur<br/>Diarized Segments JSON]
    D --> E[Groq SDK<br/>LLaMA 3.3 70B Versatile]
    E --> F[Ekstraksi JSON Klinis<br/>Seksi A - Seksi F]
    F --> G[(PostgreSQL Supabase<br/>Tabel Candidate)]
```

---

## 💻 Tech Stack & Ketergantungan Utama

| Kategori | Teknologi | Deskripsi / Peran |
| :--- | :--- | :--- |
| **Framework Full-stack** | [Next.js 16 (App Router)](https://nextjs.org/) | Server Actions, API Routes, Streaming UI |
| **Library UI** | [React 19](https://react.dev/) | Client Components, React Hooks & Context |
| **Bahasa Pemrograman** | [TypeScript 5](https://www.typescriptlang.org/) | Static type-safety end-to-end |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/) | Styling modern berbasis utility tokens |
| **Database & Storage** | [PostgreSQL (Supabase)](https://supabase.com/) | Cloud relational database berkinerja tinggi |
| **ORM** | [Prisma ORM 7.8](https://www.prisma.io/) + `@prisma/adapter-pg` | Query builder & connection pooling |
| **Speech-to-Text Engine** | [Deepgram Nova-3](https://deepgram.com/) | Transkripsi Bahasa Indonesia + Speaker Diarization |
| **LLM Reasoning Engine** | [Groq LLaMA 3.3 70B](https://groq.com/) | Ekstraksi data JSON deterministik berkecepatan tinggi |
| **Autentikasi & Keamanan** | [Jose](https://github.com/panva/jose) + [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js) + [Zod](https://zod.dev/) | JWT stateless cookie & hashing password |
| **Visualisasi Data** | [Recharts 3.10](https://recharts.org/) | Grafik analitik statistik pada dashboard |
| **Ikonografi & Notifikasi** | [Lucide React](https://lucide.dev/) + [React-Hot-Toast](https://react-hot-toast.com/) | UI Feedback & Icon sistem |

---

## 📁 Struktur Direktori Proyek

```plaintext
automated-candidate-data/
├── app/
│   ├── actions/                  # Next.js Server Actions (RPC Backend)
│   │   ├── auth.ts               # Login, Register, Logout & Zod Validation
│   │   ├── candidate.ts          # CRUD Kandidat, Statistik & DB Status
│   │   └── extract.ts            # Core AI & Media Extraction Engine
│   ├── api/                      # REST Route Handlers
│   │   ├── upload/route.ts       # Endpoint POST upload binary audio/video
│   │   ├── cron/route.ts         # Endpoint keep-alive database cron job
│   │   └── keep-alive/route.ts   # Endpoint health check database Supabase
│   ├── context/
│   │   └── UploadContext.tsx     # Context global status upload & task persistence
│   ├── dashboard/                # Modul Dashboard (Protected Routes)
│   │   ├── layout.tsx            # Sidebar, Navigasi & Storage Indicator
│   │   ├── page.tsx              # Analytics View & KPI Cards
│   │   ├── upload/page.tsx       # Studio Upload & Ingesti Media
│   │   └── candidates/
│   │       ├── page.tsx          # Daftar & Pencarian Kandidat
│   │       └── [id]/page.tsx     # Asesmen Studio & Click-to-Seek Audio Player
│   ├── login/page.tsx            # Halaman Login Internal
│   ├── register/page.tsx         # Halaman Pendaftaran Asesor Baru
│   ├── tokens/session.ts         # Enkripsi / Dekripsi JWT Cookie Session
│   └── utils/clientAudio.ts      # Engine Kompresi Audio Browser (Web Audio API)
├── lib/
│   └── prisma.ts                 # Prisma Client Singleton dengan Connection Pool
├── prisma/
│   ├── schema.prisma             # Skema Basis Data PostgreSQL (User & Candidate)
│   └── seed.ts                   # Seeder Data Uji Coba Kandidat
├── middleware.ts                 # Edge Middleware untuk Proteksi Rute /dashboard/*
├── README_BACKEND.md             # Dokumentasi Mendalam Arsitektur Backend
├── README_FRONTEND.md            # Dokumentasi Mendalam Arsitektur Frontend
└── README.md                     # Dokumentasi Utama Proyek
```

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 📋 Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi 20.x atau lebih baru
- **npm** / **yarn** / **pnpm**
- **FFmpeg** (opsional untuk pemrosesan file video langsung di server backend)
- Akun & API Key untuk **Deepgram**, **Groq**, dan **Supabase PostgreSQL**.

---

### 1. Kloning Repositori
```bash
git clone https://github.com/MarioSitepu/Automated-Candidate-Extraction-Data.git
cd Automated-Candidate-Extraction-Data
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Buat file `.env` pada direktori root proyek dan isi dengan konfigurasi berikut:

```env
# Database Supabase Connection
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Autentikasi & JWT Secret
SESSION_SECRET="kunci-rahasia-jwt-anda-yang-sangat-kuat"

# AI Service API Keys
DEEPGRAM_API_KEY="api-key-deepgram-anda"
GROQ_API_KEY="api-key-groq-anda"

# Google Drive Integration (Opsional / Fallback Token)
ACCESS_TOKEN="google-drive-oauth-access-token"
```

### 4. Sinkronisasi Skema Basis Data & Generate Prisma Client
```bash
# Sinkronkan skema prisma ke PostgreSQL
npx prisma db push

# Generate client prisma terbaru
npx prisma generate
```

*(Opsional) Masukkan data dummy awal untuk pengujian:*
```bash
npx tsx prisma/seed.ts
```

### 5. Jalankan Server Development
```bash
npm run dev
```

Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 📚 Tautan Dokumentasi Lanjutan

Untuk mempelajari lebih dalam mengenai teknis implementasi masing-masing lapisan arsitektur:

- 🛠️ [**Dokumentasi Lengkap Sistem Backend (`README_BACKEND.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_BACKEND.md) — *Membahas detil Prisma ORM pooling, JWT session, Deepgram API timeout handling, Groq JSON prompting, Multi-tier GDrive downloaders, dan Edge Middleware.*
- 📑 [**Laporan Teknis & Audit 39 Poin Kritis Arsitektur (`README_TECHNICAL_REPORT.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_TECHNICAL_REPORT.md) — *Laporan investigasi mendalam menjawab 39 pertanyaan arsitektur, alur orkestrasi data, mitigasi error, dan batasan akademis sistem.*
- 🔬 [**Dokumentasi Lanjutan Rekayasa Backend Deep-Dive (`README_BACKEND_DEEPDIVE.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_BACKEND_DEEPDIVE.md) — *Membahas mitigasi pipe deadlock FFmpeg, timeout 10 menit Deepgram, konfigurasi 500MB serverless, Supabase connection pooler, dan CLI diagnostik.*
- 🎨 [**Dokumentasi Lengkap Sistem Frontend (`README_FRONTEND.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_FRONTEND.md) — *Membahas Web Audio API in-browser compression, UploadContext global state, Recharts analytics, Click-to-seek audio sync, form 6-seksi asesmen klinis, dan analisis UX.*

---

## 📄 Lisensi & Kontribusi

Sistem ini dikembangkan secara internal untuk mendukung misi kemanusiaan dan rehabilitasi medis **Karla Bionics**. Seluruh hak cipta dilindungi.
