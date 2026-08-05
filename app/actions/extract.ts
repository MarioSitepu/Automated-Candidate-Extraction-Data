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

export async function extractGDriveFileId(input: string): Promise<string> {
    if (!input) return "";
    const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/) || input.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input.trim();
}

export async function runVideoToText(fileIdOrUrl: string) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

    if (!GROQ_API_KEY) {
        return { success: false, message: "GROQ_API_KEY is not set in .env" };
    }

    const cleanFileId = await extractGDriveFileId(fileIdOrUrl);
    if (!cleanFileId) {
        return { success: false, message: "Link atau File ID Google Drive tidak valid." };
    }

    const timestamp = Date.now();
    const tempAudio = path.join(process.cwd(), `tmp_gdrive_${timestamp}.mp3`);
    
    // Choose URL & Headers based on ACCESS_TOKEN availability
    let gdriveUrl = `https://drive.google.com/uc?export=download&id=${cleanFileId}`;
    let args: string[] = [];

    if (ACCESS_TOKEN && ACCESS_TOKEN.trim().length > 0) {
        gdriveUrl = `https://www.googleapis.com/drive/v3/files/${cleanFileId}?alt=media`;
        const authHeader = `Authorization: Bearer ${ACCESS_TOKEN.trim()}\r\n`;
        args = [
            "-headers", authHeader,
            "-i", gdriveUrl,
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y",
            tempAudio
        ];
    } else {
        args = [
            "-i", gdriveUrl,
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y",
            tempAudio
        ];
    }

    try {
        // Step 1: Download and compress audio via FFmpeg
        console.log(`1. Downloading and compressing GDrive video (${cleanFileId}) via FFmpeg...`);
        await execFileAsync("ffmpeg", args);
        console.log("   -> GDrive audio successfully extracted!");

        // Step 2: Transcribe via Groq API
        console.log("2. Sending GDrive audio to Groq Whisper API...");
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        
        const transcription = await groq.audio.transcriptions.create({
            file: fsSync.createReadStream(tempAudio),
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
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const jsonResponse = chatCompletion.choices[0]?.message?.content;
        if (!jsonResponse) {
            throw new Error("Empty response from AI");
        }
        
        console.log("AI Data Extraction Result:", jsonResponse);

        const data = JSON.parse(jsonResponse);
        return { success: true, data };

    } catch (error: any) {
        console.error("AI Data Extraction error:", error);
        return { success: false, message: "Gagal mengekstrak data JSON: " + error.message };
    }
}
