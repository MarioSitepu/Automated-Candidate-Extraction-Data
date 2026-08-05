"use server";

import { execFile } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { DeepgramClient } from "@deepgram/sdk";
import Groq from "groq-sdk";
import util from "util";

const execFileAsync = util.promisify(execFile);

// Helper to format seconds to HH:MM:SS,mmm
function formatTime(seconds: number) {
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor((seconds - totalSeconds) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

export async function extractGDriveFileId(input: string): Promise<string> {
    if (!input) return "";
    const trimmed = input.trim();
    
    // Check if user accidentally pasted a Folder link
    if (trimmed.includes("/drive/folders/") || trimmed.includes("/folders/")) {
        throw new Error("Link yang Anda masukkan adalah link FOLDER Google Drive. Harap buka FILE video/audio spesifik di dalam folder tersebut, klik 'Bagikan' -> 'Salin Link', lalu tempelkan link file tersebut di sini.");
    }

    const match = 
        trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/id=([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);

    if (match && match[1]) {
        return match[1];
    }

    // If string does not contain URL slashes and looks like a raw GDrive File ID
    if (!trimmed.includes("/") && !trimmed.includes("http") && trimmed.length >= 15) {
        return trimmed;
    }

    return "";
}

// Helper to transcribe audio using Deepgram Nova-3 or Groq Whisper fallback
async function transcribeAudioFile(audioPath: string) {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (DEEPGRAM_API_KEY && DEEPGRAM_API_KEY.trim().length > 0) {
        console.log("Transcribing audio via Deepgram API (Nova-3)...");
        const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY.trim() });

        const response = await deepgram.listen.v1.media.transcribeFile(
            fsSync.createReadStream(audioPath),
            {
                model: "nova-3",
                language: "id",
                smart_format: true,
                utterances: true,
            }
        );

        const utterances = (response as any)?.results?.utterances || [];
        const formattedSegments = utterances.length > 0
            ? utterances.map((u: any, index: number) => ({
                id: index + 1,
                startStr: formatTime(u.start),
                endStr: formatTime(u.end),
                text: u.transcript.trim(),
                rawStart: u.start
            }))
            : ((response as any)?.results?.channels[0]?.alternatives[0]?.paragraphs?.paragraphs || []).flatMap((p: any) =>
                p.sentences.map((s: any, index: number) => ({
                    id: index + 1,
                    startStr: formatTime(s.start),
                    endStr: formatTime(s.end),
                    text: s.text.trim(),
                    rawStart: s.start
                }))
            );

        return formattedSegments;
    }

    if (!GROQ_API_KEY) {
        throw new Error("Tutup konfigurasi: DEEPGRAM_API_KEY maupun GROQ_API_KEY belum diset di file .env");
    }

    console.log("Transcribing audio via Groq Whisper API (whisper-large-v3)...");
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const transcription = await groq.audio.transcriptions.create({
        file: fsSync.createReadStream(audioPath),
        model: "whisper-large-v3",
        language: "id",
        response_format: "verbose_json"
    });

    const segments = (transcription as any).segments || [];
    return segments.map((segment: any, index: number) => ({
        id: index + 1,
        startStr: formatTime(segment.start),
        endStr: formatTime(segment.end),
        text: segment.text.trim(),
        rawStart: segment.start
    }));
}

export async function runVideoToText(fileIdOrUrl: string) {
    const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

    let cleanFileId = "";
    try {
        cleanFileId = await extractGDriveFileId(fileIdOrUrl);
    } catch (e: any) {
        return { success: false, message: e.message };
    }

    if (!cleanFileId) {
        return { success: false, message: "Link atau File ID Google Drive tidak valid. Pastikan Anda menempelkan link khusus FILE (bukan folder)." };
    }

    const timestamp = Date.now();
    const tempAudio = path.join(process.cwd(), `tmp_gdrive_${timestamp}.mp3`);

    try {
      // Step 1: Download GDrive video via Node.js Fast Stream Downloader
      const tempVideo = path.join(process.cwd(), `tmp_gdrive_video_${timestamp}.mp4`);
      let downloaded = false;

      const candidateUrls = [
        `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${cleanFileId}&confirm=t`,
        `https://drive.google.com/uc?id=${cleanFileId}&export=download`,
      ];

      for (const downloadUrl of candidateUrls) {
        try {
          console.log(`1. Fast-downloading GDrive stream: ${downloadUrl}`);
          let streamRes = await fetch(downloadUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });

          if (!streamRes.ok || !streamRes.body) continue;

          let contentType = streamRes.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            console.log("   -> HTML warning page returned by GDrive, parsing confirmation token...");
            const htmlText = await streamRes.text();
            const confirmMatch = htmlText.match(/confirm=([a-zA-Z0-9_-]+)/) || htmlText.match(/name="confirm" value="([a-zA-Z0-9_-]+)"/);
            const uuidMatch = htmlText.match(/uuid=([a-zA-Z0-9_-]+)/);

            const confirmToken = confirmMatch ? confirmMatch[1] : "t";
            const uuidParam = uuidMatch ? `&uuid=${uuidMatch[1]}` : "";
            
            const confirmedUrl = `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=${confirmToken}${uuidParam}`;
            console.log(`   -> Fetching confirmed stream URL: ${confirmedUrl}`);
            const confirmedRes = await fetch(confirmedUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });

            if (confirmedRes.ok && confirmedRes.body && !(confirmedRes.headers.get("content-type") || "").includes("text/html")) {
              streamRes = confirmedRes;
            } else {
              const ucConfirmedUrl = `https://drive.google.com/uc?export=download&id=${cleanFileId}&confirm=${confirmToken}`;
              const ucRes = await fetch(ucConfirmedUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
              });
              if (ucRes.ok && ucRes.body && !(ucRes.headers.get("content-type") || "").includes("text/html")) {
                streamRes = ucRes;
              } else {
                console.log("   -> Could not bypass HTML confirmation page for this candidate URL.");
                continue;
              }
            }
          }

          await new Promise<void>((resolve, reject) => {
            const fileStream = fsSync.createWriteStream(tempVideo);
            fileStream.on("finish", resolve);
            fileStream.on("error", reject);

            const reader = (streamRes.body as any).getReader();
            function pump() {
              reader.read().then(({ done, value }: any) => {
                if (done) {
                  fileStream.end();
                  return;
                }
                fileStream.write(Buffer.from(value), (err) => {
                  if (err) {
                    fileStream.destroy(err);
                    reject(err);
                  } else {
                    pump();
                  }
                });
              }).catch(reject);
            }
            pump();
          });

          const stat = await fs.stat(tempVideo).catch(() => ({ size: 0 }));
          if (stat.size > 1000) {
            downloaded = true;
            console.log(`   -> GDrive video fast-download finished! (Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
            break;
          }
        } catch (err: any) {
          console.error("Download strategy failed:", err?.message);
        }
      }

      // Strategy 2: OAuth API v3 if ACCESS_TOKEN is present
      if (!downloaded && ACCESS_TOKEN && ACCESS_TOKEN.trim().length > 0) {
        try {
          console.log("1b. Trying GDrive API v3 with OAuth ACCESS_TOKEN...");
          const gdriveApiUrl = `https://www.googleapis.com/drive/v3/files/${cleanFileId}?alt=media`;
          const res = await fetch(gdriveApiUrl, {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN.trim()}`,
            },
          });

          if (res.ok && res.body) {
            await new Promise<void>((resolve, reject) => {
              const fileStream = fsSync.createWriteStream(tempVideo);
              fileStream.on("finish", resolve);
              fileStream.on("error", reject);

              const reader = (res.body as any).getReader();
              function pump() {
                reader.read().then(({ done, value }: any) => {
                  if (done) {
                    fileStream.end();
                    return;
                  }
                  fileStream.write(Buffer.from(value), (err) => {
                    if (err) {
                      fileStream.destroy(err);
                      reject(err);
                    } else {
                      pump();
                    }
                  });
                }).catch(reject);
              }
              pump();
            });

            const stat = await fs.stat(tempVideo).catch(() => ({ size: 0 }));
            if (stat.size > 1000) {
              downloaded = true;
              console.log(`   -> GDrive API v3 download finished! (Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
            }
          }
        } catch (err: any) {
          console.error("OAuth download failed:", err?.message);
        }
      }

      // Strategy 3: FFmpeg Direct Connection Fallback
      if (!downloaded) {
        try {
          console.log("1c. Trying FFmpeg Direct Stream fallback...");
          const ffmpegDirectUrl = `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=t`;
          const args = [
            "-rw_timeout", "15000000",
            "-i", ffmpegDirectUrl,
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y",
            tempAudio
          ];
          await execFileAsync("ffmpeg", args);
          const stat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
          if (stat.size > 1000) {
            downloaded = true;
            console.log("   -> FFmpeg direct stream successfully extracted audio!");
          }
        } catch (err: any) {
          console.error("FFmpeg direct stream fallback failed:", err?.message);
        }
      }

      if (!downloaded) {
        throw new Error(
          "Gagal mengunduh file dari Google Drive. Harap pastikan akses file di Google Drive diatur ke 'Siapa saja yang memiliki link' (Anyone with the link can view)."
        );
      }

      // Step 2: Extract audio locally via FFmpeg
      console.log("2. Extracting MP3 audio locally via FFmpeg...");
      const ffmpegArgs = [
        "-i", tempVideo,
        "-vn",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        "-y",
        tempAudio
      ];
      await execFileAsync("ffmpeg", ffmpegArgs);
      console.log("   -> Audio extraction finished!");

      // Cleanup local video file immediately
      await fs.unlink(tempVideo).catch(() => {});

      // Step 3: Transcribe via Deepgram Nova-3 or Groq Whisper
      const formattedSegments = await transcribeAudioFile(tempAudio);

      // Save audio to public uploads directory for playback
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const finalAudioPath = path.join(uploadsDir, `audio_gdrive_${cleanFileId}_${timestamp}.mp3`);
      await fs.copyFile(tempAudio, finalAudioPath).catch(() => {});
      const publicAudioUrl = `/uploads/audio_gdrive_${cleanFileId}_${timestamp}.mp3`;

      // Clean up temporary files
      await fs.unlink(tempAudio).catch(() => {});

      return { 
          success: true, 
          segments: formattedSegments, 
          audioUrl: publicAudioUrl,
          fileId: cleanFileId 
      };

    } catch (error: any) {
      console.error("GDrive extraction error:", error);
      await fs.unlink(tempAudio).catch(() => {});
      return { success: false, message: "Terjadi kesalahan saat ekstraksi Google Drive: " + error.message };
    }
}

