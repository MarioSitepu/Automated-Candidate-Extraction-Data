import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
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
  const fileName = rawFileName ? decodeURIComponent(rawFileName) : `upload_${timestamp}.mp4`;
  const ext = path.extname(fileName).toLowerCase() || ".mp4";

  const inputFilePath = path.join(os.tmpdir(), `tmp_upload_${timestamp}${ext}`);
  const outputAudio = path.join(os.tmpdir(), `audio_${timestamp}.mp3`);

  try {
    // 1. Read binary payload via request.arrayBuffer()
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
    console.log(`1. Processing uploaded file (File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    if (stat.size < 100) {
      return NextResponse.json(
        { success: false, message: "File video/audio yang diunggah kosong atau rusak." },
        { status: 400 }
      );
    }

    // 2. FFmpeg Video to MP3 Audio Conversion (or direct fallback for Deepgram)
    let ffmpegOk = false;
    try {
      await runFFmpeg([
        "-i", inputFilePath,
        "-vn",
        "-ac", "2",
        "-ar", "44100",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        "-y",
        outputAudio
      ]);
      ffmpegOk = true;
    } catch {
      console.warn("   -> First pass FFmpeg failed, running robust pass with err_detect ignore...");
      try {
        await runFFmpeg([
          "-err_detect", "ignore_err",
          "-i", inputFilePath,
          "-vn",
          "-ac", "2",
          "-ar", "44100",
          "-y",
          outputAudio
        ]);
        ffmpegOk = true;
      } catch {
        console.warn("   -> FFmpeg conversion not available. Passing file directly to Deepgram Nova-3...");
        await fs.copyFile(inputFilePath, outputAudio).catch(() => {});
      }
    }

    const targetAudioPath = ffmpegOk ? outputAudio : inputFilePath;

    // 3. Transcribe audio/video directly via Deepgram Nova-3 + Diarization
    const formattedSegments = await transcribeAudioFile(targetAudioPath);

    // 4. Save clean audio file for playback in dashboard (if filesystem is writable)
    const uploadsDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

    const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}.mp3`);
    await fs.copyFile(targetAudioPath, finalAudioPath).catch(() => {});
    const publicAudioUrl = `/uploads/audio_${timestamp}.mp3`;

    // Clean up temporary files
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});

    return NextResponse.json({
      success: true,
      segments: formattedSegments,
      audioUrl: publicAudioUrl
    });

  } catch (error: unknown) {
    console.error("API upload extraction error:", error);
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat ekstraksi AI: " + message },
      { status: 500 }
    );
  }
}
