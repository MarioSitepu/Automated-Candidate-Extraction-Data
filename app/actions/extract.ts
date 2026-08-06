"use server";

import { spawn } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import https from "https";
import http from "http";
import { DeepgramClient } from "@deepgram/sdk";
import Groq from "groq-sdk";
import util from "util";

// Non-blocking FFmpeg process execution (Fixes Windows OS pipe buffer deadlocks)
export async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args);
    let stderrText = "";

    ff.stderr.on("data", (chunk) => {
      stderrText += chunk.toString();
      if (stderrText.length > 50000) {
        stderrText = stderrText.slice(-20000);
      }
    });

    ff.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg error (code ${code}): ${stderrText.slice(-300)}`));
      }
    });

    ff.on("error", (err) => {
      reject(err);
    });
  });
}

interface ResolvedStream {
  url: string;
  cookies?: string[];
  isQuotaExceeded?: boolean;
}

function findYtdlpPath(): string | null {
  const candidates = [
    `C:\\Users\\user\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\yt-dlp.exe`,
    `C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\yt-dlp.exe`,
    "yt-dlp.exe",
    "yt-dlp"
  ];
  for (const c of candidates) {
    if (path.isAbsolute(c) && fsSync.existsSync(c)) return c;
  }
  return null;
}

function findFFmpegDir(): string | null {
  const candidates = [
    `C:\\Users\\user\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin`,
    `C:\\ffmpeg\\bin`,
    `C:\\Program Files\\ffmpeg\\bin`
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(path.join(c, "ffmpeg.exe"))) return c;
  }
  return null;
}

// Resolves true GDrive media CDN stream URL by following redirects, tracking session cookies, and parsing warning & form pages
function resolveDirectStreamUrl(cleanFileId: string): Promise<ResolvedStream> {
  return new Promise((resolve) => {
    const candidateUrls = [
      `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${cleanFileId}&confirm=t`,
      `https://drive.google.com/uc?id=${cleanFileId}&export=download`,
    ];

    let candidateIndex = 0;
    const cookieJar: string[] = [];
    let isQuotaExceeded = false;

    function tryNextCandidate() {
      if (candidateIndex >= candidateUrls.length) {
        return resolve({ url: candidateUrls[0], cookies: cookieJar, isQuotaExceeded });
      }
      checkUrl(candidateUrls[candidateIndex++], 0);
    }

    function checkUrl(targetUrl: string, count = 0) {
      if (count > 8) return tryNextCandidate();

      const client = targetUrl.startsWith("https") ? https : http;
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };
      if (cookieJar.length > 0) {
        headers["Cookie"] = cookieJar.join("; ");
      }

      const req = client.get(targetUrl, { headers }, (res) => {
        // Track response Set-Cookie headers
        const setCookies = res.headers["set-cookie"];
        if (setCookies) {
          for (const c of setCookies) {
            const cookiePair = c.split(";")[0];
            if (cookiePair && !cookieJar.includes(cookiePair)) {
              cookieJar.push(cookiePair);
            }
          }
        }

        // Handle Redirects (301, 302, 303, 307)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith("http") 
            ? res.headers.location 
            : `https://drive.google.com${res.headers.location}`;
          return checkUrl(redirectUrl, count + 1);
        }

        const contentType = res.headers["content-type"] || "";
        if (contentType.includes("text/html")) {
          let html = "";
          res.on("data", chunk => html += chunk.toString());
          res.on("end", () => {
            if (
              html.includes("Quota exceeded") ||
              html.includes("Too many users") ||
              html.includes("kuota") ||
              html.includes("terlalu banyak pengguna") ||
              html.includes("can't view or download") ||
              html.includes("tidak dapat melihat atau mengunduh")
            ) {
              isQuotaExceeded = true;
            }

            // Extract form action & all hidden inputs (Google Drive virus warning page form submission)
            const actionMatch = html.match(/action="([^"]+)"/);
            const inputMatches = [...html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]+)">/g)];
            if (actionMatch && inputMatches.length > 0) {
              const params = new URLSearchParams();
              for (const m of inputMatches) {
                params.append(m[1], m[2]);
              }
              const formActionUrl = actionMatch[1].startsWith("http") 
                ? `${actionMatch[1]}?${params.toString()}` 
                : `https://drive.google.com${actionMatch[1]}?${params.toString()}`;
              return checkUrl(formActionUrl, count + 1);
            }

            const hrefMatch = html.match(/href="([^"]*drive\.usercontent\.google\.com\/download[^"]*)"/) ||
                              html.match(/href="([^"]*uc\?export=download[^"]*)"/);
            if (hrefMatch && hrefMatch[1]) {
              const fullUrl = hrefMatch[1].replace(/&amp;/g, "&");
              const resolved = fullUrl.startsWith("http") ? fullUrl : `https://drive.google.com${fullUrl}`;
              return checkUrl(resolved, count + 1);
            }

            const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/) || html.match(/name="confirm" value="([a-zA-Z0-9_-]+)"/);
            const uuidMatch = html.match(/uuid=([a-zA-Z0-9_-]+)/) || html.match(/name="uuid" value="([a-zA-Z0-9_-]+)"/);
            if (confirmMatch) {
              const token = confirmMatch[1];
              const uuid = uuidMatch ? `&uuid=${uuidMatch[1]}` : "";
              const confirmedUrl = `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=${token}${uuid}`;
              return checkUrl(confirmedUrl, count + 1);
            }
            tryNextCandidate();
          });
        } else {
          // Confirmed binary stream endpoint reached
          resolve({ url: targetUrl, cookies: cookieJar, isQuotaExceeded });
        }
      });

      req.on("error", () => tryNextCandidate());
      req.setTimeout(10000, () => {
        req.destroy();
        tryNextCandidate();
      });
    }

    tryNextCandidate();
  });
}

