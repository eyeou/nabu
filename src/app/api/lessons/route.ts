import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lessonSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const programId = searchParams.get("programId");

  try {
    const lessons = await prisma.lesson.findMany({
      where: programId ? { programId } : undefined,
      orderBy: { orderIndex: "asc" },
      include: {
        outgoing: true,
        incoming: true,
      },
    });

    return NextResponse.json({ success: true, data: lessons });
  } catch (error) {
    console.error("Lessons GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lessons." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = lessonSchema.parse(body);
    const lesson = await prisma.lesson.create({ data: parsed });
    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (error) {
    console.error("Lessons POST error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create lesson." },
      { status }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Lesson id is required." },
        { status: 400 }
      );
    }
    const parsed = lessonSchema.partial().parse(rest);
    const lesson = await prisma.lesson.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Lessons PUT error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update lesson." },
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
        { success: false, error: "Lesson id is required." },
        { status: 400 }
      );
    }
    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lessons DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson." },
      { status: 500 }
    );
  }
}
