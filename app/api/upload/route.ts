import { NextResponse } from "next/server";
import { uploadAndExtract } from "@/app/actions/extract";

export const maxDuration = 300; // 5 minutes max execution

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await uploadAndExtract(formData);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses upload file audio." },
      { status: 500 }
    );
  }
}