export async function uploadAndExtract(formData: FormData) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return { success: false, message: "GROQ_API_KEY is not set in .env" };
    }

    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, message: "No file uploaded" };
    }

    const timestamp = Date.now();
    const inputExt = path.extname(file.name) || '.mp4';
    const inputFilePath = path.join(process.cwd(), `tmp_upload_${timestamp}${inputExt}`);
    const outputAudio = path.join(process.cwd(), `audio_${timestamp}.mp3`);

    try {
        // Step 1: Save the uploaded file to disk
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(inputFilePath, buffer);

        // Step 2: Compress and extract audio via FFmpeg
        console.log("1. Compressing and extracting audio via FFmpeg (Local File)...");
        const args = [
            "-i", inputFilePath,
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y",
            outputAudio
        ];
        await execFileAsync("ffmpeg", args);
        console.log("   -> Audio successfully extracted!");

        // Step 3: Transcribe via Deepgram Nova-3 or Groq Whisper
        const formattedSegments = await transcribeAudioFile(outputAudio);

        // Save audio to public uploads directory for playback
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}.mp3`);
        await fs.copyFile(outputAudio, finalAudioPath).catch(() => {});
        const publicAudioUrl = `/uploads/audio_${timestamp}.mp3`;

        // Clean up temporary files
        await fs.unlink(inputFilePath).catch(() => {});
        await fs.unlink(outputAudio).catch(() => {});

        return { success: true, segments: formattedSegments, audioUrl: publicAudioUrl };

    } catch (error: any) {
        console.error("Extraction error:", error);
        // Clean up on error
        await fs.unlink(inputFilePath).catch(() => {});
        await fs.unlink(outputAudio).catch(() => {});
        return { success: false, message: "Terjadi kesalahan saat ekstraksi AI: " + error.message };
    }
}

export async function extractDataFromTranscript(transcriptText: string) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return { success: false, message: "GROQ_API_KEY is not set in .env" };
    }

    try {
        console.log("Starting data extraction using Groq LLaMA 3...");
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        
        const systemPrompt = `Anda adalah Asisten HRD & Asesor Klinis Karla Bionics. 
