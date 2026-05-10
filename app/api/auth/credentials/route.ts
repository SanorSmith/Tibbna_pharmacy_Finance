import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, getUserByEmail } from "@/lib/db/queries/user";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "NO_EMAIL" }, { status: 401 });
    }

    // Find user by email
    const dbUser = await getUserByEmail(email);

    if (!dbUser || !dbUser.password) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(password, dbUser.password);

    if (!isValid) {
      return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 401 });
    }

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: dbUser.userid,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
      },
    });
  } catch (error) {
    console.error("Credentials authentication error:", error);
    // Return 200 with null for any server errors to avoid NextAuth error logs
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