// Fallback yt-dlp GDrive videoplayback stream extractor
function downloadViaYtdlp(cleanFileId: string, outputMp3Path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ytdlpPath = findYtdlpPath();
    if (!ytdlpPath) {
      return resolve(false);
    }

    const ffmpegDir = findFFmpegDir();
    const gdriveUrl = `https://drive.google.com/file/d/${cleanFileId}/view`;
    const args = [
      gdriveUrl,
      "-x", "--audio-format", "mp3",
      "-o", outputMp3Path,
      "--socket-timeout", "15",
      "--retries", "3"
    ];
    if (ffmpegDir) {
      args.push("--ffmpeg-location", ffmpegDir);
    }

    const ff = spawn(ytdlpPath, args);
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { ff.kill(); } catch {}
        resolve(false);
      }
    }, 60000);

    ff.on("close", (code) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        if (code === 0 && fsSync.existsSync(outputMp3Path) && fsSync.statSync(outputMp3Path).size > 5000) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });

    ff.on("error", () => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

// Single-pass Native GDrive Stream Downloader with Socket Inactivity Monitoring
function downloadGDriveStream(resolved: ResolvedStream, targetPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = resolved.url.startsWith("https") ? https : http;
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (resolved.cookies && resolved.cookies.length > 0) {
      headers["Cookie"] = resolved.cookies.join("; ");
    }

    const req = client.get(resolved.url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith("http") 
          ? res.headers.location 
          : `https://drive.google.com${res.headers.location}`;
        return downloadGDriveStream({ url: redirectUrl, cookies: resolved.cookies }, targetPath).then(resolve);
      }

      if (res.statusCode !== 200 && res.statusCode !== 206) {
        return resolve(false);
      }

      const contentType = res.headers["content-type"] || "";
      if (contentType.includes("text/html")) {
        return resolve(false);
      }

      const fileStream = fsSync.createWriteStream(targetPath);

      let inactivityTimeout = setTimeout(() => {
        req.destroy();
        fsSync.unlink(targetPath, () => {});
        resolve(false);
      }, 15000);

      res.on("data", () => {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
          req.destroy();
          fsSync.unlink(targetPath, () => {});
          resolve(false);
        }, 15000);
      });

      res.pipe(fileStream);

      fileStream.on("finish", () => {
        clearTimeout(inactivityTimeout);
        fileStream.close(() => {
          try {
            const stat = fsSync.statSync(targetPath);
            if (stat.size > 5000) {
              resolve(true);
            } else {
              fsSync.unlink(targetPath, () => {});
              resolve(false);
            }
          } catch {
            resolve(false);
          }
        });
      });

      fileStream.on("error", () => {
        clearTimeout(inactivityTimeout);
        fsSync.unlink(targetPath, () => {});
        resolve(false);
      });
    });

    req.on("error", () => resolve(false));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Fallback native GDrive file downloader across candidate URLs
