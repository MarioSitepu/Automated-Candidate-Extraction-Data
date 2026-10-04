# 🛠️ Dokumentasi Arsitektur & Sistem Backend
**Automated Candidate Extraction Data (Karla Bionics)**

Dokumentasi ini menyajikan analisis arsitektur, alur data, integrasi AI, manajemen database, sistem autentikasi, serta evaluasi kritis terhadap performa dan keamanan backend.

---

## 📌 1. Ringkasan Eksekutif & Tech Stack Backend

Sistem backend ini dirancang untuk memproses media wawancara (audio/video lokal dan Google Drive) secara otomatis menjadi transkrip terdiarisasi dan mengekstrak data klinis/psikososial kandidat penerima tangan prostetik (*Raga Arm*) menggunakan Large Language Models (LLM).

| Komponen | Teknologi / Library | Keterangan & Peran |
| :--- | :--- | :--- |
| **Runtime & Framework** | **Next.js 16 (App Router)** | Full-stack serverless & Node runtime dengan Server Actions |
| **Bahasa** | **TypeScript 5** | Static typing ketat di seluruh layer action dan API |
| **Database** | **PostgreSQL (Supabase)** | Database relasional utama berbasis Cloud |
| **ORM & Driver** | **Prisma ORM 7.8** + `@prisma/adapter-pg` + `pg.Pool` | Connection pooling teroptimasi untuk serverless |
| **Autentikasi & Sesi** | **Jose (JWT)** + **Bcrypt.js** + **Zod** | Stateless JWT via HttpOnly Cookies & password hashing (Cost 10) |
| **Media Processing** | **FFmpeg (CLI child process)** + **Web Audio API** | Ekstraksi trek audio, downsampling, dan konversi ke MP3/WAV |
| **Engine STT (Speech-to-Text)**| **Deepgram Nova-3 API** | Model STT Bahasa Indonesia dengan Speaker Diarization |
| **Engine Ekstraksi LLM** | **Groq SDK (LLaMA 3.3 70B Versatile)** | Ekstraksi terstruktur JSON format deterministik |
| **GDrive Stream Engine** | **Native HTTP/HTTPS + Cookie Tracker + yt-dlp** | Bypass limit kuota & Google Drive virus-scan warnings |

---

## 🏗️ 2. Arsitektur Folder & Struktur Backend

```plaintext
├── app/
│   ├── actions/                  # Next.js Server Actions (RPC Backend)
│   │   ├── auth.ts               # Login, Register, Logout, Zod Validation
│   │   ├── candidate.ts          # CRUD Kandidat, Statistik Dashboard & Storage DB
│   │   └── extract.ts            # Core AI & Media Extraction Engine
│   ├── api/                      # Next.js Route Handlers (REST Endpoints)
│   │   ├── upload/route.ts       # Endpoint POST stream binary upload audio/video
│   │   ├── cron/route.ts         # Endpoint keep-alive database cron job
│   │   └── keep-alive/route.ts   # Endpoint health check Supabase
│   ├── tokens/
│   │   └── session.ts            # Manajemen JWT, Enkripsi/Dekripsi Cookie Session
│   └── utils/
│       └── clientAudio.ts        # Kompresi audio client-side (Web Audio API/HTML5)
├── lib/
│   └── prisma.ts                 # Prisma Client Singleton dengan connection pool
├── prisma/
│   ├── schema.prisma             # Skema model User dan Candidate
│   ├── check-db-status.ts        # CLI Diagnostik database & data integrity
│   └── seed.ts                   # Database seeder untuk pengujian
├── middleware.ts                 # Edge Middleware untuk proteksi rute /dashboard/*
└── next.config.ts                # Konfigurasi payload server action (500MB)
```

---

## 🗄️ 3. Skema Basis Data & Model Data

Aplikasi menggunakan skema PostgreSQL dengan 2 entitas utama:

```mermaid
erDiagram
    USER {
        Int id PK "Autoincrement"
        String email UK "Unique"
        String password "Hashed bcrypt"
        DateTime createdAt "Default now()"
    }

    CANDIDATE {
        String id PK "UUID"
        String candidateCode UK "KB-YYYY-XXX"
        String nama
        String umur "Nullable"
        String jenisKelamin "Nullable"
        String ringkasan "Nullable"
        String ekonomi "Nullable"
        String motivasi "Nullable"
        String hobi "Nullable"
        String status "Ready | Processing | Verified"
        String audioUrl "Nullable (Path / URL)"
        String transcriptJson "Nullable (Diarized Segments JSON)"
        String assessmentJson "Nullable (Seksi A-F Clinical JSON)"
        DateTime createdAt "Default now()"
        DateTime updatedAt "Auto update"
    }
```

