import { NextResponse } from "next/server";
import { authSchema } from "@/lib/validators";
import { findTeacherByEmail, generateMockToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = authSchema.omit({ name: true }).parse(json);

    const teacher = await findTeacherByEmail(parsed.email);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(parsed.password, teacher.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = generateMockToken(teacher.id);

    return NextResponse.json({ success: true, data: { teacher, token } });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { success: false, error: "Failed to login." },
      { status: 500 }
    );
  }
}
