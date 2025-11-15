import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");

  try {
    const classes = await prisma.class.findMany({
      where: teacherId ? { teacherId } : undefined,
      include: { students: true },
    });

    return NextResponse.json({ success: true, data: classes });
  } catch (error) {
    console.error("Classes GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = classSchema.parse(body);
    const created = await prisma.class.create({ data: parsed });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Classes POST error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create class." },
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
        { success: false, error: "Class id is required." },
        { status: 400 }
      );
    }
    const parsed = classSchema.partial().parse(rest);
    const updated = await prisma.class.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Classes PUT error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update class." },
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
        { success: false, error: "Class id is required." },
        { status: 400 }
      );
    }
    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Classes DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete class." },
      { status: 500 }
    );
  }
}
