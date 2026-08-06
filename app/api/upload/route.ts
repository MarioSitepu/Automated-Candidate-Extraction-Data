import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
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
    // 1. Stream raw binary request body directly to disk using pipeline to ensure 100% complete write
    if (request.body) {
      const nodeStream = Readable.fromWeb(request.body as any);
      const writeStream = fsSync.createWriteStream(inputFilePath);
      await pipeline(nodeStream, writeStream);
    } else {
      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(inputFilePath, buffer);
    }

    const stat = await fs.stat(inputFilePath).catch(() => ({ size: 0 }));
    if (stat.size === 0) {
      return NextResponse.json(
        { success: false, message: "Payload file audio/video kosong." },
        { status: 400 }
      );
    }

    console.log(`1. Compressing and extracting audio via FFmpeg (File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    // Robust FFmpeg arguments for MP4/MOV/WebM video files with moov atom tolerance & probe size
    const args = [
      "-probesize", "100M",
      "-analyzeduration", "100M",
      "-err_detect", "ignore_err",
      "-i", inputFilePath,
      "-vn",
      "-c:a", "libmp3lame",
      "-q:a", "2",
      "-y",
      outputAudio
    ];

    await runFFmpeg(args);
    console.log("   -> Audio successfully extracted!");

    const formattedSegments = await transcribeAudioFile(outputAudio);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const finalAudioPath = path.join(uploadsDir, `audio_${timestamp}.mp3`);
    await fs.copyFile(outputAudio, finalAudioPath).catch(() => {});
    const publicAudioUrl = `/uploads/audio_${timestamp}.mp3`;

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
