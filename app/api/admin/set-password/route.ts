import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/db/queries/user";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Update user password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedat: new Date()
      })
      .where(eq(users.email, email));
    
    return NextResponse.json({ 
      success: true,
      message: `Password set successfully for ${email}`
    });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
