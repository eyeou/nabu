import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lessonLinkSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = lessonLinkSchema.parse(body);
    const link = await prisma.lessonLink.create({ data: parsed });
    return NextResponse.json({ success: true, data: link }, { status: 201 });
  } catch (error) {
    console.error("LessonLink POST error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create link." },
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Link id is required." },
        { status: 400 }
      );
    }
    await prisma.lessonLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LessonLink DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete link." },
      { status: 500 }
    );
  }
}