Tugas Anda adalah mengekstrak informasi dari teks transkrip wawancara ke dalam format JSON yang valid.
Jika informasi tidak disebutkan secara eksplisit di dalam teks, isi dengan "-".

JSON harus memiliki struktur persis seperti ini:
{
  "nama": "string (Nama Lengkap)",
  "umur": "string (Umur dalam angka)",
  "jenisKelamin": "Laki-laki" | "Perempuan" | "",
  "seksiA": {
    "kegiatanSehariHari": "string (Cerita diri dan kegiatan sehari-hari)",
    "riwayatKondisi": "string (Kapan amputasi/kondisi terjadi, bawaan/kecelakaan, area sensitif/nyeri/linu)",
    "kondisiLengan": "string (Bawah siku, atas siku, tanpa jari, dsb)",
    "perubahanKesulitan": "string (Kegiatan yang berubah & paling susah dilakukan sekarang)",
    "pengalamanProstetik": "string (Pernah pakai tangan prostetik sebelumnya & rasanya)",
    "bantuanSehariHari": "string (Siapa yang membantu kegiatan sehari-hari)"
  },
  "seksiB": {
    "alasanRagaArm": "string (Kenapa ingin pakai Raga Arm)",
    "harapanUtama": "string (Hal yang paling ingin dilakukan jika punya Raga Arm)",
    "komitmenHarian": "string (Apakah sanggup memakai setiap hari)",
    "kesiapanAdaptasi": "string (Skala 1-10 kesiapan belajar & adaptasi)"
  },
  "seksiC": {
    "rencanaMasaDepan": "string (Rencana 6-12 bulan ke depan: kerja/usaha/skill)",
    "peranRagaArm": "string (Bagaimana Raga Arm membantu target masa depan)"
  },
  "seksiD": {
    "sumberPenghasilan": "string (Sumber & jumlah penghasilan per bulan)",
    "tanggunganKeluarga": "string (Status menikah, anak, atau orang tua yang ditanggung)"
  },
  "seksiE": {
    "kesiapanKeBandung": "string (Bersedia ke Bandung & pengetahuan transportasi/luar kota)",
    "laporanPublikasi": "string (Bersedia kirim kabar per 2 minggu, video call bulanan, foto/video acara)",
    "minatPelatihan": "string (Keinginan ikut pelatihan kerja / usaha)"
  },
  "seksiF": {
    "tantanganBangkit": "string (Tantangan terberat disabilitas & cara bangkit dari down)",
    "hubunganKeluarga": "string (Sikap dan hubungan dengan keluarga saat ini)",
    "hubunganTeman": "string (Hubungan dengan teman dekat/pasangan)",
    "kegiatanSosial": "string (Kegiatan rutin kumpul/komunitas)"
  }
}

Ingat: OUTPUT HARUS HANYA BERUPA JSON OBJECT, TANPA TEKS LAIN.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcriptText }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const jsonResponse = chatCompletion.choices[0]?.message?.content;
        if (!jsonResponse) {
            throw new Error("Empty response from AI");
        }
        
        console.log("AI Data Extraction Result:", jsonResponse);

        const parsed = JSON.parse(jsonResponse);
        const data = {
            nama: parsed.nama || "Tanpa Nama",
            umur: parsed.umur || "-",
            jenisKelamin: parsed.jenisKelamin || "-",
            ringkasan: parsed.seksiA?.kegiatanSehariHari || "-",
            ekonomi: parsed.seksiD?.sumberPenghasilan || "-",
            motivasi: parsed.seksiB?.alasanRagaArm || "-",
            assessmentJson: JSON.stringify(parsed)
        };
        return { success: true, data };

    } catch (error: any) {
        console.error("AI Data Extraction error:", error);
        return { success: false, message: "Gagal mengekstrak data JSON: " + error.message };
    }
}
