"use server";

import { execFile } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
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

export async function runVideoToText(fileId: string) {
    const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!ACCESS_TOKEN || !GROQ_API_KEY) {
        return { success: false, message: "ACCESS_TOKEN or GROQ_API_KEY is not set in .env" };
    }

    // Paths
    const outputAudio = path.join(process.cwd(), `audio_${fileId}.mp3`);
    const gdriveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const authHeader = `Authorization: Bearer ${ACCESS_TOKEN.trim()}\r\n`;

    try {
        // Step 1: Download and compress audio via FFmpeg
        console.log("1. Downloading and compressing audio via FFmpeg...");
        const args = [
            "-headers", authHeader,
            "-i", gdriveUrl,
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y",
            outputAudio
        ];
        await execFileAsync("ffmpeg", args);
        console.log("   -> Audio successfully extracted!");

        // Step 2: Transcribe via Groq API
        console.log("2. Sending audio to Groq Whisper API...");
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        
        const transcription = await groq.audio.transcriptions.create({
            file: fsSync.createReadStream(outputAudio),
            model: "whisper-large-v3",
            language: "id",
            response_format: "verbose_json"
        });

        // Step 3: Format the response
        console.log("3. Formatting transcription...");
        const segments = (transcription as any).segments || [];
        const formattedSegments = segments.map((segment: any, index: number) => {
            return {
                id: index + 1,
                startStr: formatTime(segment.start),
                endStr: formatTime(segment.end),
                text: segment.text.trim(),
                rawStart: segment.start
            };
        });

        // Clean up the mp3 file
        await fs.unlink(outputAudio).catch(() => {});

        return { success: true, segments: formattedSegments };

    } catch (error: any) {
        console.error("Extraction error:", error);
        // Clean up on error
        await fs.unlink(outputAudio).catch(() => {});
        return { success: false, message: "Terjadi kesalahan saat ekstraksi AI: " + error.message };
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

        // Step 3: Transcribe via Groq API
        console.log("2. Sending audio to Groq Whisper API...");
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        
        const transcription = await groq.audio.transcriptions.create({
            file: fsSync.createReadStream(outputAudio),
            model: "whisper-large-v3",
            language: "id",
            response_format: "verbose_json"
        });

        // Step 4: Format the response
        console.log("3. Formatting transcription...");
        const segments = (transcription as any).segments || [];
        const formattedSegments = segments.map((segment: any, index: number) => {
            return {
                id: index + 1,
                startStr: formatTime(segment.start),
                endStr: formatTime(segment.end),
                text: segment.text.trim(),
                rawStart: segment.start
            };
        });

        // Clean up temporary files
        await fs.unlink(inputFilePath).catch(() => {});
        await fs.unlink(outputAudio).catch(() => {});

        return { success: true, segments: formattedSegments };

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
        
        const systemPrompt = `Anda adalah Asisten HRD cerdas. 
Tugas Anda adalah mengekstrak informasi dari teks transkrip wawancara berikut ke dalam format JSON yang valid.
Jika informasi tidak disebutkan secara eksplisit di dalam teks, gunakan tanda hubung "-" atau tulis "Tidak disebutkan".

JSON harus memiliki struktur persis seperti ini:
{
  "nama": "string (Nama Lengkap)",
  "umur": "string (Umur dalam angka)",
  "jenisKelamin": "Laki-laki" | "Perempuan" | "",
  "ringkasan": "string (Ringkasan aktivitas keseharian)",
  "ekonomi": "string (Kondisi ekonomi dan finansial saat ini)",
  "motivasi": "string (Motivasi utama membutuhkan prostetik/tangan bionik)"
}

Ingat: OUTPUT HARUS HANYA BERUPA JSON OBJECT, TANPA TEKS LAIN.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcriptText }
            ],
            model: "llama-3.1-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const jsonResponse = chatCompletion.choices[0]?.message?.content;
        if (!jsonResponse) {
            throw new Error("Empty response from AI");
        }

        const data = JSON.parse(jsonResponse);
        return { success: true, data };

    } catch (error: any) {
        console.error("AI Data Extraction error:", error);
        return { success: false, message: "Gagal mengekstrak data JSON: " + error.message };
    }
}
