import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { programSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");

  try {
    const programs = await prisma.program.findMany({
      where: teacherId ? { teacherId } : undefined,
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ success: true, data: programs });
  } catch (error) {
    console.error("Programs GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch programs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = programSchema.parse(body);

    const program = await prisma.program.create({
      data: parsed,
    });

    return NextResponse.json({ success: true, data: program }, { status: 201 });
  } catch (error) {
    console.error("Programs POST error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to create program." },
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
        { success: false, error: "Program id is required." },
        { status: 400 }
      );
    }
    const parsed = programSchema.partial().parse(rest);
    const program = await prisma.program.update({
      where: { id },
      data: parsed,
    });
    return NextResponse.json({ success: true, data: program });
  } catch (error) {
    console.error("Programs PUT error", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to update program." },
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
        { success: false, error: "Program id is required." },
        { status: 400 }
      );
    }

    await prisma.program.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Programs DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete program." },
      { status: 500 }
    );
  }
}
