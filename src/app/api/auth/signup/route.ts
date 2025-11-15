import { NextResponse } from "next/server";
import { authSchema } from "@/lib/validators";
import { createTeacher, findTeacherByEmail, generateMockToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = authSchema.parse(json);

    if (!parsed.name) {
      return NextResponse.json(
        { success: false, error: "Name is required for signup." },
        { status: 400 }
      );
    }

    const existing = await findTeacherByEmail(parsed.email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered." },
        { status: 400 }
      );
    }

    const teacher = await createTeacher({
      email: parsed.email,
      password: parsed.password,
      name: parsed.name,
    });

    const token = generateMockToken(teacher.id);

    return NextResponse.json({ success: true, data: { teacher, token } });
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign up." },
      { status: 500 }
    );
  }
}
