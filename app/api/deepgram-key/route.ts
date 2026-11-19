import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "DEEPGRAM_API_KEY belum dikonfigurasi di Vercel Environment Variables. Silakan buka dashboard Vercel -> Settings -> Environment Variables, lalu tambahkan DEEPGRAM_API_KEY.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    key: DEEPGRAM_API_KEY.trim(),
  });
}