### Detail Kolom Kritis:
- **`transcriptJson`**: Menyimpan transkrip percakapan per segmen speaker:
  ```json
  [
    {
      "id": 1,
      "speaker": 0,
      "startStr": "00:00:02,120",
      "endStr": "00:00:05,400",
      "text": "Selamat pagi, bisa diceritakan mengenai kondisi tangan saat ini?",
      "rawStart": 2.12
    }
  ]
  ```
- **`assessmentJson`**: Menyimpan penilaian klinis terstruktur dari Seksi A hingga F:
  - **Seksi A**: Riwayat amputasi, kondisi fisik lengan, bantuan harian.
  - **Seksi B**: Alasan pemilihan *Raga Arm*, kesiapan adaptasi (1-10), komitmen.
  - **Seksi C**: Rencana target hidup 6-12 bulan ke depan.
  - **Seksi D**: Kondisi sosial ekonomi & tanggungan keluarga.
  - **Seksi E**: Kesiapan mobilisasi ke workshop Bandung & pelatihan kerja.
  - **Seksi F**: Kesiapan mental bangkit & relasi sosial/keluarga.

---

## 🔄 4. Alur Kerja & Pipeline Pemrosesan Media (Media Pipeline)

Sistem mengadopsi pipeline 4-tahap end-to-end:

```mermaid
flowchart TD
    A[Input: File Video/Audio Lokal atau Link Google Drive] --> B{Sumber Input?}
    
    %% Input Lokal
    B -- File Lokal --> C[Client-side Pre-compression<br/>Web Audio API 16kHz Mono WAV]
    C --> D[POST /api/upload<br/>Stream ArrayBuffer]
    D --> E[FFmpeg Server Transcode<br/>libmp3lame -q:a 2]
    
    %% Input GDrive
    B -- GDrive URL/ID --> F[Multi-tier GDrive Resolver<br/>FFmpeg Stream / yt-dlp / API v3]
    F --> E
    
    %% Transkripsi
    E --> G[Deepgram Nova-3 API<br/>Language: 'id', Diarization: true]
    G --> H[Segmen Transkrip Terstruktur<br/>Format: HH:MM:SS,mmm + Speaker ID]
    
    %% LLM Extraction
    H --> I[Groq SDK: LLaMA 3.3 70B Versatile<br/>JSON Mode Prompting]
    I --> J{Groq Sukses?}
    J -- Ya --> K[Parsed JSON Assessment Data]
    J -- Gagal --> L[Regex Fallback Extractor]
    
    %% Penyimpanan
    K --> M[Prisma createCandidate<br/>Generate Kode KB-YYYY-XXX]
    L --> M
    M --> N[(Supabase PostgreSQL)]
```

### Penjelasan Tahapan Pipeline:
1. **Pencegahan Vercel Payload Limit (Client-Side Compression)**:
   - File video besar (hingga ratusan MB) diekstrak audionya langsung di browser user menggunakan `OfflineAudioContext` (Web Audio API) menjadi WAV 16kHz mono (~1-3 MB) sebelum dikirim ke endpoint `/api/upload`.
2. **Multi-tier Google Drive Ingestion**:
   - Menghindari kegagalan *quota limit* dan halaman verifikasi virus Google Drive dengan 5 strategi bertingkat:
     1. Direct Stream via FFmpeg dengan Cookie Jar tracking & Form redirect parser.
     2. `yt-dlp` CLI fallback via videoplayback stream.
     3. Native single-pass stream downloader dengan deteksi socket timeout (15 detik).
     4. Google Drive API v3 OAuth (`ACCESS_TOKEN`).
     5. Google Drive API v3 Service Key (`GOOGLE_DRIVE_API_KEY`).
3. **Speech-to-Text & Speaker Diarization**:
   - Dikelola oleh Deepgram API menggunakan model terbaru `nova-3` dengan konfigurasi:
     - `language: "id"` (Bahasa Indonesia)
     - `smart_format: true`, `punctuate: true`
     - `utterances: true`, `diarize: true`
   - Dilengkapi *Promise timeout* (10 menit) untuk mencegah process hanging pada rekaman berdurasi panjang.
4. **Ekstraksi Informasi Klinis (LLM)**:
   - Menggunakan Groq API (`llama-3.3-70b-versatile`) dengan `temperature: 0.1` dan `response_format: { type: "json_object" }`.
   - Mampu membedakan entitas antara Pewawancara (`Speaker 0`) dan Kandidat (`Speaker 1`).

