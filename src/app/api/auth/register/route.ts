import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input data." },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        normalizedEmail: email.toLowerCase(),
        passwordHash,
        name,
        role: "LEARNER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Create session cookie
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    return NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
