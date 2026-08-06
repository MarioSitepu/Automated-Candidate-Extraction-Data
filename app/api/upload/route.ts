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
  const ext = path.extname(fileName).toLowerCase() || ".mp4";

  const inputFilePath = path.join(process.cwd(), `tmp_upload_${timestamp}${ext}`);
  const outputAudio = path.join(process.cwd(), `audio_${timestamp}.mp3`);

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
    if (stat.size < 100) {
      return NextResponse.json(
        { success: false, message: "File video/audio yang diunggah kosong atau rusak." },
        { status: 400 }
      );
    }

    const isAudioOnly = ext === ".mp3" || ext === ".wav" || ext === ".m4a" || ext === ".aac" || ext === ".ogg" || ext === ".flac";
    let fileToTranscribe = outputAudio;
    let ffmpegSuccess = false;

    if (isAudioOnly) {
      console.log(`1. Processing Audio File (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);
      try {
        await runFFmpeg([
          "-i", inputFilePath,
          "-vn",
          "-c:a", "libmp3lame",
          "-q:a", "2",
          "-y",
          outputAudio
        ]);
        ffmpegSuccess = true;
      } catch (audioErr) {
        console.warn("   -> Audio re-encode skipped, passing raw audio to Deepgram...");
        fileToTranscribe = inputFilePath;
      }
    } else {
      console.log(`1. Processing MP4 Video File (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);
      try {
        await runFFmpeg([
          "-probesize", "50M",
          "-analyzeduration", "50M",
          "-err_detect", "ignore_err",
          "-i", inputFilePath,
          "-vn",
          "-c:a", "libmp3lame",
          "-q:a", "2",
          "-y",
          outputAudio
        ]);
        ffmpegSuccess = true;
      } catch (videoErr: any) {
        console.warn("   -> FFmpeg MP4 audio extraction skipped (moov atom warning). Passing MP4 video file directly to Deepgram Nova-3...");
        fileToTranscribe = inputFilePath;
      }
    }

    // Check extracted MP3 file size if FFmpeg ran
    if (ffmpegSuccess) {
      const audioStat = await fs.stat(outputAudio).catch(() => ({ size: 0 }));
      if (audioStat.size > 1000) {
        fileToTranscribe = outputAudio;
      } else {
        fileToTranscribe = inputFilePath;
      }
    }

    // 2. Transcribe via Deepgram Nova-3 (Supports MP3, MP4, WAV, M4A, MOV natively!)
    const formattedSegments = await transcribeAudioFile(fileToTranscribe);

    // 3. Save final audio/video file for playback in dashboard
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    let publicAudioUrl = "";
    if (fsSync.existsSync(outputAudio) && fsSync.statSync(outputAudio).size > 1000) {
      const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}.mp3`);
      await fs.copyFile(outputAudio, finalAudioPath).catch(() => {});
      publicAudioUrl = `/uploads/audio_${timestamp}.mp3`;
    } else {
      const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}${ext}`);
      await fs.copyFile(inputFilePath, finalAudioPath).catch(() => {});
      publicAudioUrl = `/uploads/audio_${timestamp}${ext}`;
    }

    // Clean up temporary files
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});

    return NextResponse.json({
      success: true,
      segments: formattedSegments,
      audioUrl: publicAudioUrl
    });

  } catch (error: any) {
    console.error("API upload extraction error:", error);
    await fs.unlink(inputFilePath).catch(() => {});
    await fs.unlink(outputAudio).catch(() => {});
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat ekstraksi AI: " + error.message },
      { status: 500 }
    );
  }
}