---

## 🔒 5. Sistem Keamanan & Autentikasi

1. **Password Hashing**:
   - Menggunakan `bcryptjs` dengan `costFactor = 10` (10 putaran salt hashing) sebelum disimpan di tabel `User`.
2. **Stateless JWT Session**:
   - Dikelola oleh library `jose` dengan algoritma `HS256`.
   - Token disimpan di Cookie dengan atribut:
     - `httpOnly: true` (Kebal terhadap serangan XSS browser).
     - `secure: true` (Hanya dikirim melalui HTTPS).
     - `sameSite: "lax"` (Mencegah serangan CSRF).
     - Durasi: **30 hari** jika mencentang *Remember Me*, atau **1 jam** jika sesi standar.
3. **Edge Middleware Protection**:
   - `middleware.ts` memverifikasi token sesi pada setiap permintaan yang menuju rute `/dashboard/*`.
   - Jika token tidak valid/hilang, request langsung di-redirect ke `/login`.
4. **Input Sanitization & Validation**:
   - Menggunakan `zod` untuk validasi format email (`z.string().email()`) dan batas minimal panjang password sebelum menyentuh database.

---

## 📊 6. Server Actions & API Reference

### A. Server Actions (`app/actions/`)

#### 1. `auth.ts`
- **`loginUser(email, password, rememberMe)`**:
  - Validasi Zod -> Cek User Prisma -> Verifikasi Bcrypt -> Buat JWT Cookie.
- **`registerUser(email, password)`**:
  - Validasi Zod -> Cek duplikasi email -> Hash Bcrypt -> Simpan User.
- **`logoutUser()`**:
  - Hapus cookie sesi -> Redirect ke `/login`.

#### 2. `candidate.ts`
- **`createCandidate(data: CandidateInput)`**:
  - Mengenerate kode unik kandidat otomatis (`KB-YYYY-XXX`).
  - Menyimpan data kandidat beserta segmen transkrip dan data asesmen ke PostgreSQL.
  - Memanggil `revalidatePath()` pada `/dashboard` dan `/dashboard/candidates`.
- **`getCandidates(searchQuery?, statusFilter?, genderFilter?)`**:
  - Mengambil daftar kandidat dengan query filter dinamis (nama, kode, status, gender) diurutkan berdasarkan `createdAt: desc`.
- **`getCandidateById(idOrCode: string)`**:
  - Mengambil kandidat berdasarkan UUID atau `candidateCode`, serta melakukan parsing otomatis pada `transcriptJson`.
- **`updateCandidate(id, data)`**:
  - Memperbarui atribut kandidat secara parsial dan merevalidasi cache halaman.
- **`deleteCandidate(id: string)`**:
  - Menghapus baris kandidat dari database.
- **`getDashboardStats()`**:
  - Menghitung agregasi data: total kandidat, status `Processing`, `Ready`, `Verified`, dan 5 log aktivitas terakhir.
- **`getDatabaseStorageStats()`**:
  - Menjalankan raw query SQL `SELECT pg_database_size(current_database())` untuk memantau kapasitas penyimpanan Supabase (Free Tier Cap: 500 MB).

#### 3. `extract.ts`
- **`runVideoToText(fileIdOrUrl)`**: Pipeline unduh & transkripsi Google Drive.
- **`uploadAndExtract(formData)`**: Pipeline upload lokal via Server Action.
- **`extractDataFromTranscript(transcriptText)`**: Pipeline LLM parsing via Groq.

---

### B. REST Route Handlers (`app/api/`)

| Endpoint | Method | Fungsi & Behavior |
| :--- | :---: | :--- |
| `/api/upload` | `POST` | Menerima payload binary (`ArrayBuffer`) file audio/video, konversi FFmpeg, dan transkripsi Deepgram. Mendukung timeout hingga 300 detik (`maxDuration = 300`). |
| `/api/cron` | `GET` | Endpoint keep-alive Supabase PostgreSQL untuk mencegah auto-pause pada free-tier project. |
| `/api/keep-alive`| `GET` | Health check endpoint untuk memverifikasi kesiapan koneksi database. |

---

## ⚙️ 7. Konfigurasi Environment Variables (`.env`)

Pastikan seluruh variabel lingkungan berikut telah dikonfigurasi:

