import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const candidateCount = await prisma.candidate.count();
    return NextResponse.json({
      status: "alive",
      message: "Supabase database keep-alive ping successful",
      timestamp: new Date().toISOString(),
      database: "Supabase PostgreSQL",
      data: {
        users: userCount,
        candidates: candidateCount,
      },
    });
  } catch (error: any) {
    console.error("Keep-alive cron ping error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to query database" },
      { status: 500 }
    );
  }
}
