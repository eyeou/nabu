import { NextResponse } from "next/server";
import { studentSummarySchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = studentSummarySchema.parse(body);

    const summary = {
      ...parsed,
      bulletPoints: parsed.bulletPoints,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        message: "AI summary generation placeholder.",
      },
    });
  } catch (error) {
    console.error("Summaries generate error", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
