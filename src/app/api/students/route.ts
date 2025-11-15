import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");

  try {
    const students = await prisma.student.findMany({
      where: classId ? { classId } : undefined,
      include: {
        statuses: true,
        summaries: true,
      },
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error("Students GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch students." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = studentSchema.parse(body);
    const created = await prisma.student.create({ data: parsed });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Students POST error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create student." },
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
        { success: false, error: "Student id is required." },
        { status: 400 }
      );
    }
    const parsed = studentSchema.partial().parse(rest);
    const updated = await prisma.student.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Students PUT error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update student." },
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
        { success: false, error: "Student id is required." },
        { status: 400 }
      );
    }
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Students DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete student." },
      { status: 500 }
    );
  }
}
