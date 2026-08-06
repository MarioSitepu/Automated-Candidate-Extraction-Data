import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { runFFmpeg, transcribeAudioFile } from "@/app/actions/extract";

export const maxDuration = 300; // 5 minutes max
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!GROQ_API_KEY && !DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { success: false, message: "API key transkripsi tidak ditemukan di .env" },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const rawFileName = request.headers.get("x-file-name");
  const fileName = rawFileName ? decodeURIComponent(rawFileName) : `audio_${timestamp}.mp3`;
  const ext = path.extname(fileName) || ".mp4";

  const inputFilePath = path.join(process.cwd(), `tmp_upload_${timestamp}${ext}`);
  const outputAudio = path.join(process.cwd(), `audio_${timestamp}.mp3`);

  try {
    // 1. Read full binary payload via request.arrayBuffer() (ensures 100% full file write in Next.js Turbopack)
    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, message: "Payload file audio/video kosong." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(inputFilePath, buffer);

    const stat = await fs.stat(inputFilePath).catch(() => ({ size: 0 }));
    console.log(`1. Compressing and extracting audio via FFmpeg (File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    if (stat.size < 1000) {
      return NextResponse.json(
        { success: false, message: "File video/audio yang diunggah tidak lengkap atau terpotong." },
        { status: 400 }
      );
    }

    // 2. FFmpeg Extraction with fallback for non-standard video headers
    try {
      await runFFmpeg([
        "-probesize", "100M",
        "-analyzeduration", "100M",
        "-err_detect", "ignore_err",
        "-i", inputFilePath,
        "-vn",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        "-y",
        outputAudio
      ]);
    } catch (ffmpegErr: any) {
      console.warn("   -> First FFmpeg pass failed, running fallback audio stream extractor...");
      await runFFmpeg([
        "-ignore_unknown",
        "-probesize", "50M",
        "-i", inputFilePath,
        "-vn",
        "-ac", "2",
        "-ar", "44100",
        "-y",
        outputAudio
      ]);
    }

    const audioStat = await fs.stat(outputAudio).catch(() => ({ size: 0 }));
    if (audioStat.size === 0) {
      throw new Error("Gagal mengolah trek audio dari file video ini.");
    }

    console.log(`   -> Audio successfully extracted! (${(audioStat.size / (1024 * 1024)).toFixed(2)} MB)`);

    // 3. Transcribe via Deepgram Nova-3 + Diarization
    const formattedSegments = await transcribeAudioFile(outputAudio);

    // Save final audio to public uploads directory for playback
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}.mp3`);
    await fs.copyFile(outputAudio, finalAudioPath).catch(() => {});
    const publicAudioUrl = `/uploads/audio_${timestamp}.mp3`;

    // Clean up temporary files
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});

    return NextResponse.json({
      success: true,
      segments: formattedSegments,
      audioUrl: publicAudioUrl
    });

  } catch (error: any) {
    console.error("API raw upload extraction error:", error);
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat ekstraksi AI: " + error.message },
      { status: 500 }
    );
  }
}