```env
# 1. Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# 2. Keamanan Sesi
SESSION_SECRET="generate_random_secret_string_min_32_chars"

# 3. AI Speech-to-Text & Diarization
DEEPGRAM_API_KEY="your_deepgram_api_key"

# 4. AI Structured Extraction (LLM)
GROQ_API_KEY="your_groq_api_key"

# 5. Google Drive API (Opsional / Fallback)
GOOGLE_DRIVE_API_KEY="your_optional_gdrive_api_key"
ACCESS_TOKEN="your_optional_oauth_token"
```

---

## 🔍 8. Evaluasi Kritis & Rekomendasi Pengembangan (Critical Review)

Berikut adalah tinjauan kritis terhadap arsitektur backend saat ini beserta rekomendasi perbaikannya:

### ⚠️ 1. Penyimpanan File Lokal (`public/uploads`) pada Serverless
- **Temuan**: File audio hasil konversi disimpan ke sistem file lokal (`public/uploads/audio_*.mp3`).
- **Dampak Kritis**: Pada deployment serverless (seperti Vercel atau AWS Lambda), filesystem bersifat *read-only* atau *ephemeral* (hilang setiap kali instance berganti). Hal ini menyebabkan pemutaran audio di dashboard kandidat akan gagal (404) setelah aplikasi di-deploy ke produksi.
- **Rekomendasi Solusi**: Alihkan penyimpanan file audio ke Cloud Object Storage (misalnya **Supabase Storage Bucket**, AWS S3, atau Cloudflare R2), dan simpan URL publik file tersebut pada kolom `audioUrl`.

### ⚠️ 2. Race Condition pada Pembuatan Kode Kandidat (`generateCandidateCode`)
- **Temuan**: Kode `KB-YYYY-XXX` dibuat dengan membaca kandidat terakhir (`findFirst`), menambah 1, lalu melakukan pengecekan `findUnique` dalam loop `while`.
- **Dampak Kritis**: Jika 2 atau lebih user memproses wawancara secara bersamaan (konkurensi tinggi), keduanya bisa mendapatkan nomor urut yang sama sebelum data tersimpan, memicu konflik *unique constraint*.
- **Rekomendasi Solusi**: Gunakan PostgreSQL Database Sequence (`CREATE SEQUENCE candidate_code_seq`) atau jalankan pembuatan kode di dalam Prisma Interactive Transaction (`prisma.$transaction`) dengan level isolasi *Serializable*.

### ⚠️ 3. Duplikasi Modul Ekstraksi
- **Temuan**: Terdapat dua file ekstraksi yaitu `app/actions/extract.ts` (versi terbaru dengan non-blocking FFmpeg & multi-tier GDrive) dan `extraction/extract.ts` (versi lama berbasis `execFileAsync`).
- **Dampak**: Membuka potensi kebingungan tim pengembang dan beban pemeliharaan ganda (*maintenance overhead*).
- **Rekomendasi Solusi**: Hapus folder `extraction/` dan standarisasi seluruh impor ke `app/actions/extract.ts`.

### ⚠️ 4. Pembersihan File Temporary (`tmp_*`) pada Kasus Crash
- **Temuan**: Jika proses FFmpeg atau Node.js terhenti secara paksa (*SIGKILL* / kehabisan memori), file temporary (`tmp_gdrive_*`, `temp_parallel_video*`) dapat tertinggal di direktori root server.
- **Rekomendasi Solusi**: Buat utilitas *cleanup worker* terjadwal (misalnya melalui cron job) yang otomatis membersihkan file sementara yang berumur lebih dari 1 jam di direktori temporary OS (`os.tmpdir()`).

---

## 🚀 9. Panduan Menjalankan & Menguji Backend

### 1. Migrasi & Sinkronisasi Database
```bash
npx prisma generate
npx prisma db push
```

### 2. Menjalankan Diagnostik Database & Server Actions
```bash
npx tsx prisma/check-db-status.ts
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000/login` untuk mengakses sistem.

---

## 🔬 Referensi Lanjutan
- 📑 [**Laporan Teknis & Audit 39 Poin Kritis Arsitektur (`README_TECHNICAL_REPORT.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_TECHNICAL_REPORT.md) — *Jawaban lengkap & kritis atas 39 pertanyaan arsitektur data, orkestrasi pipeline, mitigasi AI, dan evaluasi laporan PKL.*
- 🔬 [**Dokumentasi Rekayasa Backend Deep-Dive (`README_BACKEND_DEEPDIVE.md`)**](file:///c:/Users/user/Documents/MyProject/automated-candidate-data/README_BACKEND_DEEPDIVE.md) — *Membahas mitigasi pipe deadlock FFmpeg, timeout STT, connection pooling Supabase, konfigurasi 500MB payload, dan diagnostik CLI.*