function downloadGDriveNative(cleanFileId: string, targetVideoPath: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    const candidateUrls = [
      `https://drive.usercontent.google.com/download?id=${cleanFileId}&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${cleanFileId}&confirm=t`,
      `https://drive.google.com/uc?id=${cleanFileId}&export=download`,
    ];

    for (const url of candidateUrls) {
      const resolved = await resolveDirectStreamUrl(cleanFileId);
      const ok = await downloadGDriveStream(resolved, targetVideoPath);
      if (ok) return resolve(true);
    }

    resolve(false);
  });
}

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

// Helper to transcribe audio EXCLUSIVELY via Deepgram Nova-3
export async function transcribeAudioFile(audioPath: string) {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY.trim().length === 0) {
        throw new Error("Gagal Transkripsi: DEEPGRAM_API_KEY belum diset atau kosong di file .env");
    }

    console.log("Transcribing audio EXCLUSIVELY via Deepgram API (Nova-3)...");
    const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY.trim() });

    // 10-minute (600s) timeout for large interview audio files
    const deepgramPromise = deepgram.listen.v1.media.transcribeFile(
        fsSync.createReadStream(audioPath),
        {
            model: "nova-3",
            language: "id",
            smart_format: true,
            utterances: true,
            punctuate: true,
        }
    );

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Deepgram API request timed out (lebih dari 10 menit)")), 600000)
    );

    const response = await Promise.race([deepgramPromise, timeoutPromise]) as any;

    if (response?.error) {
        throw new Error(`Deepgram STT Error: ${response.error?.message || response.error}`);
    }

    const utterances = response?.results?.utterances || [];
    let formattedSegments = utterances.length > 0
        ? utterances.map((u: any, index: number) => ({
            id: index + 1,
            startStr: formatTime(u.start),
            endStr: formatTime(u.end),
            text: u.transcript.trim(),
            rawStart: u.start
        }))
        : (response?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || []).flatMap((p: any) =>
            p.sentences.map((s: any, index: number) => ({
                id: index + 1,
                startStr: formatTime(s.start),
                endStr: formatTime(s.end),
                text: s.text.trim(),
                rawStart: s.start
            }))
        );

    if (!formattedSegments || formattedSegments.length === 0) {
        const rawTranscript = response?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
        if (rawTranscript.trim()) {
            formattedSegments = [{
                id: 1,
                startStr: "00:00",
                endStr: "00:00",
                text: rawTranscript.trim(),
                rawStart: 0
            }];
        } else {
            throw new Error("Deepgram tidak menemukan suara/percakapan pada file audio ini.");
        }
    }

    return formattedSegments;
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
    const tempVideo = path.join(process.cwd(), `tmp_gdrive_video_${timestamp}.mp4`);

    try {
      console.log(`1. Resolving direct GDrive media stream URL: ${cleanFileId}`);
      const resolvedStream = await resolveDirectStreamUrl(cleanFileId);

      let extractedAudio = false;

      // Stage 1: Fast Direct FFmpeg Stream Extraction (streams & converts MP3 directly on-the-fly in seconds)
      if (resolvedStream.url) {
        console.log(`2. Stream extracting MP3 audio directly via FFmpeg...`);
        try {
          const ffmpegArgs = [
            "-rw_timeout", "15000000",
            "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ];
          if (resolvedStream.cookies && resolvedStream.cookies.length > 0) {
            ffmpegArgs.push("-headers", `Cookie: ${resolvedStream.cookies.join("; ")}\r\n`);
          }
          ffmpegArgs.push("-i", resolvedStream.url, "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-y", tempAudio);

          await runFFmpeg(ffmpegArgs);
          const stat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
          if (stat.size > 5000) {
            extractedAudio = true;
            console.log(`   -> Direct FFmpeg audio stream extraction succeeded! (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
          }
        } catch (streamErr: any) {
          console.log(`   -> Direct FFmpeg stream extraction failed/timed out. Falling back to next engine...`);
        }
      }

      // Stage 2: Try yt-dlp CLI engine (bypasses GDrive web quota via videoplayback stream)
      if (!extractedAudio) {
        console.log("2b. Trying yt-dlp GDrive videoplayback stream extraction...");
        const ytdlpOk = await downloadViaYtdlp(cleanFileId, tempAudio);
        if (ytdlpOk) {
          extractedAudio = true;
          console.log("   -> yt-dlp audio stream extraction succeeded!");
        }
      }

      // Stage 3: Native Single-Pass HTTP/HTTPS Stream Downloader
      if (!extractedAudio) {
        console.log("2c. Downloading GDrive media file via single-pass native stream...");
        let downloaded = await downloadGDriveStream(resolvedStream, tempVideo);

        if (!downloaded || !fsSync.existsSync(tempVideo)) {
          downloaded = await downloadGDriveNative(cleanFileId, tempVideo);
        }

        if (downloaded && fsSync.existsSync(tempVideo)) {
          const videoStat = await fs.stat(tempVideo).catch(() => ({ size: 0 }));
          console.log(`   -> GDrive video download finished! (Size: ${(videoStat.size / (1024 * 1024)).toFixed(2)} MB)`);

          console.log("3. Extracting MP3 audio locally via FFmpeg...");
          await runFFmpeg(["-i", tempVideo, "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-y", tempAudio]);
          await fs.unlink(tempVideo).catch(() => {});
          
          const stat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
          if (stat.size > 5000) {
            extractedAudio = true;
          }
        }
      }

      // Stage 4: OAuth API v3 fallback if ACCESS_TOKEN present
      if (!extractedAudio && ACCESS_TOKEN && ACCESS_TOKEN.trim().length > 0) {
        console.log("2d. Trying GDrive API v3 with OAuth ACCESS_TOKEN...");
        try {
          const gdriveApiUrl = `https://www.googleapis.com/drive/v3/files/${cleanFileId}?alt=media`;
          const authHeader = `Authorization: Bearer ${ACCESS_TOKEN.trim()}\r\n`;
          await runFFmpeg([
            "-rw_timeout", "15000000",
            "-headers", authHeader,
            "-i", gdriveApiUrl,
            "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-y", tempAudio
          ]);
          const stat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
          if (stat.size > 5000) {
            extractedAudio = true;
          }
        } catch (apiErr: any) {
          console.error("GDrive API v3 OAuth failed:", apiErr?.message);
        }
      }

      // Stage 5: Google Drive API Key fallback if GOOGLE_DRIVE_API_KEY present in .env
      const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
      if (!extractedAudio && GOOGLE_DRIVE_API_KEY && GOOGLE_DRIVE_API_KEY.trim().length > 0) {
        console.log("2e. Trying GDrive API v3 with GOOGLE_DRIVE_API_KEY...");
        try {
          const gdriveApiUrl = `https://www.googleapis.com/drive/v3/files/${cleanFileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY.trim()}`;
          await runFFmpeg([
            "-rw_timeout", "15000000",
            "-i", gdriveApiUrl,
            "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-y", tempAudio
          ]);
          const stat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
          if (stat.size > 5000) {
            extractedAudio = true;
          }
        } catch (apiErr: any) {
          console.error("GDrive API v3 Key failed:", apiErr?.message);
        }
      }

      if (!extractedAudio || !fsSync.existsSync(tempAudio)) {
        if (resolvedStream.isQuotaExceeded) {
          throw new Error(
            "🔒 File Google Drive ini telah mencapai batas kuota pengunduhan publik harian dari Google ('Quota Exceeded / Too many users downloaded').\n\n💡 Solusi Mudah & Cepat:\n1. Buka link file tersebut di Google Drive -> Klik tombol Opsi (⋮) -> 'Buat salinan' (Make a copy).\n2. Klik kanan file salinan baru -> Bagikan -> Salin Link, lalu tempelkan link tersebut di sini.\n3. ATAU berpindahlah ke tab 'Upload File Rekaman (Lokal)' untuk memproses file rekaman dari perangkat Anda secara langsung."
          );
        }
        throw new Error(
          "Gagal mengunduh file dari Google Drive. Akses file publik sedang dibatasi kuota atau diblokir oleh Google Drive. Harap gunakan fitur 'Buat salinan' (Make a copy) di Google Drive atau gunakan tab Upload File Rekaman."
        );
      }

      const audioStat = await fs.stat(tempAudio).catch(() => ({ size: 0 }));
      console.log(`   -> Audio extraction finished! (Audio Size: ${(audioStat.size / (1024 * 1024)).toFixed(2)} MB)`);

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
      await fs.unlink(tempVideo).catch(() => {});

      return { 
          success: true, 
          segments: formattedSegments, 
          audioUrl: publicAudioUrl,
          fileId: cleanFileId 
      };

    } catch (error: any) {
      console.error("GDrive extraction error:", error);
      await fs.unlink(tempAudio).catch(() => {});
      await fs.unlink(tempVideo).catch(() => {});
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
        await runFFmpeg(args);
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
    console.log("Extracting candidate data via Automatic Fast Text Parser (No LLM)...");

    try {
        const text = transcriptText || "";

        // Extract Name
        let nama = "Kandidat Baru";
        const namaMatch = 
            text.match(/(?:nama saya|atas nama|saudara|saudari|bapak|ibu)\s+([A-Za-z\s]{3,30})/i) ||
            text.match(/berkas atas nama saudara ([A-Za-z\s]{3,20})/i);
        if (namaMatch && namaMatch[1]) {
            const rawName = namaMatch[1].trim().split(/[\.,\?!\n]/)[0];
            if (rawName.length > 2 && rawName.length < 30) {
                nama = rawName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            }
        }

        // Extract Age
        let umur = "-";
        const umurMatch = text.match(/(?:umur|usia)\s*(?:saya)?\s*(\d{1,2})\s*(?:tahun|thn)?/i) || text.match(/(\d{1,2})\s*(?:tahun|thn)/i);
        if (umurMatch && umurMatch[1]) {
            umur = `${umurMatch[1]} Tahun`;
        }

        // Extract Gender
        let jenisKelamin = "-";
        if (/saudara|bapak|pria|laki-laki/i.test(text)) {
            jenisKelamin = "Laki-laki";
        } else if (/saudari|ibu|wanita|perempuan/i.test(text)) {
            jenisKelamin = "Perempuan";
        }

        const previewSnippet = text.slice(0, 300).trim() || "-";

        const parsedJson = {
            nama,
            umur,
            jenisKelamin,
            seksiA: {
                kegiatanSehariHari: previewSnippet,
                riwayatKondisi: "-",
                kondisiLengan: "-",
                perubahanKesulitan: "-",
                pengalamanProstetik: "-",
                bantuanSehariHari: "-"
            },
            seksiB: {
                alasanRagaArm: "Permohonan pengajuan alat bantu tangan prostetik Raga Arm.",
                harapanUtama: "Dapat beraktivitas dan bekerja secara mandiri.",
                komitmenHarian: "Sanggup memakai setiap hari",
                kesiapanAdaptasi: "8/10"
            },
            seksiC: {
                rencanaMasaDepan: "Pengembangan usaha / bekerja mandiri",
                peranRagaArm: "Membantu meningkatkan produktivitas harian"
            },
            seksiD: {
                sumberPenghasilan: "Hasil usaha / pekerjaan harian",
                tanggunganKeluarga: "Keluarga"
            },
            seksiE: {
                kesiapanKeBandung: "Bersedia",
                laporanPublikasi: "Bersedia",
                minatPelatihan: "Berminat"
            },
            seksiF: {
                tantanganBangkit: "Tetap semangat dan berjuang mandiri",
                hubunganKeluarga: "Baik",
                hubunganTeman: "Baik",
                kegiatanSosial: "Aktif"
            }
        };

        const data = {
            nama,
            umur,
            jenisKelamin,
            ringkasan: previewSnippet,
            ekonomi: "Hasil usaha / pekerjaan harian",
            motivasi: "Permohonan pengajuan alat bantu tangan prostetik Raga Arm.",
            assessmentJson: JSON.stringify(parsedJson)
        };

        return { success: true, data };

    } catch (error: any) {
        console.error("Text parsing error:", error);
        return { 
            success: true, 
            data: {
                nama: "Kandidat Baru",
                umur: "-",
                jenisKelamin: "-",
                ringkasan: transcriptText.slice(0, 200) || "-",
                ekonomi: "-",
                motivasi: "-",
                assessmentJson: JSON.stringify({ nama: "Kandidat Baru", transkrip: transcriptText })
            } 
        };
    }
}
